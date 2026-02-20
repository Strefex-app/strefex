/** Equipment suppliers: open source and database. Replace with your DB later. */
export const SUPPLIERS_BY_EQUIPMENT = {
  'auto-inj-hydraulic': [
    { id: 'eq1', name: 'Engel (open)', source: 'open', country: 'AT', rating: 4.6 },
    { id: 'eq2', name: 'Arburg (open)', source: 'open', country: 'DE', rating: 4.5 },
    { id: 'eq3', name: 'Your Molding Corp', source: 'database', country: 'US', rating: 4.2 },
  ],
  'auto-inj-electric': [
    { id: 'eq4', name: 'Sumitomo (open)', source: 'open', country: 'JP', rating: 4.5 },
    { id: 'eq5', name: 'Fanuc (open)', source: 'open', country: 'JP', rating: 4.6 },
    { id: 'eq6', name: 'Local Electric Molding', source: 'database', country: 'US', rating: 4.3 },
  ],
  'auto-hot-manifold': [
    { id: 'eq7', name: 'Yudo (open)', source: 'open', country: 'KR', rating: 4.4 },
    { id: 'eq8', name: 'Mastip (open)', source: 'open', country: 'NZ', rating: 4.3 },
    { id: 'eq9', name: 'DB Hot Runner', source: 'database', country: 'DE', rating: 4.5 },
  ],
  'auto-chiller': [
    { id: 'eq10', name: 'Cooling Corp (open)', source: 'open', country: 'US', rating: 4.2 },
    { id: 'eq11', name: 'Chiller Solutions', source: 'database', country: 'IT', rating: 4.4 },
  ],
  'mach-cnc-vertical': [
    { id: 'eq12', name: 'Haas (open)', source: 'open', country: 'US', rating: 4.5 },
    { id: 'eq13', name: 'DMG MORI (open)', source: 'open', country: 'DE', rating: 4.7 },
    { id: 'eq14', name: 'Local CNC Supplier', source: 'database', country: 'US', rating: 4.2 },
  ],
  'elec-smt-place': [
    { id: 'eq15', name: 'ASM (open)', source: 'open', country: 'DE', rating: 4.6 },
    { id: 'eq16', name: 'Fuji (open)', source: 'open', country: 'JP', rating: 4.5 },
    { id: 'eq17', name: 'SMT Partner', source: 'database', country: 'CN', rating: 4.3 },
  ],
  'med-ster-autoclave': [
    { id: 'eq18', name: 'Steris (open)', source: 'open', country: 'US', rating: 4.6 },
    { id: 'eq19', name: 'Getinge (open)', source: 'open', country: 'SE', rating: 4.5 },
    { id: 'eq20', name: 'Medical Sterilizer Inc', source: 'database', country: 'US', rating: 4.4 },
  ],
  default: [
    { id: 'eqd1', name: 'Open source supplier (sample)', source: 'open', country: '—', rating: 4.0 },
    { id: 'eqd2', name: 'Your database supplier', source: 'database', country: '—', rating: 0 },
  ],
}

export function getSuppliersForEquipment(equipmentId) {
  return SUPPLIERS_BY_EQUIPMENT[equipmentId] || SUPPLIERS_BY_EQUIPMENT.default
}
