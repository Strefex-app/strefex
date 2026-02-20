import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import SupplierRating from '../components/SupplierRating'
import '../styles/app-page.css'
import './IndustryManagementGantt.css'

const IndustryManagementGantt = () => {
  const navigate = useNavigate()
  const { industryId } = useParams()
  const backPath = industryId ? `/industry/${industryId}` : '/main-menu'
  const backLabel = industryId ? `Back to Industry` : 'Back to Home'

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1)
  const highlightedDays = [7, 14, 21, 28]

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href={backPath} onClick={(e) => { e.preventDefault(); navigate(backPath) }}>
            ← {backLabel}
          </a>
          <h2 className="app-page-title">Industry Management</h2>
          <p className="app-page-subtitle">Project & Audit Schedule — Gantt chart, production status, audit calendar.</p>
        </div>

        <div className="app-page-card">
          <div className="dashboard-main gantt-dashboard-main">
            <div className="widget gantt-chart-card">
              <h3 className="widget-title">Project Timeline</h3>
              <div className="gantt-chart">
                <div className="gantt-bar" style={{ width: '30%', backgroundColor: '#4CAF50', left: '10%' }}>
                  <span className="gantt-label">Phase 1</span>
                </div>
                <div className="gantt-bar" style={{ width: '40%', backgroundColor: '#2196F3', left: '45%' }}>
                  <span className="gantt-label">Phase 2</span>
                </div>
                <div className="gantt-bar" style={{ width: '20%', backgroundColor: '#4CAF50', left: '90%' }}>
                  <span className="gantt-label">Phase 3</span>
                </div>
              </div>
              <div className="gantt-timeline">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
              </div>
            </div>

            <div className="widget pie-chart-card">
              <h3 className="widget-title">Status Distribution</h3>
              <div className="pie-chart-container">
                <div
                  className="stx-pie-ring"
                  style={{ background: 'conic-gradient(#FF9800 0% 28%, #2196F3 28% 53%, #9E9E9E 53% 100%)' }}
                  title="Status Distribution"
                />
                <div className="pie-legend">
                  <div className="legend-item"><span className="legend-color" style={{ backgroundColor: '#FF9800' }}></span><span className="legend-label">In Progress 28%</span></div>
                  <div className="legend-item"><span className="legend-color" style={{ backgroundColor: '#2196F3' }}></span><span className="legend-label">Planned 25%</span></div>
                  <div className="legend-item"><span className="legend-color" style={{ backgroundColor: '#9E9E9E' }}></span><span className="legend-label">Not Started 47%</span></div>
                </div>
              </div>
            </div>

            <div className="widget production-status-card">
              <h3 className="widget-title">Production Status</h3>
              <div className="production-content">
                <div className="production-label">Devin</div>
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: '75%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="widget supplier-rating-card">
              <SupplierRating />
            </div>

            <div className="widget audit-schedule-card">
              <h3 className="widget-title">Audit Schedule</h3>
              <div className="calendar-grid">
                {calendarDays.map((day) => (
                  <div key={day} className={`calendar-day ${highlightedDays.includes(day) ? 'highlighted' : ''}`}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="calendar-legend">
                <span className="legend-dot"></span>
                <span className="legend-text">Scheduled Audits</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default IndustryManagementGantt
