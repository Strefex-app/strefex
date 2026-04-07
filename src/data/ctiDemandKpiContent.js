/**
 * Plain-language copy for Cost / demand KPIs (indicator engine).
 * Units: model salary is documented as USD for comparability across countries.
 */
export const CTI_SALARY_CURRENCY = 'USD'

export const CTI_DEMAND_KPI_DEFS = [
  {
    key: 'real_income',
    title: 'Real income',
    unitLabel: 'US dollars',
    format: 'usd',
    what:
      'Your modeled salary after adjusting for the average inflation rate in the data. It answers: “What does my pay feel like in today’s prices?”',
    why:
      'When real income falls, households tighten spending — relevant for demand planning, pricing, and workforce location decisions.',
  },
  {
    key: 'real_income_index',
    title: 'Real income index',
    unitLabel: 'index points',
    format: 'index',
    what:
      'A scaled index (salary ÷ (1 + inflation) × 100). It moves with the same logic as real income but on an index scale for charts.',
    why:
      'Use it to compare relative changes over time or scenarios without focusing on the absolute dollar amount.',
  },
  {
    key: 'purchasing_power_index',
    title: 'Purchasing power index',
    unitLabel: 'index points',
    format: 'index',
    what:
      'Salary divided by the modeled “cost index” (×100). Higher means pay stretches further versus the cost benchmark.',
    why:
      'Helps compare markets where living or operating costs differ — useful for footprint and sourcing strategy.',
  },
  {
    key: 'demand_index',
    title: 'Demand index',
    unitLabel: 'model score',
    format: 'score',
    what:
      'Real income minus the cost index in this prototype — a simple “demand pressure” score (not a currency).',
    why:
      'A quick signal of whether modeled purchasing power sits above or below the cost hurdle used in the engine.',
  },
  {
    key: 'inflation_annual_pct',
    title: 'CPI inflation (average of series)',
    unitLabel: 'percent per year',
    format: 'pct',
    what:
      'Average of annual consumer-price inflation rates in the loaded series (World Bank CPI indicator). Each year’s value is already an annual inflation rate.',
    why:
      'Inflation drives interest rates, wages, and pricing — watch it when stress-testing costs and customer demand.',
  },
]
