import { useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useRfqEquipmentStore } from '../../store/rfqEquipmentStore'
import { downloadRfqDatabase, exportRfqDatabaseJson, exportRfqDatabaseSection } from '../../utils/rfqDatabaseIo'
import RfqCostEditModal, {
  ENERGY_TARIFF_FIELDS,
  MACHINE_FIELDS,
  MATERIAL_FIELDS,
  PERIPHERAL_FIELDS,
  PERSONNEL_REGION_FIELDS,
  PERSONNEL_ROLE_FIELDS,
} from './RfqCostEditModal'

const PILLARS = [
  {
    id: 'material',
    label: 'Material cost',
    desc: 'Grades, density, €/kg, scrap — edit per plant purchase price',
    sections: [{ key: 'materials', label: 'Materials', fields: MATERIAL_FIELDS, upsert: 'upsertMaterial', del: 'deleteMaterial' }],
  },
  {
    id: 'process',
    label: 'Process & equipment',
    desc: 'Machines, peripherals, and energy tariffs by location (manual)',
    sections: [
      { key: 'machines', label: 'Machines', fields: MACHINE_FIELDS, upsert: 'upsertMachine', del: 'deleteMachine' },
      { key: 'peripherals', label: 'Peripherals', fields: PERIPHERAL_FIELDS, upsert: 'upsertPeripheral', del: 'deletePeripheral' },
      { key: 'energyTariffs', label: 'Energy tariffs', fields: ENERGY_TARIFF_FIELDS, upsert: 'upsertEnergyTariff', del: 'deleteEnergyTariff' },
    ],
  },
  {
    id: 'personnel',
    label: 'Personnel cost',
    desc: 'Regional overhead and role rates — set manually per location',
    sections: [
      { key: 'personnelRegions', label: 'Regions', fields: PERSONNEL_REGION_FIELDS, upsert: 'upsertPersonnelRegion', del: 'deletePersonnelRegion' },
      { key: 'personnelRoles', label: 'Roles', fields: PERSONNEL_ROLE_FIELDS, upsert: 'upsertPersonnelRole', del: 'deletePersonnelRole' },
    ],
  },
]

function rowDetail(pillar, sectionKey, row) {
  if (sectionKey === 'materials') return `${row.cat} · €${row.price}/kg · scrap ${row.scrapPct ?? 15}%`
  if (sectionKey === 'machines') return `${row.processId} · €${row.machineRateEUR}/h · ${row.energyKwh ?? 0} kWh/h`
  if (sectionKey === 'peripherals') return `${row.processId} · €${row.rateEUR}/h`
  if (sectionKey === 'energyTariffs') return `${row.region || '—'} · €${row.energyEURkWh}/kWh`
  if (sectionKey === 'personnelRegions') return `${row.region || '—'} · overhead ${row.overheadPct}%`
  if (sectionKey === 'personnelRoles') return `€${row.rateEURh}/h · cycle ${row.cycleShare ?? 0} · setup ${row.setupHours ?? 0}h`
  return ''
}

