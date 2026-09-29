/* STREFEX — Household Products SKU catalogue.
   A product layer that sits UNDER the process taxonomy: the buyer searches for the
   article he ships (a 640 ml glass container), not for "Moulding · Assembly · Pack".
   Every family carries real variants (sizes) and one offer per supplier with the
   commercial terms a container buyer actually compares: MOQ, FOB unit price by tier,
   carton pack, CBM, pieces per container, lead time and certification. */
(function () {
  var CONTAINERS = { "40HQ": { label: "40 ft HQ", cbm: 67.7, usable: 0.90 }, "20GP": { label: "20 ft GP", cbm: 33.2, usable: 0.90 } };

  var GROUPS = [
    { id: "foodstore", name: "Food Storage & Containers", cat: "kitchenware", icon: "package", desc: "Glass and PP containers, canisters, lunch boxes", dom: "product", subMap: { household: ["kw-foodstore", "kw-lunch"] } },
    { id: "drinkware", name: "Drinkware", cat: "kitchenware", icon: "verified", desc: "Bottles, tumblers, mugs, jugs", dom: "product", subMap: { household: ["kw-drinkware", "kw-jug"] } },
    { id: "cookware", name: "Cookware & Bakeware", cat: "kitchenware", icon: "factory", desc: "Pans, pots, trays, grills", dom: "product", subMap: { household: ["kw-cookware", "kw-bakeware"] } },
    { id: "tools", name: "Kitchen Tools & Gadgets", cat: "kitchenware", icon: "wrench", desc: "Cutlery, boards, utensils, measuring", dom: "product", subMap: { household: ["kw-tools"] } },
    { id: "tabletop", name: "Tabletop & Serveware", cat: "kitchenware", icon: "layers", desc: "Dinner sets, glasses, trays, cutlery", dom: "product", subMap: { household: ["kw-cutlery"] } },
    { id: "organise", name: "Home Organisation & Storage", cat: "textilehome", icon: "folder", desc: "Boxes, bins, racks, hangers, vacuum bags", dom: "product", subMap: { household: ["sh-box", "sh-fabric", "sh-shelving", "sh-shoe", "sh-vacbag", "sh-closet"] } },
    { id: "cleaning", name: "Cleaning & Laundry", cat: "smallappl", icon: "clipboardCheck", desc: "Mops, baskets, brushes, cloths, racks, bins", dom: "product", subMap: { household: ["cl-floorcare", "cl-brush", "cl-cloth", "cl-laundry", "cl-drying", "cl-waste"] } },
    { id: "bath", name: "Bath & Home Accessories", cat: "textilehome", icon: "building", desc: "Dispensers, holders, hampers, mats, curtains, mirrors", dom: "product", subMap: { household: ["bh-dispenser", "bh-hamper", "bh-mat", "bh-holder", "bh-shower", "bh-mirror"] } },
    { id: "appliance", name: "Small Kitchen Appliances", cat: "smallappl", icon: "cpu", desc: "Kettles, blenders, fryers — GS/CE electrical", dom: "product", subMap: { household: ["sa-kettle", "sa-blender", "sa-cooking", "sa-breakfast", "sa-floorcare", "sa-personal"] } },

    { id: "textiles", name: "Home Textiles", cat: "textilehome", icon: "ruler", desc: "Bedding, towels, curtains, cushions, throws", dom: "product", subMap: { household: ["tx-bedding", "tx-towel", "tx-curtain", "tx-cushion", "tx-throw"] } },

    /* Equipment — spare parts and standard components (catalogue articles, not build-to-print) */
    { id: "moldstd", name: "Mould & Die Standard Components", cat: "tooling", icon: "layers", desc: "Guide pillars, ejector pins, hot-runner tips, springs, sliders", dom: "equipment", catMap: { automotive: ["tooling", "imm"], medical: ["cleanroom", "micro"] }, spare: true },
    { id: "machspares", name: "Machine Wear & Spare Parts", cat: "imm", icon: "cog", desc: "Screws, barrels, heater bands, seal kits, guides, filters", dom: "equipment", catMap: { automotive: ["imm", "cnc", "press", "heat"], machinery: ["machtool", "weldcell", "testrig", "paintline"], household: ["packline", "assyhouse"], rawmat: ["cutservice", "silo"], electronics: ["smtline"] }, spare: true },
    { id: "autospares", name: "Line & Robot Consumables", cat: "robot", icon: "workflow", desc: "Weld caps, grippers, vacuum cups, cable tracks, sensors", dom: "equipment", catMap: { automotive: ["robot", "assembly"], machinery: ["weldcell", "handling"], electronics: ["smtline", "testers"] }, spare: true },

    /* Product — catalogue articles by industry */
    { id: "autocat", name: "Standard Parts & Consumables", cat: "metal", icon: "truck", desc: "Fasteners, clips, seals, bearings, grommets", dom: "product", inds: ["automotive"] },
    { id: "aerocat", name: "Qualified Hardware & Consumables", cat: "fasteners", icon: "compass", desc: "Qualified fasteners, lockwire, bonded washers, sealant kits", dom: "product", inds: ["aerospace"] },
    { id: "medcat", name: "Standard Device Components", cat: "moulded", icon: "shieldCheck", desc: "Luer fittings, tubing, sterile pouches, syringe parts", dom: "product", inds: ["medical"] },
    { id: "machcat", name: "Mechanical Catalogue Parts", cat: "gears", icon: "cog", desc: "Bearings, couplings, cylinders, sensors, gearmotors", dom: "product", inds: ["machinery"] },
    { id: "eleccat", name: "Electronic Catalogue Parts", cat: "electmed", icon: "cpu", desc: "Connectors, enclosures, cable sets, LED modules", dom: "product", inds: ["electronics"] },
    { id: "rawcat", name: "Stock Materials", cat: "polymer", icon: "layers", desc: "Resin lots, masterbatch, coil, billet — index-linked", dom: "product", inds: ["rawmat"] },
    { id: "oilcat", name: "Flow & Sealing Catalogue", cat: "valves", icon: "gauge", desc: "Gaskets, valve trim kits, flanges, instrument fittings", dom: "product", inds: ["oilgas"] },
    { id: "energycat", name: "Balance-of-System Parts", cat: "solar", icon: "trendUp", desc: "Mounting clips, DC connectors, fasteners, inverter spares", dom: "product", inds: ["energy"] },
    { id: "nuccat", name: "Qualified Consumables", cat: "nucparts", icon: "target", desc: "Qualified fasteners, seals, monitoring consumables", dom: "product", inds: ["nuclear"] }
  ];

  var EXT = window.INDUSTRY_CATALOG_EXT || null;
  if (EXT) GROUPS = GROUPS.concat(EXT.groups);

  /* a spare-parts group hangs off specific equipment categories, never off the
     industry as a whole — mould standards belong under Tooling & Mould Bases */
  GROUPS.forEach(function (g) {
    if (g.catMap) g.inds = Object.keys(g.catMap);
    if (g.subMap) g.inds = Object.keys(g.subMap);
    g.catsFor = function (ind) { return (g.catMap && g.catMap[ind]) || []; };
    g.subsFor = function (ind) { return (g.subMap && g.subMap[ind]) || []; };
  });

  /* fam(id, group, name, material, desc, keywords, unitPrice, moq, pack, cbm, variants, flags) */
  function v(code, label, cap, dim, weight, pf) { return { code: code, label: label, cap: cap, dim: dim, weight: weight, pf: pf }; }
  function fam(id, group, name, material, desc, keywords, price, moq, pack, cbm, variants, flags) {
    return Object.assign({
      id: id, group: group, name: name, material: material, desc: desc,
      keywords: keywords, price: price, moq: moq, pack: pack, cbm: cbm, variants: variants, images: []
    }, flags || {});
  }

  var FAMILIES = [
    fam("glass-rect", "foodstore", "Borosilicate Glass Food Container — Rectangular, Clip Lid", "Borosilicate glass + PP lid",
      "Oven-safe borosilicate body, four-clip PP lid with silicone gasket, airtight and leak-proof. Retail-ready sleeve or bulk carton.",
      ["glass container", "hermetic", "pote de vidro", "food storage", "lunch box", "airtight", "meal prep"],
      1.42, 2000, 12, 0.062,
      [v("GPK22-310/L1", "310 ml", "310 ml", "H 48.5 · Ø 112 mm", "240 g", 0.78),
       v("GPK22-520/L1", "520 ml", "520 ml", "H 55 · Ø 132 mm", "322 g", 0.90),
       v("GPK22-640/L1", "640 ml", "640 ml", "H 58 · Ø 142 mm", "372 g", 1.00),
       v("GPK22-800/L1", "800 ml", "800 ml", "H 60 · Ø 152 mm", "448 g", 1.12),
       v("GPK22-1040/L1", "1 040 ml", "1 040 ml", "H 68 · Ø 168 mm", "540 g", 1.28)],
      { certs: ["LFGB", "FDA 21 CFR", "BPA-free"], oem: true, hero: "assets/catalog/glass-rect-hero.jpg",
        images: ["assets/catalog/glass-rect-hero.jpg", "assets/catalog/glass-rect-specs.jpg", "assets/catalog/glass-rect-10pack.jpg", "assets/catalog/glass-rect-carton.jpg", "assets/catalog/glass-rect-sample.jpg"] }),
    fam("glass-round", "foodstore", "Borosilicate Glass Food Container — Round, Clip Lid", "Borosilicate glass + PP lid",
      "Round body for soups and sauces, same four-clip lid platform as the rectangular range — shared tooling, shared certification.",
      ["glass container", "round", "soup", "food storage"], 1.36, 2000, 12, 0.058,
      [v("GPR-400", "400 ml", "400 ml", "H 62 · Ø 108 mm", "268 g", 0.84), v("GPR-600", "600 ml", "600 ml", "H 72 · Ø 120 mm", "340 g", 1.00), v("GPR-900", "900 ml", "900 ml", "H 84 · Ø 136 mm", "455 g", 1.20)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),
    fam("glass-bento", "foodstore", "Divided Glass Bento Box, 2 / 3 Compartment", "Borosilicate glass + PP lid",
      "Moulded dividers, vented lid valve, microwave and dishwasher safe. Popular for meal-prep multipacks.",
      ["bento", "lunch", "divided", "meal prep"], 2.24, 1500, 8, 0.071,
      [v("GBX-2C-950", "2-compartment 950 ml", "950 ml", "260 × 175 × 55 mm", "690 g", 1.00), v("GBX-3C-1100", "3-compartment 1 100 ml", "1 100 ml", "280 × 190 × 58 mm", "780 g", 1.14)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),
    fam("pp-crisper", "foodstore", "PP Airtight Crisper Set, Nesting", "Polypropylene + TPE seal",
      "Injection-moulded nesting crispers, four-side locking lid. Shipped nested — best CBM efficiency in the group.",
      ["crisper", "plastic container", "nesting", "food storage"], 0.62, 5000, 24, 0.048,
      [v("PPC-500", "500 ml", "500 ml", "150 × 105 × 55 mm", "78 g", 0.72), v("PPC-1000", "1 000 ml", "1 000 ml", "180 × 128 × 70 mm", "112 g", 1.00), v("PPC-1800", "1 800 ml", "1 800 ml", "215 × 155 × 82 mm", "158 g", 1.32)],
      { certs: ["LFGB", "BPA-free"], oem: true }),
    fam("canister", "foodstore", "Airtight Cereal Canister, Push-Button Lid", "PET body + ABS lid",
      "Stackable dry-goods canister, silicone-sealed push lid, clear PET body with measuring scale.",
      ["canister", "cereal", "dry goods", "airtight"], 1.08, 3000, 12, 0.084,
      [v("CAN-1200", "1.2 L", "1.2 L", "H 195 · 110 × 110 mm", "206 g", 0.88), v("CAN-1800", "1.8 L", "1.8 L", "H 255 · 110 × 110 mm", "248 g", 1.00), v("CAN-2500", "2.5 L", "2.5 L", "H 310 · 120 × 120 mm", "312 g", 1.18)],
      { certs: ["LFGB"], oem: true }),
    fam("lunch-steel", "foodstore", "Vacuum Insulated Lunch Jar, 18/8", "304 stainless + PP outer",
      "Double-wall vacuum jar, 6 h hot retention, folding spoon in lid. Electro-polished inner.",
      ["lunch jar", "thermos", "insulated", "stainless"], 4.85, 1000, 12, 0.098,
      [v("VLJ-500", "500 ml", "500 ml", "H 148 · Ø 102 mm", "418 g", 0.90), v("VLJ-750", "750 ml", "750 ml", "H 178 · Ø 108 mm", "512 g", 1.00), v("VLJ-1000", "1 000 ml", "1 000 ml", "H 205 · Ø 114 mm", "596 g", 1.16)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),

    fam("bottle-tritan", "drinkware", "Tritan Sports Bottle, Flip-Top", "Tritan copolyester",
      "Impact-resistant Tritan body, leak-proof flip spout, silicone grip band. Pad-print or IML decoration.", ["bottle", "sports", "tritan", "water"], 1.18, 3000, 24, 0.072,
      [v("TSB-600", "600 ml", "600 ml", "H 225 · Ø 72 mm", "128 g", 0.92), v("TSB-800", "800 ml", "800 ml", "H 258 · Ø 76 mm", "152 g", 1.00), v("TSB-1000", "1 000 ml", "1 000 ml", "H 285 · Ø 80 mm", "176 g", 1.12)],
      { certs: ["LFGB", "BPA-free"], oem: true }),
    fam("tumbler-steel", "drinkware", "Vacuum Tumbler, Powder-Coated 18/8", "304 stainless",
      "Double-wall tumbler with slider lid, powder-coat finish in up to 6 Pantone colours.", ["tumbler", "vacuum", "travel mug"], 3.40, 2000, 25, 0.086,
      [v("VTB-350", "350 ml", "350 ml", "H 148 · Ø 72 mm", "246 g", 0.86), v("VTB-500", "500 ml", "500 ml", "H 178 · Ø 76 mm", "298 g", 1.00), v("VTB-750", "750 ml", "750 ml", "H 215 · Ø 84 mm", "364 g", 1.18)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),
    fam("mug-dblglass", "drinkware", "Double-Wall Borosilicate Mug", "Borosilicate glass",
      "Hand-blown double wall, thermal shock tested −20 → 150 °C. High breakage allowance — pack design matters.", ["mug", "double wall", "glass", "coffee"], 1.62, 2000, 24, 0.094,
      [v("DWM-250", "250 ml", "250 ml", "H 92 · Ø 78 mm", "168 g", 0.90), v("DWM-350", "350 ml", "350 ml", "H 108 · Ø 84 mm", "196 g", 1.00), v("DWM-450", "450 ml", "450 ml", "H 122 · Ø 90 mm", "228 g", 1.12)],
      { certs: ["LFGB"], oem: true }),
    fam("jug-glass", "drinkware", "Glass Jug with Infuser Core", "Borosilicate glass + PP",
      "Heat-resistant jug with removable fruit-infuser core and bamboo lid option.", ["jug", "pitcher", "infuser", "carafe"], 2.95, 1200, 6, 0.072,
      [v("GJG-1000", "1.0 L", "1.0 L", "H 240 · Ø 105 mm", "520 g", 0.92), v("GJG-1500", "1.5 L", "1.5 L", "H 285 · Ø 115 mm", "640 g", 1.00)],
      { certs: ["LFGB"], oem: true }),

    fam("frypan", "cookware", "Non-Stick Forged Aluminium Frypan", "Forged aluminium + PTFE",
      "3.5 mm forged body, 3-layer non-stick, induction base plate option, bakelite handle.", ["frypan", "non-stick", "skillet", "cookware"], 4.20, 1000, 6, 0.089,
      [v("FPN-20", "20 cm", "20 cm", "Ø 200 · H 45 mm", "620 g", 0.80), v("FPN-24", "24 cm", "24 cm", "Ø 240 · H 50 mm", "780 g", 1.00), v("FPN-28", "28 cm", "28 cm", "Ø 280 · H 55 mm", "980 g", 1.22)],
      { certs: ["LFGB", "PFOA-free"], oem: true }),
    fam("potset", "cookware", "Stainless Cookware Set, 5-Ply Base", "304 stainless",
      "Casserole, saucepan and stockpot with tempered glass lids and encapsulated base.", ["pot set", "cookware", "saucepan", "stainless"], 18.60, 400, 2, 0.112,
      [v("SPS-6", "6-piece", "3 pots + lids", "Nested set", "4.8 kg", 1.00), v("SPS-10", "10-piece", "5 pots + lids", "Nested set", "7.9 kg", 1.52)],
      { certs: ["LFGB"], oem: true }),
    fam("grillpan", "cookware", "Pre-Seasoned Cast Iron Grill Pan", "Cast iron",
      "Sand-cast, vegetable-oil seasoned, ribbed base with pour spouts. Heavy — freight cost dominates.", ["grill pan", "cast iron", "bbq"], 6.90, 600, 4, 0.076,
      [v("CIG-26", "26 cm square", "26 cm", "260 × 260 × 42 mm", "2.6 kg", 1.00), v("CIG-30", "30 cm square", "30 cm", "300 × 300 × 45 mm", "3.4 kg", 1.22)],
      { certs: ["LFGB"], oem: false }),
    fam("baketray", "cookware", "Glass Bakeware Tray with Lid", "Borosilicate glass",
      "Oven-to-table tray, −40 → 400 °C, optional PP storage lid — sells as a roasting and storage combo.", ["bakeware", "roasting", "oven dish", "glass tray"], 2.48, 1500, 6, 0.081,
      [v("GBT-1500", "1.5 L", "1.5 L", "280 × 180 × 55 mm", "980 g", 0.88), v("GBT-2200", "2.2 L", "2.2 L", "320 × 205 × 62 mm", "1.24 kg", 1.00), v("GBT-3000", "3.0 L", "3.0 L", "355 × 225 × 68 mm", "1.52 kg", 1.16)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),

    fam("knifeblock", "tools", "Knife Block Set, Stamped 3Cr14", "3Cr14 steel + rubberwood",
      "5 knives plus shears and block, laser-etched blades, PP or rubberwood block options.", ["knife set", "block", "kitchen knife"], 7.40, 600, 6, 0.104,
      [v("KBS-7", "7-piece", "5 knives + shears + block", "Block 340 × 120 mm", "2.1 kg", 1.00), v("KBS-9", "9-piece", "7 knives + shears + block", "Block 360 × 130 mm", "2.6 kg", 1.18)],
      { certs: ["LFGB"], oem: true }),
    fam("utensils", "tools", "Silicone Kitchen Utensil Set, Beech Handle", "Silicone + beech",
      "Heat-resistant to 230 °C, seamless one-piece moulding, hanging loop. 6 or 11 piece.", ["utensil", "spatula", "silicone", "kitchen tools"], 3.15, 1500, 12, 0.094,
      [v("SUS-6", "6-piece", "6 tools", "Sleeve 340 mm", "520 g", 1.00), v("SUS-11", "11-piece", "10 tools + holder", "Box 360 mm", "1.1 kg", 1.62)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),
    fam("board-bamboo", "tools", "Bamboo Chopping Board Set", "Moso bamboo",
      "Carbonised bamboo, food-grade glue, juice groove. FSC chain-of-custody available on request.", ["chopping board", "bamboo", "cutting board"], 2.10, 2000, 20, 0.098,
      [v("BCB-S", "Small 280 × 200", "280 × 200 mm", "H 18 mm", "480 g", 0.76), v("BCB-M", "Medium 340 × 240", "340 × 240 mm", "H 18 mm", "680 g", 1.00), v("BCB-L", "Large 400 × 280", "400 × 280 mm", "H 20 mm", "920 g", 1.24)],
      { certs: ["LFGB", "FSC option"], oem: true }),
    fam("measure", "tools", "Measuring Cup & Spoon Set, 18/8", "304 stainless",
      "Stackable nesting set, laser-marked ML/OZ scale, riveted handles.", ["measuring cup", "spoon set", "baking"], 1.55, 3000, 24, 0.062,
      [v("MCS-8", "8-piece", "4 cups + 4 spoons", "Nested", "310 g", 1.00), v("MCS-12", "12-piece", "6 cups + 6 spoons", "Nested", "440 g", 1.28)],
      { certs: ["LFGB"], oem: true }),

    fam("dinnerset", "tabletop", "Porcelain Dinner Set, Reactive Glaze", "New-bone porcelain",
      "1 280 °C fired, reactive glaze, cadmium and lead tested. Breakage-rated export carton.", ["dinner set", "porcelain", "plates", "tableware"], 9.80, 500, 1, 0.068,
      [v("PDS-16", "16-piece / 4 settings", "4 settings", "Carton 420 × 340 × 280 mm", "6.4 kg", 1.00), v("PDS-24", "24-piece / 6 settings", "6 settings", "Carton 460 × 380 × 300 mm", "9.1 kg", 1.42)],
      { certs: ["LFGB", "FDA 21 CFR", "Cd/Pb tested"], oem: true }),
    fam("tumblerglass", "tabletop", "Machine-Pressed Tumbler Set, 6-Pack", "Soda-lime glass",
      "Fully automatic press line, stackable profile, dishwasher rated 2 000 cycles.", ["tumbler", "drinking glass", "glassware", "set"], 2.35, 2000, 4, 0.072,
      [v("MTS-300", "300 ml × 6", "300 ml", "H 98 · Ø 74 mm", "1.9 kg/set", 0.92), v("MTS-400", "400 ml × 6", "400 ml", "H 118 · Ø 80 mm", "2.4 kg/set", 1.00)],
      { certs: ["LFGB"], oem: true }),
    fam("cutlery", "tabletop", "Cutlery Set 18/10, Mirror Polish", "18/10 stainless",
      "Forged 3 mm gauge, mirror or matt PVD finish, gift box or bulk pack.", ["cutlery", "flatware", "fork", "spoon"], 5.60, 1000, 10, 0.058,
      [v("CTL-16", "16-piece", "4 settings", "Box 320 × 240 mm", "1.3 kg", 1.00), v("CTL-24", "24-piece", "6 settings", "Box 360 × 260 mm", "1.9 kg", 1.38)],
      { certs: ["LFGB"], oem: true }),
    fam("tray-melamine", "tabletop", "Melamine Serving Tray, Non-Slip", "Melamine + rubber feet",
      "Compression-moulded melamine, in-mould decal artwork, rubberised base.", ["tray", "melamine", "serving"], 1.72, 2500, 20, 0.088,
      [v("MST-33", "33 × 23 cm", "33 × 23 cm", "H 22 mm", "340 g", 0.88), v("MST-45", "45 × 31 cm", "45 × 31 cm", "H 24 mm", "520 g", 1.00)],
      { certs: ["LFGB"], oem: true }),

    fam("storagebox", "organise", "Clear PP Storage Box with Latching Lid", "Polypropylene",
      "Stack-and-nest geometry, latching lid, optional wheels on 45 L+. Nests 6-deep for freight.", ["storage box", "plastic box", "bin", "latching"], 2.65, 1500, 6, 0.135,
      [v("SBX-10", "10 L", "10 L", "390 × 270 × 145 mm", "480 g", 0.72), v("SBX-25", "25 L", "25 L", "480 × 340 × 210 mm", "820 g", 1.00), v("SBX-45", "45 L", "45 L", "580 × 400 × 260 mm", "1.32 kg", 1.38)],
      { certs: ["REACH"], oem: true }),
    fam("fabricbin", "organise", "Foldable Fabric Storage Bin, Non-Woven", "Non-woven + cardboard",
      "Collapsible bin with reinforced handles, printed or plain. Ships flat — very high pcs per container.", ["storage bin", "fabric", "foldable", "organiser"], 1.24, 3000, 20, 0.052,
      [v("FSB-28", "28 × 28 × 28 cm", "22 L", "Folds to 40 mm", "290 g", 0.90), v("FSB-33", "33 × 33 × 33 cm", "36 L", "Folds to 45 mm", "380 g", 1.00)],
      { certs: ["REACH"], oem: true }),
    fam("shoerack", "organise", "Steel Shoe Rack, Powder-Coated", "Steel tube + non-woven",
      "Knock-down frame, tool-free assembly, 3 / 5 tier. KD pack keeps CBM low.", ["shoe rack", "shelf", "organiser", "steel"], 4.10, 800, 4, 0.096,
      [v("SSR-3", "3-tier", "3 tier", "700 × 300 × 550 mm", "2.4 kg", 0.86), v("SSR-5", "5-tier", "5 tier", "700 × 300 × 900 mm", "3.6 kg", 1.00)],
      { certs: ["REACH"], oem: false }),
    fam("vacbag", "organise", "Vacuum Compression Storage Bag Set", "PA/PE composite film",
      "Double-zip and valve, 8-layer film, hand pump included. Lowest freight cost per retail unit in the range.", ["vacuum bag", "compression", "space saver"], 0.78, 5000, 40, 0.046,
      [v("VCB-6", "6-bag set", "2 × S/M/L", "Sleeve 320 × 240 mm", "620 g", 1.00), v("VCB-10", "10-bag set + pump", "10 bags", "Box 360 × 260 mm", "1.1 kg", 1.46)],
      { certs: ["REACH"], oem: true }),

    fam("spraymop", "cleaning", "Spray Mop with Refillable Tank", "ABS + microfibre",
      "350 ml refill tank, trigger spray, two washable microfibre pads, aluminium pole.", ["mop", "spray", "floor cleaning"], 3.35, 1200, 8, 0.108,
      [v("SPM-STD", "Standard", "350 ml tank", "Pole 1 200 mm", "890 g", 1.00), v("SPM-PRO", "Pro + 4 pads", "500 ml tank", "Pole 1 300 mm", "1.12 kg", 1.24)],
      { certs: ["REACH"], oem: true }),
    fam("laundrybasket", "cleaning", "PP Laundry Basket, Ventilated", "Polypropylene",
      "Injection-moulded, nesting, integrated handles. Nests 10-deep — CBM per piece is the whole negotiation.", ["laundry basket", "hamper", "plastic basket"], 1.95, 2000, 10, 0.156,
      [v("PLB-35", "35 L", "35 L", "550 × 390 × 270 mm", "640 g", 0.88), v("PLB-50", "50 L", "50 L", "600 × 430 × 310 mm", "820 g", 1.00)],
      { certs: ["REACH"], oem: true }),
    fam("microfibre", "cleaning", "Microfibre Cloth Multipack, 300 gsm", "Polyester/polyamide 80/20",
      "Laser-cut edge or overlocked, 300 gsm, colour-coded for zoned cleaning.", ["microfibre", "cloth", "cleaning cloth"], 0.34, 10000, 100, 0.038,
      [v("MFC-12", "12-pack 30 × 30", "12 pcs", "30 × 30 cm", "420 g", 1.00), v("MFC-24", "24-pack 40 × 40", "24 pcs", "40 × 40 cm", "1.3 kg", 2.10)],
      { certs: ["OEKO-TEX option"], oem: true }),
    fam("brushset", "cleaning", "Household Brush & Scrubber Set", "PP + PET bristle",
      "Dish brush, bottle brush, scrub brush and holder. Common private-label filler item.", ["brush", "scrubber", "dish brush"], 0.92, 5000, 48, 0.064,
      [v("HBS-4", "4-piece", "4 tools", "Sleeve 280 mm", "310 g", 1.00), v("HBS-7", "7-piece + caddy", "7 tools", "Box 320 mm", "620 g", 1.55)],
      { certs: ["REACH"], oem: true }),

    fam("dispenser", "bath", "Soap Dispenser & Bath Accessory Set", "Resin / glass / bamboo",
      "4-piece set: dispenser, tumbler, dish, toothbrush holder. Multiple material platforms on one tooling family.", ["soap dispenser", "bathroom set", "accessories"], 3.85, 1000, 6, 0.098,
      [v("BAS-R4", "Resin 4-piece", "4 pcs", "Set carton 300 × 220 mm", "1.6 kg", 1.00), v("BAS-G4", "Glass + bamboo 4-piece", "4 pcs", "Set carton 300 × 220 mm", "2.2 kg", 1.34)],
      { certs: ["REACH"], oem: true }),
    fam("hamper", "bath", "Bamboo & Fabric Laundry Hamper", "Bamboo frame + cotton liner",
      "Folding bamboo frame, removable washable liner, lid option.", ["hamper", "laundry", "bamboo", "basket"], 5.20, 800, 4, 0.126,
      [v("BLH-60", "60 L", "60 L", "Ø 380 · H 600 mm", "2.1 kg", 1.00), v("BLH-90", "90 L double", "2 × 45 L", "600 × 340 · H 620 mm", "3.2 kg", 1.42)],
      { certs: ["REACH"], oem: false }),
    fam("bathmat", "bath", "Memory Foam Bath Mat, Anti-Slip", "Memory foam + TPR backing",
      "Coral-fleece surface, 12 mm memory foam, TPR anti-slip backing. Compressed pack.", ["bath mat", "rug", "memory foam"], 2.40, 2000, 20, 0.118,
      [v("MBM-4060", "40 × 60 cm", "40 × 60", "H 12 mm", "420 g", 0.86), v("MBM-5080", "50 × 80 cm", "50 × 80", "H 15 mm", "680 g", 1.00)],
      { certs: ["OEKO-TEX option", "REACH"], oem: true }),

    fam("kettle", "appliance", "Stainless Electric Kettle, 1.7 L", "304 stainless + PP",
      "1 850 W UK-type element, STRIX-compatible controller, dry-boil and auto shut-off. GS/CE and plug set per market.", ["kettle", "electric", "appliance", "boiler"], 8.90, 1000, 6, 0.132,
      [v("EKT-17S", "1.7 L brushed", "1.7 L", "H 245 · Ø 165 mm", "1.15 kg", 1.00), v("EKT-17G", "1.7 L glass window", "1.7 L", "H 250 · Ø 168 mm", "1.28 kg", 1.10)],
      { certs: ["GS", "CE", "RoHS", "EMC"], oem: true, regulated: true }),
    fam("blender", "appliance", "Hand Blender Set, 800 W", "ABS + 304 shaft",
      "800 W DC motor, detachable stainless shaft, whisk and 600 ml chopper in the set version.", ["blender", "stick blender", "hand mixer"], 9.60, 800, 8, 0.108,
      [v("HBL-800", "800 W base", "800 W", "H 380 mm", "980 g", 1.00), v("HBL-800S", "800 W + chopper set", "800 W", "Box 300 × 220 mm", "1.6 kg", 1.32)],
      { certs: ["GS", "CE", "RoHS"], oem: true, regulated: true }),
    fam("airfryer", "appliance", "Digital Air Fryer, 4.5 L", "ABS + non-stick basket",
      "1 400 W, 8 presets, PFOA-free basket, EU/UK plug variants. High CBM — container economics dominate.", ["air fryer", "fryer", "appliance", "kitchen"], 22.40, 500, 2, 0.086,
      [v("AFR-45", "4.5 L digital", "4.5 L", "320 × 300 × 330 mm", "4.2 kg", 1.00), v("AFR-60", "6.0 L dual-zone", "6.0 L", "380 × 340 × 350 mm", "5.6 kg", 1.36)],
      { certs: ["GS", "CE", "RoHS", "EMC"], oem: true, regulated: true }),
    fam("toaster", "appliance", "2-Slice Toaster, Wide Slot", "Stainless + PP",
      "800 W, 7 browning levels, defrost and reheat, removable crumb tray.", ["toaster", "appliance", "breakfast"], 7.20, 1000, 6, 0.114,
      [v("TST-2S", "2-slice", "2 slice", "280 × 175 × 195 mm", "1.5 kg", 1.00), v("TST-4S", "4-slice", "4 slice", "400 × 200 × 200 mm", "2.4 kg", 1.48)],
      { certs: ["GS", "CE", "RoHS"], oem: true, regulated: true }),
    fam("vacuum", "appliance", "Cordless Stick Vacuum, 22.2 V", "ABS + Li-ion pack",
      "Brushless motor, HEPA filtration, 2 500 mAh pack, wall dock. Battery ships under UN38.3.",
      ["vacuum", "stick vacuum", "cordless", "floor care"], 34.50, 400, 2, 0.094,
      [v("SVC-22", "22.2 V standard", "22.2 V", "1 100 × 250 mm", "2.4 kg", 1.00), v("SVC-25", "25.9 V + 2 batteries", "25.9 V", "1 100 × 250 mm", "2.8 kg", 1.22)],
      { certs: ["CE", "RoHS", "UN38.3"], oem: true, regulated: true }),
    fam("hairdryer", "appliance", "Ionic Hair Dryer, 2 000 W", "PC + ABS",
      "AC motor, ionic generator, two nozzles, cool-shot. Plug and voltage set per market.",
      ["hair dryer", "personal care", "ionic"], 11.80, 800, 6, 0.072,
      [v("HD-2000", "2 000 W standard", "2 000 W", "H 260 mm", "580 g", 1.00), v("HD-2200", "2 200 W + diffuser", "2 200 W", "H 265 mm", "640 g", 1.14)],
      { certs: ["CE", "RoHS", "GS"], oem: true, regulated: true }),
    fam("dryrack", "cleaning", "Folding Clothes Drying Rack", "Powder-coated steel + PP",
      "Winged floor rack, 20 m drying length, folds flat to 60 mm. Knock-down pack keeps CBM low.",
      ["drying rack", "airer", "clothes rack", "laundry"], 6.40, 600, 4, 0.128,
      [v("DR-18", "18 m line", "18 m", "1 800 × 550 mm", "3.2 kg", 0.88), v("DR-20", "20 m line + wings", "20 m", "1 800 × 550 mm", "3.8 kg", 1.00)],
      { certs: ["REACH"], oem: false }),
    fam("pedalbin", "cleaning", "Pedal Bin, Soft-Close 30 L", "304 stainless + PP liner",
      "Fingerprint-resistant shell, soft-close damper tested to 150 000 cycles, removable liner.",
      ["pedal bin", "waste bin", "trash can", "recycling"], 9.20, 500, 2, 0.142,
      [v("PB-20", "20 L", "20 L", "H 490 · Ø 250 mm", "3.1 kg", 0.84), v("PB-30", "30 L", "30 L", "H 640 · Ø 295 mm", "4.2 kg", 1.00), v("PB-2x20", "2 × 20 L recycling", "40 L", "H 640 × 560 mm", "6.4 kg", 1.38)],
      { certs: ["REACH"], oem: true }),
    fam("hangerset", "organise", "Velvet Non-Slip Hanger Set", "ABS + velvet flocking",
      "Slim profile, 360° swivel hook, notched shoulders. Sold in 20 and 50 piece packs.",
      ["hanger", "velvet hanger", "closet", "wardrobe"], 0.38, 5000, 50, 0.052,
      [v("VH-20", "20-pack", "20 pcs", "420 mm wide", "1.2 kg", 1.00), v("VH-50", "50-pack", "50 pcs", "420 mm wide", "2.9 kg", 2.35)],
      { certs: ["REACH"], oem: true }),
    fam("towelbar", "bath", "Towel Bar & Hook Set, 304 Stainless", "304 stainless",
      "Concealed-fix towel bar with matching robe hooks, brushed or matt-black PVD.",
      ["towel bar", "hook", "bathroom fitting", "rail"], 4.60, 1000, 10, 0.062,
      [v("TB-40", "400 mm bar + 2 hooks", "400 mm", "Set", "620 g", 0.88), v("TB-60", "600 mm bar + 2 hooks", "600 mm", "Set", "820 g", 1.00)],
      { certs: ["REACH"], oem: true }),
    fam("showercurtain", "bath", "Shower Curtain with Rings", "PEVA / polyester",
      "Water-repellent curtain with reinforced eyelets and 12 rings. Digital or screen print.",
      ["shower curtain", "bathroom", "curtain", "rings"], 2.20, 2000, 20, 0.058,
      [v("SC-180", "180 × 180 cm", "180 × 180", "PEVA", "480 g", 0.92), v("SC-180200", "180 × 200 cm", "180 × 200", "Polyester", "620 g", 1.00)],
      { certs: ["REACH", "OEKO-TEX option"], oem: true }),
    fam("wallmirror", "bath", "Wall Mirror with Safety Backing", "Silver mirror glass + MDF",
      "4 mm mirror with safety film, framed or frameless, breakage-rated export carton.",
      ["mirror", "wall mirror", "bathroom mirror", "glass"], 7.80, 500, 2, 0.096,
      [v("WM-4060", "40 × 60 cm framed", "40 × 60", "H 20 mm", "3.4 kg", 0.88), v("WM-5070", "50 × 70 cm framed", "50 × 70", "H 20 mm", "4.6 kg", 1.00), v("WM-LED", "60 × 80 LED backlit", "60 × 80", "H 40 mm", "7.2 kg", 1.46)],
      { certs: ["REACH", "CE (LED)"], oem: true }),

    /* second and third articles per household subcategory — a subcategory with one
       article cannot be compared, which is the whole point of the catalogue */
    fam("kettle-glass", "appliance", "Glass Body Kettle with LED Ring, 1.7 L", "Borosilicate glass + PP base",
      "Borosilicate body with blue LED ring, concealed element, STRIX-compatible controller.",
      ["kettle", "glass kettle", "electric", "boiler"], 10.40, 800, 6, 0.138,
      [v("GKT-17", "1.7 L glass", "1.7 L", "H 250 · Ø 168 mm", "1.32 kg", 1.00), v("GKT-18T", "1.8 L temperature select", "1.8 L", "H 258 · Ø 172 mm", "1.48 kg", 1.14)],
      { certs: ["GS", "CE", "RoHS"], oem: true, regulated: true }),
    fam("blender-jug", "appliance", "Jug Blender, 1.5 L Glass Jug", "ABS + borosilicate jug",
      "1 200 W motor, six-blade stainless assembly, pulse and ice-crush programmes.",
      ["blender", "jug blender", "smoothie", "food prep"], 15.80, 600, 4, 0.152,
      [v("JBL-15", "1.5 L · 1 200 W", "1.5 L", "H 400 mm", "3.4 kg", 1.00), v("JBL-20", "2.0 L · 1 500 W", "2.0 L", "H 430 mm", "4.1 kg", 1.22)],
      { certs: ["GS", "CE", "RoHS"], oem: true, regulated: true }),
    fam("grill-contact", "appliance", "Contact Grill & Panini Press, 2 000 W", "Die-cast aluminium plates",
      "Floating hinge, removable non-stick plates, drip tray. PFOA-free coating.",
      ["grill", "panini", "contact grill", "cooking"], 17.20, 500, 2, 0.096,
      [v("CG-2P", "2-portion", "2 portion", "300 × 250 × 130 mm", "3.2 kg", 1.00), v("CG-4P", "4-portion", "4 portion", "380 × 300 × 140 mm", "4.6 kg", 1.32)],
      { certs: ["GS", "CE", "RoHS"], oem: true, regulated: true }),
    fam("coffee-drip", "appliance", "Filter Coffee Maker, 1.25 L", "PP + glass carafe",
      "900 W, anti-drip valve, keep-warm plate, reusable filter. 10-cup glass carafe.",
      ["coffee maker", "filter coffee", "drip", "breakfast"], 8.60, 800, 4, 0.126,
      [v("CM-125", "1.25 L · 10 cup", "1.25 L", "H 330 mm", "1.9 kg", 1.00), v("CM-180", "1.8 L · 15 cup + timer", "1.8 L", "H 360 mm", "2.4 kg", 1.24)],
      { certs: ["GS", "CE", "RoHS"], oem: true, regulated: true }),
    fam("steammop", "appliance", "Steam Mop, 1 500 W", "ABS + microfibre pads",
      "30-second heat-up, 350 ml tank, two washable pads, carpet glider.",
      ["steam mop", "floor care", "steam cleaner"], 18.40, 500, 4, 0.118,
      [v("SM-STD", "Standard", "350 ml", "1 150 mm pole", "2.4 kg", 1.00), v("SM-PRO", "Pro + handheld unit", "500 ml", "1 150 mm pole", "3.1 kg", 1.28)],
      { certs: ["GS", "CE", "RoHS"], oem: true, regulated: true }),
    fam("straightener", "appliance", "Ceramic Hair Straightener", "PC + ceramic plates",
      "Floating ceramic-tourmaline plates, 5 heat settings to 230 °C, swivel cord.",
      ["straightener", "hair iron", "personal care"], 7.40, 1000, 12, 0.058,
      [v("HS-STD", "25 mm plates", "25 mm", "L 290 mm", "340 g", 1.00), v("HS-WIDE", "38 mm wide plates", "38 mm", "L 310 mm", "420 g", 1.16)],
      { certs: ["CE", "RoHS", "GS"], oem: true, regulated: true }),

    fam("wireshelf", "organise", "Chrome Wire Shelving Unit, 4-Tier", "Chromed steel wire",
      "Adjustable wire shelves on split-sleeve posts, 150 kg per tier. Knock-down pack.",
      ["wire shelving", "shelf", "rack", "storage"], 12.80, 300, 1, 0.118,
      [v("WS-4T", "4-tier 900 × 350", "4 tier", "900 × 350 × 1 400 mm", "9.8 kg", 1.00), v("WS-5T", "5-tier 1 200 × 450", "5 tier", "1 200 × 450 × 1 800 mm", "16.4 kg", 1.52)],
      { certs: ["REACH"], oem: false }),
    fam("trolley", "organise", "3-Tier Rolling Storage Trolley", "Powder-coated steel",
      "Slim rolling cart with lockable castors, mesh or solid trays. Ships knocked down.",
      ["trolley", "cart", "rolling", "storage"], 8.90, 400, 2, 0.096,
      [v("TRL-3", "3-tier slim", "3 tier", "420 × 300 × 760 mm", "3.8 kg", 1.00), v("TRL-4", "4-tier wide", "4 tier", "520 × 350 × 900 mm", "5.4 kg", 1.28)],
      { certs: ["REACH"], oem: true }),
    fam("cratefold", "organise", "Foldable Plastic Crate, Stackable", "Polypropylene",
      "Collapses to 18% of its height, stacks when open. Best CBM in the storage range.",
      ["crate", "foldable", "stackable", "storage box"], 2.10, 1500, 10, 0.064,
      [v("FC-30", "30 L", "30 L", "530 × 350 × 285 mm", "1.28 kg", 1.00), v("FC-55", "55 L", "55 L", "600 × 400 × 320 mm", "1.86 kg", 1.34)],
      { certs: ["REACH"], oem: true }),
    fam("closetorg", "organise", "Hanging Closet Organiser, 6-Shelf", "Non-woven + steel frame",
      "Hanging shelf tower with side pockets, steel frame, folds flat for freight.",
      ["closet organiser", "hanging", "wardrobe", "shelf"], 3.40, 1000, 12, 0.062,
      [v("CO-6", "6-shelf", "6 shelf", "300 × 300 × 1 200 mm", "820 g", 1.00), v("CO-8", "8-shelf + drawers", "8 shelf", "300 × 300 × 1 600 mm", "1.14 kg", 1.26)],
      { certs: ["REACH"], oem: true }),

    fam("wallairer", "cleaning", "Wall-Mounted Retractable Airer", "Aluminium + steel line",
      "Retractable five-line airer, 12 m drying length, wall or ceiling fixing kit included.",
      ["airer", "drying line", "retractable", "laundry"], 7.60, 500, 4, 0.084,
      [v("WA-12", "12 m · 5 line", "12 m", "620 mm housing", "2.1 kg", 1.00), v("WA-18", "18 m · 6 line", "18 m", "820 mm housing", "2.8 kg", 1.22)],
      { certs: ["REACH"], oem: false }),
    fam("sensorbin", "cleaning", "Sensor Waste Bin, Touchless 50 L", "304 stainless + ABS",
      "Infrared touchless lid, battery or USB-C powered, removable inner liner.",
      ["sensor bin", "touchless", "waste bin", "kitchen bin"], 16.40, 400, 1, 0.168,
      [v("SB-30", "30 L", "30 L", "H 650 · Ø 300 mm", "4.6 kg", 0.86), v("SB-50", "50 L", "50 L", "H 750 · Ø 330 mm", "6.2 kg", 1.00)],
      { certs: ["REACH", "CE"], oem: true }),

    /* ── Home textiles ── */
    fam("bedset", "textiles", "Cotton Percale Bedding Set", "200TC combed cotton",
      "Duvet cover, fitted sheet and pillowcases, reactive-dyed and pre-shrunk.",
      ["bedding", "duvet", "sheet set", "bed linen"], 11.40, 800, 6, 0.084,
      [v("BD-SGL", "Single 135 × 200", "Single", "3-piece", "1.6 kg", 0.84), v("BD-DBL", "Double 200 × 200", "Double", "4-piece", "2.2 kg", 1.00), v("BD-KING", "King 240 × 220", "King", "4-piece", "2.8 kg", 1.22)],
      { certs: ["OEKO-TEX option", "REACH"], oem: true }),
    fam("towelset", "textiles", "Terry Towel Set, 500 gsm", "100% combed cotton",
      "Zero-twist terry, double-stitched hems, colourfast to 40 washes.",
      ["towel", "bath towel", "terry", "bathroom"], 6.20, 1000, 12, 0.072,
      [v("TW-3", "3-piece set", "3 pcs", "30×50 / 50×90 / 70×140", "1.1 kg", 1.00), v("TW-6", "6-piece set", "6 pcs", "Mixed sizes", "2.0 kg", 1.72)],
      { certs: ["OEKO-TEX option"], oem: true }),
    fam("curtainbo", "textiles", "Blackout Curtain Pair, Eyelet Header", "Triple-weave polyester",
      "Triple-weave blackout to 95%, thermal lining, 8 rustproof eyelets per panel.",
      ["curtain", "blackout", "drapes", "eyelet"], 8.40, 600, 6, 0.078,
      [v("CB-117", "117 × 137 cm pair", "117 × 137", "Eyelet", "1.4 kg", 0.88), v("CB-167", "167 × 183 cm pair", "167 × 183", "Eyelet", "2.1 kg", 1.00), v("CB-228", "228 × 228 cm pair", "228 × 228", "Eyelet", "3.2 kg", 1.34)],
      { certs: ["OEKO-TEX option", "REACH"], oem: true }),
    fam("cushioncov", "textiles", "Cushion Cover Set with Inners", "Cotton-linen blend",
      "Hidden-zip covers with hollow-fibre inners, digital or woven jacquard fronts.",
      ["cushion", "pillow cover", "throw pillow", "scatter"], 2.60, 2000, 20, 0.066,
      [v("CC-45", "45 × 45 cm · 2 pack", "45 × 45", "2 pack", "680 g", 1.00), v("CC-60", "60 × 60 cm · 2 pack", "60 × 60", "2 pack", "1.1 kg", 1.42)],
      { certs: ["OEKO-TEX option"], oem: true }),
    fam("throwknit", "textiles", "Knitted Throw Blanket, 320 gsm", "Acrylic-cotton blend",
      "Chunky knit with fringed or bound edge, anti-pilling rated 4.",
      ["throw", "blanket", "knitted", "sofa throw"], 5.80, 1000, 10, 0.074,
      [v("TH-130", "130 × 170 cm", "130 × 170", "320 gsm", "1.1 kg", 1.00), v("TH-150", "150 × 200 cm", "150 × 200", "380 gsm", "1.6 kg", 1.36)],
      { certs: ["OEKO-TEX option"], oem: true }),

    /* a second comparable article in every remaining subcategory */
    fam("lunch-bento2", "foodstore", "Stainless Bento Lunch Box, 2-Tier", "304 stainless + PP lid",
      "Two stacked stainless tiers with a clip band and cutlery slot, leak-proof silicone gaskets.",
      ["lunch box", "bento", "stainless", "tiffin"], 5.40, 1000, 12, 0.086,
      [v("SBX-2T", "2-tier 1 000 ml", "1 000 ml", "H 120 · Ø 130 mm", "420 g", 1.00), v("SBX-3T", "3-tier 1 500 ml", "1 500 ml", "H 165 · Ø 130 mm", "560 g", 1.22)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),
    fam("carafe-steel", "drinkware", "Vacuum Carafe with Pump Lid, 1.9 L", "304 stainless",
      "Double-wall carafe with push-pump lid, 12 h heat retention, tested to 2 000 pumps.",
      ["carafe", "thermal jug", "pitcher", "vacuum"], 8.20, 800, 6, 0.098,
      [v("VCF-16", "1.6 L", "1.6 L", "H 305 · Ø 155 mm", "1.08 kg", 0.90), v("VCF-19", "1.9 L", "1.9 L", "H 330 · Ø 160 mm", "1.24 kg", 1.00)],
      { certs: ["LFGB", "FDA 21 CFR"], oem: true }),
    fam("caketin", "cookware", "Non-Stick Bakeware Tin Set", "Carbon steel + PTFE",
      "0.4 mm carbon steel with two-layer non-stick, rolled edges, loaf, round and muffin forms.",
      ["bakeware", "cake tin", "baking", "muffin"], 3.40, 1200, 12, 0.068,
      [v("BT-3", "3-piece set", "3 pcs", "Nested", "920 g", 1.00), v("BT-5", "5-piece set", "5 pcs", "Nested", "1.42 kg", 1.38)],
      { certs: ["LFGB", "PFOA-free"], oem: true }),
    fam("sweepset", "cleaning", "Broom, Dustpan & Squeegee Set", "PP + rubber blade",
      "Rubber-bristle broom with clip-on dustpan and window squeegee, telescopic pole.",
      ["broom", "dustpan", "squeegee", "sweeping"], 3.80, 1200, 8, 0.112,
      [v("BS-STD", "Broom + dustpan", "2 pcs", "Pole 1 200 mm", "980 g", 1.00), v("BS-PLUS", "Broom + pan + squeegee", "3 pcs", "Pole 1 300 mm", "1.28 kg", 1.22)],
      { certs: ["REACH"], oem: true }),
    fam("scourer", "cleaning", "Stainless Scourer & Sponge Multipack", "430 stainless + foam",
      "Spiral stainless scourers with non-scratch sponges, retail-bagged multipacks.",
      ["scourer", "sponge", "pot scrubber", "dish"], 0.44, 8000, 60, 0.044,
      [v("SC-6", "6-pack", "6 pcs", "Bagged", "180 g", 1.00), v("SC-12", "12-pack", "12 pcs", "Bagged", "340 g", 1.78)],
      { certs: ["REACH"], oem: true }),
    fam("wipesheet", "cleaning", "Non-Woven Dry Wipe Rolls", "Viscose-polyester non-woven",
      "Perforated dry-wipe rolls, 60 gsm, food-contact approved, printed core options.",
      ["wipes", "cloth roll", "non-woven", "cleaning"], 0.62, 6000, 40, 0.048,
      [v("DW-50", "50-sheet roll", "50 sheets", "250 × 300 mm", "280 g", 1.00), v("DW-100", "100-sheet roll", "100 sheets", "250 × 300 mm", "520 g", 1.68)],
      { certs: ["LFGB", "REACH"], oem: true }),
    fam("pegbasket", "cleaning", "Laundry Peg Set with Hanging Basket", "PP + stainless spring",
      "UV-stabilised pegs with stainless springs and a hanging mesh basket.",
      ["pegs", "clothes pins", "laundry", "basket"], 1.10, 4000, 24, 0.056,
      [v("PG-40", "40 pegs + basket", "40 pegs", "Basket 240 mm", "420 g", 1.00), v("PG-80", "80 pegs + basket", "80 pegs", "Basket 280 mm", "720 g", 1.52)],
      { certs: ["REACH"], oem: true }),
    fam("underbed", "organise", "Under-Bed Storage Bag, Zipped", "Non-woven + PEVA window",
      "Reinforced handles, clear window, stiffened base. Ships flat at very low CBM.",
      ["under-bed", "storage bag", "zipped", "organiser"], 1.68, 2500, 20, 0.048,
      [v("UB-90", "90 L", "90 L", "1 000 × 450 × 150 mm", "520 g", 1.00), v("UB-120", "120 L", "120 L", "1 100 × 500 × 180 mm", "680 g", 1.26)],
      { certs: ["REACH"], oem: true }),
    fam("shoebox", "organise", "Stackable Clear Shoe Box Set", "PP + magnetic door",
      "Front-opening magnetic door, stackable and side-ventilated, sold in 6 and 12 packs.",
      ["shoe box", "shoe storage", "stackable", "clear"], 2.40, 1500, 6, 0.092,
      [v("SBX-6", "6-box set", "6 boxes", "330 × 230 × 130 mm", "2.4 kg", 1.00), v("SBX-12", "12-box set", "12 boxes", "330 × 230 × 130 mm", "4.6 kg", 1.86)],
      { certs: ["REACH"], oem: true }),
    fam("vaccube", "organise", "Vacuum Storage Cube with Pump", "PA/PE film + PP frame",
      "Framed vacuum cube that holds its shape when compressed, electric pump option.",
      ["vacuum cube", "compression", "space saver", "storage"], 3.20, 2000, 12, 0.052,
      [v("VQ-60", "60 L cube", "60 L", "500 × 400 × 300 mm", "640 g", 1.00), v("VQ-90", "90 L cube + pump", "90 L", "600 × 450 × 330 mm", "980 g", 1.34)],
      { certs: ["REACH"], oem: true }),
    fam("dispenser-auto", "bath", "Automatic Soap Dispenser, Sensor", "ABS + PP tank",
      "Infrared sensor pump, 400 ml tank, USB-C charging, adjustable dose.",
      ["soap dispenser", "automatic", "sensor", "bathroom"], 6.40, 800, 8, 0.082,
      [v("ASD-300", "300 ml", "300 ml", "H 175 mm", "310 g", 0.90), v("ASD-400", "400 ml", "400 ml", "H 195 mm", "380 g", 1.00)],
      { certs: ["CE", "RoHS", "REACH"], oem: true }),
    fam("shelfshower", "bath", "Adhesive Shower Shelf & Rail Set", "304 stainless + ABS base",
      "Drill-free adhesive mount rated to 8 kg, removable basket, matching hooks.",
      ["shower shelf", "caddy", "holder", "adhesive"], 3.90, 1200, 12, 0.068,
      [v("SS-1", "Single shelf + 2 hooks", "1 shelf", "400 mm", "480 g", 1.00), v("SS-2", "Double shelf + rail", "2 shelf", "400 mm", "760 g", 1.42)],
      { certs: ["REACH"], oem: true }),
    fam("bathrug", "bath", "Cotton Bath Rug, Reversible", "Combed cotton + latex backing",
      "1 800 gsm reversible cotton rug with anti-slip latex backing, machine washable.",
      ["bath rug", "mat", "cotton", "bathroom"], 4.20, 1200, 12, 0.104,
      [v("BR-5080", "50 × 80 cm", "50 × 80", "1 800 gsm", "820 g", 1.00), v("BR-60100", "60 × 100 cm", "60 × 100", "1 800 gsm", "1.18 kg", 1.32)],
      { certs: ["OEKO-TEX option", "REACH"], oem: true }),
    fam("showerrail", "bath", "Tension Shower Rail & Liner Set", "Aluminium + PEVA liner",
      "No-drill tension rail with a weighted PEVA liner and 12 rustproof rings.",
      ["shower rail", "curtain rod", "tension", "liner"], 4.80, 800, 6, 0.086,
      [v("SR-110", "110–200 cm rail", "110–200 cm", "Set", "980 g", 1.00), v("SR-200", "200–300 cm rail", "200–300 cm", "Set", "1.28 kg", 1.24)],
      { certs: ["REACH"], oem: true }),
    fam("hamperpp", "bath", "Slim PP Laundry Hamper with Lid", "Polypropylene",
      "Slim profile for tight bathrooms, ventilated sides, hinged lid, nests for freight.",
      ["hamper", "laundry bin", "lidded", "bathroom"], 3.60, 1200, 6, 0.134,
      [v("PH-40", "40 L slim", "40 L", "480 × 300 × 580 mm", "1.28 kg", 0.90), v("PH-60", "60 L", "60 L", "540 × 340 × 640 mm", "1.68 kg", 1.00)],
      { certs: ["REACH"], oem: true }),
    fam("mirrorled", "bath", "LED Vanity Mirror, Dimmable", "Glass + aluminium frame",
      "Anti-fog heated pad, three colour temperatures, touch dimmer, IP44 rated.",
      ["mirror", "LED mirror", "vanity", "anti-fog"], 19.60, 300, 1, 0.126,
      [v("LM-6080", "60 × 80 cm", "60 × 80", "IP44", "8.4 kg", 1.00), v("LM-70100", "70 × 100 cm", "70 × 100", "IP44", "11.6 kg", 1.34)],
      { certs: ["CE", "RoHS", "IP44"], oem: true }),
    fam("bedmicro", "textiles", "Brushed Microfibre Bedding Set", "Brushed polyester microfibre",
      "Easy-care microfibre, wrinkle-resistant, printed or plain dyed, deep-pocket sheet.",
      ["bedding", "microfibre", "duvet set", "sheet"], 6.80, 1200, 8, 0.078,
      [v("BM-SGL", "Single", "Single", "3-piece", "1.1 kg", 0.84), v("BM-DBL", "Double", "Double", "4-piece", "1.5 kg", 1.00), v("BM-KING", "King", "King", "4-piece", "1.9 kg", 1.20)],
      { certs: ["OEKO-TEX option", "REACH"], oem: true }),
    fam("towelbamboo", "textiles", "Bamboo-Cotton Towel Set, 600 gsm", "Bamboo viscose + cotton",
      "70/30 bamboo-cotton blend, high absorbency, dobby border, gift-boxed option.",
      ["towel", "bamboo", "bath sheet", "set"], 9.40, 800, 10, 0.086,
      [v("BT-3", "3-piece set", "3 pcs", "600 gsm", "1.3 kg", 1.00), v("BT-6", "6-piece set", "6 pcs", "600 gsm", "2.4 kg", 1.74)],
      { certs: ["OEKO-TEX option"], oem: true }),
    fam("curtainsheer", "textiles", "Sheer Voile Curtain Pair", "Polyester voile",
      "Lightweight voile with weighted hem, rod-pocket or eyelet header, 12 colours.",
      ["curtain", "voile", "sheer", "net"], 3.60, 1500, 10, 0.062,
      [v("CV-140", "140 × 230 cm pair", "140 × 230", "Rod pocket", "640 g", 1.00), v("CV-140270", "140 × 270 cm pair", "140 × 270", "Eyelet", "780 g", 1.18)],
      { certs: ["OEKO-TEX option"], oem: true }),
    fam("cushionvelvet", "textiles", "Velvet Cushion Cover Pair", "Polyester velvet",
      "Dutch velvet with piped edge and invisible zip, 24 stock colours, covers only.",
      ["cushion", "velvet", "cover", "scatter"], 1.90, 3000, 25, 0.058,
      [v("VC-45", "45 × 45 cm pair", "45 × 45", "Covers only", "320 g", 1.00), v("VC-50", "50 × 50 cm pair", "50 × 50", "Covers only", "390 g", 1.16)],
      { certs: ["OEKO-TEX option"], oem: true }),
    fam("throwfleece", "textiles", "Sherpa Fleece Throw, 280 gsm", "Polyester fleece + sherpa",
      "Double-sided fleece and sherpa throw, anti-static finish, banded retail pack.",
      ["throw", "fleece", "sherpa", "blanket"], 4.20, 1500, 12, 0.082,
      [v("FT-130", "130 × 170 cm", "130 × 170", "280 gsm", "940 g", 1.00), v("FT-150", "150 × 200 cm", "150 × 200", "320 gsm", "1.32 kg", 1.34)],
      { certs: ["OEKO-TEX option"], oem: true }),

    /* ── Equipment · mould and die standard components (spare parts) ── */
    fam("guidepillar", "moldstd", "Guide Pillar & Bushing Set, Hardened", "1.2379 / bronze-graphite",
      "DIN-pattern guide pillar with matched bushing, 58–62 HRC, ground h5 fit. Interchangeable with standard mould-base bores.",
      ["guide pillar", "leader pin", "bushing", "mould base", "spare"], 18.40, 50, 10, 0.012,
      [v("GP-20-100", "Ø 20 × 100 mm", "Ø 20", "L 100 mm", "310 g", 0.86), v("GP-25-150", "Ø 25 × 150 mm", "Ø 25", "L 150 mm", "580 g", 1.00), v("GP-32-200", "Ø 32 × 200 mm", "Ø 32", "L 200 mm", "1.24 kg", 1.32)],
      { certs: ["ISO 9001", "Material cert 3.1"], oem: false }),
    fam("ejectorpin", "moldstd", "Ejector Pin, Nitrided Through-Hardened", "1.2344 nitrided",
      "Straight ejector pin to ISO 6751, nitrided surface 900 HV, cut-to-length service. The highest-turnover consumable in any moulding tool room.",
      ["ejector pin", "knock-out pin", "mould spare", "nitrided"], 2.35, 200, 50, 0.004,
      [v("EP-3-150", "Ø 3 × 150 mm", "Ø 3", "L 150 mm", "12 g", 0.82), v("EP-5-200", "Ø 5 × 200 mm", "Ø 5", "L 200 mm", "32 g", 1.00), v("EP-8-250", "Ø 8 × 250 mm", "Ø 8", "L 250 mm", "98 g", 1.28)],
      { certs: ["ISO 9001"], oem: false }),
    fam("hotrunner", "moldstd", "Hot Runner Nozzle Tip & Heater Set", "Beryllium-free copper alloy",
      "Replacement tip, heater band and thermocouple for open-gate hot-runner systems. Sized by shot weight, not by machine.",
      ["hot runner", "nozzle tip", "heater", "thermocouple", "spare"], 96.00, 10, 2, 0.006,
      [v("HRT-12", "12 mm · to 60 g shot", "12 mm", "L 60 mm", "140 g", 0.88), v("HRT-16", "16 mm · to 180 g shot", "16 mm", "L 80 mm", "220 g", 1.00), v("HRT-20", "20 mm · to 400 g shot", "20 mm", "L 100 mm", "340 g", 1.22)],
      { certs: ["ISO 9001", "CE"], oem: false }),
    fam("moldspring", "moldstd", "Die Spring & Date Insert Kit", "Chrome-silicon / 1.2083",
      "ISO 10243 colour-coded die springs with date and cavity-number inserts. Shipped as a maintenance kit per tool.",
      ["die spring", "date stamp", "cavity insert", "maintenance kit"], 7.80, 100, 20, 0.008,
      [v("DSK-L", "Light load · green", "green", "Ø 25 × 50 mm", "95 g", 0.90), v("DSK-M", "Medium load · blue", "blue", "Ø 25 × 50 mm", "105 g", 1.00), v("DSK-H", "Heavy load · red", "red", "Ø 25 × 50 mm", "118 g", 1.14)],
      { certs: ["ISO 10243"], oem: false }),
    fam("slidelock", "moldstd", "Slider, Wear Plate & Latch Lock Set", "1.2312 + graphite bronze",
      "Angle-pin slider with graphite wear plates and latch lock — the set that fails first on side-action tools.",
      ["slider", "wear plate", "latch lock", "side action", "spare"], 42.00, 20, 5, 0.014,
      [v("SL-S", "Small · to 60 mm stroke", "60 mm", "Set of 4", "1.1 kg", 0.88), v("SL-M", "Medium · to 100 mm stroke", "100 mm", "Set of 4", "1.9 kg", 1.00)],
      { certs: ["ISO 9001"], oem: false }),
    fam("coolfitting", "moldstd", "Cooling Circuit Fitting & Baffle Kit", "Brass / stainless",
      "Quick couplings, plugs, baffles and bubblers for mould cooling circuits, pressure-tested to 10 bar.",
      ["cooling", "quick coupling", "baffle", "bubbler", "water circuit"], 5.60, 100, 25, 0.009,
      [v("CF-9", "9 mm coupling kit", "9 mm", "Kit of 10", "420 g", 0.92), v("CF-13", "13 mm coupling kit", "13 mm", "Kit of 10", "620 g", 1.00)],
      { certs: ["ISO 9001"], oem: false }),

    /* ── Equipment · machine wear parts ── */
    fam("screwbarrel", "machspares", "Screw & Barrel Set, Bimetallic", "38CrMoAlA + bimetal liner",
      "Replacement plasticising unit for injection machines, nitrided screw with bimetallic barrel liner — sized by machine tonnage.",
      ["screw", "barrel", "plasticising", "injection spare", "bimetal"], 1850.00, 1, 1, 0.42,
      [v("SB-36", "Ø 36 mm · 80–130 t", "Ø 36", "L 900 mm", "48 kg", 0.82), v("SB-45", "Ø 45 mm · 160–250 t", "Ø 45", "L 1 150 mm", "76 kg", 1.00), v("SB-60", "Ø 60 mm · 300–450 t", "Ø 60", "L 1 500 mm", "128 kg", 1.38)],
      { certs: ["ISO 9001", "Material cert 3.1"], oem: false }),
    fam("heaterband", "machspares", "Ceramic Heater Band with Thermocouple", "Ceramic / stainless shell",
      "Barrel heater band, 230/400 V, ceramic insulation to 700 °C, integrated type-J thermocouple pocket.",
      ["heater band", "barrel heater", "thermocouple", "spare"], 34.00, 20, 10, 0.016,
      [v("HB-120", "Ø 120 × 100 mm", "Ø 120", "1.2 kW", "1.1 kg", 0.90), v("HB-150", "Ø 150 × 130 mm", "Ø 150", "2.0 kW", "1.6 kg", 1.00)],
      { certs: ["CE", "RoHS"], oem: false }),
    fam("sealkit", "machspares", "Hydraulic Cylinder Seal Kit", "NBR / PTFE / PUR",
      "Complete rod and piston seal kit with wipers and back-up rings, to 250 bar, −30 to +110 °C.",
      ["seal kit", "hydraulic", "cylinder", "o-ring", "spare"], 46.00, 10, 5, 0.007,
      [v("SK-63", "Ø 63 mm bore", "Ø 63", "Kit", "280 g", 0.88), v("SK-100", "Ø 100 mm bore", "Ø 100", "Kit", "460 g", 1.00)],
      { certs: ["ISO 9001"], oem: false }),
    fam("linearguide", "machspares", "Linear Guide & Ball Screw Assembly", "Bearing steel, C7 grade",
      "Profiled rail with two carriages and a matched ball screw, preloaded, greased for 5 000 km travel.",
      ["linear guide", "ball screw", "rail", "carriage", "spare"], 210.00, 4, 2, 0.048,
      [v("LG-20", "20 mm rail · 500 mm", "20 mm", "L 500 mm", "4.2 kg", 0.86), v("LG-25", "25 mm rail · 800 mm", "25 mm", "L 800 mm", "7.8 kg", 1.00)],
      { certs: ["ISO 9001"], oem: false }),
    fam("filterlube", "machspares", "Filter & Lubrication Service Pack", "Cellulose / glass fibre",
      "Annual service pack: hydraulic and air filters, lubrication cartridges, gaskets for one machine.",
      ["filter", "lubrication", "service kit", "maintenance"], 88.00, 5, 2, 0.032,
      [v("SP-STD", "Standard machine pack", "1 machine", "Annual", "3.4 kg", 1.00), v("SP-PLUS", "Extended pack + belts", "1 machine", "Annual", "5.1 kg", 1.30)],
      { certs: ["ISO 9001"], oem: false }),

    /* ── Equipment · line and robot consumables ── */
    fam("weldcap", "autospares", "Spot-Weld Electrode Cap Set", "CuCrZr",
      "Truncated-cone caps for servo weld guns, ISO 5821 taper, supplied in production packs of 100.",
      ["weld cap", "electrode", "spot welding", "consumable"], 1.85, 500, 100, 0.011,
      [v("WC-16", "Ø 16 · F1 type", "Ø 16", "L 20 mm", "28 g", 0.94), v("WC-20", "Ø 20 · F1 type", "Ø 20", "L 25 mm", "46 g", 1.00)],
      { certs: ["ISO 5821"], oem: false }),
    fam("vacuumcup", "autospares", "Vacuum Cup & Gripper Fitting Set", "NBR / silicone",
      "Bellows and flat vacuum cups with fittings for end-of-arm tooling, marking-free silicone option.",
      ["vacuum cup", "suction", "gripper", "EOAT", "robot"], 6.40, 100, 25, 0.013,
      [v("VC-40", "Ø 40 mm bellows", "Ø 40", "1.5 bellows", "48 g", 0.90), v("VC-60", "Ø 60 mm flat", "Ø 60", "Flat", "72 g", 1.00)],
      { certs: ["ISO 9001"], oem: false }),
    fam("cabletrack", "autospares", "Energy Chain & Cable Set", "PA6 / PUR cable",
      "Drag chain with pre-assembled power and signal cables for robot and gantry axes, 5 million-cycle rating.",
      ["energy chain", "drag chain", "cable track", "robot"], 74.00, 10, 2, 0.056,
      [v("EC-30", "30 mm inner · 2 m", "30 mm", "L 2 m", "3.1 kg", 0.88), v("EC-45", "45 mm inner · 3 m", "45 mm", "L 3 m", "6.4 kg", 1.00)],
      { certs: ["CE", "RoHS"], oem: false }),

    /* ── Product · catalogue articles by industry ── */
    fam("autofast", "autocat", "Fastener & Clip Assortment, Zinc-Flake", "Steel 8.8 / PA66",
      "Flanged bolts, plastic trim clips and grommets to OEM release, zinc-flake 720 h salt spray.",
      ["fastener", "clip", "bolt", "grommet", "trim"], 0.18, 10000, 500, 0.022,
      [v("FC-M6", "M6 flange bolt", "M6", "L 20 mm", "9 g", 0.86), v("FC-M8", "M8 flange bolt", "M8", "L 25 mm", "18 g", 1.00), v("FC-CLIP", "Trim clip · 8 mm", "8 mm", "PA66", "3 g", 0.52)],
      { certs: ["IATF", "IMDS"], oem: false }),
    fam("autoseal", "autocat", "O-Ring & Radial Shaft Seal Set", "NBR / FKM",
      "Standard-series O-rings and radial shaft seals, FKM for hot and oil-side applications.",
      ["o-ring", "shaft seal", "gasket", "sealing"], 0.34, 5000, 250, 0.014,
      [v("OR-NBR", "NBR 70 · to 110 °C", "NBR", "Series 2", "2 g", 0.88), v("OR-FKM", "FKM 75 · to 200 °C", "FKM", "Series 2", "2 g", 1.00)],
      { certs: ["IATF"], oem: false }),
    fam("autobearing", "autocat", "Deep-Groove Ball Bearing, Sealed", "Bearing steel 100Cr6",
      "2RS sealed bearings, C3 clearance, grease for −30 to +120 °C.",
      ["bearing", "ball bearing", "2RS", "drive"], 1.15, 2000, 100, 0.018,
      [v("BB-6203", "6203 · 17 × 40 × 12", "6203", "17 × 40 × 12", "65 g", 0.86), v("BB-6205", "6205 · 25 × 52 × 15", "6205", "25 × 52 × 15", "128 g", 1.00)],
      { certs: ["IATF", "ISO 9001"], oem: false }),
    fam("aerofast", "aerocat", "Qualified Fastener Pack, NAS/EN Standard", "Titanium / A286",
      "Lot-traceable qualified fasteners with certificate of conformity and full material traceability.",
      ["fastener", "NAS", "lockbolt", "titanium", "qualified"], 3.80, 500, 100, 0.009,
      [v("NAS-4", "Ø 4 mm · A286", "Ø 4", "L 16 mm", "6 g", 0.88), v("NAS-6", "Ø 6 mm · Ti-6Al-4V", "Ø 6", "L 22 mm", "11 g", 1.00)],
      { certs: ["AS9100", "CoC", "Lot traceable"], oem: false, regulated: false }),
    fam("aeroconsum", "aerocat", "Sealant, Lockwire & Bonded Washer Kit", "PS-870 class sealant / Inconel wire",
      "Shelf-life-controlled sealant cartridges, lockwire spools and bonded washers, cold-shipped where required.",
      ["sealant", "lockwire", "bonded washer", "consumable", "shelf life"], 24.00, 100, 20, 0.021,
      [v("AC-KIT-A", "Standard kit", "Kit", "6 items", "1.4 kg", 1.00), v("AC-KIT-B", "Extended kit", "Kit", "11 items", "2.6 kg", 1.42)],
      { certs: ["AS9100", "Shelf-life controlled"], oem: false }),
    fam("medluer", "medcat", "Luer Fitting & Connector Range", "PC / PP medical grade",
      "ISO 80369-7 luer locks and slips, moulded in ISO 7 cleanroom, gamma and EtO compatible.",
      ["luer", "connector", "fitting", "ISO 80369"], 0.14, 10000, 1000, 0.026,
      [v("LL-M", "Male luer lock", "Male", "ISO 80369-7", "1.2 g", 0.94), v("LL-F", "Female luer lock", "Female", "ISO 80369-7", "1.4 g", 1.00)],
      { certs: ["ISO 13485", "USP Class VI"], oem: false }),
    fam("medtube", "medcat", "Medical Tubing, Extruded Reels", "PVC DEHP-free / TPU",
      "Single and multi-lumen tubing on 100 m reels, lot-controlled, biocompatibility file on request.",
      ["tubing", "extrusion", "catheter", "PVC", "TPU"], 0.42, 5000, 1, 0.038,
      [v("MT-3", "3.0 × 4.1 mm", "3.0 mm", "100 m reel", "1.9 kg", 0.90), v("MT-45", "4.5 × 6.0 mm", "4.5 mm", "100 m reel", "3.1 kg", 1.00)],
      { certs: ["ISO 13485", "ISO 10993"], oem: false }),
    fam("medpouch", "medcat", "Sterile Barrier Pouch, Tyvek-Faced", "Medical paper / Tyvek",
      "Pre-formed sterile barrier pouches with peel indicator, validated to ISO 11607.",
      ["sterile pouch", "barrier", "Tyvek", "packaging"], 0.09, 20000, 1000, 0.019,
      [v("SP-90", "90 × 230 mm", "90 mm", "230 mm", "3 g", 0.88), v("SP-130", "130 × 280 mm", "130 mm", "280 mm", "5 g", 1.00)],
      { certs: ["ISO 13485", "ISO 11607"], oem: false }),
    fam("machbearing", "machcat", "Coupling & Bearing Unit Range", "Cast iron / steel",
      "Plummer blocks, flanged units and jaw couplings for machine build, greased and sealed.",
      ["coupling", "bearing unit", "plummer block", "machine part"], 12.40, 200, 20, 0.041,
      [v("BU-25", "Ø 25 mm shaft", "Ø 25", "Flanged", "1.1 kg", 0.90), v("BU-40", "Ø 40 mm shaft", "Ø 40", "Plummer", "2.4 kg", 1.00)],
      { certs: ["ISO 9001", "CE"], oem: false }),
    fam("machcyl", "machcat", "Pneumatic Cylinder, ISO 15552", "Aluminium / stainless rod",
      "Double-acting profile cylinders with magnetic piston and adjustable cushioning.",
      ["pneumatic", "cylinder", "actuator", "ISO 15552"], 28.00, 100, 10, 0.036,
      [v("PC-32", "Ø 32 · stroke 100", "Ø 32", "100 mm", "0.9 kg", 0.88), v("PC-50", "Ø 50 · stroke 200", "Ø 50", "200 mm", "2.1 kg", 1.00)],
      { certs: ["CE", "ISO 9001"], oem: false }),
    fam("machsensor", "machcat", "Inductive Sensor & Cable Set", "Stainless / PUR cable",
      "M12 and M18 inductive proximity sensors with moulded connectors, IP67, 10–30 V DC.",
      ["sensor", "inductive", "proximity", "M12", "IP67"], 8.60, 200, 25, 0.012,
      [v("IS-M12", "M12 · 4 mm range", "M12", "4 mm", "58 g", 0.92), v("IS-M18", "M18 · 8 mm range", "M18", "8 mm", "96 g", 1.00)],
      { certs: ["CE", "RoHS", "IP67"], oem: false }),
    fam("elecconn", "eleccat", "Board & Wire Connector Range", "PBT / tin-plated brass",
      "Pitch 2.0 and 2.54 mm wire-to-board headers and housings on tape and reel, RoHS and REACH declared.",
      ["connector", "header", "wire to board", "reel"], 0.07, 20000, 2000, 0.017,
      [v("CN-200", "2.00 mm pitch", "2.00 mm", "Reel 2 000", "0.4 g", 0.92), v("CN-254", "2.54 mm pitch", "2.54 mm", "Reel 2 000", "0.6 g", 1.00)],
      { certs: ["IPC-A-610", "RoHS", "REACH"], oem: false }),
    fam("elecencl", "eleccat", "ABS/Aluminium Enclosure with Gasket", "ABS V0 / extruded aluminium",
      "IP65 enclosures with gasket and mounting plate, CNC cut-outs and pad printing on request.",
      ["enclosure", "housing", "IP65", "box"], 3.90, 1000, 20, 0.052,
      [v("EN-120", "120 × 80 × 55 mm", "120 mm", "IP65", "180 g", 0.88), v("EN-200", "200 × 120 × 75 mm", "200 mm", "IP65", "390 g", 1.00)],
      { certs: ["RoHS", "UL94 V0"], oem: true }),
    fam("eleccable", "eleccat", "Cable Assembly, Moulded Ends", "PVC / tinned copper",
      "Custom-length assemblies with moulded strain relief, 100% continuity and hi-pot tested.",
      ["cable assembly", "harness", "moulded", "wiring"], 1.24, 5000, 200, 0.029,
      [v("CA-500", "500 mm · 4-core", "500 mm", "4-core", "42 g", 0.90), v("CA-1000", "1 000 mm · 4-core", "1 000 mm", "4-core", "78 g", 1.00)],
      { certs: ["IPC/WHMA-A-620", "RoHS"], oem: false }),
    fam("rawresin", "rawcat", "Engineering Resin, 25 kg Bags", "PP / ABS / PA66 GF30",
      "Prime virgin resin in 25 kg bags or 1 t octabins, lot certificates, index-linked pricing on ICIS reference.",
      ["resin", "polymer", "PP", "ABS", "PA66", "granulate"], 1.62, 5000, 1, 0.031,
      [v("RS-PP", "PP homopolymer", "PP", "25 kg bag", "25 kg", 0.72), v("RS-ABS", "ABS natural", "ABS", "25 kg bag", "25 kg", 1.00), v("RS-PA66", "PA66 GF30", "PA66", "25 kg bag", "25 kg", 1.46)],
      { certs: ["REACH", "Lot certificate"], oem: false }),
    fam("rawmb", "rawcat", "Colour & Additive Masterbatch", "PE carrier",
      "Colour, UV and flame-retardant masterbatch, 2–4% let-down, colour-matched to your reference chip.",
      ["masterbatch", "colour", "additive", "UV"], 3.40, 1000, 1, 0.028,
      [v("MB-COL", "Colour · 25 kg", "Colour", "25 kg bag", "25 kg", 1.00), v("MB-UV", "UV stabiliser · 25 kg", "UV", "25 kg bag", "25 kg", 1.18)],
      { certs: ["REACH", "RoHS"], oem: false }),
    fam("rawcoil", "rawcat", "Cold-Rolled Steel Coil, Slit to Width", "DC01 / DX51D+Z",
      "Slit coil to your width tolerance with mill certificates, galvanised or oiled finish.",
      ["steel coil", "cold rolled", "slit", "galvanised"], 0.92, 20000, 1, 0.14,
      [v("CO-DC01", "DC01 · 1.0 mm", "DC01", "1.0 mm", "per kg", 0.94), v("CO-DX51", "DX51D+Z · 1.2 mm", "DX51D+Z", "1.2 mm", "per kg", 1.00)],
      { certs: ["EN 10204 3.1", "REACH"], oem: false }),
    fam("oilgasket", "oilcat", "Spiral-Wound Gasket & Sealing Kit", "316L / graphite",
      "ASME B16.20 spiral-wound gaskets with inner and outer rings, class 150 to 900.",
      ["gasket", "spiral wound", "flange", "sealing"], 14.80, 100, 10, 0.024,
      [v("GK-150", "Class 150 · 2 in", "Class 150", "2 in", "240 g", 0.86), v("GK-300", "Class 300 · 4 in", "Class 300", "4 in", "580 g", 1.00)],
      { certs: ["API", "ASME B16.20"], oem: false }),
    fam("oiltrim", "oilcat", "Valve Trim & Repair Kit", "Stellite-faced 410SS",
      "Seat, stem and packing kit for gate and globe valves, API 6D repair scope, NACE MR0175 compliant.",
      ["valve trim", "repair kit", "seat", "packing", "API 6D"], 320.00, 5, 1, 0.038,
      [v("VT-2", "2 in · class 300", "2 in", "Class 300", "3.8 kg", 0.84), v("VT-4", "4 in · class 600", "4 in", "Class 600", "9.2 kg", 1.00)],
      { certs: ["API 6D", "NACE MR0175"], oem: false }),
    fam("oilfitting", "oilcat", "Instrumentation Tube Fitting Set", "316 stainless",
      "Twin-ferrule compression fittings, manifolds and needle valves to 413 bar, hydrostatically tested.",
      ["tube fitting", "ferrule", "instrumentation", "needle valve"], 8.40, 200, 25, 0.016,
      [v("TF-6", "6 mm tube", "6 mm", "Twin ferrule", "58 g", 0.88), v("TF-12", "12 mm tube", "12 mm", "Twin ferrule", "142 g", 1.00)],
      { certs: ["ISO 9001", "NACE MR0175"], oem: false }),
    fam("pvclip", "energycat", "PV Module Clamp & Rail Fastener Set", "Anodised aluminium / A2 stainless",
      "Mid and end clamps with T-bolts for 30–40 mm frames, 25-year corrosion warranty.",
      ["PV clamp", "solar", "mounting", "rail", "fastener"], 1.35, 5000, 100, 0.021,
      [v("PVC-MID", "Mid clamp · 35 mm", "Mid", "35 mm", "78 g", 0.92), v("PVC-END", "End clamp · 35 mm", "End", "35 mm", "86 g", 1.00)],
      { certs: ["IEC 61215 compatible", "EN 1090"], oem: false }),
    fam("pvconn", "energycat", "DC Connector & Cable Set, 1500 V", "PPO / tinned copper",
      "IP68 DC connectors and pre-assembled 4 and 6 mm² solar cable, TUV certified to 1 500 V.",
      ["DC connector", "solar cable", "IP68", "1500V"], 2.10, 2000, 100, 0.024,
      [v("DC-4", "4 mm² · pair", "4 mm²", "Pair", "96 g", 0.90), v("DC-6", "6 mm² · pair", "6 mm²", "Pair", "128 g", 1.00)],
      { certs: ["TUV", "IEC 62852"], oem: false }),
    fam("nucfast", "nuccat", "Safety-Class Fastener Lot, Traceable", "A193 B7 / A540",
      "Safety-class fasteners supplied against an NQA-1 quality plan with full lot traceability and CMTR.",
      ["fastener", "NQA-1", "safety class", "traceable", "CMTR"], 18.60, 200, 25, 0.018,
      [v("NF-M16", "M16 · A193 B7", "M16", "L 80 mm", "180 g", 0.88), v("NF-M24", "M24 · A540 B23", "M24", "L 120 mm", "520 g", 1.00)],
      { certs: ["ASME NQA-1", "CMTR", "10 CFR 50 App. B"], oem: false }),
    fam("nucseal", "nuccat", "Qualified Seal & Gasket Set", "Graphite / EPDM qualified",
      "Radiation-qualified seals and gaskets with qualification dossier, shelf-life controlled.",
      ["seal", "gasket", "qualified", "radiation", "dossier"], 42.00, 50, 10, 0.014,
      [v("NS-STD", "Standard duty", "Standard", "Set", "320 g", 1.00), v("NS-HT", "High temperature", "High temp", "Set", "380 g", 1.22)],
      { certs: ["ASME NQA-1", "Qualification dossier"], oem: false })
  ];

  if (EXT) FAMILIES = FAMILIES.concat(EXT.families);
  if (EXT) FAMILIES.forEach(function (f) { if (EXT.orderModeLegacy.indexOf(f.id) >= 0) f.orderMode = true; });

  /* ── supplier pool: consumer-goods plants with a declared export footprint ── */
  function sup(name, city, cc, lat, lon, port, groups, priceIdx, moqIdx, lead, certs, audit, resp, stage) {
    return { name: name, city: city, cc: cc, lat: lat, lon: lon, port: port, groups: groups, priceIdx: priceIdx, moqIdx: moqIdx, lead: lead, certs: certs, audit: audit, resp: resp, stage: stage || 6 };
  }
  var CSUP = [
    sup("Guangdong Housewares", "Foshan", "CN", 23.02, 113.12, "Nansha", ["foodstore", "drinkware", "tools", "organise", "cleaning", "bath"], 0.88, 1.2, 32, ["ISO 9001", "LFGB", "BSCI"], "Flagged", 92),
    sup("Zhejiang Homegoods", "Ningbo", "CN", 29.87, 121.55, "Ningbo", ["foodstore", "cookware", "tabletop", "organise", "cleaning", "appliance"], 0.91, 1.0, 34, ["ISO 9001", "GS", "BSCI"], "Passed", 88),
    sup("Hejian Glassworks", "Hejian", "CN", 38.44, 116.09, "Tianjin", ["foodstore", "drinkware", "cookware", "tabletop"], 0.84, 1.5, 38, ["ISO 9001", "LFGB", "FDA"], "Passed", 79),
    sup("Xuzhou Clear Glass", "Xuzhou", "CN", 34.26, 117.19, "Lianyungang", ["foodstore", "drinkware", "tabletop"], 0.86, 1.4, 36, ["ISO 9001", "LFGB"], "Due", 74),
    sup("Chaozhou Porcelain Works", "Chaozhou", "CN", 23.66, 116.62, "Shantou", ["tabletop", "bath"], 0.89, 1.3, 40, ["ISO 9001", "LFGB", "Cd/Pb"], "Passed", 71),
    sup("Yiwu Plastic Industries", "Yiwu", "CN", 29.31, 120.07, "Ningbo", ["foodstore", "organise", "cleaning", "bath", "tools"], 0.82, 1.6, 30, ["ISO 9001", "BSCI"], "Due", 86),
    sup("Zhongshan Appliance Mfg", "Zhongshan", "CN", 22.52, 113.39, "Nansha", ["appliance", "drinkware"], 0.93, 1.1, 42, ["ISO 9001", "GS", "CE", "RoHS"], "Passed", 83),
    sup("Cixi Home Electrics", "Cixi", "CN", 30.17, 121.27, "Ningbo", ["appliance", "cleaning"], 0.90, 1.2, 38, ["ISO 9001", "GS", "CE", "RoHS", "BSCI"], "Passed", 87),
    sup("Nantong Home Textiles", "Nantong", "CN", 32.01, 120.86, "Shanghai", ["textiles", "bath", "cleaning"], 0.86, 1.3, 33, ["ISO 9001", "OEKO-TEX", "BSCI"], "Passed", 85),
    sup("Karur Home Linens", "Karur", "IN", 10.96, 78.08, "Tuticorin", ["textiles", "bath"], 0.92, 0.9, 46, ["ISO 9001", "OEKO-TEX"], "Due", 72),
    sup("Denizli Tekstil", "Denizli", "TR", 37.78, 29.09, "Izmir", ["textiles", "bath"], 1.16, 0.6, 22, ["ISO 9001", "OEKO-TEX", "BSCI"], "Passed", 84),
    sup("Guimaraes Texteis", "Guimarães", "PT", 41.44, -8.29, "Leixões", ["textiles"], 1.32, 0.4, 20, ["ISO 9001", "OEKO-TEX", "GOTS"], "Passed", 80),
    sup("Binh Duong Homeware", "Binh Duong", "VN", 11.15, 106.67, "Cat Lai", ["foodstore", "organise", "cleaning", "tools", "bath"], 0.95, 0.8, 41, ["ISO 9001", "BSCI"], "Passed", 77),
    sup("Rajkot Steelware", "Rajkot", "IN", 22.30, 70.80, "Mundra", ["drinkware", "cookware", "tabletop", "tools"], 0.97, 0.9, 48, ["ISO 9001", "LFGB"], "Due", 64),
    sup("Lombardia Casalinghi", "Brescia", "IT", 45.54, 10.22, "Genoa", ["cookware", "tabletop", "foodstore"], 1.34, 0.4, 24, ["ISO 9001", "LFGB", "Food contact"], "Passed", 81),
    sup("Porto Vidro", "Marinha Grande", "PT", 39.75, -8.93, "Leixões", ["foodstore", "drinkware", "tabletop"], 1.26, 0.5, 26, ["ISO 9001", "LFGB", "BRC"], "Passed", 78),
    sup("Bursa Ev Ürünleri", "Bursa", "TR", 40.19, 29.06, "Gemlik", ["foodstore", "organise", "cleaning", "cookware"], 1.12, 0.6, 21, ["ISO 9001", "LFGB"], "Passed", 85),
    sup("Puebla Hogar", "Puebla", "MX", 19.04, -98.20, "Veracruz", ["organise", "cleaning", "tabletop", "bath"], 1.18, 0.7, 18, ["ISO 9001"], "Due", 72),
    sup("Gujarat Polymers", "Ahmedabad", "IN", 23.03, 72.58, "Mundra", ["foodstore", "organise", "cleaning"], 0.94, 1.0, 52, [], "None", 48, 2),

    /* component and spare-part specialists */
    sup("Rheinmold Normalien", "Solingen", "DE", 51.17, 7.08, "Rotterdam", ["moldstd", "machspares", "machcat"], 1.38, 0.3, 12, ["ISO 9001", "Material cert 3.1"], "Passed", 91),
    sup("Emilia Stampi Components", "Modena", "IT", 44.65, 10.93, "Genoa", ["moldstd", "machcat", "autospares"], 1.22, 0.4, 16, ["ISO 9001"], "Passed", 84),
    sup("Osaka Mold Standards", "Osaka", "JP", 34.69, 135.50, "Kobe", ["moldstd", "machspares"], 1.30, 0.4, 24, ["ISO 9001", "JIS"], "Passed", 78),
    sup("Dongguan Precision Components", "Dongguan", "CN", 23.02, 113.75, "Shenzhen", ["moldstd", "machspares", "autospares", "eleccat"], 0.83, 1.2, 30, ["ISO 9001"], "Due", 88),
    sup("Chicago Die Components", "Chicago", "US", 41.88, -87.63, "Chicago", ["moldstd", "machspares", "autocat"], 1.42, 0.3, 14, ["ISO 9001", "IATF"], "Passed", 86),
    sup("Pune Machine Spares", "Pune", "IN", 18.52, 73.86, "Nhava Sheva", ["machspares", "machcat", "autocat"], 0.89, 0.9, 44, ["ISO 9001"], "Due", 70),
    sup("Katowice Fasteners", "Katowice", "PL", 50.26, 19.02, "Gdansk", ["autocat", "machcat", "energycat", "nuccat"], 1.06, 0.6, 18, ["IATF", "ISO 9001"], "Passed", 82),
    sup("Toulouse Aero Hardware", "Toulouse", "FR", 43.60, 1.44, "Le Havre", ["aerocat", "nuccat"], 1.54, 0.3, 26, ["AS9100", "Nadcap"], "Passed", 80),
    sup("Kaunas Medical Components", "Kaunas", "LT", 54.90, 23.90, "Klaipeda", ["medcat", "eleccat"], 1.24, 0.5, 22, ["ISO 13485", "MDSAP"], "Passed", 85),
    sup("Penang Electronic Parts", "Penang", "MY", 5.41, 100.33, "Penang", ["eleccat", "machcat", "autospares"], 0.92, 0.9, 34, ["IPC-A-610", "ISO 9001"], "Passed", 83),
    sup("Rotterdam Polymer Trading", "Rotterdam", "NL", 51.92, 4.48, "Rotterdam", ["rawcat"], 1.10, 0.7, 10, ["REACH", "ISO 9001"], "Passed", 89),
    sup("Jubail Industrial Supply", "Jubail", "SA", 27.01, 49.66, "Jubail", ["rawcat", "oilcat"], 0.96, 0.8, 28, ["ISO 9001", "API"], "Due", 74),
    sup("Houston Flow Components", "Houston", "US", 29.76, -95.37, "Houston", ["oilcat", "nuccat", "machcat"], 1.36, 0.4, 20, ["API 6A", "ISO 29001", "NACE"], "Passed", 87),
    sup("Zaragoza Solar Hardware", "Zaragoza", "ES", 41.65, -0.89, "Barcelona", ["energycat", "machcat"], 1.14, 0.6, 19, ["ISO 9001", "EN 1090"], "Due", 76)
  ];

  if (EXT) CSUP = CSUP.concat(EXT.suppliers);

  function hash(str) { var h = 0, i; for (i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000; return h; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function nice(n) { var steps = [1, 2, 3, 5, 10, 15, 20, 25, 40, 50, 75, 100, 150, 200, 300, 500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 20000]; var best = steps[0]; steps.forEach(function (s) { if (Math.abs(s - n) < Math.abs(best - n)) best = s; }); return best; }

  var OFFERS = {};
  FAMILIES.forEach(function (f) {
    var list = [];
    if (false) CSUP.forEach(function (s) {
      if (s.groups.indexOf(f.group) < 0) return;
      if (s.stage < 5) return;                                  /* stages 1–4 are invisible to buyers */
      var h = hash(f.id + s.name);
      if (h % 10 < 2) return;                                   /* not every plant runs every family */
      if (f.regulated && s.certs.indexOf("GS") < 0) return;     /* electricals need the GS file */
      var pf = s.priceIdx + ((h % 9) - 4) / 100;
      var unit = r2(f.price * pf);
      var moq = nice(f.moq * s.moqIdx * (1 + ((h >> 2) % 5 - 2) / 10));
      var pack = f.pack + ((h >> 3) % 3 === 0 ? (f.pack >= 12 ? 12 : 2) : 0);
      var cbm = r2(f.cbm * (1 + ((h >> 4) % 11 - 5) / 100) * (pack / f.pack) * 1000) / 1000;
      var cartons40 = Math.floor(67.7 * 0.90 / cbm);
      var lead = s.lead + ((h >> 5) % 12) - 4;
      list.push({
        supplier: s.name, city: s.city, cc: s.cc, lat: s.lat, lon: s.lon, port: s.port,
        audit: s.audit, resp: s.resp, stage: s.stage, published: s.stage >= 5,
        certs: s.certs, moq: moq, unit: unit,
        tiers: [{ q: moq, p: unit }, { q: moq * 5, p: r2(unit * (0.93 - (h % 4) / 100)) }, { q: moq * 20, p: r2(unit * (0.86 - (h % 5) / 100)) }],
        pack: pack, cbm: cbm, cartons40: cartons40, pcs40: cartons40 * pack,
        lead: lead, sample: 20 + (h % 7) * 10, sampleDays: 5 + (h % 10),
        tooling: f.oem ? ((h >> 6) % 3 === 0 ? 0 : 180 + (h % 9) * 60) : 0,
        oemPrint: f.oem && (h % 3 !== 0), stock: (h % 4) === 0,
        incoterm: (h % 5) === 0 ? "FOB / EXW" : "FOB",
        payment: ["30% TT + 70% B/L", "T/T 30/70", "LC at sight", "30% TT + 70% before shipment"][h % 4],
        updated: 3 + (h % 60)
      });
    });
    list.sort(function (a, b) { return a.unit - b.unit; });
    OFFERS[f.id] = list;
  });

  /* every catalogue family belongs to exactly one product subcategory, so a buyer
     comparing lunch jars is never shown crispers */
  var FAM_SUB = {
    "glass-rect": "kw-foodstore", "glass-round": "kw-foodstore", "glass-bento": "kw-foodstore",
    "pp-crisper": "kw-foodstore", "canister": "kw-foodstore", "lunch-steel": "kw-lunch",
    "bottle-tritan": "kw-drinkware", "tumbler-steel": "kw-drinkware", "mug-dblglass": "kw-drinkware",
    "jug-glass": "kw-jug",
    "frypan": "kw-cookware", "potset": "kw-cookware", "grillpan": "kw-cookware", "baketray": "kw-bakeware",
    "utensils": "kw-tools", "board-bamboo": "kw-tools", "measure": "kw-tools",
    "knifeblock": "kw-cutlery", "dinnerset": "kw-cutlery", "tumblerglass": "kw-cutlery",
    "cutlery": "kw-cutlery", "tray-melamine": "kw-cutlery",
    "kettle": "sa-kettle", "blender": "sa-blender", "airfryer": "sa-cooking", "toaster": "sa-breakfast",
    "spraymop": "cl-floorcare", "brushset": "cl-brush", "microfibre": "cl-cloth", "laundrybasket": "cl-laundry",
    "storagebox": "sh-box", "fabricbin": "sh-fabric", "shoerack": "sh-shoe", "vacbag": "sh-vacbag",
    "dispenser": "bh-dispenser", "hamper": "bh-hamper", "bathmat": "bh-mat",
    "vacuum": "sa-floorcare", "hairdryer": "sa-personal", "dryrack": "cl-drying", "pedalbin": "cl-waste",
    "hangerset": "sh-closet", "towelbar": "bh-holder", "showercurtain": "bh-shower", "wallmirror": "bh-mirror",
    "kettle-glass": "sa-kettle", "blender-jug": "sa-blender", "grill-contact": "sa-cooking", "coffee-drip": "sa-breakfast",
    "steammop": "sa-floorcare", "straightener": "sa-personal", "wireshelf": "sh-shelving", "trolley": "sh-shelving",
    "cratefold": "sh-box", "closetorg": "sh-closet", "wallairer": "cl-drying", "sensorbin": "cl-waste",
    "bedset": "tx-bedding", "towelset": "tx-towel", "curtainbo": "tx-curtain", "cushioncov": "tx-cushion", "throwknit": "tx-throw",
    "lunch-bento2": "kw-lunch", "carafe-steel": "kw-jug", "caketin": "kw-bakeware",
    "sweepset": "cl-floorcare", "scourer": "cl-brush", "wipesheet": "cl-cloth", "pegbasket": "cl-laundry",
    "underbed": "sh-fabric", "shoebox": "sh-shoe", "vaccube": "sh-vacbag",
    "dispenser-auto": "bh-dispenser", "shelfshower": "bh-holder", "bathrug": "bh-mat",
    "showerrail": "bh-shower", "hamperpp": "bh-hamper", "mirrorled": "bh-mirror",
    "bedmicro": "tx-bedding", "towelbamboo": "tx-towel", "curtainsheer": "tx-curtain",
    "cushionvelvet": "tx-cushion", "throwfleece": "tx-throw"
  };

  if (EXT) Object.keys(EXT.famSub).forEach(function (k) { FAM_SUB[k] = EXT.famSub[k]; });

  /* Catalogue plants join the main supplier pool so they carry pins on the map,
     lanes to the buyer's plant and the same account/verification fields as every
     other listed supplier. Only published accounts (stage 5+) become visible. */
  var IND_NAME = { automotive: "Automotive", aerospace: "Aerospace & Defence", medical: "Medical Devices", machinery: "Machinery & Industrial", electronics: "Electronics", rawmat: "Raw Materials", oilgas: "Oil & Gas", energy: "Green Energy", nuclear: "Nuclear", household: "Household Products" };
  function supIndustries(c) {
    var out = [];
    c.groups.forEach(function (gid) {
      var g = GROUPS.filter(function (x) { return x.id === gid; })[0];
      (g && g.inds || []).forEach(function (i) { var n = IND_NAME[i]; if (n && out.indexOf(n) < 0) out.push(n); });
    });
    return out.length ? out.slice(0, 4) : ["Household Products"];
  }

  (function mergeIntoNetwork() { if (true) return;
    var D = window.SOURCING_DATA;
    if (!D || !D.SUPPLIERS) return;
    var have = {};
    D.SUPPLIERS.forEach(function (s) { have[s.name] = s; });
    CSUP.forEach(function (c) {
      var h = hash(c.name);
      if (have[c.name]) { have[c.name].catalogue = true; return; }
      var rec = {
        name: c.name, city: c.city, cc: c.cc, lat: c.lat, lon: c.lon,
        fit: 58 + (h % 34), risk: 22 + (h % 40), cap: 68 + (h % 30),
        onTime: 82 + (h % 16), ppm: 120 + (h % 700), lead: c.lead,
        delta: Math.round(((h % 240) / 10 - 16) * 10) / 10, spend: Math.round((h % 60) / 10 * 10) / 10,
        certs: c.certs.slice(0, 3), audit: c.audit,
        auditIn: c.audit === "Flagged" ? -(5 + h % 30) : c.audit === "Passed" ? 90 + (h % 220) : 15 + (h % 60),
        fin: ["A-", "B+", "B", "B-", "C"][h % 5], tariff: c.cc === "CN" ? "Sec. 301 · 25%" : c.cc === "TR" ? "EU CU" : c.cc === "MX" ? "USMCA ok" : "None",
        tier2: ["Mapped", "Partial", "Unknown"][h % 3],
        industries: supIndustries(c), stage: c.stage, published: c.stage >= 5,
        accountSince: 2019 + (h % 7), profile: 58 + (h % 42), updatedDays: 2 + (h % 180),
        respRate: c.resp, quoteTurn: 2 + (h % 12), docs: 3 + (h % 9),
        certExpiry: 30 + (h % 360), machines: 8 + (h % 130), shifts: [1, 2, 3][h % 3],
        langs: ["EN · ZH", "EN", "EN · ES"][h % 3],
        verifiedFields: c.stage >= 5 ? ["Certificates", "Address"] : [],
        catalogue: true
      };
      rec.employees = Math.round((rec.machines * 1.6 * rec.shifts + 24) / 5) * 5;
      D.SUPPLIERS.push(rec);
    });
  })();

  var CONT_CC = { DE: "EU", IT: "EU", FR: "EU", PL: "EU", ES: "EU", PT: "EU", TR: "EU", LT: "EU", NL: "EU", SA: "APAC", JP: "APAC", CN: "APAC", VN: "APAC", IN: "APAC", MY: "APAC", US: "NA", MX: "NA" };
  if (EXT) Object.keys(EXT.cont).forEach(function (k) { CONT_CC[k] = EXT.cont[k]; });
  (function patchCont() {
    var D = window.SOURCING_DATA;
    if (!D || !D.CONT) return;
    Object.keys(CONT_CC).forEach(function (k) { if (!D.CONT[k]) D.CONT[k] = CONT_CC[k]; });
  })();

  function relateName(name, subName) {
    if (!subName) return name;
    if (!name) return subName;
    if (String(name).toLowerCase() === String(subName).toLowerCase()) return subName;
    var tokens = String(subName).toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 3; });
    var hay = String(name).toLowerCase();
    if (tokens.some(function (t) { return hay.indexOf(t) >= 0; })) return name;
    return subName + " — " + name;
  }

  function finalizeFamily(f, labels) {
    OFFERS[f.id] = OFFERS[f.id] || [];
    var o = OFFERS[f.id];
    f.offerCount = o.length;
    f.minUnit = o.length ? o[0].unit : 0;
    f.maxUnit = o.length ? o[o.length - 1].unit : 0;
    f.minMoq = o.length ? Math.min.apply(null, o.map(function (x) { return x.moq; })) : 0;
    f.minLead = o.length ? Math.min.apply(null, o.map(function (x) { return x.lead; })) : 0;
    f.maxPcs40 = o.length ? Math.max.apply(null, o.map(function (x) { return x.pcs40; })) : 0;
    f.countries = o.reduce(function (a, x) { return a.indexOf(x.cc) < 0 ? a.concat([x.cc]) : a; }, []);
    var grp = GROUPS.filter(function (g) { return g.id === f.group; })[0] || {};
    f.dom = grp.dom || f.dom || "product";
    f.inds = grp.inds || f.inds || ["household"];
    f.catMap = grp.catMap || f.catMap || null;
    f.subMap = grp.subMap || f.subMap || null;
    f.sub = f.taxSub || FAM_SUB[f.id] || f.sub || null;
    f.spare = !!grp.spare || !!f.orderMode;
    var subLabel = (labels && f.sub && labels[f.sub]) || f.taxSubName || "";
    f.groupName = subLabel || grp.name || f.groupName || "";
    f.name = relateName(f.name, subLabel);
    f.variants = f.variants && f.variants.length ? f.variants : [{ code: String(f.id).toUpperCase(), label: "Standard", cap: "—", dim: "—", weight: "—", pf: 1 }];
    f.keywords = f.keywords || [];
    f.search = (f.name + " " + (f.material || "") + " " + f.keywords.join(" ") + " " + f.groupName + " " +
      f.variants.map(function (x) { return (x.code || "") + " " + (x.label || ""); }).join(" ")).toLowerCase();
  }

  FAMILIES.forEach(function (f) { finalizeFamily(f, null); });

  window.HOUSEHOLD_CATALOG = {
    CONTAINERS: CONTAINERS, GROUPS: GROUPS, FAMILIES: FAMILIES, SUPPLIERS: CSUP, OFFERS: OFFERS,
    family: function (id) { return FAMILIES.filter(function (f) { return f.id === id; })[0]; },
    ingestTaxonomy: function (ext) {
      if (!ext || this._taxed) return;
      this._taxed = true;
      var labels = ext.subLabels || {};
      if (ext.groups && ext.groups.length) {
        ext.groups.forEach(function (g) {
          if (GROUPS.some(function (x) { return x.id === g.id; })) return;
          if (g.catMap) g.inds = Object.keys(g.catMap);
          if (g.subMap) g.inds = Object.keys(g.subMap);
          GROUPS.push(g);
        });
      }
      if (ext.famSub) Object.keys(ext.famSub).forEach(function (k) { FAM_SUB[k] = ext.famSub[k]; });
      if (ext.families && ext.families.length) {
        ext.families.forEach(function (f) {
          if (FAMILIES.some(function (x) { return x.id === f.id; })) return;
          FAMILIES.push(f);
        });
      }
      FAMILIES.forEach(function (f) { finalizeFamily(f, labels); });
      if (window.HOUSEHOLD_CATALOG) this.FAMILIES = FAMILIES;
    }
  };
  if (window.__STREFEX_CATALOG_EXT__) {
    window.HOUSEHOLD_CATALOG.ingestTaxonomy(window.__STREFEX_CATALOG_EXT__);
  }
})();
