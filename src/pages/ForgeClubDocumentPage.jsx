import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useTranslation } from '../i18n/useTranslation'
import { FORGE_PATHS } from '../constants/forgeSpaceRoutes'
import {
  CLUB_DOC_LABELS,
  clubDocAssetUrl,
  clubDocStorageKey,
  isValidClubDocId,
} from '../lib/forgeClubDocRegistry'
import './HeadcountManagement.css'
import './ForgeClubDocumentPage.css'

export default function ForgeClubDocumentPage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const iframeRef = useRef(null)
  const editingRef = useRef(false)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

  editingRef.current = editing

  const valid = docId && isValidClubDocId(docId)

  const loadTemplate = useCallback(async () => {
    if (!valid) return
    const url = clubDocAssetUrl(docId)
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const text = await res.text()
    setHtml(text)
    setLoadError('')
  }, [docId, valid])

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    const key = clubDocStorageKey(docId)
    const saved = localStorage.getItem(key)
    if (saved) {
      setHtml(saved)
      setLoading(false)
      return
    }
    setLoading(true)
    loadTemplate()
      .then(() => {
        if (!cancelled) {
          setLoading(false)
          setLoadError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(t('forge.clubDoc.loadError', 'Could not load this document.'))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [docId, valid, loadTemplate, t])

  useEffect(() => {
    if (!html || !iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(html)
    doc.close()
    try {
      doc.designMode = editingRef.current ? 'on' : 'off'
    } catch {
      /* ignore */
    }
  }, [html])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc?.body) return
    try {
      doc.designMode = editing ? 'on' : 'off'
    } catch {
      /* ignore */
    }
  }, [editing])

  const persistFromIframe = useCallback(() => {
    if (!valid || !iframeRef.current?.contentDocument?.documentElement) return
    const root = iframeRef.current.contentDocument.documentElement
    const serialized = '<!DOCTYPE html>\n' + root.outerHTML
    localStorage.setItem(clubDocStorageKey(docId), serialized)
    setHtml(serialized)
    setSaveStatus('saved')
    window.setTimeout(() => setSaveStatus(''), 2000)
  }, [docId, valid])

  const handleSave = () => {
    persistFromIframe()
  }

  const handleReset = () => {
    if (!valid) return
    if (!window.confirm(t('forge.clubDoc.confirmReset', 'Discard saved edits and reload the original template?'))) return
    localStorage.removeItem(clubDocStorageKey(docId))
    setLoading(true)
    loadTemplate()
      .then(() => {
        setLoading(false)
        setLoadError('')
      })
      .catch(() => {
        setLoadError(t('forge.clubDoc.loadError', 'Could not load this document.'))
        setLoading(false)
      })
  }

  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try {
      win.focus()
      win.print()
    } catch {
      /* ignore */
    }
  }

  if (!valid) {
    return <Navigate to={FORGE_PATHS.hub} replace />
  }

  const title = CLUB_DOC_LABELS[docId] || t('forge.clubDoc.fallbackTitle', 'Club document')

  return (
    <AppLayout>
      <div className="headcount-page forge-club-doc-page">
        <div className="headcount-header forge-club-doc-header no-print">
          <h1 className="headcount-title">{title}</h1>
          <p className="headcount-subtitle">
            {t(
              'forge.clubDoc.subtitle',
              'Edit in the browser, then print or save as PDF for signatures. Changes are stored on this device only.',
            )}
          </p>
        </div>

        <div className="headcount-card forge-club-doc-toolbar no-print">
          <div className="forge-club-doc-toolbar-row">
            <button
              type="button"
              className={`forge-club-doc-tool ${editing ? 'forge-club-doc-tool--active' : ''}`}
              onClick={() => setEditing((e) => !e)}
            >
              <Icon name="edit" size={18} />
              {editing ? t('forge.clubDoc.viewMode', 'View mode') : t('forge.clubDoc.editMode', 'Edit mode')}
            </button>
            <button type="button" className="forge-club-doc-tool" onClick={handleSave} disabled={loading || !!loadError}>
              <Icon name="check" size={18} />
              {t('forge.clubDoc.save', 'Save')}
            </button>
            <button type="button" className="forge-club-doc-tool" onClick={handleReset} disabled={loading}>
              <Icon name="refresh" size={18} />
              {t('forge.clubDoc.reset', 'Reset template')}
            </button>
            <button type="button" className="forge-club-doc-tool forge-club-doc-tool--primary" onClick={handlePrint} disabled={loading || !!loadError}>
              <Icon name="document" size={18} />
              {t('forge.clubDoc.printPdf', 'Print / PDF')}
            </button>
            {saveStatus === 'saved' ? (
              <span className="forge-club-doc-saved">{t('forge.clubDoc.saved', 'Saved')}</span>
            ) : null}
          </div>
        </div>

        {loadError ? (
          <p className="forge-club-doc-error no-print">{loadError}</p>
        ) : null}
        {loading && !html ? (
          <p className="forge-club-doc-loading no-print">{t('forge.clubDoc.loading', 'Loading…')}</p>
        ) : null}

        <div className="forge-club-doc-frame-wrap">
          <iframe ref={iframeRef} className="forge-club-doc-frame" title={title} />
        </div>
      </div>
    </AppLayout>
  )
}
