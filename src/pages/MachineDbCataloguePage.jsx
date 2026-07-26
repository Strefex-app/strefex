import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import MachineDbOverviewStats from '../components/machineDb/MachineDbOverviewStats'
import StrefexCutDbPage from '../components/machineDb/StrefexCutDbPage'
import StrefexMachineDbPage from '../components/machineDb/StrefexMachineDbPage'
import { CUT_DB_CATALOG } from '../data/cutDbCatalog'
import { useAuthStore } from '../store/authStore'
import { buildCutDbOverviewStats, buildMachineDbOverviewStats } from '../utils/machineDbOverviewStats'
import '../styles/app-page.css'
import '../styles/strefex-machinedb.css'

export default function MachineDbCataloguePage() {
  const navigate = useNavigate()
  const { catalogueId } = useParams()
  const role = useAuthStore((s) => s.role)
  const isCutDb = catalogueId === CUT_DB_CATALOG.routeSlug
  const [machineCatalog, setMachineCatalog] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [loadingMachineCatalog, setLoadingMachineCatalog] = useState(!isCutDb)
  const [cutDbOverviewStats, setCutDbOverviewStats] = useState(null)

  useEffect(() => {
    if (!isCutDb) {
      setCutDbOverviewStats(null)
      return undefined
    }

    let cancelled = false
    import('../data/cutDbSeed')
      .then((mod) => {
        if (!cancelled) setCutDbOverviewStats(buildCutDbOverviewStats(mod.CUT_DB))
      })
      .catch(() => {
        if (!cancelled) setCutDbOverviewStats([])
      })

    return () => {
      cancelled = true
    }
  }, [isCutDb])

  useEffect(() => {
    if (isCutDb) return undefined

    let cancelled = false
    setLoadingMachineCatalog(true)
    setLoadError(false)
    setMachineCatalog(null)

    import('../data/machineDbCatalogs')
      .then(({ getMachineDbCatalog }) => {
        if (cancelled) return
        setMachineCatalog(getMachineDbCatalog(catalogueId))
        setLoadingMachineCatalog(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setLoadingMachineCatalog(false)
      })

    return () => {
      cancelled = true
    }
  }, [catalogueId, isCutDb])

  if (role !== 'superadmin') {
    return <Navigate to="/profile" replace />
  }

  const pageTitle = isCutDb ? CUT_DB_CATALOG.shortName : machineCatalog?.shortName
  const pageSubtitle = isCutDb ? CUT_DB_CATALOG.title : machineCatalog?.title
  const overviewStats = useMemo(() => {
    if (isCutDb) return cutDbOverviewStats || []
    return buildMachineDbOverviewStats(machineCatalog?.db)
  }, [isCutDb, cutDbOverviewStats, machineCatalog])
  const overviewLabel = isCutDb
    ? 'CutDB overview'
    : `${machineCatalog?.shortName || 'Database'} overview`

  if (!isCutDb && loadingMachineCatalog) {
    return (
      <AppLayout>
        <div className="app-page stx-mdb-page">
          <button
            type="button"
            className="app-page-back-link"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
          <p className="stx-text-body">Loading catalogue…</p>
        </div>
      </AppLayout>
    )
  }

  if (!isCutDb && (loadError || !machineCatalog)) {
    return (
      <AppLayout>
        <div className="app-page stx-mdb-page">
          <button
            type="button"
            className="app-page-back-link"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
          <div className="app-page-card" style={{ textAlign: 'center', padding: 40 }}>
            <h2 className="stx-text-heading">
              {loadError ? 'Failed to load catalogue' : 'Catalogue not found'}
            </h2>
            <p className="stx-text-body">
              {loadError
                ? 'The machine intelligence database could not be loaded. Please refresh and try again.'
                : `The machine intelligence catalogue "${catalogueId}" was not found.`}
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page stx-mdb-page">
        <button
          type="button"
          className="app-page-back-link"
          onClick={() => navigate('/profile')}
        >
          ← Back to Profile
        </button>
        <div className="stx-mdb-page-header">
          <div className="stx-mdb-page-header__text">
            <h1 className="app-page-title">{pageTitle}</h1>
            <p className="app-page-subtitle">{pageSubtitle}</p>
          </div>
          <MachineDbOverviewStats stats={overviewStats} ariaLabel={overviewLabel} />
        </div>
        {isCutDb ? (
          <StrefexCutDbPage />
        ) : (
          <StrefexMachineDbPage catalog={machineCatalog} />
        )}
      </div>
    </AppLayout>
  )
}
