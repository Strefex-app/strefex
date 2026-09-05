import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import FolderBrowser from '../components/company/FolderBrowser'
import {
  COMPANY_DATABASE_PATH,
  COMPANY_DATABASE_SPACES,
  PLANT_QMS_SPACE,
  spaceRootFolderId,
} from '../data/companyDatabaseSpaces'
import { getIndustryQualityProfile } from '../data/industryQualityProfiles'
import { PLATFORM_HUB_INDUSTRY_SLUGS } from '../data/platformHubIndustries'
import { IATF_CONTROL_PATH } from '../data/iatfControlCatalog'
import useIatfControlStore from '../store/iatfControlStore'
import '../components/company/FolderBrowser.css'
import '../pages/IatfControl.css'
import '../pages/QualityExcellence.css'
import '../styles/app-page.css'
import './CompanyDatabase.css'

export default function CompanyDatabase() {
  const { space = PLANT_QMS_SPACE, folderId } = useParams()
  const navigate = useNavigate()
  const ensureFolders = useIatfControlStore((s) => s.ensureFolders)
  const plantIndustry = useIatfControlStore((s) => s.plantIndustry) || 'general'
  const setPlantIndustry = useIatfControlStore((s) => s.setPlantIndustry)
  const readOnly = useIatfControlStore((s) => s.isReadOnly())
  const documents = useIatfControlStore((s) => s.documents)
  const folders = useIatfControlStore((s) => s.folders)
  const industryProfile = getIndustryQualityProfile(plantIndustry)

  useEffect(() => {
    ensureFolders()
  }, [ensureFolders, plantIndustry])

  const activeSpace = COMPANY_DATABASE_SPACES.find((s) => s.id === space) || COMPANY_DATABASE_SPACES[0]
  const rootFolderId = activeSpace.rootFolderId || spaceRootFolderId(activeSpace.id)
  const docCount = (documents || []).filter((d) => d.space === activeSpace.id).length
  const folderCount = (folders || []).filter((f) => f.space === activeSpace.id).length

  return (
    <AppLayout>
      <div className="cdb-page">
        <header className="cdb-page__head">
          <div className="min-width-0">
            <h1 className="app-page-title">Company Database</h1>
            <p className="stx-text-caption stx-text-wrap">
              Controlled folder spaces linked to plant, people, and commercial records.
              {' '}
              {docCount} documents · {folderCount} folders in {activeSpace.label}.
            </p>
          </div>
          <div className="cdb-page__actions">
            {activeSpace.id === PLANT_QMS_SPACE && (
              <label className="cdb-industry-select">
                <span className="stx-text-caption">Plant industry</span>
                <select
                  value={plantIndustry}
                  disabled={readOnly}
                  onChange={(e) => setPlantIndustry(e.target.value)}
                >
                  {PLATFORM_HUB_INDUSTRY_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {getIndustryQualityProfile(slug).label}
                    </option>
                  ))}
                  <option value="general">General manufacturing</option>
                </select>
              </label>
            )}
            {activeSpace.iatfPath ? (
              <Link className="qe-btn" to={activeSpace.iatfPath}>Plant workspace</Link>
            ) : (
              <Link className="qe-btn" to={IATF_CONTROL_PATH}>Plant workspace</Link>
            )}
            {activeSpace.relatedPath ? (
              <Link className="qe-btn" to={activeSpace.relatedPath}>
                {activeSpace.relatedLabel || 'Related module'}
              </Link>
            ) : null}
            <Link className="qe-btn" to="/management/people/departments">Departments</Link>
          </div>
        </header>

        <div className="cdb-page__spaces">
          {COMPANY_DATABASE_SPACES.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`qe-pill${row.id === activeSpace.id ? ' is-active' : ''}`}
              onClick={() => navigate(`${COMPANY_DATABASE_PATH}/${row.id}`)}
            >
              {row.label}
            </button>
          ))}
        </div>

        <p className="stx-text-caption stx-text-wrap cdb-page__space-desc">
          {activeSpace.id === PLANT_QMS_SPACE
            ? `${activeSpace.description} ${industryProfile.plantWorkspaceHint}`
            : activeSpace.description}
        </p>

        <FolderBrowser
          space={activeSpace.id}
          initialFolderId={folderId || rootFolderId}
          readOnly={readOnly}
          plantIndustry={activeSpace.id === PLANT_QMS_SPACE ? plantIndustry : undefined}
        />
      </div>
    </AppLayout>
  )
}
