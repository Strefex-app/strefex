import { useState } from 'react'
import IatfChangeLog, { IatfEditDialog } from './IatfChangeLog'
import { attachPlantFile, openPlantFile } from '../../utils/iatfFileAttach'

export default function IatfTrackedActions({
  record,
  title,
  fields = [],
  readOnly,
  onSave,
  requireReason,
  attachKind,
  attachOptions = {},
  onAttachMeta,
}) {
  const [editing, setEditing] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [values, setValues] = useState({})
  const [reason, setReason] = useState('')
  const [fileNote, setFileNote] = useState('')
  const [busy, setBusy] = useState(false)

  const openEdit = () => {
    const next = {}
    fields.forEach((field) => {
      next[field.key] = record?.[field.key] ?? ''
    })
    setValues(next)
    setReason('')
    setFileNote('')
    setEditing(true)
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !attachKind) return
    setBusy(true)
    setFileNote('')
    try {
      const meta = await attachPlantFile({
        entityType: attachKind,
        entityId: record.id,
        file,
        space: attachOptions.space,
        folderStoragePath: attachOptions.folderStoragePath,
      })
      onAttachMeta?.(meta, reason)
      setFileNote(meta.cloud
        ? `Stored ${meta.fileName}`
        : `Recorded ${meta.fileName} (cloud storage not connected — name only)`)
    } catch (err) {
      setFileNote(err.message || 'Could not attach file')
    } finally {
      setBusy(false)
    }
  }

  const openStored = async () => {
    if (!record?.storagePath) return
    try {
      const url = await openPlantFile(record.storagePath)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setFileNote('Could not open stored file')
    }
  }

  return (
    <div className="iatf-tracked">
      <div className="iatf-tracked__btns">
        {!readOnly && (
          <button type="button" className="qe-btn" onClick={openEdit}>Edit</button>
        )}
        <button type="button" className="qe-btn" onClick={() => setShowLog((v) => !v)}>
          Log{(record?.changeLog || []).length ? ` (${record.changeLog.length})` : ''}
        </button>
        {record?.storagePath ? (
          <button type="button" className="qe-btn" onClick={openStored}>Open file</button>
        ) : null}
      </div>
      {showLog && (
        <IatfChangeLog entries={record?.changeLog || []} />
      )}
      {editing && (
        <IatfEditDialog
          title={title}
          fields={fields}
          values={values}
          onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
          reason={reason}
          onReason={setReason}
          requireReason={requireReason}
          onClose={() => setEditing(false)}
          onSave={() => {
            onSave(values, { reason })
            setEditing(false)
          }}
        >
          {attachKind && !readOnly && (
            <label className="iatf-field">
              <span className="stx-text-caption">Controlled file (PDF / WI / certificate)</span>
              <input type="file" disabled={busy} onChange={handleFile} />
              {record?.fileName ? (
                <span className="stx-text-caption stx-text-wrap">Current: {record.fileName}</span>
              ) : null}
              {fileNote ? <span className="stx-text-caption stx-text-wrap">{fileNote}</span> : null}
            </label>
          )}
        </IatfEditDialog>
      )}
    </div>
  )
}
