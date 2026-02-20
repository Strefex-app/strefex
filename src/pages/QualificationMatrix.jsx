import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from '../i18n/useTranslation'
import AppLayout from '../components/AppLayout'
import EmptyState from '../components/EmptyState'
/* jspdf loaded dynamically only when exporting PDF */
import './QualificationMatrix.css'

/* ── Star rating widget ──────────────────────────── */
const StarRating = ({ value, onChange }) => (
  <div className="qm-stars">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className={`qm-star ${star <= value ? 'filled' : ''}`}
        onClick={() => onChange?.(star)}
        style={{ cursor: onChange ? 'pointer' : 'default' }}
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill={star <= value ? '#f1c40f' : '#ddd'}
          stroke={star <= value ? '#f1c40f' : '#ccc'}
          strokeWidth="1"
        />
      </svg>
    ))}
  </div>
)

/* ── Initial data ────────────────────────────────── */
const initialEmployees = [
  { id: 1, name: 'Martin Weber', role: 'CNC Operator', department: 'Production' },
  { id: 2, name: 'Sarah Klein', role: 'Quality Inspector', department: 'Quality' },
  { id: 3, name: 'Thomas Müller', role: 'Maintenance Tech', department: 'Maintenance' },
  { id: 4, name: 'Anna Fischer', role: 'Assembly Lead', department: 'Assembly' },
  { id: 5, name: 'Klaus Schmidt', role: 'Process Engineer', department: 'Engineering' },
  { id: 6, name: 'Lisa Braun', role: 'Shift Supervisor', department: 'Production' },
  { id: 7, name: 'Peter Wagner', role: 'Welding Specialist', department: 'Production' },
  { id: 8, name: 'Maria Hoffmann', role: 'Lab Technician', department: 'Quality' },
]

const initialQualifications = [
  'Machine Operation',
  'Quality Control',
  'Safety Procedures',
  'Lean Manufacturing',
  'Problem Solving',
  'Measurement Tools',
  'Documentation',
  'Team Leadership',
]

const initialDepartments = ['Production', 'Quality', 'Maintenance', 'Assembly', 'Engineering']

function buildInitialRatings(employees, qualifications) {
  const ratings = {}
  employees.forEach((emp) => {
    qualifications.forEach((_, qIdx) => {
      ratings[`${emp.id}-${qIdx}`] = Math.floor(Math.random() * 5) + 1
    })
  })
  return ratings
}

const LEGEND = [
  { stars: 5, label: 'Expert' },
  { stars: 4, label: 'Advanced' },
  { stars: 3, label: 'Intermediate' },
  { stars: 2, label: 'Basic' },
  { stars: 1, label: 'Beginner' },
]

/* ── Reusable modal ──────────────────────────────── */
function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="qm-modal-backdrop" onClick={onClose}>
      <div className="qm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qm-modal-header">
          <h3 className="qm-modal-title">{title}</h3>
          <button type="button" className="qm-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="qm-modal-body">{children}</div>
      </div>
    </div>
  )
}

/* ── Employee links popover ──────────────────────── */
const EMPLOYEE_LINKS = [
  { label: 'Onboarding', path: '/production/headcount/onboarding' },
  { label: 'Training Records', path: '/production/headcount/training' },
  { label: 'Employee Goals', path: '/production/headcount/goals' },
  { label: 'Employee Dialogue', path: '/production/headcount/dialogue' },
]

