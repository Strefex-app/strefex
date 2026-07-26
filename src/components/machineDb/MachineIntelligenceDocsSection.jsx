import { useNavigate } from 'react-router-dom'
import { MACHINE_DB_CATALOG_META } from '../../data/machineDbCatalogMeta'
import IntelligenceDbHubCard from './IntelligenceDbHubCard'

/** Superadmin-only machine intelligence catalogues inside Profile → Documentation. */
export default function MachineIntelligenceDocsSection() {
  const navigate = useNavigate()
  const openCatalogue = (slug) => navigate(`/profile/machine-intelligence/${slug}`)

  return (
    <div className="prof-mdb-section">
      <div className="prof-mdb-section-head">
        <h4 className="prof-mdb-section-title">Machine Intelligence Databases</h4>
        <p className="prof-mdb-section-sub">
          STREFEX reference catalogues — cutting tools, EDM, CNC turning, automation and injection molding suppliers, models, compare and benchmark tools.
        </p>
      </div>
      <div className="prof-docs-grid">
        {MACHINE_DB_CATALOG_META.map((cat) => (
          <IntelligenceDbHubCard
            key={cat.id}
            catalog={cat}
            onOpen={() => openCatalogue(cat.routeSlug)}
          />
        ))}
      </div>
    </div>
  )
}
