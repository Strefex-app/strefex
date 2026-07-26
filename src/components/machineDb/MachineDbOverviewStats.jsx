/**
 * Database overview metrics — same pattern as Management cluster stats.
 * @param {{ stats: { label: string, value: number | string }[], ariaLabel?: string }} props
 */
export default function MachineDbOverviewStats({ stats, ariaLabel = 'Database overview' }) {
  if (!stats?.length) return null

  return (
    <div className="stx-mdb-overview-stats" role="list" aria-label={ariaLabel}>
      {stats.map((stat) => (
        <div key={stat.label} className="stx-mdb-overview-stat" role="listitem">
          <span className="stx-mdb-overview-stat__value">
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </span>
          <span className="stx-mdb-overview-stat__label">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
