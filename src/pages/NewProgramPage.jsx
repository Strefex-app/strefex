import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useProgramStore } from '../store/programStore'
import ProjectControlPlaybook from '../components/pm/ProjectControlPlaybook'
import '../styles/app-page.css'
import '../styles/projectControl.css'

export default function NewProgramPage() {
  const navigate = useNavigate()
  const addProgram = useProgramStore((s) => s.addProgram)
  const previewNumber = useProgramStore((s) => s.allocateNextProgramNumber())

  const [name, setName] = useState('')
  const [sponsor, setSponsor] = useState('')
  const [budgetTarget, setBudgetTarget] = useState('')
  const [currency, setCurrency] = useState('USD')

  const handleCreate = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = addProgram({
      name: name.trim(),
      sponsor: sponsor.trim(),
      programNumber: previewNumber,
      budgetTarget: budgetTarget ? Number(budgetTarget) : null,
      currency,
    })
    navigate(`/project-management/program/${id}`)
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a
            className="app-page-back-link"
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/management') }}
          >
            ← Management
          </a>
          <h1 className="app-page-title">New program</h1>
          <p className="app-page-subtitle">Step 2 of 2 — confirm program number and identity</p>

          <ProjectControlPlaybook />

          <form onSubmit={handleCreate}>
            <div className="pcc-form-row">
              <label>Program number (assigned)</label>
              <input type="text" value={previewNumber} readOnly />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="pgm-name">Program name *</label>
              <input
                id="pgm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="pgm-sponsor">Sponsor</label>
              <input id="pgm-sponsor" value={sponsor} onChange={(e) => setSponsor(e.target.value)} />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="pgm-budget">Optional program budget target</label>
              <input
                id="pgm-budget"
                type="number"
                min="0"
                value={budgetTarget}
                onChange={(e) => setBudgetTarget(e.target.value)}
              />
            </div>
            <div className="pcc-form-row">
              <label htmlFor="pgm-currency">Currency</label>
              <select id="pgm-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="pcc-toolbar-row">
              <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="app-page-btn-primary app-page-btn-sm">Create program</button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
