/** CutDB catalogue metadata — native React UI in StrefexCutDbPage */
export const CUT_DB_CATALOG = {
  id: 'cutdb',
  routeSlug: 'cutdb',
  shortName: 'CutDB',
  title: 'Cutting Tools Intelligence',
  subtitle: 'Professional cutting tools database',
  version: 'v2.0 · GLOBAL EDITION',
  color: '#c8a84b',
  icon: 'wrench',
  stats: {
    tools: 191,
    suppliers: 34,
    machineBrands: 17,
    coatings: 10,
  },
}

export function getCutDbCatalog() {
  return CUT_DB_CATALOG
}
