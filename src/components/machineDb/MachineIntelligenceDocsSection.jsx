import { useNavigate } from 'react-router-dom'
import { METAL_MACHINE_CATALOGUES } from '../../data/machineDbCatalogs'
import MachineDbHubCard from './MachineDbHubCard'

/** Superadmin-only machine intelligence catalogues inside Profile → Documentation. */
export default function MachineIntelligenceDocsSection() {
  const navigate = useNavigate()
  const openCatalogue = (slug) => navigate(`/profile/machine-intelligence/${slug}`)

  return (
    <div className="prof-mdb-section">
      <div className="prof-mdb-section-head">
        <h4 className="prof-mdb-section-title">Machine Intelligence Databases</h4>
        <p className="prof-mdb-section-sub">
          STREFEX reference catalogues — suppliers, models, compare and benchmark tools for EDM, CNC turning, automation and injection molding.
        </p>
      </div>
      <div className="prof-docs-grid">
        {METAL_MACHINE_CATALOGUES.map((cat) => (
          <MachineDbHubCard
            key={cat.id}
            catalog={cat}
            onOpen={() => openCatalogue(cat.routeSlug)}
          />
        ))}
      </div>
    </div>
  )
}
