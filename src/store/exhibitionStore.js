import { create } from 'zustand'

const useExhibitionStore = create((set, get) => ({
  exhibitions: [
    // ═══════════════════════════════════════════════════════════
    // 2026 EXHIBITIONS
    // ═══════════════════════════════════════════════════════════

    // ─── 2026 AUTOMOTIVE ─────────────────────────────────────
    {
      id: 'ex-26-001', name: 'Automechanika Frankfurt 2026', industry: 'Automotive',
      country: 'Germany', city: 'Frankfurt', venue: 'Messe Frankfurt',
      startDate: '2026-09-08', endDate: '2026-09-12',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automotive Parts', 'Diagnostics', 'Electronics'],
      description: 'World\'s leading trade fair for the automotive aftermarket.',
      website: 'https://automechanika.messefrankfurt.com',
      visitors: '135,000+', exhibitors: '4,800+',
      color: '#e74c3c',
    },
    {
      id: 'ex-26-002', name: 'Automechanika Dubai 2026', industry: 'Automotive',
      country: 'UAE', city: 'Dubai', venue: 'Dubai World Trade Centre',
      startDate: '2026-06-09', endDate: '2026-06-11',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Automotive Parts', 'Tires', 'Lubricants'],
      description: 'Middle East and Africa\'s largest automotive aftermarket trade show.',
      website: 'https://automechanikadubai.com',
      visitors: '30,000+', exhibitors: '2,000+',
      color: '#e74c3c',
    },
    {
      id: 'ex-26-003', name: 'IAA Transportation 2026', industry: 'Automotive',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2026-09-22', endDate: '2026-09-27',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Commercial Vehicles', 'Logistics', 'Trailers'],
      description: 'Global platform for transport and logistics.',
      website: 'https://www.iaa-transportation.com',
      visitors: '150,000+', exhibitors: '1,600+',
      color: '#e74c3c',
    },
    {
      id: 'ex-26-004', name: 'COMTRANS Moscow 2026', industry: 'Automotive',
      country: 'Russia', city: 'Moscow', venue: 'IEC Crocus Expo',
      startDate: '2026-09-08', endDate: '2026-09-12',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Commercial Vehicles', 'Trucks', 'Buses', 'Trailers'],
      description: 'Russia\'s largest commercial vehicle and transport exhibition.',
      website: 'https://www.comtransexpo.com',
      visitors: '30,000+', exhibitors: '400+',
      color: '#e74c3c',
    },

    // ─── 2026 MANUFACTURING ──────────────────────────────────
    {
      id: 'ex-26-010', name: 'Hannover Messe 2026', industry: 'Manufacturing',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2026-04-13', endDate: '2026-04-17',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automation', 'Robotics', 'Industry 4.0', 'Energy'],
      description: 'World\'s leading industrial trade fair for technology and innovation.',
      website: 'https://www.hannovermesse.de',
      visitors: '130,000+', exhibitors: '4,000+',
      color: '#3498db',
    },
    {
      id: 'ex-26-011', name: 'IMTS Chicago 2026', industry: 'Manufacturing',
      country: 'USA', city: 'Chicago', venue: 'McCormick Place',
      startDate: '2026-09-14', endDate: '2026-09-19',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'Additive Manufacturing', 'Robotics'],
      description: 'North America\'s largest manufacturing technology event.',
      website: 'https://www.imts.com',
      visitors: '129,000+', exhibitors: '2,500+',
      color: '#3498db',
    },
    {
      id: 'ex-26-012', name: 'SPS Nuremberg 2026', industry: 'Manufacturing',
      country: 'Germany', city: 'Nuremberg', venue: 'NürnbergMesse',
      startDate: '2026-11-24', endDate: '2026-11-26',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['PLC', 'Sensors', 'Drive Technology', 'Industrial Software'],
      description: 'Leading trade fair for smart and digital automation.',
      website: 'https://sps.mesago.com',
      visitors: '50,000+', exhibitors: '1,500+',
      color: '#3498db',
    },
    {
      id: 'ex-26-013', name: 'CeMAT Hannover 2026', industry: 'Manufacturing',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2026-04-13', endDate: '2026-04-17',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Intralogistics', 'Material Handling', 'Conveyor Systems', 'Warehouse Automation', 'AGV'],
      description: 'World\'s leading trade fair for intralogistics and supply chain management.',
      website: 'https://www.cemat.de',
      visitors: '130,000+', exhibitors: '1,300+',
      color: '#3498db',
    },
    {
      id: 'ex-26-014', name: 'LogiMAT Stuttgart 2026', industry: 'Manufacturing',
      country: 'Germany', city: 'Stuttgart', venue: 'Messe Stuttgart',
      startDate: '2026-03-10', endDate: '2026-03-12',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Warehouse Management', 'Conveyor Technology', 'Picking Systems', 'AGV'],
      description: 'International trade fair for intralogistics solutions and process management.',
      website: 'https://www.logimat-messe.de',
      visitors: '65,000+', exhibitors: '1,600+',
      color: '#3498db',
    },
    {
      id: 'ex-26-015', name: 'Automatica Munich 2026', industry: 'Manufacturing',
      country: 'Germany', city: 'Munich', venue: 'Messe München',
      startDate: '2026-06-22', endDate: '2026-06-25',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Robotics', 'Assembly', 'Machine Vision', 'Industrial AI'],
      description: 'Leading exhibition for smart automation and robotics.',
      website: 'https://www.automatica-munich.com',
      visitors: '46,000+', exhibitors: '750+',
      color: '#3498db',
    },
    {
      id: 'ex-26-016', name: 'INNOPROM 2026', industry: 'Manufacturing',
      country: 'Russia', city: 'Yekaterinburg', venue: 'Yekaterinburg-Expo IEC',
      startDate: '2026-07-06', endDate: '2026-07-09',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automation', 'Robotics', 'Industry 4.0', 'Digital Manufacturing'],
      description: 'Russia\'s main international industrial exhibition.',
      website: 'https://www.innoprom.com',
      visitors: '46,000+', exhibitors: '700+',
      color: '#3498db',
    },
    {
      id: 'ex-26-017', name: 'CIIF Shanghai 2026', industry: 'Manufacturing',
      country: 'China', city: 'Shanghai', venue: 'National Exhibition Center',
      startDate: '2026-09-15', endDate: '2026-09-19',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automation', 'Robotics', 'CNC', 'Industry 4.0', 'New Energy'],
      description: 'China\'s top industrial trade fair covering manufacturing, automation, energy and IT.',
      website: 'https://www.ciif-expo.com',
      visitors: '220,000+', exhibitors: '2,600+',
      color: '#3498db',
    },
    {
      id: 'ex-26-018', name: 'CIROS Shanghai 2026', industry: 'Manufacturing',
      country: 'China', city: 'Shanghai', venue: 'National Exhibition Center',
      startDate: '2026-07-06', endDate: '2026-07-09',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Industrial Robots', 'Collaborative Robots', 'Robot Components', 'AI'],
      description: 'China\'s largest and most influential robotics exhibition.',
      website: 'https://www.ciros.com.cn',
      visitors: '80,000+', exhibitors: '500+',
      color: '#3498db',
    },
    {
      id: 'ex-26-019', name: 'Formnext Frankfurt 2026', industry: 'Manufacturing',
      country: 'Germany', city: 'Frankfurt', venue: 'Messe Frankfurt',
      startDate: '2026-11-17', endDate: '2026-11-20',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['3D Printing', 'Additive Manufacturing', 'Materials'],
      description: 'Leading trade fair for additive manufacturing and next-gen solutions.',
      website: 'https://www.formnext.com',
      visitors: '34,000+', exhibitors: '800+',
      color: '#3498db',
    },
    {
      id: 'ex-26-020', name: 'Metalloobrabotka Moscow 2026', industry: 'Manufacturing',
      country: 'Russia', city: 'Moscow', venue: 'Expocentre Fairgrounds',
      startDate: '2026-05-25', endDate: '2026-05-29',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'CNC', 'Laser Cutting', 'Metalworking'],
      description: 'Russia\'s largest international exhibition for metalworking equipment and tools.',
      website: 'https://www.metobr-expo.ru',
      visitors: '30,000+', exhibitors: '1,000+',
      color: '#3498db',
    },
    {
      id: 'ex-26-021', name: 'Bauma Munich 2026', industry: 'Manufacturing',
      country: 'Germany', city: 'Munich', venue: 'Messe München',
      startDate: '2026-04-20', endDate: '2026-04-26',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Construction Machinery', 'Mining Equipment', 'Heavy Equipment'],
      description: 'World\'s leading trade fair for construction, mining and equipment.',
      website: 'https://www.bauma.de',
      visitors: '620,000+', exhibitors: '3,500+',
      color: '#3498db',
    },
    {
      id: 'ex-26-022', name: 'Automation Expo Russia 2026', industry: 'Manufacturing',
      country: 'Russia', city: 'Moscow', venue: 'Expocentre Fairgrounds',
      startDate: '2026-09-21', endDate: '2026-09-24',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Automation', 'PLC', 'SCADA', 'Sensors', 'Control Systems'],
      description: 'International exhibition for industrial automation and control.',
      website: 'https://www.automation-expo.ru',
      visitors: '18,000+', exhibitors: '400+',
      color: '#3498db',
    },

    // ─── 2026 PLASTICS ───────────────────────────────────────
    {
      id: 'ex-26-030', name: 'Chinaplas Shenzhen 2026', industry: 'Plastic',
      country: 'China', city: 'Shenzhen', venue: 'Shenzhen World Exhibition Center',
      startDate: '2026-04-14', endDate: '2026-04-17',
      tier: ['OEM', 'Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Injection Molding', 'Extrusion', 'Recycling', 'Materials'],
      description: 'Asia\'s largest plastics and rubber trade fair.',
      website: 'https://www.chinaplasonline.com',
      visitors: '250,000+', exhibitors: '4,000+',
      color: '#27ae60',
    },
    {
      id: 'ex-26-031', name: 'Fakuma 2026', industry: 'Plastic',
      country: 'Germany', city: 'Friedrichshafen', venue: 'Messe Friedrichshafen',
      startDate: '2026-10-13', endDate: '2026-10-17',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Injection Molding', 'Thermoforming', 'Tooling'],
      description: 'International trade fair for plastics processing.',
      website: 'https://www.fakuma-messe.de',
      visitors: '47,000+', exhibitors: '1,800+',
      color: '#27ae60',
    },
    {
      id: 'ex-26-032', name: 'ROSMOULD / ROSPLAST Moscow 2026', industry: 'Plastic',
      country: 'Russia', city: 'Moscow', venue: 'IEC Crocus Expo',
      startDate: '2026-06-16', endDate: '2026-06-18',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Mold Making', 'Injection Molding', 'Plastics Processing', 'Tooling'],
      description: 'Russia\'s international exhibition for mold-making and plastics processing.',
      website: 'https://www.rosmould.com',
      visitors: '8,000+', exhibitors: '250+',
      color: '#27ae60',
    },

    // ─── 2026 METAL ──────────────────────────────────────────
    {
      id: 'ex-26-040', name: 'EuroBLECH Hanover 2026', industry: 'Metal',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2026-10-20', endDate: '2026-10-23',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Sheet Metal', 'Laser Cutting', 'Welding', 'Forming'],
      description: 'International sheet metal working technology exhibition.',
      website: 'https://www.euroblech.com',
      visitors: '60,000+', exhibitors: '1,500+',
      color: '#e67e22',
    },
    {
      id: 'ex-26-041', name: 'FABTECH Chicago 2026', industry: 'Metal',
      country: 'USA', city: 'Chicago', venue: 'McCormick Place',
      startDate: '2026-11-09', endDate: '2026-11-12',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Fabrication', 'Welding', 'Metal Forming', 'Finishing'],
      description: 'North America\'s largest metal forming, fabricating and welding event.',
      website: 'https://www.fabtechexpo.com',
      visitors: '48,000+', exhibitors: '1,500+',
      color: '#e67e22',
    },
    {
      id: 'ex-26-042', name: 'Weldex Moscow 2026', industry: 'Metal',
      country: 'Russia', city: 'Moscow', venue: 'Sokolniki Exhibition Center',
      startDate: '2026-10-13', endDate: '2026-10-16',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Welding', 'Cutting', 'Surfacing', 'Inspection'],
      description: 'International welding exhibition in Russia.',
      website: 'https://www.weldex.ru',
      visitors: '10,000+', exhibitors: '250+',
      color: '#e67e22',
    },

    // ─── 2026 MEDICAL EQUIPMENT ──────────────────────────────
    {
      id: 'ex-26-050', name: 'MEDICA Düsseldorf 2026', industry: 'Medical Equipment',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2026-11-16', endDate: '2026-11-19',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Medical Devices', 'Diagnostics', 'Imaging', 'IT'],
      description: 'World\'s largest medical trade fair with COMPAMED supplier expo.',
      website: 'https://www.medica-tradefair.com',
      visitors: '81,000+', exhibitors: '5,100+',
      color: '#9b59b6',
    },
    {
      id: 'ex-26-051', name: 'Arab Health Dubai 2026', industry: 'Medical Equipment',
      country: 'UAE', city: 'Dubai', venue: 'Dubai World Trade Centre',
      startDate: '2026-01-26', endDate: '2026-01-29',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Medical Devices', 'Surgical Equipment', 'Hospital Furniture'],
      description: 'Middle East\'s largest healthcare exhibition.',
      website: 'https://www.arabhealthonline.com',
      visitors: '56,000+', exhibitors: '3,700+',
      color: '#9b59b6',
    },
    {
      id: 'ex-26-052', name: 'MD&M West Anaheim 2026', industry: 'Medical Equipment',
      country: 'USA', city: 'Anaheim', venue: 'Anaheim Convention Center',
      startDate: '2026-02-10', endDate: '2026-02-12',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Medical Devices', 'Contract Manufacturing', 'Materials'],
      description: 'Medical Design & Manufacturing — largest medtech event in the West.',
      website: 'https://www.mdmwest.com',
      visitors: '20,000+', exhibitors: '2,000+',
      color: '#9b59b6',
    },

    // ─── 2026 RAW MATERIALS ──────────────────────────────────
    {
      id: 'ex-26-060', name: 'TUBE & WIRE Düsseldorf 2026', industry: 'Raw Materials',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2026-04-06', endDate: '2026-04-10',
      tier: ['OEM', 'Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Tube', 'Pipe', 'Wire', 'Cable', 'Steel Processing'],
      description: 'International tube, pipe, wire and cable trade fair.',
      website: 'https://www.tube-tradefair.com',
      visitors: '72,000+', exhibitors: '2,400+',
      color: '#16a085',
    },
    {
      id: 'ex-26-061', name: 'Metal-Expo Moscow 2026', industry: 'Raw Materials',
      country: 'Russia', city: 'Moscow', venue: 'VDNKH Expo',
      startDate: '2026-11-10', endDate: '2026-11-13',
      tier: ['OEM', 'Raw Materials'],
      equipment: ['Steel', 'Non-Ferrous Metals', 'Metal Products'],
      description: 'International industrial exhibition for metals industry.',
      website: 'https://www.metal-expo.ru',
      visitors: '30,000+', exhibitors: '600+',
      color: '#16a085',
    },

    // ═══════════════════════════════════════════════════════════
    // 2027 EXHIBITIONS
    // ═══════════════════════════════════════════════════════════

    // ─── AUTOMOTIVE ──────────────────────────────────────────
    {
      id: 'ex-001', name: 'Automechanika Frankfurt', industry: 'Automotive',
      country: 'Germany', city: 'Frankfurt', venue: 'Messe Frankfurt',
      startDate: '2027-09-14', endDate: '2027-09-18',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automotive Parts', 'Diagnostics', 'Electronics'],
      description: 'World\'s leading trade fair for the automotive aftermarket.',
      website: 'https://automechanika.messefrankfurt.com',
      visitors: '135,000+', exhibitors: '4,800+',
      color: '#e74c3c',
    },
    {
      id: 'ex-002', name: 'Detroit Auto Show (NAIAS)', industry: 'Automotive',
      country: 'USA', city: 'Detroit', venue: 'Huntington Place',
      startDate: '2027-01-15', endDate: '2027-01-25',
      tier: ['OEM'],
      equipment: ['Vehicles', 'EV Technology', 'Autonomous Driving'],
      description: 'North American International Auto Show — major OEM showcase.',
      website: 'https://naias.com',
      visitors: '800,000+', exhibitors: '500+',
      color: '#e74c3c',
    },
    {
      id: 'ex-003', name: 'Auto Shanghai', industry: 'Automotive',
      country: 'China', city: 'Shanghai', venue: 'National Exhibition Center',
      startDate: '2027-04-21', endDate: '2027-04-28',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Vehicles', 'EV Battery', 'Powertrain'],
      description: 'Asia\'s largest and most influential automotive show.',
      website: 'https://www.autoshanghai.org',
      visitors: '1,000,000+', exhibitors: '2,000+',
      color: '#e74c3c',
    },
    {
      id: 'ex-004', name: 'Automechanika Dubai', industry: 'Automotive',
      country: 'UAE', city: 'Dubai', venue: 'Dubai World Trade Centre',
      startDate: '2027-06-10', endDate: '2027-06-12',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Automotive Parts', 'Tires', 'Lubricants'],
      description: 'Middle East and Africa\'s largest automotive aftermarket trade show.',
      website: 'https://automechanikadubai.com',
      visitors: '30,000+', exhibitors: '2,000+',
      color: '#e74c3c',
    },
    {
      id: 'ex-005', name: 'Tokyo Motor Show', industry: 'Automotive',
      country: 'Japan', city: 'Tokyo', venue: 'Tokyo Big Sight',
      startDate: '2027-10-28', endDate: '2027-11-08',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Vehicles', 'Hydrogen Fuel Cell', 'ADAS'],
      description: 'Japan Mobility Show — global technology showcase.',
      website: 'https://www.japan-mobility-show.com',
      visitors: '1,300,000+', exhibitors: '400+',
      color: '#e74c3c',
    },
    {
      id: 'ex-006', name: 'IAA Transportation', industry: 'Automotive',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2027-09-20', endDate: '2027-09-25',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Commercial Vehicles', 'Logistics', 'Trailers'],
      description: 'Global platform for transport and logistics.',
      website: 'https://www.iaa-transportation.com',
      visitors: '150,000+', exhibitors: '1,600+',
      color: '#e74c3c',
    },

    // ─── MANUFACTURING ───────────────────────────────────────
    {
      id: 'ex-010', name: 'Hannover Messe', industry: 'Manufacturing',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2027-04-12', endDate: '2027-04-16',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automation', 'Robotics', 'Industry 4.0', 'Energy'],
      description: 'World\'s leading industrial trade fair for technology and innovation.',
      website: 'https://www.hannovermesse.de',
      visitors: '130,000+', exhibitors: '4,000+',
      color: '#3498db',
    },
    {
      id: 'ex-011', name: 'EMO Hannover', industry: 'Manufacturing',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2027-09-13', endDate: '2027-09-18',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'CNC Machines', 'Cutting Tools', 'Metalworking'],
      description: 'The world\'s leading trade fair for production technology.',
      website: 'https://www.emo-hannover.de',
      visitors: '117,000+', exhibitors: '2,200+',
      color: '#3498db',
    },
    {
      id: 'ex-012', name: 'IMTS – International Manufacturing Technology Show', industry: 'Manufacturing',
      country: 'USA', city: 'Chicago', venue: 'McCormick Place',
      startDate: '2027-09-13', endDate: '2027-09-18',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'Additive Manufacturing', 'Robotics'],
      description: 'North America\'s largest manufacturing technology event.',
      website: 'https://www.imts.com',
      visitors: '129,000+', exhibitors: '2,500+',
      color: '#3498db',
    },
    {
      id: 'ex-013', name: 'SPS – Smart Production Solutions', industry: 'Manufacturing',
      country: 'Germany', city: 'Nuremberg', venue: 'NürnbergMesse',
      startDate: '2027-11-23', endDate: '2027-11-25',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['PLC', 'Sensors', 'Drive Technology', 'Industrial Software'],
      description: 'Leading trade fair for smart and digital automation.',
      website: 'https://sps.mesago.com',
      visitors: '50,000+', exhibitors: '1,500+',
      color: '#3498db',
    },
    {
      id: 'ex-014', name: 'JIMTOF Tokyo', industry: 'Manufacturing',
      country: 'Japan', city: 'Tokyo', venue: 'Tokyo Big Sight',
      startDate: '2027-11-08', endDate: '2027-11-13',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Machine Tools', 'Precision Instruments', 'CAD/CAM'],
      description: 'Japan International Machine Tool Fair.',
      website: 'https://www.jimtof.org',
      visitors: '150,000+', exhibitors: '900+',
      color: '#3498db',
    },
    {
      id: 'ex-015', name: 'CIMT Beijing', industry: 'Manufacturing',
      country: 'China', city: 'Beijing', venue: 'China International Exhibition Center',
      startDate: '2027-04-12', endDate: '2027-04-17',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'Lasers', 'Forming Technology'],
      description: 'China International Machine Tool Show — Asia\'s top event.',
      website: 'https://www.cimtshow.com',
      visitors: '200,000+', exhibitors: '1,500+',
      color: '#3498db',
    },

    // ─── PLASTICS ────────────────────────────────────────────
    {
      id: 'ex-020', name: 'K Düsseldorf', industry: 'Plastic',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2027-10-13', endDate: '2027-10-20',
      tier: ['OEM', 'Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Injection Molding', 'Extrusion', 'Blow Molding', 'Recycling'],
      description: 'The world\'s No. 1 trade fair for plastics and rubber.',
      website: 'https://www.k-online.com',
      visitors: '177,000+', exhibitors: '3,000+',
      color: '#27ae60',
    },
    {
      id: 'ex-021', name: 'NPE – The Plastics Show', industry: 'Plastic',
      country: 'USA', city: 'Orlando', venue: 'Orange County Convention Center',
      startDate: '2027-05-03', endDate: '2027-05-07',
      tier: ['OEM', 'Tier 1', 'Raw Materials'],
      equipment: ['Injection Molding', 'Extrusion', 'Thermoforming'],
      description: 'America\'s largest plastics trade show.',
      website: 'https://www.npe.org',
      visitors: '55,000+', exhibitors: '2,000+',
      color: '#27ae60',
    },
    {
      id: 'ex-022', name: 'Chinaplas', industry: 'Plastic',
      country: 'China', city: 'Shenzhen', venue: 'Shenzhen World Exhibition Center',
      startDate: '2027-04-15', endDate: '2027-04-18',
      tier: ['OEM', 'Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Injection Molding', 'Extrusion', 'Recycling', 'Materials'],
      description: 'Asia\'s largest plastics and rubber trade fair.',
      website: 'https://www.chinaplasonline.com',
      visitors: '250,000+', exhibitors: '4,000+',
      color: '#27ae60',
    },
    {
      id: 'ex-023', name: 'Fakuma', industry: 'Plastic',
      country: 'Germany', city: 'Friedrichshafen', venue: 'Messe Friedrichshafen',
      startDate: '2027-10-12', endDate: '2027-10-16',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Injection Molding', 'Thermoforming', 'Tooling'],
      description: 'International trade fair for plastics processing.',
      website: 'https://www.fakuma-messe.de',
      visitors: '47,000+', exhibitors: '1,800+',
      color: '#27ae60',
    },
    {
      id: 'ex-024', name: 'Plastimagen Mexico', industry: 'Plastic',
      country: 'Mexico', city: 'Mexico City', venue: 'Centro Citibanamex',
      startDate: '2027-03-09', endDate: '2027-03-12',
      tier: ['Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Injection Molding', 'Packaging', 'Recycling'],
      description: 'Latin America\'s leading plastics exhibition.',
      website: 'https://www.plastimagen.com.mx',
      visitors: '45,000+', exhibitors: '1,000+',
      color: '#27ae60',
    },

    // ─── METAL / METALWORKING ────────────────────────────────
    {
      id: 'ex-030', name: 'EuroBLECH', industry: 'Metal',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2027-10-21', endDate: '2027-10-24',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Sheet Metal', 'Laser Cutting', 'Welding', 'Forming'],
      description: 'International sheet metal working technology exhibition.',
      website: 'https://www.euroblech.com',
      visitors: '60,000+', exhibitors: '1,500+',
      color: '#e67e22',
    },
    {
      id: 'ex-031', name: 'SCHWEISSEN & SCHNEIDEN', industry: 'Metal',
      country: 'Germany', city: 'Essen', venue: 'Messe Essen',
      startDate: '2027-09-13', endDate: '2027-09-17',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Welding', 'Cutting', 'Brazing', 'Inspection'],
      description: 'World\'s leading trade fair for joining, cutting and surfacing.',
      website: 'https://www.schweissen-schneiden.com',
      visitors: '55,000+', exhibitors: '1,000+',
      color: '#e67e22',
    },
    {
      id: 'ex-032', name: 'FABTECH USA', industry: 'Metal',
      country: 'USA', city: 'Chicago', venue: 'McCormick Place',
      startDate: '2027-11-08', endDate: '2027-11-11',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Fabrication', 'Welding', 'Metal Forming', 'Finishing'],
      description: 'North America\'s largest metal forming, fabricating and welding event.',
      website: 'https://www.fabtechexpo.com',
      visitors: '48,000+', exhibitors: '1,500+',
      color: '#e67e22',
    },
    {
      id: 'ex-033', name: 'GIFA / METEC / THERMPROCESS / NEWCAST', industry: 'Metal',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2027-06-16', endDate: '2027-06-20',
      tier: ['OEM', 'Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Casting', 'Foundry', 'Metallurgy', 'Heat Treatment'],
      description: 'The Bright World of Metals — global foundry and metallurgy showcase.',
      website: 'https://www.gifa.com',
      visitors: '78,000+', exhibitors: '2,000+',
      color: '#e67e22',
    },
    {
      id: 'ex-034', name: 'Metal Madrid', industry: 'Metal',
      country: 'Spain', city: 'Madrid', venue: 'IFEMA',
      startDate: '2027-11-17', endDate: '2027-11-18',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'Metal Components', 'Surface Treatment'],
      description: 'Spanish industrial and metalworking exhibition.',
      website: 'https://www.metalmadrid.com',
      visitors: '12,000+', exhibitors: '600+',
      color: '#e67e22',
    },
    {
      id: 'ex-035', name: 'Metalloobrabotka Moscow', industry: 'Metal',
      country: 'Russia', city: 'Moscow', venue: 'Expocentre',
      startDate: '2027-05-26', endDate: '2027-05-30',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'Welding', 'Metalworking'],
      description: 'Russia\'s largest international exhibition for metalworking equipment.',
      website: 'https://www.metobr-expo.ru',
      visitors: '30,000+', exhibitors: '1,000+',
      color: '#e67e22',
    },

    // ─── MEDICAL EQUIPMENT ───────────────────────────────────
    {
      id: 'ex-040', name: 'MEDICA Düsseldorf', industry: 'Medical Equipment',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2027-11-15', endDate: '2027-11-18',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Medical Devices', 'Diagnostics', 'Imaging', 'IT'],
      description: 'World\'s largest medical trade fair with COMPAMED supplier expo.',
      website: 'https://www.medica-tradefair.com',
      visitors: '81,000+', exhibitors: '5,100+',
      color: '#9b59b6',
    },
    {
      id: 'ex-041', name: 'Arab Health', industry: 'Medical Equipment',
      country: 'UAE', city: 'Dubai', venue: 'Dubai World Trade Centre',
      startDate: '2027-01-25', endDate: '2027-01-28',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Medical Devices', 'Surgical Equipment', 'Hospital Furniture'],
      description: 'Middle East\'s largest healthcare exhibition.',
      website: 'https://www.arabhealthonline.com',
      visitors: '56,000+', exhibitors: '3,700+',
      color: '#9b59b6',
    },
    {
      id: 'ex-042', name: 'COMPAMED', industry: 'Medical Equipment',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2027-11-15', endDate: '2027-11-18',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Medical Components', 'Micro Technology', 'OEM Parts'],
      description: 'International trade fair for high-tech solutions for medical technology.',
      website: 'https://www.compamed-tradefair.com',
      visitors: '20,000+', exhibitors: '800+',
      color: '#9b59b6',
    },
    {
      id: 'ex-043', name: 'MD&M West', industry: 'Medical Equipment',
      country: 'USA', city: 'Anaheim', venue: 'Anaheim Convention Center',
      startDate: '2027-02-09', endDate: '2027-02-11',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Medical Devices', 'Contract Manufacturing', 'Materials'],
      description: 'Medical Design & Manufacturing — largest medtech event in the West.',
      website: 'https://www.mdmwest.com',
      visitors: '20,000+', exhibitors: '2,000+',
      color: '#9b59b6',
    },
    {
      id: 'ex-044', name: 'FIME Miami', industry: 'Medical Equipment',
      country: 'USA', city: 'Miami', venue: 'Miami Beach Convention Center',
      startDate: '2027-06-23', endDate: '2027-06-25',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Medical Devices', 'Hospital Supplies', 'Lab Equipment'],
      description: 'Florida International Medical Expo — connecting Americas.',
      website: 'https://www.fimeshow.com',
      visitors: '12,000+', exhibitors: '1,100+',
      color: '#9b59b6',
    },

    // ─── RAW MATERIALS ───────────────────────────────────────
    {
      id: 'ex-050', name: 'Aluminium World Trade Fair', industry: 'Raw Materials',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2027-10-05', endDate: '2027-10-07',
      tier: ['Raw Materials', 'OEM'],
      equipment: ['Aluminium Products', 'Processing Equipment', 'Recycling'],
      description: 'World trade fair and conference for the aluminium industry.',
      website: 'https://www.aluminium-exhibition.com',
      visitors: '23,000+', exhibitors: '900+',
      color: '#16a085',
    },
    {
      id: 'ex-051', name: 'TUBE Düsseldorf', industry: 'Raw Materials',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2027-04-07', endDate: '2027-04-11',
      tier: ['OEM', 'Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Tube', 'Pipe', 'Steel Processing'],
      description: 'International tube and pipe trade fair.',
      website: 'https://www.tube-tradefair.com',
      visitors: '72,000+', exhibitors: '2,400+',
      color: '#16a085',
    },
    {
      id: 'ex-052', name: 'WIRE Düsseldorf', industry: 'Raw Materials',
      country: 'Germany', city: 'Düsseldorf', venue: 'Messe Düsseldorf',
      startDate: '2027-04-07', endDate: '2027-04-11',
      tier: ['Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Wire', 'Cable', 'Fiber Optics', 'Fasteners'],
      description: 'International wire and cable trade fair.',
      website: 'https://www.wire-tradefair.com',
      visitors: '72,000+', exhibitors: '2,400+',
      color: '#16a085',
    },
    {
      id: 'ex-053', name: 'Composites Europe', industry: 'Raw Materials',
      country: 'Germany', city: 'Stuttgart', venue: 'Messe Stuttgart',
      startDate: '2027-10-19', endDate: '2027-10-21',
      tier: ['Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Carbon Fiber', 'Composites', 'Resins', 'Reinforcements'],
      description: 'European trade fair for composites, technology and applications.',
      website: 'https://www.composites-europe.com',
      visitors: '10,000+', exhibitors: '400+',
      color: '#16a085',
    },
    {
      id: 'ex-054', name: 'StainlessSteel World', industry: 'Raw Materials',
      country: 'Netherlands', city: 'Maastricht', venue: 'MECC Maastricht',
      startDate: '2027-11-09', endDate: '2027-11-11',
      tier: ['Raw Materials', 'Tier 1'],
      equipment: ['Stainless Steel', 'Alloys', 'Duplex', 'Nickel Alloys'],
      description: 'Conference and expo on stainless steel and special alloys.',
      website: 'https://www.stainless-steel-world.net',
      visitors: '8,000+', exhibitors: '300+',
      color: '#16a085',
    },
    {
      id: 'ex-055', name: 'Metal-Expo Moscow', industry: 'Raw Materials',
      country: 'Russia', city: 'Moscow', venue: 'VDNKH Expo',
      startDate: '2027-11-09', endDate: '2027-11-12',
      tier: ['OEM', 'Raw Materials'],
      equipment: ['Steel', 'Non-Ferrous Metals', 'Metal Products'],
      description: 'International industrial exhibition for metals industry.',
      website: 'https://www.metal-expo.ru',
      visitors: '30,000+', exhibitors: '600+',
      color: '#16a085',
    },
    {
      id: 'ex-056', name: 'Bauma Munich', industry: 'Manufacturing',
      country: 'Germany', city: 'Munich', venue: 'Messe München',
      startDate: '2027-04-19', endDate: '2027-04-25',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Construction Machinery', 'Mining Equipment', 'Heavy Equipment'],
      description: 'World\'s leading trade fair for construction, mining and equipment.',
      website: 'https://www.bauma.de',
      visitors: '620,000+', exhibitors: '3,500+',
      color: '#3498db',
    },
    {
      id: 'ex-057', name: 'Formnext', industry: 'Manufacturing',
      country: 'Germany', city: 'Frankfurt', venue: 'Messe Frankfurt',
      startDate: '2027-11-16', endDate: '2027-11-19',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['3D Printing', 'Additive Manufacturing', 'Materials'],
      description: 'Leading trade fair for additive manufacturing and next-gen solutions.',
      website: 'https://www.formnext.com',
      visitors: '34,000+', exhibitors: '800+',
      color: '#3498db',
    },
    {
      id: 'ex-058', name: 'MedTec Live Nuremberg', industry: 'Medical Equipment',
      country: 'Germany', city: 'Nuremberg', venue: 'NürnbergMesse',
      startDate: '2027-06-03', endDate: '2027-06-05',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Medical Components', 'Cleanroom', 'Packaging'],
      description: 'Exhibition for medical technology manufacturing.',
      website: 'https://www.medteclive.com',
      visitors: '15,000+', exhibitors: '400+',
      color: '#9b59b6',
    },

    // ─── LOGISTICS / INTRALOGISTICS / MATERIAL HANDLING ──────
    {
      id: 'ex-060', name: 'CeMAT Hannover', industry: 'Manufacturing',
      country: 'Germany', city: 'Hanover', venue: 'Deutsche Messe',
      startDate: '2027-04-12', endDate: '2027-04-16',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Intralogistics', 'Material Handling', 'Conveyor Systems', 'Warehouse Automation', 'AGV'],
      description: 'World\'s leading trade fair for intralogistics and supply chain management, co-located with Hannover Messe.',
      website: 'https://www.cemat.de',
      visitors: '130,000+', exhibitors: '1,300+',
      color: '#3498db',
    },
    {
      id: 'ex-061', name: 'CeMAT Asia (Shanghai)', industry: 'Manufacturing',
      country: 'China', city: 'Shanghai', venue: 'Shanghai New International Expo Centre',
      startDate: '2027-10-26', endDate: '2027-10-29',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Material Handling', 'Logistics Automation', 'Warehouse Systems', 'Packaging'],
      description: 'Asia\'s premier logistics technology exhibition — CeMAT edition for the Asian market.',
      website: 'https://www.cemat-asia.com',
      visitors: '65,000+', exhibitors: '700+',
      color: '#3498db',
    },
    {
      id: 'ex-062', name: 'LogiMAT Stuttgart', industry: 'Manufacturing',
      country: 'Germany', city: 'Stuttgart', venue: 'Messe Stuttgart',
      startDate: '2027-03-08', endDate: '2027-03-10',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Warehouse Management', 'Conveyor Technology', 'Picking Systems', 'AGV'],
      description: 'International trade fair for intralogistics solutions and process management.',
      website: 'https://www.logimat-messe.de',
      visitors: '65,000+', exhibitors: '1,600+',
      color: '#3498db',
    },

    // ─── CII & INDIA EXHIBITIONS ─────────────────────────────
    {
      id: 'ex-065', name: 'CII Autoexpo Components', industry: 'Automotive',
      country: 'India', city: 'New Delhi', venue: 'Pragati Maidan',
      startDate: '2027-02-10', endDate: '2027-02-13',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automotive Components', 'Electronics', 'Drivetrain'],
      description: 'CII-organized Auto Expo Components — India\'s largest auto component exhibition.',
      website: 'https://www.autoexpo-thecomponentshow.in',
      visitors: '60,000+', exhibitors: '700+',
      color: '#e74c3c',
    },
    {
      id: 'ex-066', name: 'CII Manufacturing Show', industry: 'Manufacturing',
      country: 'India', city: 'New Delhi', venue: 'India Expo Centre',
      startDate: '2027-09-06', endDate: '2027-09-08',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Manufacturing Technology', 'Automation', 'Robotics', 'Industry 4.0'],
      description: 'Confederation of Indian Industry — flagship manufacturing technology exhibition.',
      website: 'https://www.cii.in',
      visitors: '25,000+', exhibitors: '400+',
      color: '#3498db',
    },
    {
      id: 'ex-067', name: 'IMTEX – Indian Machine Tool Exhibition', industry: 'Manufacturing',
      country: 'India', city: 'Bangalore', venue: 'Bangalore International Exhibition Centre',
      startDate: '2027-01-22', endDate: '2027-01-28',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'CNC Machines', 'Metal Cutting', 'Forming'],
      description: 'India\'s largest and South Asia\'s premier machine tool exhibition, organized by IMTMA.',
      website: 'https://www.imtex.in',
      visitors: '50,000+', exhibitors: '1,100+',
      color: '#3498db',
    },
    {
      id: 'ex-068', name: 'ACMA Automechanika New Delhi', industry: 'Automotive',
      country: 'India', city: 'New Delhi', venue: 'Pragati Maidan',
      startDate: '2027-04-08', endDate: '2027-04-11',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Automotive Parts', 'Aftermarket', 'Accessories'],
      description: 'International trade fair for the automotive industry in India, co-organized with ACMA.',
      website: 'https://automechanika-newdelhi.in.messefrankfurt.com',
      visitors: '25,000+', exhibitors: '600+',
      color: '#e74c3c',
    },

    // ─── CHINA EXHIBITIONS ───────────────────────────────────
    {
      id: 'ex-070', name: 'CIROS – China International Robot Show', industry: 'Manufacturing',
      country: 'China', city: 'Shanghai', venue: 'National Exhibition Center',
      startDate: '2027-07-07', endDate: '2027-07-10',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Industrial Robots', 'Collaborative Robots', 'Robot Components', 'AI'],
      description: 'China\'s largest and most influential robotics exhibition, showcasing latest automation.',
      website: 'https://www.ciros.com.cn',
      visitors: '80,000+', exhibitors: '500+',
      color: '#3498db',
    },
    {
      id: 'ex-071', name: 'CIIF – China International Industry Fair', industry: 'Manufacturing',
      country: 'China', city: 'Shanghai', venue: 'National Exhibition Center',
      startDate: '2027-09-19', endDate: '2027-09-23',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automation', 'Robotics', 'CNC', 'Industry 4.0', 'New Energy'],
      description: 'China\'s top industrial trade fair covering manufacturing, automation, energy and IT.',
      website: 'https://www.ciif-expo.com',
      visitors: '220,000+', exhibitors: '2,600+',
      color: '#3498db',
    },
    {
      id: 'ex-072', name: 'SIAF – SPS Industrial Automation Fair Guangzhou', industry: 'Manufacturing',
      country: 'China', city: 'Guangzhou', venue: 'China Import and Export Fair Complex',
      startDate: '2027-03-03', endDate: '2027-03-05',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['PLC', 'Sensors', 'Industrial Software', 'Motion Control', 'Drives'],
      description: 'SPS partner fair in South China — smart and digital automation showcase.',
      website: 'https://spsinchina.cn.messefrankfurt.com',
      visitors: '55,000+', exhibitors: '800+',
      color: '#3498db',
    },
    {
      id: 'ex-073', name: 'CIBF – China International Battery Fair', industry: 'Manufacturing',
      country: 'China', city: 'Shenzhen', venue: 'Shenzhen World Exhibition Center',
      startDate: '2027-05-12', endDate: '2027-05-14',
      tier: ['OEM', 'Tier 1', 'Raw Materials'],
      equipment: ['Batteries', 'Energy Storage', 'EV Batteries', 'Materials'],
      description: 'China\'s leading exhibition for battery technology and energy storage solutions.',
      website: 'https://www.cibf.org.cn',
      visitors: '100,000+', exhibitors: '2,000+',
      color: '#3498db',
    },
    {
      id: 'ex-074', name: 'China (Beijing) International Robotics Exhibition', industry: 'Manufacturing',
      country: 'China', city: 'Beijing', venue: 'China International Exhibition Center',
      startDate: '2027-08-18', endDate: '2027-08-22',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Service Robots', 'Industrial Robots', 'Drones', 'AI Systems'],
      description: 'World Robot Conference — premier event for robotics innovation in China.',
      website: 'https://www.worldrobotconference.com',
      visitors: '130,000+', exhibitors: '600+',
      color: '#3498db',
    },
    {
      id: 'ex-075', name: 'Essen Motor Show China (AMS)', industry: 'Automotive',
      country: 'China', city: 'Chengdu', venue: 'Western China International Expo City',
      startDate: '2027-08-29', endDate: '2027-09-07',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Vehicles', 'Automotive Parts', 'Aftermarket'],
      description: 'Chengdu Motor Show — Western China\'s most influential automotive exhibition.',
      website: 'https://www.cdms.org.cn',
      visitors: '900,000+', exhibitors: '120+',
      color: '#e74c3c',
    },
    {
      id: 'ex-076', name: 'IE Expo China', industry: 'Manufacturing',
      country: 'China', city: 'Shanghai', venue: 'Shanghai New International Expo Centre',
      startDate: '2027-04-20', endDate: '2027-04-22',
      tier: ['Tier 1', 'Tier 2', 'Raw Materials'],
      equipment: ['Water Treatment', 'Waste Management', 'Recycling', 'Environmental Tech'],
      description: 'Asia\'s leading environmental technology exhibition.',
      website: 'https://www.ie-expo.com',
      visitors: '73,000+', exhibitors: '2,400+',
      color: '#3498db',
    },

    // ─── RUSSIA EXHIBITIONS ──────────────────────────────────
    {
      id: 'ex-080', name: 'INNOPROM', industry: 'Manufacturing',
      country: 'Russia', city: 'Yekaterinburg', venue: 'Yekaterinburg-Expo IEC',
      startDate: '2027-07-07', endDate: '2027-07-10',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Automation', 'Robotics', 'Industry 4.0', 'Digital Manufacturing'],
      description: 'Russia\'s main international industrial exhibition — INNOPROM showcases latest manufacturing tech.',
      website: 'https://www.innoprom.com',
      visitors: '46,000+', exhibitors: '700+',
      color: '#3498db',
    },
    {
      id: 'ex-081', name: 'RoboSector (at INNOPROM)', industry: 'Manufacturing',
      country: 'Russia', city: 'Yekaterinburg', venue: 'Yekaterinburg-Expo IEC',
      startDate: '2027-07-07', endDate: '2027-07-10',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Industrial Robots', 'Collaborative Robots', 'AI', 'Vision Systems'],
      description: 'Russia\'s leading robotics exhibition, part of INNOPROM industrial event.',
      website: 'https://www.innoprom.com',
      visitors: '15,000+', exhibitors: '150+',
      color: '#3498db',
    },
    {
      id: 'ex-082', name: 'Metalloobrabotka Moscow', industry: 'Manufacturing',
      country: 'Russia', city: 'Moscow', venue: 'Expocentre Fairgrounds',
      startDate: '2027-05-26', endDate: '2027-05-30',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'CNC', 'Laser Cutting', 'Metalworking'],
      description: 'Russia\'s largest international exhibition for metalworking equipment and tools.',
      website: 'https://www.metobr-expo.ru',
      visitors: '30,000+', exhibitors: '1,000+',
      color: '#3498db',
    },
    {
      id: 'ex-083', name: 'ROSMOULD / ROSPLAST', industry: 'Plastic',
      country: 'Russia', city: 'Moscow', venue: 'IEC Crocus Expo',
      startDate: '2027-06-17', endDate: '2027-06-19',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Mold Making', 'Injection Molding', 'Plastics Processing', 'Tooling'],
      description: 'Russia\'s international exhibition for mold-making and plastics processing.',
      website: 'https://www.rosmould.com',
      visitors: '8,000+', exhibitors: '250+',
      color: '#27ae60',
    },
    {
      id: 'ex-084', name: 'Automation Expo Russia', industry: 'Manufacturing',
      country: 'Russia', city: 'Moscow', venue: 'Expocentre Fairgrounds',
      startDate: '2027-09-22', endDate: '2027-09-25',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Automation', 'PLC', 'SCADA', 'Sensors', 'Control Systems'],
      description: 'International exhibition for industrial automation, instrumentation and control.',
      website: 'https://www.automation-expo.ru',
      visitors: '18,000+', exhibitors: '400+',
      color: '#3498db',
    },
    {
      id: 'ex-085', name: 'COMTRANS Moscow', industry: 'Automotive',
      country: 'Russia', city: 'Moscow', venue: 'IEC Crocus Expo',
      startDate: '2027-09-07', endDate: '2027-09-11',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Commercial Vehicles', 'Trucks', 'Buses', 'Trailers'],
      description: 'Russia\'s largest commercial vehicle and transport exhibition.',
      website: 'https://www.comtransexpo.com',
      visitors: '30,000+', exhibitors: '400+',
      color: '#e74c3c',
    },
    {
      id: 'ex-086', name: 'Weldex Moscow', industry: 'Metal',
      country: 'Russia', city: 'Moscow', venue: 'Sokolniki Exhibition Center',
      startDate: '2027-10-14', endDate: '2027-10-17',
      tier: ['Tier 1', 'Tier 2'],
      equipment: ['Welding', 'Cutting', 'Surfacing', 'Inspection'],
      description: 'International welding exhibition in Russia — welding technologies and equipment.',
      website: 'https://www.weldex.ru',
      visitors: '10,000+', exhibitors: '250+',
      color: '#e67e22',
    },
    {
      id: 'ex-087', name: 'NEVA – Maritime Exhibition', industry: 'Manufacturing',
      country: 'Russia', city: 'St. Petersburg', venue: 'ExpoForum Convention Centre',
      startDate: '2027-09-21', endDate: '2027-09-24',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Shipbuilding', 'Marine Equipment', 'Navigation', 'Offshore'],
      description: 'International maritime exhibition for shipbuilding, shipping and offshore technology.',
      website: 'https://www.transtec-neva.com',
      visitors: '25,000+', exhibitors: '600+',
      color: '#3498db',
    },
    {
      id: 'ex-088', name: 'Pharmtech & Ingredients Moscow', industry: 'Medical Equipment',
      country: 'Russia', city: 'Moscow', venue: 'IEC Crocus Expo',
      startDate: '2027-11-23', endDate: '2027-11-26',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Pharmaceutical Equipment', 'Lab Equipment', 'Cleanroom', 'Packaging'],
      description: 'International exhibition for pharma equipment and ingredients in Russia.',
      website: 'https://www.pharmtech-expo.ru',
      visitors: '12,000+', exhibitors: '450+',
      color: '#9b59b6',
    },

    // ─── GLOBAL AUTOMATION & ROBOTICS ────────────────────────
    {
      id: 'ex-090', name: 'Automate (formerly AUTOMATE Show)', industry: 'Manufacturing',
      country: 'USA', city: 'Detroit', venue: 'Huntington Place',
      startDate: '2027-05-19', endDate: '2027-05-22',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Robotics', 'Machine Vision', 'Motion Control', 'AI'],
      description: 'North America\'s largest automation trade show by A3 (Association for Advancing Automation).',
      website: 'https://www.automateshow.com',
      visitors: '35,000+', exhibitors: '750+',
      color: '#3498db',
    },
    {
      id: 'ex-091', name: 'iREX – International Robot Exhibition', industry: 'Manufacturing',
      country: 'Japan', city: 'Tokyo', venue: 'Tokyo Big Sight',
      startDate: '2027-11-29', endDate: '2027-12-02',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Industrial Robots', 'Service Robots', 'Drone Tech', 'AI'],
      description: 'World\'s largest robot trade fair held biennially in Tokyo.',
      website: 'https://irex.nikkan.co.jp',
      visitors: '140,000+', exhibitors: '600+',
      color: '#3498db',
    },
    {
      id: 'ex-092', name: 'Automatica Munich', industry: 'Manufacturing',
      country: 'Germany', city: 'Munich', venue: 'Messe München',
      startDate: '2027-06-24', endDate: '2027-06-27',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Robotics', 'Assembly', 'Machine Vision', 'Industrial AI'],
      description: 'Leading exhibition for smart automation and robotics in Munich.',
      website: 'https://www.automatica-munich.com',
      visitors: '46,000+', exhibitors: '750+',
      color: '#3498db',
    },
    {
      id: 'ex-093', name: 'SIMTOS – Seoul International Machine Tool Show', industry: 'Manufacturing',
      country: 'South Korea', city: 'Seoul', venue: 'KINTEX',
      startDate: '2027-05-17', endDate: '2027-05-22',
      tier: ['OEM', 'Tier 1', 'Tier 2'],
      equipment: ['Machine Tools', 'Robotics', 'Automation', 'CAD/CAM'],
      description: 'Korea\'s largest machine tool and manufacturing technology exhibition.',
      website: 'https://www.simtos.org',
      visitors: '90,000+', exhibitors: '1,200+',
      color: '#3498db',
    },
    {
      id: 'ex-094', name: 'CEATEC Japan', industry: 'Manufacturing',
      country: 'Japan', city: 'Chiba', venue: 'Makuhari Messe',
      startDate: '2027-10-19', endDate: '2027-10-22',
      tier: ['OEM', 'Tier 1'],
      equipment: ['Electronics', 'IoT', 'AI', 'Smart Manufacturing', 'Sensors'],
      description: 'Japan\'s largest IT and electronics exhibition — innovation for Industry 4.0.',
      website: 'https://www.ceatec.com',
      visitors: '100,000+', exhibitors: '500+',
      color: '#3498db',
    },
  ],

  // Industries list
  industries: ['All', 'Automotive', 'Manufacturing', 'Plastic', 'Metal', 'Medical Equipment', 'Raw Materials'],
  
  // Countries extracted from exhibitions
  getCountries: () => {
    const countries = new Set(get().exhibitions.map((e) => e.country))
    return ['All', ...Array.from(countries).sort()]
  },

  // All unique equipment tags
  getEquipmentTags: () => {
    const tags = new Set()
    get().exhibitions.forEach((e) => e.equipment.forEach((eq) => tags.add(eq)))
    return ['All', ...Array.from(tags).sort()]
  },

  // Tier levels
  tierLevels: ['All', 'OEM', 'Tier 1', 'Tier 2', 'Raw Materials'],

  // Planned exhibitions (user-selected to attend)
  plannedExhibitions: [],

  addPlannedExhibition: (exhibitionId) => set((state) => {
    if (state.plannedExhibitions.includes(exhibitionId)) return state
    return { plannedExhibitions: [...state.plannedExhibitions, exhibitionId] }
  }),

  removePlannedExhibition: (exhibitionId) => set((state) => ({
    plannedExhibitions: state.plannedExhibitions.filter((id) => id !== exhibitionId),
  })),

  isPlanned: (exhibitionId) => get().plannedExhibitions.includes(exhibitionId),

  getPlannedExhibitions: () => {
    const { exhibitions, plannedExhibitions } = get()
    return exhibitions.filter((e) => plannedExhibitions.includes(e.id)).sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
  },

  // Generate notifications / reminders for planned exhibitions
  getExhibitionReminders: () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const planned = get().getPlannedExhibitions()
    const reminders = []

    planned.forEach((ex) => {
      const start = new Date(ex.startDate)
      start.setHours(0, 0, 0, 0)
      const diffDays = Math.ceil((start - today) / 86400000)

      if (diffDays >= 0 && diffDays <= 30) {
        let urgency = 'info'
        let label = ''
        if (diffDays === 0) { urgency = 'today'; label = 'Starts TODAY' }
        else if (diffDays === 1) { urgency = 'urgent'; label = 'Starts TOMORROW' }
        else if (diffDays <= 7) { urgency = 'warning'; label = `Starts in ${diffDays} days (this week)` }
        else { urgency = 'info'; label = `Starts in ${diffDays} days` }

        reminders.push({ ...ex, diffDays, urgency, label })
      }
    })

    return reminders.sort((a, b) => a.diffDays - b.diffDays)
  },

  // Filter exhibitions
  getFilteredExhibitions: (filters) => {
    let results = get().exhibitions

    if (filters.industry && filters.industry !== 'All') {
      results = results.filter((e) => e.industry === filters.industry)
    }
    if (filters.country && filters.country !== 'All') {
      results = results.filter((e) => e.country === filters.country)
    }
    if (filters.tier && filters.tier !== 'All') {
      results = results.filter((e) => e.tier.includes(filters.tier))
    }
    if (filters.equipment && filters.equipment !== 'All') {
      results = results.filter((e) => e.equipment.some((eq) => eq.toLowerCase().includes(filters.equipment.toLowerCase())))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      results = results.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.equipment.some((eq) => eq.toLowerCase().includes(q))
      )
    }
    if (filters.month && filters.month !== 'All') {
      const monthIdx = parseInt(filters.month, 10)
      results = results.filter((e) => {
        const startMonth = new Date(e.startDate).getMonth()
        return startMonth === monthIdx
      })
    }
    if (filters.year && filters.year !== 'All') {
      const yr = parseInt(filters.year, 10)
      results = results.filter((e) => new Date(e.startDate).getFullYear() === yr)
    }

    return results.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
  },

  // Get exhibitions for a specific day
  getExhibitionsForDate: (dateStr) => {
    const date = new Date(dateStr)
    return get().exhibitions.filter((e) => {
      const start = new Date(e.startDate)
      const end = new Date(e.endDate)
      return date >= start && date <= end
    })
  },
}))

export default useExhibitionStore
