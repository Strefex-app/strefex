/**
 * Materials existing in the market, by category.
 * Can be replaced or extended by data from your database later.
 */
export const MATERIALS_BY_CATEGORY = {
  plastic: [
    { id: 'abs', name: 'ABS (Acrylonitrile Butadiene Styrene)', applications: 'Automotive, electronics, consumer goods' },
    { id: 'pc', name: 'Polycarbonate (PC)', applications: 'Electronics, medical, automotive' },
    { id: 'pe', name: 'Polyethylene (PE)', applications: 'Packaging, piping, automotive' },
    { id: 'pp', name: 'Polypropylene (PP)', applications: 'Automotive, packaging, medical' },
    { id: 'pvc', name: 'PVC (Polyvinyl Chloride)', applications: 'Construction, medical, electronics' },
    { id: 'pa', name: 'Polyamide (PA / Nylon)', applications: 'Machinery, automotive, electronics' },
    { id: 'pet', name: 'PET (Polyethylene Terephthalate)', applications: 'Packaging, textiles, electronics' },
    { id: 'pmma', name: 'PMMA (Acrylic)', applications: 'Medical, electronics, automotive' },
    { id: 'ptfe', name: 'PTFE (Teflon)', applications: 'Medical, machinery, electronics' },
    { id: 'ps', name: 'Polystyrene (PS)', applications: 'Packaging, electronics, consumer' },
  ],
  metal: [
    { id: 'steel-carbon', name: 'Carbon steel', applications: 'Machinery, automotive, construction' },
    { id: 'steel-stainless', name: 'Stainless steel', applications: 'Medical, food, automotive' },
    { id: 'aluminum', name: 'Aluminum', applications: 'Automotive, electronics, aerospace' },
    { id: 'copper', name: 'Copper', applications: 'Electronics, machinery, medical' },
    { id: 'brass', name: 'Brass', applications: 'Machinery, electronics, automotive' },
    { id: 'bronze', name: 'Bronze', applications: 'Machinery, marine, automotive' },
    { id: 'titanium', name: 'Titanium', applications: 'Medical, aerospace, automotive' },
    { id: 'magnesium', name: 'Magnesium', applications: 'Automotive, electronics, aerospace' },
    { id: 'zinc', name: 'Zinc', applications: 'Automotive, construction, electronics' },
    { id: 'nickel-alloy', name: 'Nickel alloys', applications: 'Medical, machinery, electronics' },
  ],
  other: [
    { id: 'carbon-fiber', name: 'Carbon fiber', applications: 'Automotive, aerospace, medical' },
    { id: 'glass', name: 'Industrial glass', applications: 'Electronics, medical, automotive' },
    { id: 'ceramics', name: 'Technical ceramics', applications: 'Electronics, medical, machinery' },
    { id: 'rubber', name: 'Industrial rubber', applications: 'Automotive, machinery, medical' },
    { id: 'composites', name: 'Composite materials', applications: 'Automotive, aerospace, marine' },
    { id: 'wood-engineered', name: 'Engineered wood', applications: 'Construction, automotive' },
    { id: 'textiles-tech', name: 'Technical textiles', applications: 'Medical, automotive, machinery' },
  ],
}
