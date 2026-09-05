import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useIatfControlStore from '../../store/iatfControlStore'
import useCompanyDepartments from '../../hooks/useCompanyDepartments'
import IatfTrackedActions from '../iatf/IatfTrackedActions'
import {
  COMMERCIAL_DOC_TYPE_IDS,
  HR_DOC_TYPE_IDS,
  IATF_DOC_STATUSES,
  IATF_DOC_TYPES,
  PLANT_DOC_TYPE_IDS,
  labelOf,
} from '../../data/iatfControlCatalog'
import {
  COMMERCIAL_SPACE,
  HR_PEOPLE_SPACE,
  PLANT_QMS_SPACE,
  spaceRootFolderId,
} from '../../data/companyDatabaseSpaces'
import { DEPARTMENTS_PATH, makeDepartmentId } from '../../utils/departmentHome'
import {
  findSpaceRootFolder,
  folderBreadcrumbs,
  folderStoragePath,
  listChildFolders,
} from '../../utils/companyFolders'
import { plantStorageStatus } from '../../utils/iatfFileAttach'
import './FolderBrowser.css'

function Field({ label, children }) {
  return (
    <label className="iatf-field">
      <span className="stx-text-caption">{label}</span>
      {children}
    </label>
  )
}

function FolderTreeNode({
  folder,
  folders,
  selectedId,
  depth,
  onSelect,
  documents,
}) {
  const children = listChildFolders(folders, folder.id)
  const docCount = (documents || []).filter((d) => d.folderId === folder.id).length
  const isSelected = selectedId === folder.id

  return (
    <div className="cdb-tree__branch">
      <button
        type="button"
        className={`cdb-tree__item${isSelected ? ' is-active' : ''}`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <span className="cdb-tree__name stx-text-wrap">{folder.name}</span>
        {docCount > 0 ? <span className="cdb-tree__count">{docCount}</span> : null}
      </button>
      {children.map((child) => (
        <FolderTreeNode
          key={child.id}
          folder={child}
          folders={folders}
          selectedId={selectedId}
          depth={depth + 1}
          onSelect={onSelect}
          documents={documents}
        />
      ))}
    </div>
  )
}

/**
 * Company Database folder browser: tree + document list + upload into current folder.
 */
export default function FolderBrowser({
  space = PLANT_QMS_SPACE,
  initialFolderId,
  readOnly = false,
  compact = false,
  onFolderChange,
  databaseBasePath,
}) {
  const folders = useIatfControlStore((s) => s.folders)
  const documents = useIatfControlStore((s) => s.documents)
  const parts = useIatfControlStore((s) => s.parts)
  const processes = useIatfControlStore((s) => s.processes)
  const addDocument = useIatfControlStore((s) => s.addDocument)
  const updateDocument = useIatfControlStore((s) => s.updateDocument)
  const approveDocument = useIatfControlStore((s) => s.approveDocument)
  const obsoleteDocument = useIatfControlStore((s) => s.obsoleteDocument)
  const addFolder = useIatfControlStore((s) => s.addFolder)
  const ensureFolders = useIatfControlStore((s) => s.ensureFolders)

  const deptNames = useCompanyDepartments()
  const defaultType = space === HR_PEOPLE_SPACE
    ? 'hr_policy'
    : space === COMMERCIAL_SPACE
      ? 'project_binder'
      : 'procedure'
  const defaultDepartment = space === HR_PEOPLE_SPACE
    ? 'HR'
    : space === COMMERCIAL_SPACE
      ? 'Purchasing'
      : 'Quality'

  const [folderId, setFolderId] = useState(initialFolderId || spaceRootFolderId(space))
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [form, setForm] = useState({
    title: '',
    type: defaultType,
    department: defaultDepartment,
    revision: '00',
    partId: '',
    processId: '',
  })

  useEffect(() => {
    if (initialFolderId) setFolderId(initialFolderId)
  }, [initialFolderId])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      type: defaultType,
      department: defaultDepartment,
    }))
  }, [defaultType, defaultDepartment])

  const spaceFolders = useMemo(
    () => (folders || []).filter((f) => f.space === space),
    [folders, space],
  )

  const rootFolder = findSpaceRootFolder(spaceFolders, space) || spaceFolders[0]
  const activeFolderId = folderId || rootFolder?.id || ''
  const crumbs = useMemo(
    () => folderBreadcrumbs(spaceFolders, activeFolderId),
    [spaceFolders, activeFolderId],
  )
  const folderDocs = useMemo(
    () => (documents || []).filter((doc) => (
      doc.space === space && doc.folderId === activeFolderId
    )),
    [documents, space, activeFolderId],
  )

  const docTypeIds = space === HR_PEOPLE_SPACE
    ? HR_DOC_TYPE_IDS
    : space === COMMERCIAL_SPACE
      ? COMMERCIAL_DOC_TYPE_IDS
      : PLANT_DOC_TYPE_IDS
  const docTypes = IATF_DOC_TYPES.filter((t) => docTypeIds.includes(t.id))
  const showPlantLinks = space === PLANT_QMS_SPACE

  const deptOptions = form.department && !deptNames.includes(form.department)
    ? [form.department, ...deptNames]
    : deptNames

  const selectFolder = (id) => {
    setFolderId(id)
    onFolderChange?.(id)
  }

  const storageFolderPath = folderStoragePath(spaceFolders, activeFolderId)

  if (!spaceFolders.length) {
    ensureFolders()
  }

  return (
    <div className={`cdb-browser${compact ? ' cdb-browser--compact' : ''}`}>
      <aside className="cdb-browser__tree app-page-card">
        <div className="cdb-browser__tree-head">
          <h2 className="stx-text-heading">Folders</h2>
          {!readOnly && (
            <button
              type="button"
              className="app-page-btn-ghost app-page-btn-sm"
              onClick={() => setShowNewFolder((v) => !v)}
            >
              + Folder
            </button>
          )}
        </div>
        {showNewFolder && !readOnly && (
          <form
            className="cdb-browser__newfolder"
            onSubmit={(e) => {
              e.preventDefault()
              const row = addFolder({ parentId: activeFolderId, name: newFolderName, space })
              setNewFolderName('')
              setShowNewFolder(false)
              selectFolder(row.id)
            }}
          >
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New subfolder name"
            />
            <button type="submit" className="app-page-btn-primary app-page-btn-sm" disabled={!newFolderName.trim()}>
              Add
            </button>
          </form>
        )}
        {rootFolder ? (
          <FolderTreeNode
            folder={rootFolder}
            folders={spaceFolders}
            selectedId={activeFolderId}
            depth={0}
            onSelect={selectFolder}
            documents={documents}
          />
        ) : null}
      </aside>

      <section className="cdb-browser__main">
        <nav className="cdb-browser__crumbs" aria-label="Folder path">
          {crumbs.map((row, i) => (
            <span key={row.id} className="cdb-browser__crumb">
              {i > 0 ? <span className="cdb-browser__sep">/</span> : null}
              {databaseBasePath ? (
                <Link to={`${databaseBasePath}/${row.id}`} className="iatf-link">
                  {row.name}
                </Link>
              ) : (
                <button type="button" className="iatf-link" onClick={() => selectFolder(row.id)}>
                  {row.name}
                </button>
              )}
            </span>
          ))}
        </nav>

        <p className="stx-text-caption stx-text-wrap">{plantStorageStatus().label}</p>

        {!readOnly && (
          <form
            className="app-page-card iatf-card iatf-form"
            onSubmit={(e) => {
              e.preventDefault()
              addDocument({
                ...form,
                space,
                folderId: activeFolderId,
              })
              setForm({
                title: '',
                type: form.type,
                department: form.department,
                revision: '00',
                partId: '',
                processId: '',
              })
            }}
          >
            <h2 className="stx-text-heading">New controlled document in this folder</h2>
            <div className="iatf-form-grid">
              <Field label="Title">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
              <Field label="Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {docTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Department">
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  {deptOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Revision">
                <input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} />
              </Field>
              {showPlantLinks ? (
                <>
                  <Field label="Part">
                    <select value={form.partId} onChange={(e) => setForm({ ...form, partId: e.target.value })}>
                      <option value="">—</option>
                      {parts.map((p) => <option key={p.id} value={p.id}>{p.partNumber || p.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Process">
                    <select value={form.processId} onChange={(e) => setForm({ ...form, processId: e.target.value })}>
                      <option value="">—</option>
                      {processes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </Field>
                </>
              ) : null}
            </div>
            <button type="submit" className="app-page-btn-primary">Add draft</button>
          </form>
        )}

        <div className="app-page-card iatf-card">
          <h2 className="stx-text-heading">
            {crumbs[crumbs.length - 1]?.name || 'Documents'}
            <span className="stx-text-caption"> · {folderDocs.length} in this folder</span>
          </h2>
          {folderDocs.length === 0 ? (
            <p className="stx-text-caption">
              No documents in this folder yet. Upload a controlled copy with Edit on each row after adding a draft.
            </p>
          ) : (
            <div className="iatf-table-wrap">
              <table className="iatf-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Rev</th>
                    <th>Status</th>
                    <th>Dept</th>
                    <th> </th>
                  </tr>
                </thead>
                <tbody>
                  {folderDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>{doc.docNumber}</td>
                      <td className="stx-text-wrap">{doc.title}</td>
                      <td>{labelOf(IATF_DOC_TYPES, doc.type)}</td>
                      <td>
                        <input
                          className="iatf-mini"
                          defaultValue={doc.revision}
                          disabled={readOnly}
                          onBlur={(e) => {
                            if (e.target.value !== doc.revision) {
                              updateDocument(doc.id, { revision: e.target.value })
                            }
                          }}
                        />
                      </td>
                      <td>
                        {labelOf(IATF_DOC_STATUSES, doc.status)}
                        {doc.changeFlag ? ` · change ${doc.changeFlag}` : ''}
                      </td>
                      <td>
                        {doc.department ? (
                          <Link className="iatf-link" to={`${DEPARTMENTS_PATH}/${doc.departmentId || makeDepartmentId(doc.department)}`}>
                            {doc.department}
                          </Link>
                        ) : '—'}
                      </td>
                      <td>
                        <IatfTrackedActions
                          record={doc}
                          title={`Edit ${doc.docNumber || 'document'}`}
                          readOnly={readOnly}
                          requireReason={doc.status === 'approved'}
                          attachKind="iatf-document"
                          attachOptions={{
                            space,
                            folderStoragePath: storageFolderPath,
                          }}
                          fields={[
                            { key: 'title', label: 'Title' },
                            { key: 'revision', label: 'Revision' },
                            { key: 'department', label: 'Department', type: 'select', options: deptOptions.map((d) => ({ value: d, label: d })) },
                            { key: 'type', label: 'Type', type: 'select', options: docTypes.map((t) => ({ value: t.id, label: t.label })) },
                            { key: 'notes', label: 'Notes' },
                          ]}
                          onSave={(values, meta) => updateDocument(doc.id, values, meta)}
                          onAttachMeta={(fileMeta, reason) => updateDocument(doc.id, {
                            fileName: fileMeta.fileName,
                            storagePath: fileMeta.storagePath || doc.storagePath || '',
                          }, { action: 'file_attached', reason })}
                        />
                        {!readOnly && doc.status !== 'approved' && doc.status !== 'obsolete' && (
                          <button type="button" className="qe-btn qe-btn--primary" onClick={() => approveDocument(doc.id)}>
                            Approve
                          </button>
                        )}
                        {!readOnly && doc.status === 'approved' && (
                          <button type="button" className="qe-btn qe-btn--danger" onClick={() => obsoleteDocument(doc.id)}>
                            Obsolete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
