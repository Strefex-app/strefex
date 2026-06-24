import { resolveProcessRates } from '../../utils/rfqEquipmentCost'
import { RFQI_PROCESSES } from '../../data/rfqIntelligenceCalc'

export default function RfqProcessSelector({
  processId,
  machineId,
  peripheralIds = [],
  energyTariffId,
  machines = [],
  peripherals = [],
  energyTariffs = [],
  onMachineChange,
  onPeripheralToggle,
  onEnergyTariffChange,
}) {
  const process = RFQI_PROCESSES[processId]
  const machine = machines.find((m) => m.id === machineId) || null
  const energyTariff = energyTariffs.find((t) => t.id === energyTariffId) || null
  const selectedPeripherals = peripherals.filter((p) => peripheralIds.includes(p.id))
  const rates = resolveProcessRates({ machine, peripherals: selectedPeripherals, energyTariff, process })

  return (
    <div className="rfqi-equipment">
      <div className="rfqi-form-grid" style={{ marginBottom: 12 }}>
        <div>
          <div className="rfqi-label">Machine</div>
          <select
            className="rfqi-inp"
            value={machineId || ''}
            onChange={(e) => onMachineChange?.(e.target.value)}
          >
            {machines.length === 0 && <option value="">No machines for this process</option>}
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.tonnage ? ` · ${m.tonnage}t` : ''} · €{m.machineRateEUR}/h
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="rfqi-label">Energy tariff</div>
          <select
            className="rfqi-inp"
            value={energyTariffId || ''}
            onChange={(e) => onEnergyTariffChange?.(e.target.value)}
          >
            {energyTariffs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · €{t.energyEURkWh}/kWh
              </option>
            ))}
          </select>
        </div>
      </div>

      {peripherals.length > 0 && (
        <>
          <div className="rfqi-label" style={{ marginBottom: 8 }}>
            Peripherals &amp; auxiliary equipment
          </div>
          <div className="rfqi-peri-grid">
            {peripherals.map((p) => {
              const on = peripheralIds.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`rfqi-peri-card ${on ? 'rfqi-peri-card--on' : ''}`}
                  onClick={() => onPeripheralToggle?.(p.id)}
                >
                  <strong>{p.name}</strong>
                  <span className="rfqi-muted">€{p.rateEUR}/h</span>
                  {p.notes && <span className="rfqi-muted stx-text-caption">{p.notes}</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="rfqi-rate-breakdown">
        <div className="rfqi-summary-row">
          <span className="rfqi-muted">Machine rate</span>
          <span>€{rates.machineRateEUR.toFixed(2)}/h</span>
        </div>
        {rates.peripheralRateEUR > 0 && (
          <div className="rfqi-summary-row">
            <span className="rfqi-muted">Peripherals</span>
            <span>€{rates.peripheralRateEUR.toFixed(2)}/h</span>
          </div>
        )}
        {rates.energyRateEUR > 0 && (
          <div className="rfqi-summary-row">
            <span className="rfqi-muted">Energy</span>
            <span>€{rates.energyRateEUR.toFixed(2)}/h</span>
          </div>
        )}
        <div className="rfqi-summary-row" style={{ fontWeight: 600 }}>
          <span>Process rate (cycle)</span>
          <span className="rfqi-price-cell">€{rates.processRateEUR.toFixed(2)}/h</span>
        </div>
      </div>
    </div>
  )
}
