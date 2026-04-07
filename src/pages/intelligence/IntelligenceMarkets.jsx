import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import './IntelligencePages.css'

const MODULES = [
  {
    title: 'Data collectors',
    desc: 'Official APIs — ECB (HICP, rates), IMF WEO (GDP growth), World Bank (CPI, trade, industry), OECD SDMX (PPI, wages, transport, confidence).',
    items: ['ECB SDW', 'IMF DataServices', 'World Bank Open Data', 'OECD.stats'],
  },
  {
    title: 'Data normalizer',
    desc: 'Maps provider-specific payloads to unified { year, value } series for the indicator engine.',
    items: ['worldbank_to_series', 'trim_timeframe'],
  },
  {
    title: 'Indicator engine',
    desc: 'Real income, purchasing power index, trade balance, demand index — see /api/v1/cti/report.',
    items: ['calculations.py', 'models/indicators.py'],
  },
  {
    title: 'Scenario engine',
    desc: 'Grid simulation over inflation and policy rate, tied to model income.',
    items: ['scenarios.scenario_simulation'],
  },
  {
    title: 'Report generator',
    desc: 'build_report(country, city, data) — headline, KPIs, monitoring list, outlook.',
    items: ['report_builder.py'],
  },
]

export default function IntelligenceMarkets() {
  return (
    <AppLayout>
      <div className="intel-page">
        <header className="intel-page__header">
          <h1 className="intel-page__title">Markets &amp; data architecture</h1>
          <p className="intel-page__lead">
            Core modules behind Cost Transformation Intelligence — collectors through report generation.
          </p>
        </header>

        <div className="intel-modules">
          {MODULES.map((m) => (
            <section key={m.title} className="intel-modules__card">
              <h2 className="intel-modules__h">{m.title}</h2>
              <p className="intel-modules__desc">{m.desc}</p>
              <ul className="intel-modules__ul">
                {m.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="intel-page__nav">
          <Link to="/intelligence/dashboard" className="intel-link">
            <Icon name="arrow-left" size={16} /> Dashboard
          </Link>
          <Link to="/intelligence/reports" className="intel-link">
            Report generator <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </div>
    </AppLayout>
  )
}
