import WorldMap, { MAP_PIN_TONES } from './WorldMap'
import { MAP_TRANSPORT_MODES } from '../utils/transitLeadTime'
import './ExecutiveLocationMap.css'

const DEFAULT_DISCLAIMER =
  'Pins use approximate positions from country/city (and address fields where available), not precise street coordinates.'

/**
 * Intelligent Sourcing supplier-map chrome (Home + People HR).
 */
export default function ExecutiveLocationMap({
  title = 'Supplier Locations',
  disclaimer = DEFAULT_DISCLAIMER,
  locations = [],
  plantLocation = null,
  selectedId = null,
  onMarkerClick = null,
  metric = 'risk',
  legendMode = 'risk',
  /** Custom legend chips: [{ key, label, color }] — replaces default risk tones when set */
  legendItems = null,
  plantLegendLabel = null,
  className = '',
  showLane = true,
  lanes = null,
  transportMode = null,
  onTransportModeChange = null,
  showTransportModes = false,
  mapFit = null,
}) {
  const plantLabel = plantLegendLabel
    || (plantLocation?.name ? `Receiving plant · ${plantLocation.name}` : 'Receiving plant')

  const hideToneLegend = legendMode === 'plants' || legendMode === 'none'

  const toneLabels = legendMode === 'rfq'
    ? ['Quotes in', 'Awaiting', 'Incoming']
    : ['Low risk', 'Watch', 'High risk']

  const defaultToneKeys = hideToneLegend
    ? []
    : [
      { key: 'low', label: toneLabels[0] },
      { key: 'medium', label: toneLabels[1] },
      { key: 'high', label: toneLabels[2] },
    ]

  const chips = Array.isArray(legendItems)
    ? legendItems
    : defaultToneKeys.map(({ key, label }) => ({
      key,
      label,
      color: MAP_PIN_TONES[key].fill,
    }))

  return (
    <div className={`app-page-card exec-loc-map ${className}`.trim()}>
      <div className="exec-loc-map__head">
        <h3 className="exec-loc-map__title">{title}</h3>
        {showTransportModes ? (
          <div className="exec-loc-map__modes" role="group" aria-label="Transportation option">
            {MAP_TRANSPORT_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`exec-loc-map__mode${transportMode === mode.id ? ' is-active' : ''}`}
                onClick={() => onTransportModeChange?.(mode.id)}
                title={`${mode.label} transit lead time (reference)`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {disclaimer ? (
        <p className="exec-loc-map__disclaimer stx-text-wrap">{disclaimer}</p>
      ) : null}
      <div className="exec-loc-map__viewport">
        <WorldMap
          variant="sourcing"
          locations={locations}
          plantLocation={plantLocation}
          onMarkerClick={onMarkerClick}
          selectedId={selectedId}
          metric={metric}
          showLane={showLane}
          lanes={lanes}
          fit={mapFit}
        />
      </div>
      <div className="exec-loc-map__legend">
        {chips.map((item) => (
          <span key={item.key} className="exec-loc-map__legend-item">
            <span
              className="exec-loc-map__dot"
              style={{ background: item.color }}
            />
            {item.label}
          </span>
        ))}
        {plantLocation ? (
          <span className="exec-loc-map__legend-item">
            <span className="exec-loc-map__dot exec-loc-map__dot--plant" />
            {plantLabel}
          </span>
        ) : null}
        {showLane && plantLocation ? (
          <span className="exec-loc-map__legend-item">
            <svg className="exec-loc-map__lane" width="26" height="6" aria-hidden>
              <line
                x1="0"
                y1="3"
                x2="26"
                y2="3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeDasharray="4 4"
              />
            </svg>
            Lane to plant
            {transportMode ? ` · ${String(transportMode)} lead` : ''}
          </span>
        ) : null}
      </div>
    </div>
  )
}