export default function RfqDatabasePanel() {
  const isAdmin = useAuthStore((s) => s.isAdmin())
  const db = useRfqEquipmentStore((s) => s.exportDatabase())
  const importDatabase = useRfqEquipmentStore((s) => s.importDatabase)
  const resetToSeed = useRfqEquipmentStore((s) => s.resetToSeed)
  const store = useRfqEquipmentStore()

  const fileRef = useRef(null)
  const [pillar, setPillar] = useState('material')
  const [sectionKey, setSectionKey] = useState('materials')
  const [importMode, setImportMode] = useState('merge')
  const [message, setMessage] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [editMeta, setEditMeta] = useState(null)

  const activePillar = PILLARS.find((p) => p.id === pillar) || PILLARS[0]
  const activeSection = activePillar.sections.find((s) => s.key === sectionKey) || activePillar.sections[0]
  const rows = db[activeSection.key] || []

  const openNew = () => {
    setEditMeta(activeSection)
    setEditRow({ id: '', name: '' })
  }

  const openEdit = (row) => {
    setEditMeta(activeSection)
    setEditRow({ ...row })
  }

  const handleSave = (form) => {
    if (!editMeta) return
    store[editMeta.upsert](form)
    setEditRow(null)
    setMessage({ type: 'ok', text: 'Record saved.' })
  }

  const handleDelete = (id) => {
    if (!editMeta || !window.confirm('Delete this record?')) return
    store[editMeta.del](id)
    setEditRow(null)
    setMessage({ type: 'ok', text: 'Record deleted.' })
  }

  const handleExportAll = () => {
    downloadRfqDatabase(db)
    setMessage({ type: 'ok', text: 'Full database exported.' })
  }

  const handleExportSection = () => {
    const blob = new Blob([`\uFEFF${exportRfqDatabaseSection(db, activeSection.key)}`], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rfq-${activeSection.key}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const payload = JSON.parse(await file.text())
      const result = importDatabase(payload, importMode)
      setMessage(
        result?.ok
          ? { type: 'ok', text: `Import complete (${importMode}).` }
          : { type: 'err', text: result?.error || 'Import failed.' },
      )
    } catch {
      setMessage({ type: 'err', text: 'Invalid JSON file.' })
    }
    e.target.value = ''
  }

  return (
    <div className="app-page-card rfqi-database">
      <h3 className="app-page-title">Company rate database</h3>
      <p className="rfqi-muted stx-text-body">
        Material prices, machine rates, energy tariffs, and personnel rates are company-level and fully manual —
        each plant location keeps its own tariffs. Changes apply to RFQ Intelligence estimates and the Manufacturing calculator.
        {' '}
        {isAdmin ? 'Admins can edit rates inline or import/export JSON.' : 'View-only — contact an admin to adjust rates.'}
      </p>

      <div className="rfqi-pillar-tabs">
        {PILLARS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`rfqi-pillar-tab ${pillar === p.id ? 'rfqi-pillar-tab--on' : ''}`}
            onClick={() => {
              setPillar(p.id)
              setSectionKey(p.sections[0].key)
            }}
          >
            <strong>{p.label}</strong>
            <span className="rfqi-muted stx-text-caption">{p.desc}</span>
          </button>
        ))}
      </div>

      <div className="rfqi-chip-group" style={{ marginTop: 12 }}>
        {activePillar.sections.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`rfqi-chip ${sectionKey === s.key ? 'rfqi-chip--on' : ''}`}
            onClick={() => setSectionKey(s.key)}
          >
            {s.label} ({(db[s.key] || []).length})
          </button>
        ))}
      </div>

      <div className="rfqi-db-actions">
        {isAdmin && (
          <button type="button" className="app-page-btn-primary" onClick={openNew}>
            Add {activeSection.label.slice(0, -1).toLowerCase()}
          </button>
        )}
        <button type="button" className="app-page-action" onClick={handleExportSection}>
          Export section
        </button>
        <button type="button" className="app-page-action" onClick={handleExportAll}>
          Export all
        </button>
        {isAdmin && (
          <>
            <button type="button" className="app-page-action" onClick={() => navigator.clipboard?.writeText(exportRfqDatabaseJson(db))}>
              Copy all JSON
            </button>
            <label className="app-page-action rfqi-file-label">
              Import JSON
              <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={handleFile} />
            </label>
            <button
              type="button"
              className="app-page-action"
              onClick={() => {
                if (window.confirm('Reset all cost databases to STREFEX defaults?')) {
                  resetToSeed()
                  setMessage({ type: 'ok', text: 'Reset to defaults.' })
                }
              }}
            >
              Reset defaults
            </button>
          </>
        )}
      </div>

      {isAdmin && (
        <div className="rfqi-form-grid" style={{ marginTop: 12, maxWidth: 420 }}>
          <div>
            <div className="rfqi-label">Import mode</div>
            <select className="rfqi-inp" value={importMode} onChange={(e) => setImportMode(e.target.value)}>
              <option value="merge">Merge — update matching IDs</option>
              <option value="replace">Replace — overwrite from file</option>
            </select>
          </div>
        </div>
      )}

      {message && (
        <p className={message.type === 'ok' ? 'rfqi-db-msg rfqi-db-msg--ok' : 'rfqi-db-msg rfqi-db-msg--err'}>
          {message.text}
        </p>
      )}

      <div className="rfqi-db-table-wrap">
        <table className="rfqi-db-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Details</th>
              {isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="stx-text-caption">{row.id}</td>
                <td>{row.name}</td>
                <td className="rfqi-muted stx-text-caption">{rowDetail(pillar, activeSection.key, row)}</td>
                {isAdmin && (
                  <td>
                    <button type="button" className="pcc-fact-link" onClick={() => openEdit(row)}>
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="rfqi-muted">No records in this section.</p>}
      </div>

      <RfqCostEditModal
        open={!!editRow}
        title={editRow?.id ? `Edit ${activeSection.label}` : `New ${activeSection.label.slice(0, -1)}`}
        fields={editMeta?.fields || []}
        initial={editRow}
        onSave={handleSave}
        onClose={() => setEditRow(null)}
        onDelete={editRow?.id ? handleDelete : null}
      />
    </div>
  )
}
