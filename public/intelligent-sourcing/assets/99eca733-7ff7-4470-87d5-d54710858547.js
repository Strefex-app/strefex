/* STREFEX Intelligent Sourcing — mock intelligence dataset (shared by the DC and the map). */
(function () {
  var DOMAINS = [
    {
      id: "product", name: "Product & Component", icon: "package",
      desc: "Parts, assemblies and materials made to your drawing.",
      industries: 10, categories: 74, suppliers: 1840, verified: 62,
      example: "Plastic parts · Metal parts · Composites"
    },
    {
      id: "equipment", name: "Equipment", icon: "cog",
      desc: "Machines, tooling and automation cells for your plant.",
      industries: 8, categories: 41, suppliers: 620, verified: 48,
      example: "Injection moulding · CNC centres · Robotics"
    },
    {
      id: "service", name: "Service", icon: "clipboardCheck",
      desc: "Engineering, programme management, audit and logistics.",
      industries: 10, categories: 26, suppliers: 310, verified: 71,
      example: "APQP · Audit · Industrialisation · Customs"
    }
  ];

  var INDUSTRIES = [
    { id: "automotive", name: "Automotive", icon: "truck", registered: true, standard: "IATF 16949", suppliers: 412, cats: 7, lead: 34, coverage: 78, risk: [64, 27, 9], note: "Deepest coverage — EU, NA, APAC" },
    { id: "aerospace", name: "Aerospace & Defence", icon: "compass", registered: false, standard: "AS9100 · ITAR", suppliers: 148, cats: 6, lead: 62, coverage: 54, risk: [71, 22, 7], note: "Export-control screening required" },
    { id: "medical", name: "Medical Devices", icon: "shieldCheck", registered: false, standard: "ISO 13485 · MDR", suppliers: 121, cats: 6, lead: 48, coverage: 46, risk: [76, 19, 5], note: "Cleanroom & UDI capability tagged" },
    { id: "machinery", name: "Machinery & Industrial", icon: "factory", registered: true, standard: "ISO 9001 · CE", suppliers: 268, cats: 7, lead: 41, coverage: 66, risk: [58, 31, 11], note: "Build-to-print and turnkey lines" },
    { id: "electronics", name: "Electronics", icon: "cpu", registered: false, standard: "IPC-A-610 · RoHS", suppliers: 203, cats: 5, lead: 39, coverage: 41, risk: [52, 34, 14], note: "Allocation risk on semis" },
    { id: "rawmat", name: "Raw Materials", icon: "layers", registered: false, standard: "REACH", suppliers: 96, cats: 4, lead: 22, coverage: 33, risk: [61, 28, 11], note: "Index-linked pricing" },
    { id: "oilgas", name: "Oil & Gas", icon: "gauge", registered: false, standard: "API · ISO 29001", suppliers: 74, cats: 4, lead: 71, coverage: 28, risk: [44, 38, 18], note: "Thin coverage — request mapping" },
    { id: "energy", name: "Green Energy", icon: "trendUp", registered: false, standard: "IEC 61215", suppliers: 88, cats: 4, lead: 57, coverage: 31, risk: [57, 30, 13], note: "Fast-growing supplier base" },
    { id: "nuclear", name: "Nuclear", icon: "target", registered: false, standard: "ASME NQA-1", suppliers: 31, cats: 3, lead: 96, coverage: 19, risk: [80, 16, 4], note: "Qualification-gated" },
    { id: "household", name: "Household Products", icon: "building", registered: false, standard: "ISO 9001", suppliers: 139, cats: 5, lead: 28, coverage: 37, risk: [66, 26, 8], note: "High-volume consumer tooling" }
  ];

  function cat(id, name, icon, desc, procs, s, lead, price, headroom, risk, fit) {
    return { id: id, name: name, icon: icon, desc: desc, procs: procs, suppliers: s, lead: lead, price: price, headroom: headroom, risk: risk, fit: fit };
  }

  var CATEGORIES = {
    "product:automotive": [
      cat("plastic", "Plastic Parts", "package", "Bumpers, dashboards, trim, lighting, fluid reservoirs", ["Injection Moulding", "Blow Moulding", "Thermoforming", "Compression"], 86, 31, +2.4, 18, "low", 81),
      cat("metal", "Metal Parts", "factory", "Chassis, brackets, engine parts, structural elements", ["Stamping", "Die-casting", "CNC Machining", "Forging"], 104, 38, +5.1, 9, "medium", 78),
      cat("rubber", "Rubber & Sealing", "layers", "Seals, gaskets, hoses, bushings, vibration mounts", ["Rubber Injection", "Compression", "Extrusion", "Rubber-to-Metal"], 47, 29, -1.2, 24, "low", 76),
      cat("glass", "Glass", "verified", "Windshields, windows, mirrors, lighting optics", ["Tempering", "Lamination", "Glass Moulding"], 19, 44, +3.8, 6, "high", 68),
      cat("composite", "Composites", "layers", "Body panels, spoilers, structural reinforcements", ["Carbon Layup", "GRP/FRP", "RTM"], 23, 52, +7.6, 12, "medium", 71),
      cat("electronics", "Electronics & Wiring", "cpu", "Wire harnesses, ECUs, sensor assemblies", ["Wire Harness", "PCB Assembly", "Cable Assembly"], 61, 41, +9.3, 4, "high", 64),
      cat("textile", "Textile & Interior", "ruler", "Seat covers, headliners, acoustic insulation, carpets", ["Cut & Sew", "Lamination", "Moulded Fibre"], 34, 33, +1.1, 21, "low", 74)
    ],
    "equipment:automotive": [
      cat("imm", "Injection Moulding Machines", "cog", "Clamping 50–4000 t, hot-runner and multi-shot cells", ["Hydraulic", "All-electric", "Multi-shot", "Hot runner"], 38, 168, +4.2, 15, "low", 84),
      cat("cnc", "CNC Machining Centres", "wrench", "3/4/5-axis, HMC/VMC, turning and mill-turn", ["5-axis", "HMC", "VMC", "Mill-turn"], 52, 142, +6.5, 11, "low", 82),
      cat("press", "Presses & Transfer Lines", "gauge", "Servo and mechanical presses, transfer and tandem lines", ["Servo press", "Tandem line", "Blanking", "Hydroforming"], 21, 231, +8.1, 7, "medium", 75),
      cat("robot", "Robotics & Automation Cells", "workflow", "Handling, welding and assembly cells with safety design", ["6-axis handling", "Spot welding", "Vision-guided", "Cobot"], 44, 118, +2.9, 19, "low", 80),
      cat("metrology", "Metrology & Inspection", "ruler", "CMM, optical scanning, in-line vision and leak test", ["CMM", "Optical 3D", "In-line vision", "Leak test"], 29, 87, -0.8, 26, "low", 79),
      cat("assembly", "Assembly & Joining Lines", "network", "Manual, semi and fully automatic assembly with poka-yoke", ["Manual cell", "Semi-auto", "Full auto", "Leak/EOL test"], 33, 196, +5.4, 9, "medium", 73),
      cat("heat", "Heat & Surface Treatment", "cpu", "Furnaces, quench lines, e-coat and paint booths", ["Vacuum furnace", "Induction", "E-coat", "Paint booth"], 17, 254, +11.2, 3, "high", 66),
      cat("tooling", "Tooling & Mould Bases", "layers", "Moulds, dies, fixtures, gauges and spare inserts", ["Mould making", "Die making", "Fixtures", "Gauges"], 74, 96, +3.3, 22, "medium", 77)
    ],
    "service:automotive": [
      cat("apqp", "Programme Management (APQP)", "gantt", "Launch governance, PPAP packages, gate reviews", ["APQP", "PPAP", "Gate review"], 26, 17, +1.8, 31, "low", 83),
      cat("audit", "Quality & Supplier Audit", "clipboardCheck", "VDA 6.3, process audits, corrective-action tracking", ["VDA 6.3", "Process audit", "8D / CAPA"], 41, 22, +0.4, 44, "low", 86),
      cat("engineering", "Engineering & CAE", "compass", "Class-A, DFM, mould-flow, tolerance and durability analysis", ["Class-A", "DFM", "Mould flow", "FEA"], 37, 17, +2.2, 28, "low", 80),
      cat("industrialisation", "Industrialisation & Install", "hardHat", "Line install, commissioning, SAT, ramp-up support", ["Install", "Commissioning", "SAT", "Ramp-up"], 22, 34, +6.9, 12, "medium", 74),
      cat("logistics", "Logistics & Customs", "truck", "Inbound flows, bonded storage, origin and tariff advisory", ["Inbound", "Bonded", "Customs", "Origin"], 19, 10, +4.5, 33, "medium", 72),
      cat("testing", "Testing & Homologation", "shieldCheck", "Material, EMC, durability and regulatory approval", ["Material", "EMC", "Durability", "Homologation"], 24, 34, +3.1, 17, "low", 78)
    ],
    "equipment:aerospace": [
      cat("mill5", "5-Axis Machining Centres", "wrench", "Hard-metal structural machining, AS9100 shops", ["5-axis", "Titanium", "Adaptive"], 18, 214, +7.4, 8, "medium", 79),
      cat("ndt", "NDT & Inspection Systems", "shieldCheck", "FPI, X-ray CT, ultrasonic and eddy-current", ["FPI", "X-ray CT", "UT", "ET"], 12, 176, +5.2, 14, "low", 81),
      cat("autoclave", "Autoclaves & Composite Cells", "layers", "Curing, AFP/ATL layup and trimming cells", ["Autoclave", "AFP", "ATL", "Trim"], 9, 288, +9.8, 5, "high", 70),
      cat("am", "Additive Manufacturing", "cpu", "Metal LPBF, EBM and qualification support", ["LPBF", "EBM", "HIP", "Qual"], 14, 162, +2.6, 22, "medium", 76)
    ],
    "equipment:medical": [
      cat("cleanroom", "Cleanroom Moulding Cells", "cog", "ISO 7/8 moulding islands with validated utilities", ["ISO 7", "ISO 8", "Validated"], 16, 148, +3.4, 17, "low", 82),
      cat("sterile", "Sterilisation Equipment", "shieldCheck", "EtO, gamma and e-beam capability with IQ/OQ/PQ", ["EtO", "Gamma", "E-beam"], 8, 192, +6.1, 9, "medium", 74),
      cat("packaging", "Sterile Packaging Lines", "package", "Tray sealing, pouching, UDI print and verify", ["Tray seal", "Pouch", "UDI"], 11, 131, +2.2, 24, "low", 78),
      cat("micro", "Micro-Moulding & Assembly", "ruler", "Sub-gram parts, insert moulding, vision assembly", ["Micro-mould", "Insert", "Vision"], 13, 156, +4.8, 12, "medium", 77)
    ]
  };

  CATEGORIES["product:aerospace"] = [
    cat("structural", "Structural Machined Parts", "wrench", "Ribs, frames, fittings in titanium and hard alloys", ["5-axis milling", "Turning", "Shot peen"], 41, 84, +8.4, 6, "medium", 79),
    cat("aerocomp", "Composite Structures", "layers", "Fairings, panels, ducts — autoclave and OOA cure", ["AFP", "Hand layup", "RTM", "Autoclave"], 27, 112, +11.1, 4, "high", 72),
    cat("fasteners", "Fasteners & Hardware", "package", "Qualified fasteners, bushings, inserts, lockbolts", ["Cold forming", "Rolling", "Plating"], 33, 68, +5.7, 14, "medium", 76),
    cat("harness", "Electrical Harnesses", "cpu", "EWIS harnesses, connectors, backshells", ["Crimp", "Overbraid", "Potting"], 22, 76, +6.9, 9, "medium", 74),
    cat("castings", "Investment Castings", "factory", "Complex nickel and aluminium castings, X-ray class A", ["Investment", "HIP", "X-ray"], 14, 138, +9.6, 5, "high", 70)
  ];
  CATEGORIES["service:aerospace"] = [
    cat("as9100", "AS9100 Qualification Support", "clipboardCheck", "Gap analysis, first-article (AS9102), certification readiness", ["Gap analysis", "FAI", "Cert prep"], 18, 32, +2.4, 27, "low", 82),
    cat("itar", "Export Control & ITAR Screening", "shieldCheck", "Jurisdiction review, TAA support, denied-party screening", ["ITAR", "EAR", "TAA"], 11, 15, +3.8, 19, "medium", 78),
    cat("ndtserv", "NDT Services", "verified", "FPI, radiography, UT — Nadcap accredited providers", ["FPI", "RT", "UT"], 16, 13, +1.6, 31, "low", 80),
    cat("airworthy", "Airworthiness & DOA/POA", "compass", "Part 21 design and production organisation approval support", ["Part 21", "DOA", "POA"], 9, 34, +4.2, 22, "medium", 75)
  ];
  CATEGORIES["product:medical"] = [
    cat("moulded", "Moulded Device Components", "package", "Housings, luers, connectors — ISO 7/8 cleanroom", ["Cleanroom mould", "Insert", "Assembly"], 38, 52, +3.1, 16, "low", 81),
    cat("extruded", "Extruded Tubing & Catheters", "layers", "Multi-lumen, braided and tipped tubing", ["Extrusion", "Braiding", "Tipping"], 21, 61, +4.6, 11, "medium", 77),
    cat("implant", "Implantable Metal Components", "wrench", "Ti and CoCr machining with passivation and validation", ["Micro-machining", "Passivation", "Laser mark"], 17, 78, +7.2, 7, "medium", 74),
    cat("singleuse", "Single-Use Assemblies", "clipboardCheck", "Kitted, sterile-barrier assemblies with UDI", ["Kitting", "Sealing", "UDI"], 24, 44, +2.2, 22, "low", 79),
    cat("electmed", "Medical Electronics", "cpu", "PCBA, sensors and cable sets under IEC 60601", ["PCBA", "Cable", "Test"], 19, 58, +6.4, 9, "medium", 73)
  ];
  CATEGORIES["service:medical"] = [
    cat("mdr", "MDR / 510(k) Submission Support", "fileText", "Technical file, clinical evaluation, notified-body liaison", ["Tech file", "CER", "510(k)"], 14, 41, +5.1, 18, "medium", 79),
    cat("val", "Validation (IQ/OQ/PQ)", "clipboardCheck", "Process and equipment validation with protocols", ["IQ", "OQ", "PQ"], 17, 29, +3.4, 24, "low", 83),
    cat("bio", "Biocompatibility & Testing", "shieldCheck", "ISO 10993 panels, sterilisation and shelf-life validation", ["ISO 10993", "Sterility", "Ageing"], 12, 51, +6.8, 12, "medium", 76),
    cat("qms13485", "ISO 13485 QMS & CAPA", "verified", "QMS build-out, internal audit, CAPA remediation", ["QMS", "Audit", "CAPA"], 15, 24, +1.9, 29, "low", 81)
  ];
  CATEGORIES["product:machinery"] = [
    cat("weldments", "Weldments & Frames", "factory", "Heavy fabricated frames, machined and painted", ["Cutting", "Welding", "Machining", "Paint"], 63, 36, +4.1, 19, "low", 78),
    cat("gears", "Gears & Drivetrain", "cog", "Hobbed and ground gears, shafts, gearboxes", ["Hobbing", "Grinding", "Heat treat"], 44, 47, +6.3, 12, "medium", 76),
    cat("hydraulic", "Hydraulics & Pneumatics", "gauge", "Cylinders, manifolds, power units", ["Honing", "Manifold", "Assembly"], 37, 41, +5.2, 15, "medium", 75),
    cat("elecpanel", "Electrical Panels & Controls", "cpu", "Panel build, wiring, PLC integration to UL/CE", ["Panel build", "Wiring", "PLC"], 29, 33, +3.7, 21, "low", 79),
    cat("sheet", "Sheet Metal & Enclosures", "layers", "Laser, bend, powder coat, guarding", ["Laser", "Bending", "Powder coat"], 71, 24, +1.8, 28, "low", 80)
  ];
  CATEGORIES["service:machinery"] = [
    cat("mechdesign", "Mechanical Design & CAD", "compass", "Concept to detail design, GD&T, BOM release", ["Concept", "Detail", "GD&T"], 34, 20, +2.6, 26, "low", 81),
    cat("ce", "CE Marking & Machinery Safety", "shieldCheck", "Risk assessment, performance level, technical file", ["Risk assess", "PL/SIL", "Tech file"], 16, 26, +4.0, 20, "medium", 77),
    cat("install", "Installation & Commissioning", "hardHat", "Site install, alignment, SAT and operator training", ["Install", "Align", "SAT", "Training"], 25, 31, +7.1, 11, "medium", 74),
    cat("retrofit", "Retrofit & Modernisation", "workflow", "Control upgrades, safety retrofit, OEE recovery", ["Controls", "Safety", "OEE"], 21, 43, +5.5, 16, "medium", 76)
  ];

  /* ── Subcategories — the deep-dive level. Executive summary lives here. ── */
  function sub(id, name, desc, specs, s, lead, price, headroom, risk, fit) {
    return { id: id, name: name, desc: desc, specs: specs, suppliers: s, lead: lead, price: price, headroom: headroom, risk: risk, fit: fit };
  }
  var SUBCATS = {
    imm: [
      sub("imm-hyd", "Hydraulic — 50 to 650 t", "General-purpose clamping for thick-wall automotive parts", [["Clamp force", "50–650 t"], ["Shot weight", "60–3 200 g"], ["Tie-bar", "Standard"]], 22, 152, +3.1, 21, "low", 82),
      sub("imm-elec", "All-electric — 30 to 500 t", "Cleanroom-capable, tight repeatability, lower energy per shot", [["Clamp force", "30–500 t"], ["Repeatability", "±0.3%"], ["Energy", "−38% vs hydraulic"]], 14, 178, +6.4, 12, "medium", 86),
      sub("imm-large", "Large tonnage — 1 000 to 4 000 t", "Bumpers, instrument panels, structural mouldings", [["Clamp force", "1 000–4 000 t"], ["Platen", "up to 4 200 mm"], ["Install", "Pit required"]], 7, 246, +9.7, 5, "high", 74),
      sub("imm-multi", "Multi-shot & 2K cells", "Rotary or index plate, two materials, one cycle", [["Stations", "2–4"], ["Materials", "PP/TPE, PC/ABS"], ["Cycle gain", "~30%"]], 9, 204, +5.2, 9, "medium", 79),
      sub("imm-hotrunner", "Hot-runner & mould auxiliaries", "Manifolds, controllers, dryers, chillers, take-out robots", [["Zones", "4–128"], ["Control", "±1 °C"], ["Lead", "6–14 wk"]], 31, 68, +1.8, 28, "low", 84)
    ],
    cnc: [
      sub("cnc-5ax", "5-axis machining centres", "Single-setup complex geometry, aerospace-grade rigidity", [["Travel", "up to 1 600 mm"], ["Spindle", "12–24 krpm"], ["Accuracy", "±5 µm"]], 19, 168, +7.8, 8, "medium", 84),
      sub("cnc-hmc", "Horizontal machining centres", "Pallet-pool production machining for cast housings", [["Pallets", "2–12"], ["Taper", "HSK-A63"], ["Uptime", "92% typical"]], 16, 134, +5.9, 13, "low", 82),
      sub("cnc-vmc", "Vertical machining centres", "Workhorse 3-axis for brackets, plates, fixtures", [["Travel", "800–1 300 mm"], ["Spindle", "8–15 krpm"], ["Lead", "10–18 wk"]], 24, 96, +3.4, 24, "low", 80),
      sub("cnc-turn", "Turning & mill-turn", "Bar-fed turning with Y-axis and sub-spindle", [["Bar cap.", "up to 102 mm"], ["Axes", "up to 9"], ["Bar feeder", "Included"]], 18, 118, +4.6, 17, "low", 81)
    ],
    tooling: [
      sub("tool-mould", "Injection moulds", "Multi-cavity production moulds with hot runner", [["Cavities", "1–48"], ["Steel", "1.2343 / H13"], ["Life", "1–3 M shots"]], 38, 104, +4.2, 19, "medium", 78),
      sub("tool-die", "Stamping dies & transfer tooling", "Progressive and transfer dies for body-in-white", [["Stations", "4–18"], ["Press fit", "400–1 600 t"], ["Try-out", "Included"]], 21, 128, +6.8, 11, "medium", 75),
      sub("tool-fixture", "Fixtures & EOAT", "Welding and machining fixtures, robot end effectors", [["Repeat.", "±0.05 mm"], ["Material", "Alu / steel"], ["Lead", "6–12 wk"]], 29, 62, +2.4, 27, "low", 80),
      sub("tool-gauge", "Gauges & checking fixtures", "CMM-correlated checking fixtures with certification", [["Tolerance", "±0.02 mm"], ["Cert", "VDA / MSA"], ["Lead", "8–14 wk"]], 17, 74, +1.6, 31, "low", 82)
    ],
    plastic: [
      sub("pl-exterior", "Exterior mouldings", "Bumpers, cladding, spoilers — Class A surface", [["Part size", "up to 2 400 mm"], ["Surface", "Class A"], ["Paint", "In-line / off-line"]], 24, 38, +3.6, 14, "medium", 79),
      sub("pl-interior", "Interior trim & panels", "IP carriers, door trim, consoles — grain and soft-touch", [["Grain", "Tool-side"], ["2K / IMD", "Yes"], ["VOC", "VDA 278"]], 31, 33, +2.1, 19, "low", 81),
      sub("pl-underhood", "Under-hood & fluid handling", "Reservoirs, ducts, housings in PA / PPS, 130 °C+", [["Temp", "−40 to 150 °C"], ["Media", "Glycol / oil"], ["Burst", "Tested"]], 18, 29, +4.8, 16, "medium", 77),
      sub("pl-lighting", "Lighting optics", "Lenses and light guides in PC / PMMA, no-flow marks", [["Optical", "PC / PMMA"], ["Tolerance", "±0.05 mm"], ["Cleanroom", "ISO 8"]], 13, 41, +6.2, 9, "high", 74)
    ]
  };

  CATEGORIES["equipment:machinery"] = [
    cat("machtool", "Machine Tools", "wrench", "Lathes, mills and grinders for build-to-print work", ["Turning", "Milling", "Grinding"], 47, 96, +5.8, 14, "medium", 78),
    cat("weldcell", "Welding & Fabrication Cells", "factory", "Robot welding, positioners, fume extraction", ["Robot weld", "Positioner", "Extraction"], 34, 84, +4.4, 18, "low", 79),
    cat("paintline", "Finishing & Paint Lines", "layers", "Blast, powder coat, wet paint, curing ovens", ["Blast", "Powder", "Wet paint", "Oven"], 22, 118, +6.7, 11, "medium", 74),
    cat("testrig", "Test Rigs & End-of-Line", "gauge", "Function, pressure and endurance test benches", ["Function", "Pressure", "Endurance"], 26, 102, +3.2, 21, "low", 80),
    cat("handling", "Material Handling", "truck", "Conveyors, AGV/AMR fleets, lift and storage", ["Conveyor", "AGV/AMR", "Storage"], 31, 76, +2.6, 25, "low", 81)
  ];
  CATEGORIES["product:electronics"] = [
    cat("pcba", "PCB Assemblies", "cpu", "SMT and mixed-technology boards to Class 2/3", ["SMT", "THT", "AOI", "ICT"], 58, 46, +8.7, 8, "high", 74),
    cat("cableharness", "Cables & Harnesses", "network", "Discrete wire, ribbon and overmoulded assemblies", ["Crimp", "Overmould", "Shielding"], 44, 38, +5.2, 16, "medium", 76),
    cat("displaymod", "Display & HMI Modules", "layers", "TFT, touch stack-ups, bonded cover lenses", ["Optical bond", "Touch", "Backlight"], 21, 62, +6.9, 9, "high", 71),
    cat("sensors", "Sensors & Modules", "gauge", "Position, pressure, temperature and vision modules", ["Calibration", "Potting", "Test"], 33, 54, +11.4, 5, "high", 69),
    cat("powerelec", "Power Electronics", "trendUp", "Converters, inverters, BMS and charging boards", ["Magnetics", "Thermal", "HiPot"], 27, 71, +14.2, 4, "high", 67)
  ];
  CATEGORIES["equipment:electronics"] = [
    cat("smtline", "SMT Placement Lines", "cog", "Printer, placement, reflow and inspection in line", ["Printer", "Placement", "Reflow"], 24, 132, +7.1, 12, "medium", 78),
    cat("testers", "Test & Programming Systems", "shieldCheck", "ICT, flying probe, boundary scan, flash stations", ["ICT", "Flying probe", "Flash"], 19, 108, +4.3, 18, "low", 80),
    cat("cleanassy", "ESD & Clean Assembly Cells", "package", "ESD-controlled benches, ionisation, conformal coat", ["ESD", "Coating", "Cure"], 15, 88, +3.0, 23, "low", 79),
    cat("depanel", "Depanel & Handling", "ruler", "Router, laser depanel, magazine handling", ["Router", "Laser", "Magazine"], 12, 74, +2.4, 27, "low", 81)
  ];
  CATEGORIES["service:electronics"] = [
    cat("dfmelec", "DFM & Design Support", "compass", "Schematic review, stack-up, EMC design support", ["DFM", "Stack-up", "EMC"], 22, 17, +3.4, 24, "low", 80),
    cat("emc", "EMC & Safety Testing", "shieldCheck", "Pre-compliance and accredited EMC, IEC 62368", ["Pre-compliance", "Accredited", "Safety"], 17, 29, +5.6, 14, "medium", 77),
    cat("obsolescence", "Obsolescence & Sourcing", "search", "EOL monitoring, last-time buys, cross-references", ["EOL watch", "LTB", "Cross-ref"], 13, 13, +7.8, 19, "high", 72),
    cat("rework", "Rework & Repair", "wrench", "BGA rework, screening and field-return analysis", ["BGA", "Screening", "Returns"], 18, 10, +2.2, 31, "low", 78)
  ];
  CATEGORIES["product:rawmat"] = [
    cat("steelmat", "Steel & Alloys", "layers", "Coil, plate, bar and tube to grade with mill certs", ["Coil", "Plate", "Bar", "Tube"], 41, 24, +6.4, 22, "medium", 77),
    cat("almat", "Aluminium & Light Alloys", "layers", "Extrusion billet, sheet, castings alloy", ["Billet", "Sheet", "Ingot"], 33, 28, +9.1, 17, "high", 73),
    cat("resins", "Polymers & Resins", "package", "Commodity and engineering resins, masterbatch", ["Commodity", "Engineering", "Masterbatch"], 38, 18, +4.8, 26, "medium", 76),
    cat("chemicals", "Chemicals & Consumables", "verified", "Lubricants, adhesives, coatings, process media", ["Lubricant", "Adhesive", "Coating"], 29, 15, +3.2, 29, "low", 79)
  ];
  CATEGORIES["equipment:rawmat"] = [
    cat("cutservice", "Cutting & Slitting Lines", "ruler", "Coil slitting, cut-to-length, blanking", ["Slitting", "CTL", "Blanking"], 14, 88, +5.1, 16, "medium", 76),
    cat("silo", "Storage & Dosing Systems", "building", "Silos, dryers, gravimetric dosing and conveying", ["Silo", "Dryer", "Dosing"], 17, 64, +3.6, 22, "low", 79),
    cat("labmat", "Material Test Equipment", "gauge", "Tensile, DSC, melt-flow and spectrometry", ["Tensile", "DSC", "Spectro"], 11, 72, +2.8, 25, "low", 80)
  ];
  CATEGORIES["service:rawmat"] = [
    cat("hedging", "Index & Hedging Advisory", "trendUp", "Index-linked clause design and exposure modelling", ["Index", "Clause", "Exposure"], 9, 7, +1.4, 34, "low", 78),
    cat("reachsvc", "REACH & Compliance", "shieldCheck", "SVHC screening, IMDS entries, declarations", ["SVHC", "IMDS", "Declaration"], 14, 14, +2.6, 27, "low", 81),
    cat("mattest", "Material Testing Labs", "verified", "Certification, failure analysis, batch release", ["Certification", "Failure", "Release"], 16, 13, +3.8, 24, "low", 79)
  ];
  CATEGORIES["product:oilgas"] = [
    cat("valves", "Valves & Actuation", "cog", "Ball, gate and control valves to API 6D", ["Casting", "Machining", "Assembly"], 26, 84, +7.2, 12, "medium", 74),
    cat("pipefit", "Pipe, Fittings & Flanges", "layers", "Seamless and welded, API 5L and B16.5", ["Seamless", "Welded", "Flange"], 31, 66, +5.4, 18, "medium", 76),
    cat("pressvessel", "Pressure Vessels", "factory", "ASME VIII separators, skids and heat exchangers", ["Rolling", "Welding", "PWHT"], 18, 128, +8.8, 8, "high", 71),
    cat("subsea", "Subsea Components", "compass", "Connectors, manifolds, corrosion-resistant alloys", ["CRA machining", "Cladding", "Test"], 11, 174, +11.6, 5, "high", 68)
  ];
  CATEGORIES["equipment:oilgas"] = [
    cat("weldauto", "Welding & Cladding Systems", "wrench", "Orbital welding, weld overlay and cladding cells", ["Orbital", "Overlay", "Cladding"], 12, 146, +6.8, 11, "medium", 75),
    cat("hpTest", "High-Pressure Test Rigs", "gauge", "Hydrostatic and gas test to 1,500 bar", ["Hydrostatic", "Gas", "Cycling"], 9, 132, +4.6, 16, "medium", 76),
    cat("ndtog", "NDT Systems", "shieldCheck", "RT, UT, PAUT and hardness for weld inspection", ["RT", "UT", "PAUT"], 10, 118, +5.2, 14, "low", 78)
  ];
  CATEGORIES["service:oilgas"] = [
    cat("apiqual", "API Qualification Support", "clipboardCheck", "Monogram readiness, licence and audit prep", ["Monogram", "Licence", "Audit"], 11, 35, +3.4, 21, "medium", 77),
    cat("weldeng", "Welding Engineering", "compass", "WPS/PQR, procedure qualification and witness", ["WPS", "PQR", "Witness"], 14, 17, +4.2, 24, "low", 79),
    cat("inspection", "Third-Party Inspection", "verified", "Expediting, source inspection and release notes", ["Expediting", "Source", "Release"], 17, 9, +2.8, 28, "low", 80)
  ];
  CATEGORIES["product:energy"] = [
    cat("pvmount", "PV Mounting & Trackers", "layers", "Roll-formed structures, trackers, foundations", ["Roll form", "Galvanise", "Assembly"], 24, 48, +4.2, 19, "medium", 76),
    cat("windparts", "Wind Turbine Components", "cog", "Hubs, frames, yaw and pitch assemblies", ["Casting", "Machining", "Coating"], 17, 112, +7.4, 9, "high", 72),
    cat("batterypack", "Battery Packs & Modules", "cpu", "Modules, busbars, cooling plates, BMS integration", ["Welding", "Cooling", "BMS"], 22, 74, +12.8, 6, "high", 69),
    cat("hydrogen", "Hydrogen & Electrolyser Parts", "verified", "Stacks, bipolar plates, sealing, balance of plant", ["Plates", "Sealing", "BoP"], 13, 96, +15.4, 4, "high", 66)
  ];
  CATEGORIES["equipment:energy"] = [
    cat("laminate", "Lamination & Stacking Lines", "cog", "Cell stringing, lamination and framing", ["Stringing", "Lamination", "Framing"], 14, 138, +8.2, 10, "high", 72),
    cat("packassy", "Battery Assembly Lines", "workflow", "Module and pack assembly with laser welding", ["Laser weld", "Leak test", "EOL"], 16, 164, +10.6, 7, "high", 70),
    cat("formation", "Formation & Ageing Systems", "gauge", "Formation cabinets, ageing racks, cycling", ["Formation", "Ageing", "Cycling"], 9, 148, +6.4, 13, "medium", 74)
  ];
  CATEGORIES["service:energy"] = [
    cat("iecqual", "IEC Certification Support", "clipboardCheck", "IEC 61215 / 62133 test planning and dossier", ["Test plan", "Dossier", "Witness"], 12, 38, +5.8, 17, "medium", 76),
    cat("gridcode", "Grid Code & Interconnection", "network", "Compliance studies, protection settings", ["Studies", "Protection", "Filing"], 10, 47, +7.2, 12, "medium", 74),
    cat("epc", "EPC & Commissioning", "hardHat", "Install, commissioning and performance-ratio test", ["Install", "Commission", "PR test"], 15, 65, +6.4, 14, "medium", 73)
  ];
  CATEGORIES["product:nuclear"] = [
    cat("nqasafety", "Safety-Class Components", "shieldCheck", "NQA-1 machined and welded safety-class parts", ["Machining", "Welding", "Dedication"], 8, 168, +6.2, 7, "high", 72),
    cat("shielding", "Shielding & Containment", "layers", "Lead, borated and composite shielding assemblies", ["Casting", "Cladding", "Assembly"], 6, 142, +5.4, 11, "high", 70),
    cat("instrumentation", "Nuclear Instrumentation", "cpu", "Qualified detectors, cabling and cabinets", ["Qualification", "Cabling", "Cabinet"], 5, 196, +8.6, 5, "high", 68)
  ];
  CATEGORIES["equipment:nuclear"] = [
    cat("remotehand", "Remote Handling Systems", "workflow", "Manipulators, shielded transfer, hot-cell kit", ["Manipulator", "Transfer", "Hot cell"], 4, 232, +9.4, 4, "high", 66),
    cat("decontam", "Decontamination Systems", "verified", "Wash, abrasive and chemical decon units", ["Wash", "Abrasive", "Chemical"], 5, 178, +6.8, 9, "high", 69)
  ];
  CATEGORIES["service:nuclear"] = [
    cat("nqasvc", "NQA-1 Programme Support", "clipboardCheck", "Programme build, commercial-grade dedication", ["Programme", "CGD", "Audit"], 7, 75, +4.6, 14, "medium", 75),
    cat("qualtest", "Qualification Testing", "gauge", "Seismic, environmental and EQ ageing", ["Seismic", "Environmental", "Ageing"], 6, 65, +7.2, 8, "high", 71),
    cat("wastesvc", "Waste & Decommissioning", "hardHat", "Characterisation, packaging, transport licensing", ["Characterise", "Package", "Licence"], 8, 80, +5.8, 12, "medium", 73)
  ];
  CATEGORIES["product:household"] = [
    cat("smallappl", "Small Appliance Assemblies", "package", "Housings, mechanisms and finished assemblies", ["Moulding", "Assembly", "Pack"], 46, 32, +2.8, 24, "low", 78),
    cat("kitchenware", "Kitchenware & Metal Goods", "factory", "Stamped, spun and coated metal goods", ["Stamping", "Spinning", "Coating"], 38, 28, +3.6, 27, "low", 79),
    cat("packagingcons", "Consumer Packaging", "layers", "Cartons, blisters, labels and inserts", ["Carton", "Blister", "Label"], 52, 16, +4.4, 31, "low", 80),
    cat("textilehome", "Home Textiles", "ruler", "Cut-and-sew soft goods, filling, finishing", ["Cut & sew", "Filling", "Finishing"], 34, 34, +1.8, 29, "low", 77)
  ];
  CATEGORIES["equipment:household"] = [
    cat("packline", "Packaging Lines", "cog", "Form-fill-seal, cartoning, labelling, palletising", ["FFS", "Carton", "Palletise"], 21, 84, +4.2, 19, "low", 78),
    cat("assyhouse", "Assembly & Test Cells", "workflow", "Semi-automatic assembly with function test", ["Semi-auto", "Function test", "Marking"], 24, 72, +3.4, 23, "low", 79),
    cat("printdeco", "Printing & Decoration", "layers", "Pad print, IMD, laser marking and hot stamp", ["Pad print", "IMD", "Laser"], 18, 58, +2.6, 26, "low", 80)
  ];
  CATEGORIES["service:household"] = [
    cat("consumercert", "Consumer Safety & Certification", "shieldCheck", "GS, CE, CPSIA and food-contact compliance", ["GS/CE", "CPSIA", "Food contact"], 16, 26, +3.2, 22, "low", 79),
    cat("packdesign", "Packaging Design", "compass", "Structural design, artwork and drop testing", ["Structural", "Artwork", "Drop test"], 19, 17, +2.4, 28, "low", 80),
    cat("qcinsp", "Pre-Shipment Inspection", "clipboardCheck", "AQL inspection, loading supervision, factory audit", ["AQL", "Loading", "Audit"], 23, 9, +1.6, 33, "low", 82)
  ];

  var BUYERS = [
    { id: "muc", name: "Munich plant", cc: "DE", lat: 48.14, lon: 11.58, cont: "EU" },
    { id: "det", name: "Detroit plant", cc: "US", lat: 42.33, lon: -83.05, cont: "NA" },
    { id: "qro", name: "Querétaro plant", cc: "MX", lat: 20.59, lon: -100.39, cont: "NA" },
    { id: "sha", name: "Shanghai plant", cc: "CN", lat: 31.23, lon: 121.47, cont: "APAC" }
  ];
  var CONT = { DE: "EU", CZ: "EU", SE: "EU", PL: "EU", PT: "EU", TR: "EU", FR: "EU", IE: "EU", LT: "EU", ES: "EU", GB: "EU", UA: "EU", MA: "EU", DK: "EU", IT: "EU", US: "NA", MX: "NA", CN: "APAC", JP: "APAC", IN: "APAC", KR: "APAC", MY: "APAC" };

  var SUPPLIERS = [
    { name: "Meridian Forge", city: "Stuttgart", cc: "DE", lat: 48.78, lon: 9.18, fit: 94, risk: 18, cap: 82, onTime: 99, ppm: 120, lead: 26, delta: -2.1, spend: 8.4, certs: ["IATF", "ISO 14001"], audit: "Passed", auditIn: 214, fin: "A", tariff: "None", tier2: "Mapped" },
    { name: "Kessler Precision", city: "Brno", cc: "CZ", lat: 49.19, lon: 16.61, fit: 88, risk: 27, cap: 91, onTime: 96, ppm: 260, lead: 31, delta: +1.4, spend: 5.7, certs: ["IATF"], audit: "Due", auditIn: 22, fin: "B+", tariff: "None", tier2: "Partial" },
    { name: "Nordic Stamping", city: "Gothenburg", cc: "SE", lat: 57.71, lon: 11.97, fit: 79, risk: 34, cap: 74, onTime: 91, ppm: 410, lead: 35, delta: +4.8, spend: 4.2, certs: ["ISO 9001"], audit: "Due", auditIn: 41, fin: "B", tariff: "None", tier2: "Unknown" },
    { name: "Vantage Polymers", city: "Wrocław", cc: "PL", lat: 51.11, lon: 17.03, fit: 63, risk: 61, cap: 96, onTime: 81, ppm: 1180, lead: 44, delta: +9.2, spend: 3.0, certs: ["ISO 9001"], audit: "Flagged", auditIn: -12, fin: "C", tariff: "None", tier2: "Unknown" },
    { name: "Apex Driveline", city: "Detroit", cc: "US", lat: 42.33, lon: -83.05, fit: 86, risk: 24, cap: 78, onTime: 97, ppm: 190, lead: 29, delta: +3.6, spend: 12.1, certs: ["IATF", "ISO 45001"], audit: "Passed", auditIn: 301, fin: "A-", tariff: "None", tier2: "Mapped" },
    { name: "Rio Molde", city: "Monterrey", cc: "MX", lat: 25.69, lon: -100.32, fit: 74, risk: 39, cap: 88, onTime: 89, ppm: 520, lead: 33, delta: -4.7, spend: 6.3, certs: ["IATF"], audit: "Passed", auditIn: 96, fin: "B+", tariff: "USMCA ok", tier2: "Partial" },
    { name: "Anhui Toolworks", city: "Hefei", cc: "CN", lat: 31.82, lon: 117.23, fit: 71, risk: 58, cap: 93, onTime: 85, ppm: 780, lead: 58, delta: -11.3, spend: 7.9, certs: ["IATF"], audit: "Due", auditIn: 9, fin: "B", tariff: "Sec. 301 · 25%", tier2: "Unknown" },
    { name: "Sakura Molding", city: "Nagoya", cc: "JP", lat: 35.18, lon: 136.91, fit: 90, risk: 21, cap: 69, onTime: 98, ppm: 90, lead: 47, delta: +7.4, spend: 4.8, certs: ["IATF", "ISO 14001"], audit: "Passed", auditIn: 188, fin: "A", tariff: "FTA", tier2: "Mapped" },
    { name: "Bharat Polytech", city: "Pune", cc: "IN", lat: 18.52, lon: 73.86, fit: 68, risk: 47, cap: 85, onTime: 87, ppm: 640, lead: 52, delta: -8.9, spend: 2.6, certs: ["ISO 9001"], audit: "Due", auditIn: 34, fin: "B-", tariff: "GSP lapsed", tier2: "Unknown" },
    { name: "Anatolia Kalıp", city: "Bursa", cc: "TR", lat: 40.19, lon: 29.06, fit: 77, risk: 44, cap: 90, onTime: 90, ppm: 470, lead: 38, delta: -6.2, spend: 3.4, certs: ["IATF"], audit: "Passed", auditIn: 128, fin: "B", tariff: "EU CU", tier2: "Partial" },
    { name: "Lusitano Moldes", city: "Marinha Grande", cc: "PT", lat: 39.75, lon: -8.93, fit: 83, risk: 29, cap: 71, onTime: 94, ppm: 210, lead: 30, delta: +0.8, spend: 2.9, certs: ["IATF", "ISO 50001"], audit: "Passed", auditIn: 156, fin: "A-", tariff: "None", tier2: "Mapped" },
    { name: "Seoul Injection", city: "Incheon", cc: "KR", lat: 37.46, lon: 126.71, fit: 81, risk: 33, cap: 87, onTime: 93, ppm: 300, lead: 45, delta: -3.4, spend: 5.1, certs: ["IATF"], audit: "Due", auditIn: 63, fin: "B+", tariff: "FTA", tier2: "Partial" },
    { name: "Alpine Aerostructures", city: "Toulouse", cc: "FR", lat: 43.60, lon: 1.44, fit: 89, risk: 23, cap: 76, onTime: 96, ppm: 140, lead: 84, delta: +6.2, spend: 6.8, certs: ["AS9100", "Nadcap"], audit: "Passed", auditIn: 232, fin: "A-", tariff: "None", tier2: "Mapped", industries: ["Aerospace & Defence", "Machinery & Industrial"], stage: 6 },
    { name: "Wichita Precision", city: "Wichita", cc: "US", lat: 37.69, lon: -97.34, fit: 84, risk: 28, cap: 83, onTime: 94, ppm: 210, lead: 76, delta: +4.1, spend: 5.4, certs: ["AS9100", "ITAR"], audit: "Due", auditIn: 38, fin: "B+", tariff: "None", tier2: "Partial", industries: ["Aerospace & Defence"], stage: 6 },
    { name: "Baltic Medtech", city: "Kaunas", cc: "LT", lat: 54.90, lon: 23.90, fit: 87, risk: 26, cap: 72, onTime: 97, ppm: 95, lead: 54, delta: +2.4, spend: 3.6, certs: ["ISO 13485", "MDSAP"], audit: "Passed", auditIn: 174, fin: "A-", tariff: "None", tier2: "Mapped", industries: ["Medical Devices"], stage: 6 },
    { name: "Galway Sterile", city: "Galway", cc: "IE", lat: 53.27, lon: -9.05, fit: 91, risk: 19, cap: 68, onTime: 98, ppm: 60, lead: 61, delta: +8.7, spend: 4.4, certs: ["ISO 13485", "ISO 14001"], audit: "Passed", auditIn: 288, fin: "A", tariff: "None", tier2: "Mapped", industries: ["Medical Devices"], stage: 6 },
    { name: "Shenzhen Circuitworks", city: "Shenzhen", cc: "CN", lat: 22.54, lon: 114.06, fit: 73, risk: 54, cap: 94, onTime: 88, ppm: 520, lead: 42, delta: -14.6, spend: 6.1, certs: ["IPC-A-610", "ISO 9001"], audit: "Due", auditIn: 17, fin: "B", tariff: "Sec. 301 · 25%", tier2: "Unknown", industries: ["Electronics"], stage: 6 },
    { name: "Penang Assembly", city: "Penang", cc: "MY", lat: 5.41, lon: 100.33, fit: 80, risk: 36, cap: 89, onTime: 92, ppm: 280, lead: 47, delta: -7.8, spend: 4.9, certs: ["IPC-A-610"], audit: "Passed", auditIn: 112, fin: "B+", tariff: "FTA", tier2: "Partial", industries: ["Electronics", "Medical Devices"], stage: 6 },
    { name: "Norrland Steel", city: "Luleå", cc: "SE", lat: 65.58, lon: 22.15, fit: 85, risk: 24, cap: 79, onTime: 95, ppm: 170, lead: 26, delta: +5.4, spend: 7.2, certs: ["ISO 9001", "ISO 50001"], audit: "Passed", auditIn: 205, fin: "A", tariff: "None", tier2: "Mapped", industries: ["Raw Materials", "Machinery & Industrial"], stage: 6 },
    { name: "Aberdeen Valve", city: "Aberdeen", cc: "GB", lat: 57.15, lon: -2.09, fit: 78, risk: 37, cap: 81, onTime: 91, ppm: 330, lead: 92, delta: +3.8, spend: 3.2, certs: ["API 6D", "ISO 9001"], audit: "Due", auditIn: 44, fin: "B", tariff: "UK-EU TCA", tier2: "Partial", industries: ["Oil & Gas"], stage: 6 },
    { name: "Iberia Solar Structures", city: "Zaragoza", cc: "ES", lat: 41.65, lon: -0.89, fit: 76, risk: 41, cap: 92, onTime: 89, ppm: 420, lead: 38, delta: -5.2, spend: 2.8, certs: ["ISO 9001"], audit: "Due", auditIn: 29, fin: "B-", tariff: "None", tier2: "Unknown", industries: ["Green Energy"], stage: 6 },
    { name: "Guangdong Housewares", city: "Foshan", cc: "CN", lat: 23.02, lon: 113.12, fit: 70, risk: 49, cap: 95, onTime: 86, ppm: 690, lead: 34, delta: -16.2, spend: 2.1, certs: ["ISO 9001"], audit: "Flagged", auditIn: -5, fin: "C", tariff: "Sec. 301 · 25%", tier2: "Unknown", industries: ["Household Products"], stage: 6 },
    /* registered but not yet publishable — used by the registration-path screen */
    { name: "Karpaty Tooling", city: "Lviv", cc: "UA", lat: 49.84, lon: 24.03, fit: 66, risk: 58, cap: 88, onTime: 84, ppm: 610, lead: 49, delta: -12.4, spend: 0.0, certs: ["ISO 9001"], audit: "None", auditIn: -40, fin: "C", tariff: "EU DCFTA", tier2: "Unknown", industries: ["Automotive", "Machinery & Industrial"], stage: 3 },
    { name: "Casablanca Harness", city: "Casablanca", cc: "MA", lat: 33.57, lon: -7.59, fit: 69, risk: 46, cap: 90, onTime: 87, ppm: 480, lead: 41, delta: -9.6, spend: 0.0, certs: ["IATF"], audit: "Scheduled", auditIn: 21, fin: "B-", tariff: "EU AA", tier2: "Unknown", industries: ["Automotive", "Electronics"], stage: 4 },
    { name: "Gujarat Polymers", city: "Ahmedabad", cc: "IN", lat: 23.03, lon: 72.58, fit: 64, risk: 52, cap: 86, onTime: 82, ppm: 820, lead: 55, delta: -13.8, spend: 0.0, certs: [], audit: "None", auditIn: -60, fin: "C", tariff: "GSP lapsed", tier2: "Unknown", industries: ["Raw Materials", "Household Products"], stage: 2 },
    /* thin-industry coverage — nuclear, oil & gas, energy, raw materials, household, medical */
    { name: "Creusot Nuclear Forge", city: "Le Creusot", cc: "FR", lat: 46.80, lon: 4.43, fit: 88, risk: 22, cap: 74, onTime: 96, ppm: 80, lead: 168, delta: +9.4, spend: 4.1, certs: ["ASME NQA-1", "ISO 9001"], audit: "Passed", auditIn: 262, fin: "A-", tariff: "None", tier2: "Mapped", industries: ["Nuclear", "Oil & Gas", "Machinery & Industrial"], stage: 6 },
    { name: "Sheffield Safety Systems", city: "Sheffield", cc: "GB", lat: 53.38, lon: -1.47, fit: 82, risk: 31, cap: 78, onTime: 93, ppm: 150, lead: 154, delta: +6.8, spend: 2.4, certs: ["ASME NQA-1"], audit: "Due", auditIn: 41, fin: "B+", tariff: "UK-EU TCA", tier2: "Partial", industries: ["Nuclear", "Oil & Gas"], stage: 6 },
    { name: "Onsan Heavy", city: "Ulsan", cc: "KR", lat: 35.54, lon: 129.31, fit: 79, risk: 35, cap: 88, onTime: 91, ppm: 240, lead: 132, delta: -6.4, spend: 5.6, certs: ["API 6D", "ASME U"], audit: "Passed", auditIn: 148, fin: "B+", tariff: "FTA", tier2: "Partial", industries: ["Oil & Gas", "Nuclear", "Raw Materials"], stage: 6 },
    { name: "Houston Wellhead", city: "Houston", cc: "US", lat: 29.76, lon: -95.37, fit: 84, risk: 27, cap: 80, onTime: 95, ppm: 190, lead: 88, delta: +4.6, spend: 6.4, certs: ["API 6A", "ISO 29001"], audit: "Passed", auditIn: 196, fin: "A-", tariff: "None", tier2: "Mapped", industries: ["Oil & Gas"], stage: 6 },
    { name: "Jutland Windparts", city: "Esbjerg", cc: "DK", lat: 55.47, lon: 8.45, fit: 86, risk: 25, cap: 84, onTime: 94, ppm: 210, lead: 74, delta: +7.2, spend: 5.9, certs: ["ISO 9001", "ISO 14001"], audit: "Passed", auditIn: 178, fin: "A-", tariff: "None", tier2: "Mapped", industries: ["Green Energy", "Machinery & Industrial"], stage: 6 },
    { name: "Anatolia Cellworks", city: "İzmir", cc: "TR", lat: 38.42, lon: 27.14, fit: 75, risk: 42, cap: 93, onTime: 88, ppm: 460, lead: 52, delta: -8.4, spend: 3.1, certs: ["IEC 61215"], audit: "Due", auditIn: 33, fin: "B", tariff: "EU CU", tier2: "Unknown", industries: ["Green Energy", "Electronics"], stage: 6 },
    { name: "Rhein Battery Systems", city: "Duisburg", cc: "DE", lat: 51.43, lon: 6.76, fit: 90, risk: 20, cap: 77, onTime: 97, ppm: 110, lead: 66, delta: +10.6, spend: 7.8, certs: ["IATF", "ISO 14001"], audit: "Passed", auditIn: 244, fin: "A", tariff: "None", tier2: "Mapped", industries: ["Green Energy", "Automotive", "Raw Materials"], stage: 6 },
    { name: "Ruhr Alloys", city: "Bochum", cc: "DE", lat: 51.48, lon: 7.22, fit: 83, risk: 26, cap: 86, onTime: 94, ppm: 200, lead: 24, delta: +5.8, spend: 9.2, certs: ["ISO 9001", "REACH"], audit: "Passed", auditIn: 214, fin: "A-", tariff: "None", tier2: "Mapped", industries: ["Raw Materials", "Machinery & Industrial", "Oil & Gas"], stage: 6 },
    { name: "Zhejiang Homegoods", city: "Ningbo", cc: "CN", lat: 29.87, lon: 121.55, fit: 72, risk: 47, cap: 94, onTime: 87, ppm: 640, lead: 36, delta: -15.4, spend: 2.6, certs: ["ISO 9001", "GS"], audit: "Due", auditIn: 26, fin: "B-", tariff: "Sec. 301 · 25%", tier2: "Unknown", industries: ["Household Products", "Electronics"], stage: 6 },
    { name: "Lombardia Casalinghi", city: "Brescia", cc: "IT", lat: 45.54, lon: 10.22, fit: 81, risk: 29, cap: 82, onTime: 93, ppm: 260, lead: 31, delta: +2.8, spend: 3.8, certs: ["ISO 9001", "Food contact"], audit: "Passed", auditIn: 164, fin: "B+", tariff: "None", tier2: "Partial", industries: ["Household Products", "Machinery & Industrial"], stage: 6 },
    { name: "Minnesota Medtech", city: "Minneapolis", cc: "US", lat: 44.98, lon: -93.27, fit: 92, risk: 18, cap: 71, onTime: 98, ppm: 50, lead: 58, delta: +11.2, spend: 6.7, certs: ["ISO 13485", "FDA reg."], audit: "Passed", auditIn: 296, fin: "A", tariff: "None", tier2: "Mapped", industries: ["Medical Devices", "Electronics"], stage: 6 },
    { name: "Tijuana Devices", city: "Tijuana", cc: "MX", lat: 32.51, lon: -117.04, fit: 78, risk: 34, cap: 90, onTime: 92, ppm: 320, lead: 44, delta: -6.8, spend: 4.3, certs: ["ISO 13485"], audit: "Due", auditIn: 37, fin: "B+", tariff: "USMCA ok", tier2: "Partial", industries: ["Medical Devices", "Automotive"], stage: 6 }
  ];

  var REGIONS = [
    { name: "Western Europe", pct: 34, tone: "low" },
    { name: "Central & Eastern EU", pct: 21, tone: "medium" },
    { name: "North America", pct: 18, tone: "low" },
    { name: "Greater China", pct: 14, tone: "high" },
    { name: "Rest of APAC", pct: 9, tone: "medium" },
    { name: "Türkiye & MENA", pct: 4, tone: "medium" }
  ];

  var GAPS = [
    { area: "Empty states", gap: "\"No manufacturers found\" is a dead end — no reason, no next step, no coverage number.", sev: "high", fix: "Explain WHY (no coverage vs. filters too narrow), show adjacent categories with counts, and offer three exits: widen filters, request category mapping, invite plants by email." },
    { area: "Data coverage", gap: "Executive summary shows Fit / Risk / Capacity at 0% — indistinguishable from a genuinely bad supply base.", sev: "high", fix: "Never render a KPI without a sample size and coverage badge. Show \"— · no data (0 of 86 suppliers scored)\" instead of 0%." },
    { area: "Access model", gap: "\"To access another industry, create a separate account registration\" forces duplicate accounts.", sev: "high", fix: "One account, per-industry entitlements. Replace with an in-page \"Request access\" that routes to admin approval." },
    { area: "Indicators", gap: "Only three indicators (fit / risk / capacity) — no quality, cost or delivery truth.", sev: "high", fix: "Add PPM quality, on-time %, quoted-vs-should-cost delta, lead-time spread, audit coverage and financial health. Define each with a tooltip and an owner." },
    { area: "Concentration", gap: "No view of single-source or regional concentration — the top procurement risk is invisible.", sev: "high", fix: "Add top-3 concentration, single-source part count and region mix with a threshold alert." },
    { area: "Trade & tariff", gap: "No tariff, origin or export-control signal, despite aerospace / ITAR and Section 301 realities.", sev: "medium", fix: "Tag landed-cost exposure per supplier and flag export-controlled categories before the RFQ is sent." },
    { area: "Sub-tier", gap: "Tier-2 visibility is absent — a mapped Tier-1 can still hide a single-source Tier-2.", sev: "medium", fix: "Add a sub-tier status column (Mapped / Partial / Unknown) and target coverage as a KPI." },
    { area: "Comparison", gap: "No side-by-side quote or supplier comparison — the Track RFQs tab is numbered \"5.\" with no 1–4.", sev: "high", fix: "Add multi-select on the table feeding a fixed compare tray, and renumber the flow: Find → Scope → Send → Track → Award." },
    { area: "Map", gap: "World map renders with no pins, no clustering, no filter link, and a caveat about pin accuracy front and centre.", sev: "medium", fix: "Colour pins by risk, size by spend, cluster by region, cross-filter with the table, and move the accuracy caveat into an info tooltip." },
    { area: "RFQ form", gap: "The RFQ page is one 20-field scroll with conditional IATF blocks appearing without warning.", sev: "medium", fix: "Split into Scope → Commercial → Quality & compliance → Documents, with a progress rail and a saved-template picker." },
    { area: "Should-cost", gap: "RFQ Intelligence estimate lives in a separate flow — buyers send RFQs with no target price attached." },
    { area: "Decision trail", gap: "No award justification, approval or audit trail on the summary.", sev: "medium", fix: "Add an award-recommendation block with rationale, approver and a timestamped decision log." },
    { area: "Freshness", gap: "Nothing states how old the supplier data is or where it came from.", sev: "medium", fix: "Per-panel \"as of\" stamp plus a source chip: self-declared, STREFEX-verified, or registry-sourced." },
    { area: "Terminology", gap: "\"Vendors\", \"manufacturers\", \"plants\", \"suppliers\" and \"marketplace catalog suppliers\" all refer to the same object.", sev: "low", fix: "Pick one noun — supplier — and one child object — plant. Apply it across nav, tables and empty states." },
    { area: "Copy", gap: "Typos and internal notes leak into the UI (\"evicence\", \"Superadmin only — off hides static directory seed\").", sev: "low", fix: "Move admin-only explanations behind an info icon; run a copy pass with the STREFEX voice rules." }
  ];
  GAPS[10].sev = "high";
  GAPS[10].fix = "Surface the live should-cost estimate inline on the RFQ as a target price, and show quoted-vs-should-cost delta on every returned quote.";

  GAPS.push({
    area: "Logistics", sev: "medium",
    gap: "Lead time is quoted as one number — it hides where the part actually ships from and how it travels.",
    fix: "Split lead time into production + transit, and show indicative transit by air / rail / road / sea from the supplier's plant to the receiving plant, with an estimated delivery date. Reference only, clearly labelled."
  });

  /* ── Subcategories: the deep-dive level. Authored specs where they matter,
     deterministic metrics derived from the parent category everywhere else. ── */
  var SPEC = {
    "Injection Moulding": ["Shot weight 5 g – 4 kg", "Tools: 1K / 2K / 3K", "Cycle 12–95 s"],
    "Blow Moulding": ["Extrusion & injection blow", "0.2–220 L vessels", "Multi-layer barrier"],
    "Thermoforming": ["Twin-sheet & pressure", "Sheet 0.5–8 mm", "Trim: CNC / laser"],
    "Compression": ["SMC / BMC", "Press 100–2500 t", "Class-A capable"],
    "Stamping": ["Press 60–2000 t", "Progressive & transfer", "HSLA / DP / boron"],
    "Die-casting": ["Al / Mg / Zn", "Cold & hot chamber", "Vacuum-assist"],
    "CNC Machining": ["3 / 4 / 5-axis", "±0.01 mm capable", "Lights-out cells"],
    "Forging": ["Hot & warm", "0.2–90 kg net", "Ring rolling"],
    "Rubber Injection": ["EPDM / NBR / FKM", "LSR capable", "Insert overmould"],
    "Extrusion": ["Profile & tube", "Co-extrusion", "In-line splicing"],
    "Rubber-to-Metal": ["Bonded mounts", "Pull-test verified", "Salt-spray 720 h"],
    "Tempering": ["Flat & bent glass", "3–19 mm", "HST tested"],
    "Lamination": ["PVB / SGP", "Acoustic interlayer", "HUD wedge"],
    "Carbon Layup": ["Prepreg & dry fibre", "Autoclave cure", "Class-A finish"],
    "GRP/FRP": ["Hand & spray layup", "RTM light", "Gel-coat"],
    "RTM": ["High-pressure RTM", "Preform automation", "Net-shape"],
    "Wire Harness": ["Up to 400 circuits", "HV orange", "Ultrasonic splice"],
    "PCB Assembly": ["SMT + THT", "AOI & ICT", "Conformal coat"],
    "Cable Assembly": ["Overmoulded", "Shielded / coax", "Continuity 100%"],
    "Cut & Sew": ["Leather / textile / TPO", "Perforation & quilting", "Laser cut"],
    "Moulded Fibre": ["Natural-fibre mats", "Acoustic tuned", "Recyclable"],
    "Hydraulic": ["50–4000 t clamp", "Accumulator assist", "Refurb available"],
    "All-electric": ["50–650 t clamp", "Cleanroom ready", "±0.3% shot repeat"],
    "Multi-shot": ["2K / 3K rotary", "Index & core-back", "Robot integrated"],
    "Hot runner": ["Valve-gate systems", "Up to 128 drops", "Sequential control"],
    "5-axis": ["Simultaneous 5-ax", "Ti / Inconel proven", "Adaptive control"],
    "HMC": ["Pallet pool 6–40", "Twin-spindle option", "Through-spindle 70 bar"],
    "VMC": ["X 800–3000 mm", "20k rpm option", "Probing standard"],
    "Mill-turn": ["Y-axis turning", "Bar 20–120 mm", "Sub-spindle"],
    "Servo press": ["160–1600 t", "Programmable slide", "Die cushion"],
    "Tandem line": ["3–6 press stations", "Crossbar transfer", "18–24 spm"],
    "Blanking": ["Coil to blank", "Laser blanking cell", "Nesting software"],
    "Hydroforming": ["Tube & sheet", "Up to 4000 bar", "Prototype tooling"],
    "6-axis handling": ["Payload 6–500 kg", "Reach to 3.9 m", "Safety PL d"],
    "Spot welding": ["Servo guns", "Adaptive control", "Weld monitoring"],
    "Vision-guided": ["2D / 3D bin pick", "Cycle 4–12 s", "Calibration jigs"],
    "Cobot": ["Payload 3–35 kg", "No-fence layout", "Fast changeover"],
    "CMM": ["Bridge & horizontal", "Scanning heads", "PC-DMIS / Calypso"],
    "Optical 3D": ["Blue-light scan", "±0.02 mm", "GD&T reporting"],
    "In-line vision": ["100% inspection", "Cycle < 2 s", "Poka-yoke interlock"],
    "Leak test": ["Air-decay & helium", "1e-6 mbar·l/s", "EOL integrated"],
    "Mould making": ["Tools to 40 t", "P20 / H13 / Stavax", "Try-out presses on site"],
    "Die making": ["Draw / trim / flange", "Cast & fabricated", "Spotting press"],
    "Fixtures": ["Weld & check fixtures", "Poka-yoke design", "CMM-certified"],
    "Gauges": ["Attribute & variable", "MSA R&R done", "Calibration cycle 12m"]
  };
  function hash(str) { var h = 0, i; for (i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000; return h; }
  function pick(seed, lo, hi) { return lo + (seed % (hi - lo + 1)); }

  var SUBCATS = {};
  Object.keys(CATEGORIES).forEach(function (key) {
    CATEGORIES[key].forEach(function (c) {
      var out = [], n = c.procs.length;
      c.procs.forEach(function (p, i) {
        var h = hash(key + c.id + p);
        var share = (n === 1) ? 1 : (0.42 - i * 0.07) + ((h % 9) - 4) / 100;
        var sup = Math.max(3, Math.round(c.suppliers * Math.max(0.08, share)));
        var lead = Math.max(4, c.lead + pick(h, -6, 9));
        var price = Math.round((c.price + (pick(h, -25, 30) / 10)) * 10) / 10;
        var head = Math.max(2, Math.min(44, c.headroom + pick(h >> 2, -9, 11)));
        var fit = Math.max(52, Math.min(95, c.fit + pick(h >> 3, -8, 9)));
        var risk = head < 8 || price > 9 ? "high" : (head < 16 || price > 4.5 ? "medium" : c.risk);
        out.push({
          id: c.id + "-" + i, name: p, parent: c.name, icon: c.icon,
          spec: SPEC[p] || ["Qualified process", "Build to print", "PPAP capable"],
          suppliers: sup, lead: lead, price: price, headroom: head, fit: fit, risk: risk,
          audited: Math.round(sup * (0.35 + (h % 40) / 100)),
          rfqs: pick(h >> 4, 0, 6),
          countries: pick(h >> 5, 3, 11),
          moq: [50, 250, 500, 1000, 2500, 5000][h % 6]
        });
      });
      SUBCATS[key + ":" + c.id] = out;
    });
  });

  /* ── Supplier account layer: everything here is what the SUPPLIER typed into
     their own account. The buyer sees it as declared data, with a freshness stamp. ── */
  var IND_POOL = ["Automotive", "Machinery & Industrial", "Aerospace & Defence", "Medical Devices", "Electronics"];
  SUPPLIERS.forEach(function (s) {
    var h = hash(s.name);
    s.accountSince = 2019 + (h % 7);
    s.profile = 58 + (h % 42);
    s.updatedDays = pick(h >> 2, 2, 210);
    s.respRate = 48 + (h % 52);
    s.quoteTurn = pick(h >> 3, 2, 14);
    s.docs = pick(h >> 4, 3, 12);
    s.certExpiry = pick(h >> 5, 20, 400);
    s.machines = pick(h >> 6, 8, 140);
    s.shifts = [1, 2, 3][h % 3];
    /* staff derived from the declared asset base so the block stays internally consistent:
       ~1.6 operators per machine per shift plus indirect headcount */
    s.employees = Math.round((s.machines * 1.6 * s.shifts + 24) / 5) * 5;
    s.langs = ["EN", "EN · DE", "EN · ZH", "EN · ES", "EN · JA"][h % 5];
    s.industries = s.industries || IND_POOL.filter(function (x, i) { return (h >> i) % 3 !== 0; }).slice(0, 3);
    if (!s.industries.length) s.industries = ["Automotive"];
    /* registration stage 1–6; a supplier is only visible to buyers (and on the map)
       from stage 5, when the STREFEX desk has verified documents and the plant address */
    s.stage = s.stage || 6;
    s.published = s.stage >= 5;
    s.verifiedFields = ["Certificates", "Address", "Bank"].filter(function (x, i) { return (h >> (i + 2)) % 2 === 0; });
  });

  /* Registration path — a supplier account only becomes visible to buyers, and only
     appears as a pin on the buyer's map, once it reaches stage 5. */
  var REG_STAGES = [
    { n: 1, name: "Invited / self-registered", owner: "Supplier", days: "Same day",
      needs: "Company name, country, contact e-mail, VAT or registration number",
      gate: "E-mail confirmed and duplicate check against existing accounts passed",
      visible: "Not visible to buyers", count: 1428 },
    { n: 2, name: "Company profile", owner: "Supplier", days: "1–3 days",
      needs: "Legal entity, ownership, turnover band, employees, working languages",
      gate: "All mandatory profile fields complete — the profile-completeness KPI starts here",
      visible: "Not visible to buyers", count: 946 },
    { n: 3, name: "Plants & capability", owner: "Supplier", days: "2–5 days",
      needs: "Each plant with full street address, industries served, processes, machine list, capacity and shift pattern",
      gate: "At least one plant with a complete address and one declared process",
      visible: "Not visible to buyers", count: 612 },
    { n: 4, name: "Documents & declarations", owner: "Supplier", days: "3–10 days",
      needs: "Certificates (IATF / AS9100 / ISO 13485 / ISO 9001), insurance, bank details, Tier-2 declaration, export-control statement",
      gate: "Certificate scope and expiry readable, and it covers the declared processes",
      visible: "Not visible to buyers", count: 487 },
    { n: 5, name: "Verification & geocoding", owner: "STREFEX desk", days: "5 working days",
      needs: "Desk checks certificate against the issuing registry, confirms the entity, geocodes each plant address to coordinates",
      gate: "Certificate valid at source and plant coordinates confirmed — otherwise the record returns to stage 4",
      visible: "Pin appears on the buyer map from here", count: 412 },
    { n: 6, name: "Published & searchable", owner: "STREFEX desk", days: "Continuous",
      needs: "Category mapping to the sourcing taxonomy, then a re-declaration every 12 months",
      gate: "Profile refreshed within 12 months, certificates in date — lapses drop the record back to stage 4 and remove the pin",
      visible: "Fully visible: map, category lists, RFQ recipient", count: 268 }
  ];

  window.SOURCING_DATA = {
    REG_STAGES: REG_STAGES,
    SUBCATS: SUBCATS,
    DOMAINS: DOMAINS, INDUSTRIES: INDUSTRIES, CATEGORIES: CATEGORIES,
    SUPPLIERS: SUPPLIERS, REGIONS: REGIONS, GAPS: GAPS, BUYERS: BUYERS, CONT: CONT, SUBCATS: SUBCATS
  };
})();
