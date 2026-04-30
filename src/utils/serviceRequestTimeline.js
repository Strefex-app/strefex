const norm = (e) => String(e || '').trim().toLowerCase()

export const ACTIVITY_KIND_LABEL = {
  request_created: 'Submitted',
  assigned: 'Assignment',
  status_changed: 'Status',
  note_added: 'Note',
}

/**
 * Single timeline for a request: stored activityLog, or legacy adminNotes + createdAt.
 * @param {object} req service request row
 */
export function mergeRequestTimelineEntries(req) {
  const logs = [...(req?.activityLog || [])].sort(
    (a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime()
  )
  if (logs.length > 0) return logs

  const legacy = []
  if (req?.createdAt) {
    legacy.push({
      id: 'legacy-entry-created',
      at: req.createdAt,
      kind: 'request_created',
      actorEmail: norm(req.email),
      summary: 'Request submitted (historical record — no activity log was stored yet)',
    })
  }
  ;(req?.adminNotes || []).forEach((n, i) => {
    legacy.push({
      id: `legacy-note-${i}`,
      kind: 'note_added',
      at: n.at,
      actorEmail: norm(n.by),
      summary: 'Note',
      detail: n.text,
    })
  })
  return legacy.sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime())
}
