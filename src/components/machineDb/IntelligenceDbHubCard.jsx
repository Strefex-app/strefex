import Icon from '../Icon'

/** Profile hub card for machine intelligence / CutDB catalogues. */
export default function IntelligenceDbHubCard({ catalog, onOpen }) {
  const { shortName, title, subtitle, color, icon, stats, kind } = catalog
  const isCutDb = kind === 'cutdb'

  return (
    <button type="button" className="prof-doc-template prof-mdb-hub-card" onClick={onOpen}>
      <div className="prof-doc-template-header">
        <span className="prof-doc-icon" style={{ background: `${color}18`, color }}>
          <Icon name={icon} size={18} />
        </span>
        <span className="prof-doc-name">{shortName}</span>
      </div>
      <p className="prof-mdb-hub-desc">{title}</p>
      <p className="prof-mdb-hub-sub">{subtitle}</p>
      <div className="prof-mdb-hub-meta">
        {isCutDb ? (
          <>
            <span>{stats.tools} tools</span>
            <span>{stats.suppliers} suppliers</span>
            <span>{stats.coatings} coatings</span>
          </>
        ) : (
          <>
            <span>{stats.suppliers} suppliers</span>
            <span>{stats.machines} models</span>
          </>
        )}
      </div>
    </button>
  )
}
