import { useEffect, useState } from 'react'
import { fetchCtiInflationMomentum } from '../services/costTransformationIntelligenceService'
import './CtiInflationMomentumPanel.css'

const n2 = (x) => (x == null || Number.isNaN(Number(x)) ? '—' : Number(x).toFixed(2))
const n3 = (x) => (x == null || Number.isNaN(Number(x)) ? '—' : Number(x).toFixed(3))

export default function CtiInflationMomentumPanel({ country }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCtiInflationMomentum(country)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [country])

  const cpi = data?.cpi_monthly
  const gdp = data?.gdp_annual

  return (
    <section className="cti-mom-panel" aria-labelledby="cti-mom-heading">
      <h4 id="cti-mom-heading" className="cti-mom-panel__title">
        High-frequency momentum (dashboard)
      </h4>
      <p className="cti-mom-panel__intro">
        <strong>MoM</strong> here is the month-to-month change in the <em>headline YoY inflation rate</em> (percentage
        points), from ECB monthly HICP where available — not the same as “price level vs last month”.
      </p>

      {loading && <p className="cti-mom-panel__loading">Loading momentum…</p>}

      {!loading && (
        <div className="cti-mom-grid">
          <div className="cti-mom-card">
            <h5 className="cti-mom-card__h">CPI / HICP (monthly feed)</h5>
            {cpi?.available ? (
              <ul className="cti-mom-list">
                <li>
                  <span>Latest period</span>
                  <strong>{cpi.latest_period}</strong>
                </li>
                <li>
                  <span>YoY inflation (that month)</span>
                  <strong>
                    {n2(cpi.yoy_hicp_pct)}%
                  </strong>
                </li>
                <li>
                  <span>MoM change vs prior month</span>
                  <strong>
                    {cpi.mom_change_pp != null
                      ? `${cpi.mom_change_pp > 0 ? '+' : ''}${n3(cpi.mom_change_pp)} pp`
                      : '—'}
                  </strong>
                </li>
                <li className="cti-mom-list__meta">{cpi.source}</li>
              </ul>
            ) : (
              <p className="cti-mom-card__note">{cpi?.note || 'No data.'}</p>
            )}
          </div>

          <div className="cti-mom-card">
            <h5 className="cti-mom-card__h">GDP growth (annual, World Bank)</h5>
            {gdp?.annual_growth_last_pct != null ? (
              <ul className="cti-mom-list">
                <li>
                  <span>
                    Last year ({gdp.last_year})
                  </span>
                  <strong>{n2(gdp.annual_growth_last_pct)}%</strong>
                </li>
                {gdp.prior_year != null && (
                  <li>
                    <span>
                      Prior year ({gdp.prior_year})
                    </span>
                    <strong>{n2(gdp.annual_growth_prior_pct)}%</strong>
                  </li>
                )}
                {gdp.yoy_delta_pp != null && (
                  <li>
                    <span>YOY Δ (acceleration of growth)</span>
                    <strong>
                      {gdp.yoy_delta_pp > 0 ? '+' : ''}
                      {n3(gdp.yoy_delta_pp)} pp
                    </strong>
                  </li>
                )}
              </ul>
            ) : (
              <p className="cti-mom-card__note">{gdp?.note || 'GDP growth not available.'}</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
