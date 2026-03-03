import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useAuthStore } from '../store/authStore'
import useAuditStore from '../store/auditStore'
import { getCompanyContext } from '../utils/companyGuard'
import './ERPIntegrations.css'

const INTEGRATIONS = [
  {
    id: 'sap',
    name: 'SAP S/4HANA',
    icon: 'erp',
    color: '#192A56',
    description: 'Starter connector template. Replace with your production ERP endpoint and credentials.',
    status: 'pending',
    lastSync: '',
    syncFreq: 'Manual',
    modules: ['Vendor Master', 'Purchase Orders', 'Invoice Verification'],
    config: { host: 'erp.example.com', client: '100', protocol: 'API' },
  },
]

const WEBHOOKS = [
  {
    id: 'wh-1',
    name: 'ERP Sync Webhook',
    url: 'https://api.example.com/webhooks/erp-sync',
    events: ['po.approved'],
    status: 'paused',
    lastTriggered: '',
  },
]

const STATUS_META = {
  connected: { label: 'Connected', color: '#27ae60', bg: 'rgba(46,204,113,.1)' },
  disconnected: { label: 'Disconnected', color: '#95a5a6', bg: 'rgba(149,165,166,.1)' },
  pending: { label: 'Pending Setup', color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  error: { label: 'Error', color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function ERPIntegrations() {
  const navigate = useNavigate()
  const addLog = useAuditStore((s) => s.addLog)
  const [tab, setTab] = useState('connectors')
  const [selectedInt, setSelectedInt] = useState(null)
  const [integrationStates, setIntegrationStates] = useState({})
  const [feedback, setFeedback] = useState(null)

  const flash = (msg) => { setFeedback({ text: msg, type: 'success' }); setTimeout(() => setFeedback(null), 3000) }

  const getStatus = (int) => integrationStates[int.id]?.status || int.status

  const toggleConnection = (int) => {
    const current = getStatus(int)
    const newStatus = current === 'connected' ? 'disconnected' : 'connected'
    setIntegrationStates((prev) => ({ ...prev, [int.id]: { ...prev[int.id], status: newStatus, lastSync: newStatus === 'connected' ? new Date().toISOString() : '' } }))
    addLog({ user: 'Admin', role: 'admin', module: 'erp', action: newStatus === 'connected' ? 'connect_erp' : 'disconnect_erp', entity: int.id, description: `${newStatus === 'connected' ? 'Connected' : 'Disconnected'} ${int.name} integration` })
    flash(`${int.name} ${newStatus}`)
  }

  const triggerSync = (int) => {
    setIntegrationStates((prev) => ({ ...prev, [int.id]: { ...prev[int.id], lastSync: new Date().toISOString() } }))
    addLog({ user: 'Admin', role: 'admin', module: 'erp', action: 'manual_sync', entity: int.id, description: `Manual sync triggered for ${int.name}` })
    flash(`Syncing ${int.name}...`)
  }

  return (
    <AppLayout>
      <div className="erp-page">
        {feedback && <div className="erp-feedback">{feedback.text}</div>}

        <div className="erp-header">
          <div>
            <button className="erp-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="erp-title">ERP & API Integrations</h1>
            <p className="erp-subtitle">Connect external systems — SAP, QuickBooks, Oracle & more</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="erp-kpis">
          <div className="erp-kpi"><span className="erp-kpi-n">{INTEGRATIONS.length}</span>Available</div>
          <div className="erp-kpi"><span className="erp-kpi-n" style={{ color: '#27ae60' }}>{INTEGRATIONS.filter((i) => getStatus(i) === 'connected').length}</span>Connected</div>
          <div className="erp-kpi"><span className="erp-kpi-n" style={{ color: '#e67e22' }}>{INTEGRATIONS.filter((i) => getStatus(i) === 'pending').length}</span>Pending</div>
          <div className="erp-kpi"><span className="erp-kpi-n">{WEBHOOKS.length}</span>Webhooks</div>
          <div className="erp-kpi"><span className="erp-kpi-n" style={{ color: '#27ae60' }}>{WEBHOOKS.filter((w) => w.status === 'active').length}</span>Active Hooks</div>
        </div>

        {/* Tabs */}
        <div className="erp-tabs">
          {[{ id: 'connectors', label: 'ERP Connectors' }, { id: 'webhooks', label: 'Webhooks & API' }, { id: 'sync-log', label: 'Sync History' }].map((t) => (
            <button key={t.id} className={`erp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Connectors */}
        {tab === 'connectors' && (
          <div className="erp-grid">
            {INTEGRATIONS.map((int) => {
              const st = getStatus(int)
              const sm = STATUS_META[st] || STATUS_META.disconnected
              const isExpanded = selectedInt === int.id
              return (
                <div key={int.id} className="erp-card" onClick={() => setSelectedInt(isExpanded ? null : int.id)}>
                  <div className="erp-card-header">
                    <span className="erp-card-icon"><Icon name={int.icon} size={24} color={int.color} /></span>
                    <div>
                      <h4 className="erp-card-name">{int.name}</h4>
                      <span className="erp-card-status" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                    </div>
                  </div>
                  <p className="erp-card-desc">{int.description}</p>
                  <div className="erp-card-modules">
                    {int.modules.map((m) => <span key={m} className="erp-module-chip">{m}</span>)}
                  </div>
                  {st === 'connected' && (
                    <div className="erp-card-sync">
                      <span>Last sync: {fmtDate(integrationStates[int.id]?.lastSync || int.lastSync)}</span>
                      <span>Frequency: {int.syncFreq}</span>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="erp-card-expanded">
                      {Object.keys(int.config).length > 0 && (
                        <div className="erp-config">
                          <h5>Configuration</h5>
                          {Object.entries(int.config).map(([k, v]) => (
                            <div key={k} className="erp-config-row"><span>{k}:</span><code>{v}</code></div>
                          ))}
                        </div>
                      )}
                      <div className="erp-card-actions">
                        <button className={`erp-btn ${st === 'connected' ? 'danger' : 'primary'}`} onClick={(e) => { e.stopPropagation(); toggleConnection(int) }}>
                          {st === 'connected' ? 'Disconnect' : 'Connect'}
                        </button>
                        {st === 'connected' && (
                          <button className="erp-btn blue" onClick={(e) => { e.stopPropagation(); triggerSync(int) }}>Sync Now</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Webhooks */}
        {tab === 'webhooks' && (
          <div className="erp-card-full">
            <h4>Webhook Endpoints</h4>
            <div className="erp-webhook-list">
              {WEBHOOKS.map((wh) => (
                <div key={wh.id} className="erp-webhook-row">
                  <div className="erp-wh-header">
                    <span className={`erp-wh-dot ${wh.status}`} />
                    <strong>{wh.name}</strong>
                    <span className={`erp-wh-status ${wh.status}`}>{wh.status}</span>
                  </div>
                  <div className="erp-wh-url"><code>{wh.url}</code></div>
                  <div className="erp-wh-events">{wh.events.map((e) => <span key={e} className="erp-event-chip">{e}</span>)}</div>
                  {wh.lastTriggered && <span className="erp-wh-last">Last triggered: {fmtDate(wh.lastTriggered)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Log */}
        {tab === 'sync-log' && (
          <div className="erp-card-full">
            <h4>Recent Sync Activity</h4>
            <div className="erp-sync-log">
              {[
                { time: new Date().toISOString(), system: 'SAP S/4HANA', action: 'Starter sync template', records: 0, status: 'success' },
              ].map((log, i) => (
                <div key={i} className="erp-sync-row">
                  <span className={`erp-sync-dot ${log.status}`} />
                  <span className="erp-sync-time">{fmtDate(log.time)}</span>
                  <span className="erp-sync-system">{log.system}</span>
                  <span className="erp-sync-action">{log.action}</span>
                  <span className="erp-sync-records">{log.records} records</span>
                  <span className={`erp-sync-status ${log.status}`}>{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
