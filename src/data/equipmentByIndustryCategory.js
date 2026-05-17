/**
 * Equipment list by industry and category. Key: "industryId_categoryId".
 * Replace or extend with your database later.
 */
function key(industryId, categoryId) {
  return `${industryId}_${categoryId}`
}

export const EQUIPMENT_BY_INDUSTRY_CATEGORY = {
  // Automotive
  [key('automotive', 'mold-makers')]: [
    { id: 'auto-mold-standard', name: 'Standard injection molds', description: 'Standard and custom molds' },
    { id: 'auto-mold-multi', name: 'Multi-cavity molds', description: 'High-volume mold solutions' },
    { id: 'auto-mold-tooling', name: 'Mold tooling and components', description: 'Inserts, ejectors, slides' },
  ],
  [key('automotive', 'injection-machines')]: [
    { id: 'auto-inj-hydraulic', name: 'Hydraulic injection machines', description: 'Clamping 50–5000 ton' },
    { id: 'auto-inj-electric', name: 'Electric injection machines', description: 'Servo-driven precision' },
    { id: 'auto-inj-hybrid', name: 'Hybrid injection machines', description: 'Hybrid drive systems' },
  ],
  [key('automotive', 'hot-runner')]: [
    { id: 'auto-hot-manifold', name: 'Hot runner manifolds', description: 'Standard and custom' },
    { id: 'auto-hot-nozzles', name: 'Hot runner nozzles', description: 'Heated nozzles and tips' },
    { id: 'auto-hot-controller', name: 'Temperature controllers', description: 'Zone and nozzle control' },
  ],
  [key('automotive', 'coolers')]: [
    { id: 'auto-chiller', name: 'Industrial chillers', description: 'Water and air cooled' },
    { id: 'auto-cooling-tower', name: 'Cooling towers', description: 'Process cooling' },
    { id: 'auto-temp-unit', name: 'Temperature control units', description: 'TCU for molds' },
  ],
  [key('automotive', 'dryer')]: [
    { id: 'auto-dryer-hopper', name: 'Hopper dryers', description: 'Central and machine-mounted' },
    { id: 'auto-dryer-desiccant', name: 'Desiccant dryers', description: 'Low dew point drying' },
  ],
  [key('automotive', 'automation')]: [
    { id: 'auto-auto-conveyor', name: 'Conveyor systems', description: 'Part handling and transfer' },
    { id: 'auto-auto-gripper', name: 'End-of-arm tooling', description: 'Grippers and EOAT' },
    { id: 'auto-auto-vision', name: 'Vision and inspection', description: 'In-line inspection' },
  ],
  [key('automotive', 'robots')]: [
    { id: 'auto-robot-articulated', name: 'Articulated robots', description: '6-axis and 7-axis' },
    { id: 'auto-robot-scara', name: 'SCARA robots', description: 'High-speed pick and place' },
    { id: 'auto-robot-collab', name: 'Collaborative robots', description: 'Cobots for assembly' },
  ],
  [key('automotive', 'conveyors')]: [
    { id: 'auto-conv-belt', name: 'Belt conveyors', description: 'Assembly and transfer' },
    { id: 'auto-conv-roller', name: 'Roller conveyors', description: 'Heavy-duty handling' },
    { id: 'auto-conv-overhead', name: 'Overhead conveyors', description: 'Paint and assembly lines' },
  ],
  [key('automotive', 'presses')]: [
    { id: 'auto-press-stamping', name: 'Stamping presses', description: 'Metal stamping' },
    { id: 'auto-press-forming', name: 'Forming presses', description: 'Sheet metal forming' },
  ],
  [key('automotive', 'testing')]: [
    { id: 'auto-test-cmm', name: 'CMM and metrology', description: 'Coordinate measuring' },
    { id: 'auto-test-durability', name: 'Durability testing', description: 'Fatigue and life test' },
  ],
  // Machinery (shared + specific)
  [key('machinery', 'cnc')]: [
    { id: 'mach-cnc-vertical', name: 'Vertical machining centers', description: '3–5 axis VMC' },
    { id: 'mach-cnc-horizontal', name: 'Horizontal machining centers', description: 'HMC and pallet systems' },
    { id: 'mach-cnc-turning', name: 'CNC turning centers', description: 'Lathes and turn-mill' },
  ],
  [key('machinery', 'injection-machines')]: [
    { id: 'mach-inj-hydraulic', name: 'Hydraulic injection machines', description: 'Plastic injection' },
    { id: 'mach-inj-electric', name: 'Electric injection machines', description: 'Precision molding' },
  ],
  [key('machinery', 'mold-makers')]: [
    { id: 'mach-mold-cavity', name: 'Cavity and core sets', description: 'Mold components' },
    { id: 'mach-mold-hotrunner', name: 'Hot runner systems', description: 'For machinery molds' },
  ],
  [key('machinery', 'coolers')]: [
    { id: 'mach-chiller', name: 'Chillers', description: 'Process cooling' },
    { id: 'mach-tcu', name: 'Temperature control units', description: 'Mold temperature control' },
  ],
  [key('machinery', 'testing')]: [
    { id: 'mach-test-hardness', name: 'Hardness testers', description: 'Material hardness' },
    { id: 'mach-test-cmm', name: 'CMM and inspection', description: 'Dimensional inspection' },
  ],
  // Electronics
  [key('electronics', 'pcb')]: [
    { id: 'elec-pcb-drill', name: 'PCB drilling machines', description: 'Mechanical and laser drill' },
    { id: 'elec-pcb-expose', name: 'Exposure and imaging', description: 'Photolithography' },
    { id: 'elec-pcb-etch', name: 'Etching equipment', description: 'Wet and dry etch' },
  ],
  [key('electronics', 'smt')]: [
    { id: 'elec-smt-place', name: 'SMT pick-and-place', description: 'High-speed placement' },
    { id: 'elec-smt-reflow', name: 'Reflow ovens', description: 'Convection and vapor phase' },
    { id: 'elec-smt-screen', name: 'Screen printers', description: 'Solder paste printing' },
  ],
  [key('electronics', 'test')]: [
    { id: 'elec-test-ate', name: 'ATE systems', description: 'Automated test equipment' },
    { id: 'elec-test-flying', name: 'Flying probe testers', description: 'PCB electrical test' },
  ],
  [key('electronics', 'clean-room')]: [
    { id: 'elec-clean-hood', name: 'Clean room hoods', description: 'ESD and laminar flow' },
    { id: 'elec-clean-monitor', name: 'Particle monitoring', description: 'Clean room monitoring' },
  ],
  // Medical
  [key('medical', 'molding')]: [
    { id: 'med-mold-cleanroom', name: 'Clean room molding', description: 'Medical-grade injection' },
    { id: 'med-mold-micro', name: 'Micro molding', description: 'Micro and mini parts' },
  ],
  [key('medical', 'sterilization')]: [
    { id: 'med-ster-autoclave', name: 'Autoclaves', description: 'Steam sterilization' },
    { id: 'med-ster-etO', name: 'Ethylene oxide', description: 'EtO sterilization systems' },
  ],
  [key('medical', 'clean-room')]: [
    { id: 'med-clean-iso', name: 'ISO clean rooms', description: 'ISO 7/8 environments' },
    { id: 'med-clean-laminar', name: 'Laminar flow systems', description: 'Class A/B areas' },
  ],
  [key('medical', 'packaging')]: [
    { id: 'med-pkg-blister', name: 'Blister packaging', description: 'Medical blister lines' },
    { id: 'med-pkg-seal', name: 'Sealing equipment', description: 'Pouch and tray sealing' },
  ],
  // Nuclear — representative equipment (extend with qualified machine models as needed)
  [key('nuclear', 'reactor-pressure')]: [
    { id: 'nucl-rpv-interfaces', name: 'Pressure vessel closure & internals tooling', description: 'Stud tensioners, seal seat tooling, lift rigs for RPV interfaces' },
    { id: 'nucl-heavy-weld', name: 'Heavy-section welding positioners', description: 'Positioners and manipulators for thick-section nuclear vessels' },
  ],
  [key('nuclear', 'fuel-storage')]: [
    { id: 'nucl-fuel-cask-handling', name: 'Fuel cask handling & transfer systems', description: 'Overhead handling, transporters, and alignment for fuel casks' },
    { id: 'nucl-rack-systems', name: 'Storage rack handling equipment', description: 'Installation and rack positioning tools for spent fuel stores' },
  ],
  [key('nuclear', 'radiation-monitoring')]: [
    { id: 'nucl-area-monitors', name: 'Area radiation monitors & stacks', description: 'Installed area monitors and effluent radiation measurement' },
    { id: 'nucl-portable-survey', name: 'Portable survey instrumentation', description: 'Handheld survey meters and contamination monitors' },
  ],
  [key('nuclear', 'nuclear-welding-nde')]: [
    { id: 'nucl-orbital-weld', name: 'Orbital & mechanized GTAW / SMAW systems', description: 'Closed-head orbital welders and mechanized pipe welding' },
    { id: 'nucl-weld-process-mon', name: 'Weld parameter monitoring & recording', description: 'Arc voltage, current, travel, and WPS traceability systems' },
  ],
  [key('nuclear', 'nuclear-fabrication-assembly')]: [
    { id: 'nucl-vmc-hmc', name: 'Large CNC machining centers', description: '5-axis and horizontal boring for nuclear-qualified fabrications' },
    { id: 'nucl-plate-roll', name: 'Plate rolls, presses & brake forming', description: 'Thick plate forming for shells, cones, and structural weldments' },
    { id: 'nucl-clean-assembly', name: 'Clean / controlled assembly bays', description: 'Cranes, alignment fixtures, and ESD-controlled assembly for safety equipment' },
  ],
  [key('nuclear', 'pipe-spool-fabrication')]: [
    { id: 'nucl-pipe-cold-cut', name: 'Cold cutting, beveling & facing', description: 'Track, clamshell, and stationary pipe prep machines' },
    { id: 'nucl-pipe-bend', name: 'Induction & mandrel pipe benders', description: 'Precision bends for LSA and safety-related piping' },
    { id: 'nucl-fit-weld-cell', name: 'Spool fit-up & welding stations', description: 'Rotators, column-boom, and roller beds for shop spool fabrication' },
  ],
  [key('nuclear', 'pressure-leak-test')]: [
    { id: 'nucl-hydro-bench', name: 'Hydrostatic test pumps & intensifiers', description: 'High-pressure hydro benches with charted pressure–time records' },
    { id: 'nucl-helium-leak', name: 'Helium leak detectors (vacuum & sniffer)', description: 'Mass-spectrometer leak testing for valves and penetrations' },
    { id: 'nucl-pneumatic-leak', name: 'Pneumatic decay & bubble leak testers', description: 'Low-pressure pneumatic decay and immersion bubble test setups' },
  ],
  [key('nuclear', 'nde-test-equipment')]: [
    { id: 'nucl-ut-paut', name: 'UT / PAUT / TOFD systems', description: 'Phased-array and conventional UT for welds and thickness' },
    { id: 'nucl-rt-digital', name: 'RT / digital radiography', description: 'X-ray and gamma enclosures, CR/DR panels, crawlers for pipe' },
    { id: 'nucl-pt-mt', name: 'PT / MT inspection lines', description: 'UV booths, electrostatic powder PT, prods and yokes for MT' },
    { id: 'nucl-et-therm', name: 'ET / thermography / visual', description: 'Eddy current, IR thermography, and borescope inspection kits' },
  ],
  [key('nuclear', 'electrical-ica-test')]: [
    { id: 'nucl-hipot-ir', name: 'Hipot & insulation resistance testers', description: 'AC/DC hipot, megger, and dielectric withstand sets' },
    { id: 'nucl-loop-cal', name: 'Loop calibrators & process calibrators', description: 'mA/V/RTD calibrators for I&C checkout and SAT' },
    { id: 'nucl-relay-test', name: 'Relay & protection test sets', description: 'Secondary injection and three-phase relay test equipment' },
  ],
  [key('nuclear', 'materials-lab-testers')]: [
    { id: 'nucl-spectro', name: 'OES / XRF / mobile PMI', description: 'Spark OES, handheld XRF, and PMI for material verification' },
    { id: 'nucl-tensile-impact', name: 'Tensile, hardness & impact testers', description: 'Universal test machines, Rockwell/Brinell/Vickers, Charpy' },
    { id: 'nucl-metallography', name: 'Metallography prep & microscopy', description: 'Mounting, polishing, and microscopes for weld/HAZ evaluation' },
  ],
}

export function getEquipmentForIndustryCategory(industryId, categoryId) {
  const k = key(industryId, categoryId)
  return EQUIPMENT_BY_INDUSTRY_CATEGORY[k] || []
}