/* ── Main component ──────────────────────────────── */
export default function QualificationMatrix() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [employees, setEmployees] = useState(initialEmployees)
  const [qualifications, setQualifications] = useState(initialQualifications)
  const [departments, setDepartments] = useState(initialDepartments)
  const [ratings, setRatings] = useState(() =>
    buildInitialRatings(initialEmployees, initialQualifications)
  )
  const [departmentFilter, setDepartmentFilter] = useState('')

  // Modal states
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showAddQual, setShowAddQual] = useState(false)
  const [showAddDept, setShowAddDept] = useState(false)

  // Add employee form
  const [newEmpName, setNewEmpName] = useState('')
  const [newEmpRole, setNewEmpRole] = useState('')
  const [newEmpDept, setNewEmpDept] = useState('')

  // Add qualification form
  const [newQualName, setNewQualName] = useState('')

  // Add department form
  const [newDeptName, setNewDeptName] = useState('')

  // Employee links popover
  const [activePopover, setActivePopover] = useState(null)

  const allDepartments = [...new Set([...departments, ...employees.map((e) => e.department)])].sort()
  const filteredEmployees =
    departmentFilter === '' ? employees : employees.filter((e) => e.department === departmentFilter)

  const getRating = (employeeId, qualIndex) => ratings[`${employeeId}-${qualIndex}`] ?? 1

  const setRating = (employeeId, qualIndex, value) => {
    setRatings((prev) => ({ ...prev, [`${employeeId}-${qualIndex}`]: value }))
  }

  const avgForEmployee = (employeeId) => {
    let sum = 0
    qualifications.forEach((_, qIdx) => {
      sum += getRating(employeeId, qIdx)
    })
    return qualifications.length ? sum / qualifications.length : 0
  }

  const avgForQualification = (qualIndex) => {
    if (filteredEmployees.length === 0) return 0
    let sum = 0
    filteredEmployees.forEach((emp) => {
      sum += getRating(emp.id, qualIndex)
    })
    return sum / filteredEmployees.length
  }

  /* ── Add Employee ───────────────────────────────── */
  const handleAddEmployee = () => {
    if (!newEmpName.trim()) return
    const id = Math.max(0, ...employees.map((e) => e.id)) + 1
    const dept = newEmpDept.trim() || 'Other'
    const newEmp = { id, name: newEmpName.trim(), role: newEmpRole.trim(), department: dept }
    setEmployees((prev) => [...prev, newEmp])
    // add department if new
    if (!allDepartments.includes(dept)) setDepartments((prev) => [...prev, dept])
    // seed ratings
    setRatings((prev) => {
      const next = { ...prev }
      qualifications.forEach((_, qIdx) => {
        next[`${id}-${qIdx}`] = 1
      })
      return next
    })
    setNewEmpName('')
    setNewEmpRole('')
    setNewEmpDept('')
    setShowAddEmployee(false)
  }

  /* ── Add Qualification ──────────────────────────── */
  const handleAddQualification = () => {
    if (!newQualName.trim()) return
    const newQualIndex = qualifications.length
    setQualifications((prev) => [...prev, newQualName.trim()])
    setRatings((prev) => {
      const next = { ...prev }
      employees.forEach((emp) => {
        next[`${emp.id}-${newQualIndex}`] = 1
      })
      return next
    })
    setNewQualName('')
    setShowAddQual(false)
  }

  /* ── Add Department ─────────────────────────────── */
  const handleAddDepartment = () => {
    if (!newDeptName.trim()) return
    if (allDepartments.includes(newDeptName.trim())) {
      alert('Department already exists.')
      return
    }
    setDepartments((prev) => [...prev, newDeptName.trim()])
    setNewDeptName('')
    setShowAddDept(false)
  }

  /* ── PDF Export ─────────────────────────────────── */
  const handleExport = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()

    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Qualifications Matrix', 14, 18)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 24)

    // Table setup
    const startY = 30
    const rowH = 7
    const empColW = 44
    const qualColW = Math.min(22, (pageW - empColW - 22 - 14) / qualifications.length)
    const avgColW = 16
    let y = startY

    // Header
    doc.setFillColor(240, 242, 245)
    doc.rect(14, y, pageW - 28, rowH, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    doc.text('Employee', 16, y + 5)
    qualifications.forEach((q, i) => {
      const x = 14 + empColW + i * qualColW
      const label = q.length > 14 ? q.substring(0, 12) + '..' : q
      doc.text(label, x + 1, y + 5)
    })
    doc.text('Avg', 14 + empColW + qualifications.length * qualColW + 2, y + 5)
    y += rowH

    // Rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    filteredEmployees.forEach((emp) => {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage()
        y = 14
      }
      // alternating bg
      if (filteredEmployees.indexOf(emp) % 2 === 1) {
        doc.setFillColor(248, 249, 250)
        doc.rect(14, y, pageW - 28, rowH, 'F')
      }
      doc.setTextColor(26, 26, 46)
      doc.text(`${emp.name} (${emp.role})`, 16, y + 5)
      qualifications.forEach((_, qIdx) => {
        const x = 14 + empColW + qIdx * qualColW
        const val = getRating(emp.id, qIdx)
        doc.setTextColor(val >= 4 ? 39 : val >= 3 ? 100 : 150, val >= 4 ? 174 : val >= 3 ? 100 : 50, val >= 4 ? 96 : val >= 3 ? 0 : 50)
        doc.text('★'.repeat(val) + '☆'.repeat(5 - val), x + 1, y + 5)
      })
      doc.setTextColor(0, 8, 136)
      doc.text(avgForEmployee(emp.id).toFixed(1), 14 + empColW + qualifications.length * qualColW + 2, y + 5)
      y += rowH
    })

    // Legend
    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(51, 51, 51)
    doc.text('Legend:', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    LEGEND.forEach((item, i) => {
      doc.text(`${'★'.repeat(item.stars)}${'☆'.repeat(5 - item.stars)} — ${item.label}`, 14 + (i * 44), y + 6)
    })

    doc.save('Qualifications_Matrix.pdf')
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="qm-page" onClick={() => setActivePopover(null)}>
        <header className="qm-header">
          <a
            className="qm-back-link"
            href="/production/headcount"
            onClick={(e) => {
              e.preventDefault()
              navigate('/production/headcount')
            }}
          >
            ← {t('qualificationMatrix.backToHeadcount', 'Back to Headcount')}
          </a>
          <h1 className="qm-title">
            {t('qualificationMatrix.title', 'Qualification Matrix')}
          </h1>
          <p className="qm-subtitle">
            {t('qualificationMatrix.subtitle', 'Rate employee skills per qualification (1–5 stars). Click an employee name to access related records.')}
          </p>
        </header>

        {/* Toolbar */}
        <div className="qm-toolbar">
          <div className="qm-toolbar-left">
            <label className="qm-filter-label">
              {t('qualificationMatrix.department', 'Department')}
              <select
                className="qm-filter-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="Assembly">Assembly</option>
                <option value="Engineering">Engineering</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Production">Production</option>
                <option value="Quality">Quality</option>
              </select>
            </label>
          </div>
          <div className="qm-toolbar-right">
            <button type="button" className="qm-btn qm-btn-secondary" onClick={() => setShowAddEmployee(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4, verticalAlign: -2 }}>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Employee
            </button>
            <button type="button" className="qm-btn qm-btn-secondary" onClick={() => setShowAddQual(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4, verticalAlign: -2 }}>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Qualification
            </button>
            <button type="button" className="qm-btn qm-btn-secondary" onClick={() => setShowAddDept(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4, verticalAlign: -2 }}>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Department
            </button>
            <button type="button" className="qm-btn qm-btn-primary" onClick={handleExport}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4, verticalAlign: -2 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="qm-legend">
          {LEGEND.map(({ stars, label }) => (
            <span key={stars} className="qm-legend-item">
              <span className="qm-legend-stars">
                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
              </span>
              <span className="qm-legend-label">{label}</span>
            </span>
          ))}
        </div>

        {/* Matrix table */}
        <div className="qm-table-wrapper">
          <table className="qm-table">
            <thead>
              <tr>
                <th className="qm-th-employee">
                  {t('qualificationMatrix.employee', 'Employee')}
                </th>
                {qualifications.map((q, idx) => (
                  <th key={idx} className="qm-th-qual">
                    <span className="qm-th-qual-text">{q}</span>
                  </th>
                ))}
                <th className="qm-th-avg">
                  {t('qualificationMatrix.avgEmployee', 'Avg')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={qualifications.length + 2} style={{ padding: 0 }}>
                    <EmptyState icon="users" title="No employees found" message="Adjust the filter or add new employees." />
                  </td>
                </tr>
              )}
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="qm-td-employee">
                    <div className="qm-employee-name-wrapper">
                      <button
                        type="button"
                        className="qm-employee-name-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActivePopover(activePopover === emp.id ? null : emp.id)
                        }}
                      >
                        {emp.name}
                      </button>
                      {activePopover === emp.id && (
                        <div className="qm-popover" onClick={(e) => e.stopPropagation()}>
                          <div className="qm-popover-title">{emp.name}</div>
                          <div className="qm-popover-subtitle">{emp.role} · {emp.department}</div>
                          <div className="qm-popover-links">
                            {EMPLOYEE_LINKS.map((link) => (
                              <Link
                                key={link.path}
                                to={link.path}
                                className="qm-popover-link"
                                onClick={() => setActivePopover(null)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="qm-employee-meta">
                      {emp.role} · {emp.department}
                    </div>
                  </td>
                  {qualifications.map((_, qIdx) => (
                    <td key={qIdx} className="qm-td-cell">
                      <StarRating
                        value={getRating(emp.id, qIdx)}
                        onChange={(v) => setRating(emp.id, qIdx, v)}
                      />
                    </td>
                  ))}
                  <td className="qm-td-avg qm-avg-cell">
                    {avgForEmployee(emp.id).toFixed(1)}
                  </td>
                </tr>
              ))}
              <tr className="qm-row-avg">
                <td className="qm-td-employee qm-avg-label">
                  {t('qualificationMatrix.avgQualification', 'Avg')}
                </td>
                {qualifications.map((_, qIdx) => (
                  <td key={qIdx} className="qm-td-avg qm-avg-cell">
                    {avgForQualification(qIdx).toFixed(1)}
                  </td>
                ))}
                <td className="qm-td-avg" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Employee Modal ─────────────────────── */}
      <Modal open={showAddEmployee} onClose={() => setShowAddEmployee(false)} title="Add Employee">
        <div className="qm-form">
          <label className="qm-form-label">
            Full Name *
            <input
              className="qm-form-input"
              value={newEmpName}
              onChange={(e) => setNewEmpName(e.target.value)}
              placeholder="e.g. John Smith"
              autoFocus
            />
          </label>
          <label className="qm-form-label">
            Role / Position
            <input
              className="qm-form-input"
              value={newEmpRole}
              onChange={(e) => setNewEmpRole(e.target.value)}
              placeholder="e.g. CNC Operator"
            />
          </label>
          <label className="qm-form-label">
            Department
            <select
              className="qm-form-input"
              value={newEmpDept}
              onChange={(e) => setNewEmpDept(e.target.value)}
            >
              <option value="">Select department...</option>
              {allDepartments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <div className="qm-form-actions">
            <button type="button" className="qm-btn qm-btn-secondary" onClick={() => setShowAddEmployee(false)}>Cancel</button>
            <button type="button" className="qm-btn qm-btn-primary" onClick={handleAddEmployee} disabled={!newEmpName.trim()}>Add Employee</button>
          </div>
        </div>
      </Modal>

      {/* ── Add Qualification Modal ────────────────── */}
      <Modal open={showAddQual} onClose={() => setShowAddQual(false)} title="Add Qualification">
        <div className="qm-form">
          <label className="qm-form-label">
            Qualification Name *
            <input
              className="qm-form-input"
              value={newQualName}
              onChange={(e) => setNewQualName(e.target.value)}
              placeholder="e.g. Forklift Certification"
              autoFocus
            />
          </label>
          <div className="qm-form-actions">
            <button type="button" className="qm-btn qm-btn-secondary" onClick={() => setShowAddQual(false)}>Cancel</button>
            <button type="button" className="qm-btn qm-btn-primary" onClick={handleAddQualification} disabled={!newQualName.trim()}>Add Qualification</button>
          </div>
        </div>
      </Modal>

      {/* ── Add Department Modal ───────────────────── */}
      <Modal open={showAddDept} onClose={() => setShowAddDept(false)} title="Add Department">
        <div className="qm-form">
          <label className="qm-form-label">
            Department Name *
            <input
              className="qm-form-input"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="e.g. Logistics"
              autoFocus
            />
          </label>
          {allDepartments.length > 0 && (
            <div className="qm-form-hint">
              Existing departments: {allDepartments.join(', ')}
            </div>
          )}
          <div className="qm-form-actions">
            <button type="button" className="qm-btn qm-btn-secondary" onClick={() => setShowAddDept(false)}>Cancel</button>
            <button type="button" className="qm-btn qm-btn-primary" onClick={handleAddDepartment} disabled={!newDeptName.trim()}>Add Department</button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
