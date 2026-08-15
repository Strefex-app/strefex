import { useSyncStatusStore } from '../store/syncStatusStore'
import './SyncErrorBanner.css'

export default function SyncErrorBanner() {
  const lastError = useSyncStatusStore((s) => s.lastError)
  const clearSyncError = useSyncStatusStore((s) => s.clearSyncError)
  const source = useSyncStatusStore((s) => s.source)
  if (!lastError) return null

  const retry = () => {
    clearSyncError()
    if (source === 'workspace') {
      import('../services/workspaceCloudSync')
        .then((m) => m.pullWorkspaceSnapshotsForced())
        .catch(() => {})
    }
  }

  return (
    <div className="sync-error-banner" role="alert">
      <span className="stx-text-wrap">
        {source === 'workspace' ? 'Workspace sync failed. ' : ''}
        {lastError}
      </span>
      <span className="sync-error-banner__actions">
        {source === 'workspace' ? (
          <button type="button" className="sync-error-banner__btn" onClick={retry}>
            Retry
          </button>
        ) : null}
        <button type="button" className="sync-error-banner__btn" onClick={clearSyncError}>
          Dismiss
        </button>
      </span>
    </div>
  )
}
