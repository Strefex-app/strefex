import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useProjectStore } from '../store/projectStore'
import '../styles/app-page.css'
import './ProjectDetail.css'

const ProjectDetail = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { getProjectById, addTask, updateTask, deleteTask } = useProjectStore()
  const project = getProjectById(projectId)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editProgress, setEditProgress] = useState(0)

  if (!project) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
              ← Back
            </a>
            <p className="app-page-body">Project not found.</p>
            <button type="button" className="app-page-action" style={{ maxWidth: 200 }} onClick={() => navigate('/project-management')}>
              Back to Summary
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const tasks = project.tasks || []
  const flatTasks = tasks.flatMap((t) => (t.children ? [t, ...t.children] : [t]))

  const handleAddTask = () => {
    if (!newTaskName.trim()) return
    addTask(projectId, {
      name: newTaskName.trim(),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      progressPercent: 0,
      status: 'not-started',
    })
    setNewTaskName('')
    setShowAddTask(false)
  }

  const handleUpdateProgress = (taskId) => {
    updateTask(projectId, taskId, { progressPercent: editProgress })
    setEditingId(null)
  }

  const handleDelete = (taskId) => {
    if (window.confirm('Delete this task?')) deleteTask(projectId, taskId)
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'complete': return 'Complete'
      case 'in-progress': return 'In progress'
      default: return 'Not started'
    }
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h2 className="app-page-title">{project.name}</h2>
          <p className="app-page-subtitle">Manage tasks and track status. Add unlimited tasks.</p>

          <div className="project-detail-actions">
            <button type="button" className="project-detail-btn-add" onClick={() => setShowAddTask(true)}>
              <span>+</span> Add Task
            </button>
            <button type="button" className="app-page-action" style={{ maxWidth: 160 }} onClick={() => navigate('/project-management')}>
              View Summary
            </button>
          </div>
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ marginBottom: 16 }}>Tasks</h3>
          <div className="project-detail-task-list">
            {flatTasks.length === 0 ? (
              <p className="project-detail-no-tasks">No tasks yet. Click &quot;+ Add Task&quot; to create one.</p>
            ) : (
              flatTasks.map((task) => (
                <div key={task.id} className="project-detail-task-row">
                  <div className="project-detail-task-info">
                    <span className="project-detail-task-name">{task.name}</span>
                    <span className="project-detail-task-status">{getStatusLabel(task.status)}</span>
                    <span className="project-detail-task-ratio">{task.progressPercent}%</span>
                  </div>
                  <div className="project-detail-progress-bar">
                    <div
                      className="project-detail-progress-fill"
                      style={{
                        width: (task.progressPercent || 0) + '%',
                        backgroundColor: task.progressPercent >= 100 ? '#4CAF50' : '#2196F3',
                      }}
                    />
                  </div>
                  {editingId === task.id ? (
                    <div className="project-detail-edit-inline">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={editProgress}
                        onChange={(e) => setEditProgress(Number(e.target.value))}
                      />
                      <span>{editProgress}%</span>
                      <button type="button" onClick={() => handleUpdateProgress(task.id)}>Save</button>
                      <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="project-detail-task-actions">
                      <button type="button" className="project-detail-btn-small" onClick={() => { setEditingId(task.id); setEditProgress(task.progressPercent || 0); }}>Edit %</button>
                      <button type="button" className="project-detail-btn-small project-detail-btn-delete" onClick={() => handleDelete(task.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddTask && (
        <div className="project-detail-modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="project-detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="app-page-title">Add Task</h3>
            <label className="project-detail-modal-label">Task name</label>
            <input
              type="text"
              className="project-detail-modal-input"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="New task"
            />
            <div className="project-detail-modal-buttons">
              <button type="button" className="app-page-action" style={{ flex: 1 }} onClick={() => setShowAddTask(false)}>Cancel</button>
              <button type="button" className="project-detail-btn-save" onClick={handleAddTask}>Add Task</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default ProjectDetail
