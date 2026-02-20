import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import './EnterpriseCostPage.css'

const EnterpriseCostPage = ({
  title,
  subtitle,
  costType,
  costs,
  columns,
  onAdd,
  onUpdate,
  onDelete,
  totalLabel = 'Total Monthly Cost',
  calculateTotal,
  addFormFields,
  color = '#3498db',
}) => {
  const navigate = useNavigate()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({})

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const total = calculateTotal ? calculateTotal(costs) : costs.reduce((sum, c) => sum + (c.amount || 0), 0)

  const handleAdd = () => {
    const initialData = {}
    addFormFields.forEach(field => {
      initialData[field.key] = field.default || ''
    })
    setFormData(initialData)
    setShowAddModal(true)
  }

  const handleEdit = (cost) => {
    setFormData({ ...cost })
    setEditingId(cost.id)
    setShowAddModal(true)
  }

  const handleSave = () => {
    if (editingId) {
      onUpdate(editingId, formData)
    } else {
      onAdd(formData)
    }
    setShowAddModal(false)
    setEditingId(null)
    setFormData({})
  }

  const handleCancel = () => {
    setShowAddModal(false)
    setEditingId(null)
    setFormData({})
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this cost item?')) {
      onDelete(id)
    }
  }

  const renderCellValue = (cost, column) => {
    const value = cost[column.key]
    if (column.format === 'currency') {
      return formatCurrency(value || 0)
    }
    if (column.format === 'percent') {
      return `${value || 0}%`
    }
    if (column.render) {
      return column.render(value, cost)
    }
    return value || '-'
  }

  return (
    <AppLayout>
      <div className="enterprise-cost-page">
        {/* Header */}
        <div className="cost-page-header">
          <a 
            className="cost-page-back-link" 
            href="/enterprise" 
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            ← Back
          </a>
          <div className="cost-page-header-row">
            <div>
              <h1 className="cost-page-title" style={{ color }}>{title}</h1>
              <p className="cost-page-subtitle">{subtitle}</p>
            </div>
            <button 
              type="button" 
              className="cost-page-add-btn"
              onClick={handleAdd}
              style={{ background: color }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add {costType}
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="cost-page-summary" style={{ borderLeftColor: color }}>
          <div className="summary-stat">
            <span className="summary-stat-label">Total Items</span>
            <span className="summary-stat-value">{costs.length}</span>
          </div>
          <div className="summary-stat">
            <span className="summary-stat-label">{totalLabel}</span>
            <span className="summary-stat-value highlight" style={{ color }}>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Costs Table */}
        <div className="cost-page-card">
          <div className="cost-table-wrapper">
            <table className="cost-table">
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col.key} style={col.width ? { width: col.width } : undefined}>{col.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {costs.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="empty-state">
                      No {costType.toLowerCase()} items added yet. Click "Add {costType}" to create one.
                    </td>
                  </tr>
                ) : (
                  costs.map(cost => (
                    <tr key={cost.id}>
                      {columns.map(col => (
                        <td key={col.key} className={col.className || ''}>
                          {renderCellValue(cost, col)}
                        </td>
                      ))}
                      <td className="actions-cell">
                        <button 
                          type="button" 
                          className="action-btn edit"
                          onClick={() => handleEdit(cost)}
                        >
                          Edit
                        </button>
                        <button 
                          type="button" 
                          className="action-btn delete"
                          onClick={() => handleDelete(cost.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {costs.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={columns.length - 1}><strong>Total</strong></td>
                    <td className="cost-cell"><strong>{formatCurrency(total)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="cost-modal-overlay" onClick={handleCancel}>
            <div className="cost-modal" onClick={e => e.stopPropagation()}>
              <div className="cost-modal-header" style={{ borderBottomColor: color }}>
                <h3>{editingId ? 'Edit' : 'Add'} {costType}</h3>
                <button type="button" className="modal-close" onClick={handleCancel}>×</button>
              </div>
              <div className="cost-modal-body">
                {addFormFields.map(field => (
                  <div key={field.key} className="modal-form-group">
                    <label>{field.label} {field.required && '*'}</label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          [field.key]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value 
                        })}
                        placeholder={field.placeholder}
                        step={field.step}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="cost-modal-footer">
                <button type="button" className="modal-btn secondary" onClick={handleCancel}>Cancel</button>
                <button 
                  type="button" 
                  className="modal-btn primary" 
                  onClick={handleSave}
                  style={{ background: color }}
                >
                  {editingId ? 'Save Changes' : `Add ${costType}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default EnterpriseCostPage
