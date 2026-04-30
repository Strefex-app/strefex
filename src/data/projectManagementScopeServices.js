/**
 * Project Management scopes — same labels as Service Hub category tags and `/services`
 * when `serviceCategory=project-management`.
 */
export const PROJECT_MANAGEMENT_SCOPE = [
  { id: 'pm-2d-3d-design', label: '2D/3D Design' },
  { id: 'pm-engineering', label: 'Engineering' },
  { id: 'pm-planning', label: 'Planning' },
  { id: 'pm-coordination', label: 'Coordination' },
  { id: 'pm-reporting', label: 'Reporting' },
]

export const PROJECT_MANAGEMENT_SCOPE_IDS = PROJECT_MANAGEMENT_SCOPE.map((s) => s.id)

export const PROJECT_MANAGEMENT_SCOPE_LABELS = PROJECT_MANAGEMENT_SCOPE.map((s) => s.label)
