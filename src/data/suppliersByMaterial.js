/** Sample supplier lists: open source and database placeholder. Replace with your DB later. */
export const SUPPLIERS_BY_MATERIAL = {
  abs: [
    { id: 's1', name: 'Plastics Europe (open data)', source: 'open', country: 'EU', rating: 4.5 },
    { id: 's2', name: 'Sample Resin Corp', source: 'database', country: 'US', rating: 4.2 },
  ],
  pc: [
    { id: 's3', name: 'Covestro AG', source: 'open', country: 'DE', rating: 4.6 },
    { id: 's4', name: 'SABIC', source: 'open', country: 'SA', rating: 4.4 },
  ],
  pe: [
    { id: 's5', name: 'LyondellBasell', source: 'open', country: 'NL', rating: 4.3 },
    { id: 's6', name: 'ExxonMobil Chemical', source: 'open', country: 'US', rating: 4.5 },
  ],
  pp: [
    { id: 's7', name: 'Braskem', source: 'open', country: 'BR', rating: 4.1 },
    { id: 's8', name: 'INEOS', source: 'open', country: 'UK', rating: 4.4 },
  ],
  'steel-carbon': [
    { id: 's9', name: 'ArcelorMittal', source: 'open', country: 'LU', rating: 4.5 },
    { id: 's10', name: 'Nippon Steel', source: 'open', country: 'JP', rating: 4.6 },
  ],
  'steel-stainless': [
    { id: 's11', name: 'Outokumpu', source: 'open', country: 'FI', rating: 4.4 },
    { id: 's12', name: 'Acerinox', source: 'open', country: 'ES', rating: 4.3 },
  ],
  aluminum: [
    { id: 's13', name: 'Rio Tinto', source: 'open', country: 'UK', rating: 4.5 },
    { id: 's14', name: 'Alcoa', source: 'open', country: 'US', rating: 4.4 },
  ],
  copper: [
    { id: 's15', name: 'Codelco', source: 'open', country: 'CL', rating: 4.5 },
    { id: 's16', name: 'Freeport-McMoRan', source: 'open', country: 'US', rating: 4.3 },
  ],
  default: [
    { id: 'd1', name: 'Open source / public supplier (sample)', source: 'open', country: '—', rating: 4.0 },
    { id: 'd2', name: 'Your database supplier (connect later)', source: 'database', country: '—', rating: 0 },
  ],
}

export function getSuppliersForMaterial(materialId) {
  return SUPPLIERS_BY_MATERIAL[materialId] || SUPPLIERS_BY_MATERIAL.default
}
