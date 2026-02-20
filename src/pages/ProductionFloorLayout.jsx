import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './ProductionFloorLayout.css'

const ProductionFloorLayout = () => {
  const navigate = useNavigate()
  const {
    equipment,
    floorLayout,
    equipmentTypes,
    updateEquipmentPosition,
    updateEquipmentStatus,
    addEquipment,
    removeEquipment,
  } = useProductionStore()

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const canvasRef = useRef(null)

  const [newEquipment, setNewEquipment] = useState({
    name: '',
    type: 'CNC Machining Center',
    status: 'idle',
    x: 100,
    y: 100,
    width: 100,
    height: 80,
  })

  // Handle zoom
  const handleZoom = (delta) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 2))
  }

  // Handle equipment drag start
  const handleDragStart = (e, eq) => {
    if (!editMode) return
    e.stopPropagation()
    setDragging(eq.id)
    const rect = canvasRef.current.getBoundingClientRect()
    setDragStart({
      x: (e.clientX - rect.left) / scale - eq.x,
      y: (e.clientY - rect.top) / scale - eq.y,
    })
  }

  // Handle mouse move for dragging
  const handleMouseMove = useCallback((e) => {
    if (!dragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min((e.clientX - rect.left) / scale - dragStart.x, floorLayout.width - 50))
    const newY = Math.max(0, Math.min((e.clientY - rect.top) / scale - dragStart.y, floorLayout.height - 50))
    updateEquipmentPosition(dragging, Math.round(newX), Math.round(newY))
  }, [dragging, dragStart, scale, floorLayout, updateEquipmentPosition])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  // Add event listeners
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return '#27ae60'
      case 'idle': return '#f1c40f'
      case 'maintenance': return '#3498db'
      default: return '#95a5a6'
    }
  }

  // Handle add equipment
  const handleAddEquipment = (e) => {
    e.preventDefault()
    const typeConfig = equipmentTypes[newEquipment.type]
    addEquipment({
      ...newEquipment,
      lastMaintenance: new Date().toISOString().split('T')[0],
      width: Math.max(newEquipment.width, typeConfig?.minWidth || 60),
      height: Math.max(newEquipment.height, typeConfig?.minHeight || 60),
      rotation: 0,
    })
    setShowAddModal(false)
    setNewEquipment({
      name: '',
      type: 'CNC Machining Center',
      status: 'idle',
      x: 100,
      y: 100,
      width: 100,
      height: 80,
    })
  }

  // Render equipment icon based on type
  const renderEquipmentShape = (eq, typeConfig) => {
    const baseColor = typeConfig?.color || '#666'
    const statusColor = getStatusColor(eq.status)
    
    switch (eq.type) {
      case 'CNC Machining Center':
        return (
          <g>
            {/* Machine body */}
            <rect x="5" y="10" width={eq.width - 10} height={eq.height - 20} rx="4" fill={baseColor} opacity="0.9" />
            {/* Control panel */}
            <rect x="10" y="15" width="30" height="20" rx="2" fill="#fff" opacity="0.3" />
            {/* Spindle area */}
            <circle cx={eq.width / 2 + 10} cy={eq.height / 2} r="15" fill="#333" opacity="0.5" />
            <circle cx={eq.width / 2 + 10} cy={eq.height / 2} r="8" fill="#555" />
            {/* Status indicator */}
            <circle cx={eq.width - 15} cy="20" r="6" fill={statusColor} />
          </g>
        )
      case 'Assembly':
        return (
          <g>
            {/* Conveyor belt */}
            <rect x="0" y="10" width={eq.width} height={eq.height - 20} rx="3" fill={baseColor} opacity="0.85" />
            {/* Belt segments */}
            {Array.from({ length: Math.floor(eq.width / 30) }).map((_, i) => (
              <rect key={i} x={10 + i * 30} y="15" width="20" height={eq.height - 30} fill="#fff" opacity="0.2" rx="2" />
            ))}
            {/* Status light */}
            <circle cx={eq.width - 20} cy={eq.height / 2} r="8" fill={statusColor} />
          </g>
        )
      case 'Injection Molding':
        return (
          <g>
            {/* Press base */}
            <rect x="5" y="20" width={eq.width - 10} height={eq.height - 30} rx="6" fill={baseColor} opacity="0.9" />
            {/* Hydraulic cylinder */}
            <rect x="15" y="5" width={eq.width / 3} height="20" rx="3" fill="#555" />
            {/* Mold area */}
            <rect x={eq.width / 2 - 20} y="30" width="40" height={eq.height - 50} fill="#333" opacity="0.5" />
            {/* Control panel */}
            <rect x={eq.width - 40} y="30" width="25" height="30" rx="2" fill="#222" />
            {/* Status indicator */}
            <circle cx={eq.width - 15} cy="15" r="8" fill={statusColor} />
          </g>
        )
      case 'Inspection':
        return (
          <g>
            {/* Inspection table */}
            <rect x="5" y="10" width={eq.width - 10} height={eq.height - 15} rx="4" fill={baseColor} opacity="0.85" />
            {/* Measuring equipment */}
            <rect x={eq.width / 2 - 15} y="5" width="30" height="15" rx="2" fill="#333" />
            {/* Light ring */}
            <circle cx={eq.width / 2} cy={eq.height / 2 + 5} r="20" fill="none" stroke="#fff" strokeWidth="3" opacity="0.4" />
            {/* Status */}
            <circle cx={eq.width - 12} cy="18" r="5" fill={statusColor} />
          </g>
        )
      case 'Packaging':
        return (
          <g>
            {/* Packaging machine body */}
            <rect x="5" y="10" width={eq.width - 10} height={eq.height - 15} rx="5" fill={baseColor} opacity="0.85" />
            {/* Conveyor input */}
            <rect x="0" y={eq.height / 2 - 8} width="15" height="16" fill="#666" />
            {/* Box output area */}
            <rect x={eq.width / 4} y="20" width={eq.width / 2} height={eq.height - 40} rx="3" fill="#8d6e63" opacity="0.5" />
            {/* Status */}
            <circle cx={eq.width - 12} cy="18" r="5" fill={statusColor} />
          </g>
        )
      case 'Storage':
        return (
          <g>
            {/* Storage rack */}
            <rect x="2" y="5" width={eq.width - 4} height={eq.height - 10} rx="2" fill={baseColor} opacity="0.7" />
            {/* Shelf lines */}
            {Array.from({ length: 3 }).map((_, i) => (
              <line key={i} x1="5" y1={15 + i * (eq.height / 4)} x2={eq.width - 5} y2={15 + i * (eq.height / 4)} stroke="#fff" strokeWidth="2" opacity="0.3" />
            ))}
            {/* Pallet boxes */}
            {Array.from({ length: Math.min(6, Math.floor((eq.width - 20) / 30)) }).map((_, i) => (
              <rect key={i} x={10 + i * 32} y={eq.height - 25} width="25" height="15" rx="2" fill="#a1887f" opacity="0.6" />
            ))}
          </g>
        )
      default:
        return (
          <rect x="2" y="2" width={eq.width - 4} height={eq.height - 4} rx="4" fill={baseColor} opacity="0.8" />
        )
    }
  }

  const runningCount = equipment.filter(e => e.status === 'running').length
  const idleCount = equipment.filter(e => e.status === 'idle').length
  const maintenanceCount = equipment.filter(e => e.status === 'maintenance').length

  return (
    <AppLayout>
      <div className="floor-page">
        <div className="floor-header">
          <button type="button" className="floor-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="floor-header-content">
            <div>
              <h1 className="floor-title">Production Floor Layout</h1>
              <p className="floor-subtitle">{floorLayout.name} • {equipment.length} Equipment Units</p>
            </div>
            <div className="floor-header-actions">
              <button
                type="button"
                className={`edit-mode-btn ${editMode ? 'active' : ''}`}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? '✓ Edit Mode ON' : 'Edit Layout'}
              </button>
              {editMode && (
                <button type="button" className="add-equipment-btn" onClick={() => setShowAddModal(true)}>
                  + Add Equipment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="floor-status-bar">
          <div className="status-item">
            <span className="status-dot running" />
            <span className="status-count">{runningCount}</span>
            <span className="status-label">Running</span>
          </div>
          <div className="status-item">
            <span className="status-dot idle" />
            <span className="status-count">{idleCount}</span>
            <span className="status-label">Idle</span>
          </div>
          <div className="status-item">
            <span className="status-dot maintenance" />
            <span className="status-count">{maintenanceCount}</span>
            <span className="status-label">Maintenance</span>
          </div>
          <div className="zoom-controls">
            <button type="button" onClick={() => handleZoom(-0.1)}>−</button>
            <span>{Math.round(scale * 100)}%</span>
            <button type="button" onClick={() => handleZoom(0.1)}>+</button>
          </div>
        </div>

        <div className="floor-content">
          {/* Floor Plan Canvas */}
          <div className="floor-canvas-container">
            <svg
              ref={canvasRef}
              className="floor-canvas"
              viewBox={`0 0 ${floorLayout.width} ${floorLayout.height}`}
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            >
              {/* Building background */}
              <rect x="0" y="0" width={floorLayout.width} height={floorLayout.height} fill="#f5f5f5" />
              
              {/* Floor areas/zones */}
              {floorLayout.areas.map((area) => (
                <g key={area.id}>
                  <rect
                    x={area.x}
                    y={area.y}
                    width={area.width}
                    height={area.height}
                    fill={area.color}
                    stroke="#ddd"
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x={area.x + area.width / 2}
                    y={area.y + 15}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#666"
                    fontWeight="500"
                  >
                    {area.name}
                  </text>
                </g>
              ))}

              {/* Walls */}
              {floorLayout.walls.map((wall, i) => (
                <line
                  key={i}
                  x1={wall.x1}
                  y1={wall.y1}
                  x2={wall.x2}
                  y2={wall.y2}
                  stroke="#333"
                  strokeWidth="8"
                />
              ))}

              {/* Columns */}
              {floorLayout.columns.map((col, i) => (
                <g key={i}>
                  <rect x={col.x - 10} y={col.y - 10} width="20" height="20" fill="#9e9e9e" />
                  <rect x={col.x - 8} y={col.y - 8} width="16" height="16" fill="#bdbdbd" />
                </g>
              ))}

              {/* Doors */}
              {floorLayout.doors.map((door, i) => (
                <g key={i}>
                  <rect
                    x={door.x}
                    y={door.y}
                    width={door.width}
                    height={door.height}
                    fill={door.type === 'entrance' ? '#4caf50' : door.type === 'exit' ? '#f44336' : '#2196f3'}
                  />
                  <text
                    x={door.x + (door.width > door.height ? door.width / 2 : -5)}
                    y={door.y + (door.width > door.height ? -5 : door.height / 2)}
                    textAnchor={door.width > door.height ? 'middle' : 'end'}
                    fontSize="8"
                    fill="#666"
                  >
                    {door.label}
                  </text>
                </g>
              ))}

              {/* Equipment */}
              {equipment.map((eq) => {
                const typeConfig = equipmentTypes[eq.type]
                return (
                  <g
                    key={eq.id}
                    transform={`translate(${eq.x}, ${eq.y}) rotate(${eq.rotation || 0}, ${eq.width / 2}, ${eq.height / 2})`}
                    className={`equipment-item ${editMode ? 'draggable' : ''} ${dragging === eq.id ? 'dragging' : ''} ${selectedEquipment?.id === eq.id ? 'selected' : ''}`}
                    onMouseDown={(e) => handleDragStart(e, eq)}
                    onClick={() => setSelectedEquipment(eq)}
                    style={{ cursor: editMode ? 'move' : 'pointer' }}
                  >
                    {/* Equipment shape */}
                    {renderEquipmentShape(eq, typeConfig)}
                    
                    {/* Equipment label */}
                    <text
                      x={eq.width / 2}
                      y={eq.height + 12}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#333"
                      fontWeight="500"
                    >
                      {eq.name}
                    </text>

                    {/* Selection highlight */}
                    {selectedEquipment?.id === eq.id && (
                      <rect
                        x="-3"
                        y="-3"
                        width={eq.width + 6}
                        height={eq.height + 6}
                        fill="none"
                        stroke="#000888"
                        strokeWidth="2"
                        strokeDasharray="4"
                        rx="4"
                      />
                    )}
                  </g>
                )
              })}

              {/* Scale indicator */}
              <g transform={`translate(${floorLayout.width - 100}, ${floorLayout.height - 25})`}>
                <line x1="0" y1="0" x2="80" y2="0" stroke="#666" strokeWidth="2" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="#666" strokeWidth="2" />
                <line x1="80" y1="-5" x2="80" y2="5" stroke="#666" strokeWidth="2" />
                <text x="40" y="12" textAnchor="middle" fontSize="10" fill="#666">10m</text>
              </g>

              {/* Legend */}
              <g transform={`translate(30, ${floorLayout.height - 35})`}>
                <circle cx="0" cy="0" r="5" fill="#27ae60" />
                <text x="10" y="4" fontSize="9" fill="#666">Running</text>
                <circle cx="60" cy="0" r="5" fill="#f1c40f" />
                <text x="70" y="4" fontSize="9" fill="#666">Idle</text>
                <circle cx="110" cy="0" r="5" fill="#3498db" />
                <text x="120" y="4" fontSize="9" fill="#666">Maintenance</text>
              </g>
            </svg>
          </div>

          {/* Equipment Details Panel */}
          {selectedEquipment && (
            <div className="equipment-detail-panel">
              <div className="panel-header">
                <h3>Equipment Details</h3>
                <button type="button" className="panel-close" onClick={() => setSelectedEquipment(null)}>×</button>
              </div>
              <div className="panel-content">
                <div className="detail-row">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{selectedEquipment.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{selectedEquipment.type}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={`status-badge ${selectedEquipment.status}`}>
                    {selectedEquipment.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Maintenance</span>
                  <span className="detail-value">{selectedEquipment.lastMaintenance}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Position</span>
                  <span className="detail-value">X: {selectedEquipment.x}, Y: {selectedEquipment.y}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Size</span>
                  <span className="detail-value">{selectedEquipment.width} × {selectedEquipment.height}</span>
                </div>

                {editMode && (
                  <>
                    <div className="panel-section">
                      <h4>Change Status</h4>
                      <div className="status-buttons">
                        {['running', 'idle', 'maintenance'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`status-btn ${status} ${selectedEquipment.status === status ? 'active' : ''}`}
                            onClick={() => {
                              updateEquipmentStatus(selectedEquipment.id, status)
                              setSelectedEquipment({ ...selectedEquipment, status })
                            }}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="delete-equipment-btn"
                      onClick={() => {
                        removeEquipment(selectedEquipment.id)
                        setSelectedEquipment(null)
                      }}
                    >
                      Delete Equipment
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Equipment Modal */}
        {showAddModal && (
          <div className="floor-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="floor-modal" onClick={(e) => e.stopPropagation()}>
              <div className="floor-modal-header">
                <h3>Add New Equipment</h3>
                <button type="button" className="floor-modal-close" onClick={() => setShowAddModal(false)}>×</button>
              </div>
              <form onSubmit={handleAddEquipment} className="floor-modal-form">
                <div className="form-group">
                  <label>Equipment Name</label>
                  <input
                    type="text"
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                    placeholder="e.g., CNC Machine 3"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={newEquipment.type}
                    onChange={(e) => setNewEquipment({ ...newEquipment, type: e.target.value })}
                  >
                    {Object.keys(equipmentTypes).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Status</label>
                  <select
                    value={newEquipment.status}
                    onChange={(e) => setNewEquipment({ ...newEquipment, status: e.target.value })}
                  >
                    <option value="running">Running</option>
                    <option value="idle">Idle</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Width</label>
                    <input
                      type="number"
                      value={newEquipment.width}
                      onChange={(e) => setNewEquipment({ ...newEquipment, width: parseInt(e.target.value) || 100 })}
                      min="50"
                      max="400"
                    />
                  </div>
                  <div className="form-group">
                    <label>Height</label>
                    <input
                      type="number"
                      value={newEquipment.height}
                      onChange={(e) => setNewEquipment({ ...newEquipment, height: parseInt(e.target.value) || 80 })}
                      min="40"
                      max="300"
                    />
                  </div>
                </div>
                <div className="floor-modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit">Add Equipment</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit mode instructions */}
        {editMode && (
          <div className="edit-instructions">
            <strong>Edit Mode:</strong> Drag equipment to reposition. Click to select and modify status or delete.
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ProductionFloorLayout
