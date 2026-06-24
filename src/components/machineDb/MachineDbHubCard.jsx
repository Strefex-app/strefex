import Icon from '../Icon'

/** Lightweight hub card — matches Profile documentation widget styling. */
export default function MachineDbHubCard({ catalog, onOpen }) {
  const { shortName, title, subtitle, db, color, icon } = catalog
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
        <span>{db.suppliers.length} suppliers</span>
        <span>{db.machines.length} models</span>
      </div>
    </button>
  )
}
