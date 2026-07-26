/** CutDB tool SVG illustrations — from cutdb-source.html */

const GOLD = 'var(--cutdb-tool-accent, #c8a84b)';

export function svgEndMill(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="43" y="4" width="24" height="38" rx="3" fill="#7a8fa8"/>
  <rect x="45" y="40" width="20" height="26" rx="2" fill="#5a7494"/>
  <line x1="45" y1="40" x2="36" y2="66" stroke="${ac}" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="49" y1="40" x2="40" y2="66" stroke="${ac}" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
  <line x1="61" y1="40" x2="70" y2="66" stroke="${ac}" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="65" y1="40" x2="74" y2="66" stroke="${ac}" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
  <ellipse cx="55" cy="66" rx="17" ry="5" fill="${ac}" opacity=".75"/>
  <rect x="47" y="37" width="16" height="5" rx="1" fill="${ac}" opacity=".4"/>
  <circle cx="55" cy="4" r="3" fill="#5a7494"/>
  </svg>`;}

export function svgBallNose(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="43" y="4" width="24" height="40" rx="3" fill="#7a8fa8"/>
  <rect x="45" y="42" width="20" height="18" rx="2" fill="#5a7494"/>
  <line x1="45" y1="42" x2="45" y2="60" stroke="${ac}" stroke-width="1.8" opacity=".8"/>
  <line x1="65" y1="42" x2="65" y2="60" stroke="${ac}" stroke-width="1.8" opacity=".8"/>
  <ellipse cx="55" cy="70" rx="10" ry="10" fill="${ac}" opacity=".9"/>
  <ellipse cx="55" cy="60" rx="10" ry="4" fill="${ac}" opacity=".4"/>
  <line x1="49" y1="42" x2="49" y2="60" stroke="${ac}" stroke-width="1" opacity=".4"/>
  <line x1="61" y1="42" x2="61" y2="60" stroke="${ac}" stroke-width="1" opacity=".4"/>
  </svg>`;}

export function svgDrill(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="46" y="4" width="18" height="46" rx="2" fill="#7a8fa8"/>
  <line x1="49" y1="6" x2="49" y2="50" stroke="${ac}" stroke-width="1.2" opacity=".55"/>
  <line x1="55" y1="6" x2="55" y2="50" stroke="${ac}" stroke-width=".8" opacity=".3"/>
  <line x1="61" y1="6" x2="61" y2="50" stroke="${ac}" stroke-width="1.2" opacity=".55"/>
  <polygon points="46,50 64,50 55,76" fill="${ac}" opacity=".92"/>
  <line x1="50" y1="50" x2="55" y2="76" stroke="rgba(255,255,255,.25)" stroke-width=".8"/>
  <line x1="60" y1="50" x2="55" y2="76" stroke="rgba(255,255,255,.25)" stroke-width=".8"/>
  </svg>`;}

export function svgIdxDrill(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="44" y="4" width="22" height="38" rx="2" fill="#7a8fa8"/>
  <line x1="48" y1="6" x2="48" y2="42" stroke="${ac}" stroke-width="1.5" opacity=".5"/>
  <line x1="62" y1="6" x2="62" y2="42" stroke="${ac}" stroke-width="1.5" opacity=".5"/>
  <rect x="44" y="42" width="10" height="11" rx="1" fill="${ac}" opacity=".9"/>
  <rect x="56" y="42" width="10" height="11" rx="1" fill="${ac}" opacity=".7"/>
  <polygon points="44,53 66,53 55,76" fill="#5a7494"/>
  <line x1="44" y1="53" x2="55" y2="76" stroke="${ac}" stroke-width="1.2"/>
  <line x1="66" y1="53" x2="55" y2="76" stroke="${ac}" stroke-width="1.2"/>
  </svg>`;}

export function svgTurnInsert(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="30" width="62" height="18" rx="3" fill="#5a7494"/>
  <polygon points="68,25 102,40 68,55" fill="${ac}" opacity=".92"/>
  <rect x="70" y="34" width="16" height="12" rx="2" fill="${ac}" opacity=".65"/>
  <circle cx="102" cy="40" r="6" fill="${ac}"/>
  <line x1="6" y1="39" x2="68" y2="39" stroke="rgba(255,255,255,.12)" stroke-width=".8" stroke-dasharray="4 3"/>
  </svg>`;}

export function svgBoringBar(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="31" width="84" height="16" rx="8" fill="#5a7494"/>
  <rect x="87" y="33" width="16" height="12" rx="2" fill="${ac}" opacity=".8"/>
  <polygon points="103,34 116,40 103,46" fill="${ac}"/>
  <circle cx="28" cy="39" r="5" fill="rgba(255,255,255,.08)" stroke="rgba(200,168,75,.4)" stroke-width="1.2"/>
  </svg>`;}

export function svgThreadMill(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="43" y="4" width="24" height="26" rx="2" fill="#7a8fa8"/>
  <rect x="41" y="28" width="28" height="54" rx="2" fill="#5a7494"/>
  <line x1="41" y1="34" x2="69" y2="34" stroke="${ac}" stroke-width="2" opacity=".85"/>
  <line x1="41" y1="41" x2="69" y2="41" stroke="${ac}" stroke-width="2" opacity=".85"/>
  <line x1="41" y1="48" x2="69" y2="48" stroke="${ac}" stroke-width="2" opacity=".85"/>
  <line x1="41" y1="55" x2="69" y2="55" stroke="${ac}" stroke-width="2" opacity=".85"/>
  <line x1="41" y1="62" x2="69" y2="62" stroke="${ac}" stroke-width="2" opacity=".85"/>
  <line x1="41" y1="69" x2="69" y2="69" stroke="${ac}" stroke-width="2" opacity=".85"/>
  <ellipse cx="55" cy="78" rx="14" ry="4" fill="${ac}" opacity=".6"/>
  </svg>`;}

export function svgTap(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="49" y="4" width="12" height="8" rx="1" fill="#3a5470"/>
  <rect x="47" y="12" width="16" height="28" rx="1" fill="#7a8fa8"/>
  <rect x="44" y="38" width="22" height="32" rx="1" fill="#5a7494"/>
  <line x1="44" y1="43" x2="66" y2="43" stroke="${ac}" stroke-width="1.8"/>
  <line x1="44" y1="49" x2="66" y2="49" stroke="${ac}" stroke-width="1.8"/>
  <line x1="44" y1="55" x2="66" y2="55" stroke="${ac}" stroke-width="1.8"/>
  <line x1="44" y1="61" x2="66" y2="61" stroke="${ac}" stroke-width="1.8"/>
  <line x1="44" y1="67" x2="66" y2="67" stroke="${ac}" stroke-width="1.8"/>
  <polygon points="44,70 66,70 55,80" fill="${ac}" opacity=".85"/>
  </svg>`;}

export function svgReamer(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,4 60,4 57,10 53,10" fill="#3a5470"/>
  <rect x="50" y="10" width="10" height="34" rx="1" fill="#7a8fa8"/>
  <line x1="48" y1="14" x2="62" y2="14" stroke="${ac}" stroke-width="1.2" opacity=".8"/>
  <line x1="48" y1="20" x2="62" y2="20" stroke="${ac}" stroke-width="1.2" opacity=".8"/>
  <line x1="48" y1="26" x2="62" y2="26" stroke="${ac}" stroke-width="1.2" opacity=".8"/>
  <line x1="48" y1="32" x2="62" y2="32" stroke="${ac}" stroke-width="1.2" opacity=".8"/>
  <line x1="48" y1="38" x2="62" y2="38" stroke="${ac}" stroke-width="1.2" opacity=".8"/>
  <polygon points="47,44 63,44 60,70 50,70" fill="${ac}" opacity=".88"/>
  <line x1="51" y1="44" x2="51" y2="70" stroke="rgba(255,255,255,.25)" stroke-width=".7"/>
  <line x1="55" y1="44" x2="55" y2="70" stroke="rgba(255,255,255,.25)" stroke-width=".7"/>
  <line x1="59" y1="44" x2="59" y2="70" stroke="rgba(255,255,255,.25)" stroke-width=".7"/>
  </svg>`;}

export function svgGrooving(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="31" width="66" height="16" rx="3" fill="#5a7494"/>
  <rect x="70" y="28" width="16" height="22" rx="2" fill="#3a5470"/>
  <rect x="85" y="34" width="24" height="10" rx="2" fill="${ac}" opacity=".9"/>
  <line x1="85" y1="37" x2="109" y2="37" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
  <line x1="85" y1="39" x2="109" y2="39" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
  <line x1="85" y1="41" x2="109" y2="41" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
  <polygon points="109,34 117,39 109,44" fill="${ac}"/>
  </svg>`;}

export function svgCBN(w,h,ac='#e0c06a'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="30" width="62" height="18" rx="3" fill="#5a7494"/>
  <polygon points="68,25 102,40 68,55" fill="#2a3a50"/>
  <polygon points="80,31 102,40 80,49" fill="${ac}" opacity=".92"/>
  <polygon points="90,35 102,40 90,45" fill="rgba(255,255,255,.7)"/>
  <circle cx="102" cy="40" r="5" fill="${ac}"/>
  <text x="30" y="20" text-anchor="middle" font-size="8" fill="${ac}" font-family="sans-serif" font-weight="bold">CBN</text>
  </svg>`;}

export function svgPCD(w,h,ac='#93c5fd'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="30" width="62" height="18" rx="3" fill="#5a7494"/>
  <polygon points="68,25 102,40 68,55" fill="#1e3a5f"/>
  <polygon points="80,31 102,40 80,49" fill="${ac}" opacity=".95"/>
  <polygon points="90,35 102,40 90,45" fill="rgba(255,255,255,.85)"/>
  <circle cx="102" cy="40" r="5" fill="${ac}"/>
  <text x="30" y="20" text-anchor="middle" font-size="8" fill="${ac}" font-family="sans-serif" font-weight="bold">PCD</text>
  </svg>`;}

export function svgGearHob(w,h,ac='#c8a84b'){
  let teeth='';
  for(let i=0;i<12;i++){
    const a=i*30*Math.PI/180;
    const x1=(55+24*Math.cos(a)).toFixed(1),y1=(40+24*Math.sin(a)).toFixed(1);
    const x2=(55+31*Math.cos(a)).toFixed(1),y2=(40+31*Math.sin(a)).toFixed(1);
    teeth+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ac}" stroke-width="3.5" stroke-linecap="round"/>`;
  }
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="55" cy="40" r="24" fill="none" stroke="#5a7494" stroke-width="7"/>
  <circle cx="55" cy="40" r="12" fill="#3a5470"/>
  <circle cx="55" cy="40" r="4" fill="${ac}"/>
  ${teeth}
  </svg>`;}

export function svgShaper(w,h,ac='#c8a84b'){
  let teeth='';
  for(let i=0;i<16;i++){
    const a=i*22.5*Math.PI/180;
    const x1=(55+20*Math.cos(a)).toFixed(1),y1=(38+20*Math.sin(a)).toFixed(1);
    const x2=(55+25*Math.cos(a)).toFixed(1),y2=(38+25*Math.sin(a)).toFixed(1);
    teeth+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ac}" stroke-width="2.8" stroke-linecap="round"/>`;
  }
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="55" cy="38" r="22" fill="none" stroke="#5a7494" stroke-width="5"/>
  <circle cx="55" cy="38" r="10" fill="#3a5470"/>
  <circle cx="55" cy="38" r="3" fill="${ac}"/>
  ${teeth}
  </svg>`;}

export function svgBroach(w,h,ac='#c8a84b'){
  let teeth='';
  for(let i=0;i<8;i++){
    const x=20+i*11;
    const h2=5+i*0.4;
    teeth+=`<rect x="${x}" y="${30-h2}" width="8" height="${h2}" rx="1" fill="${ac}" opacity="${0.55+i*0.055}"/>`;
    teeth+=`<rect x="${x}" y="48" width="8" height="${h2}" rx="1" fill="${ac}" opacity="${0.55+i*0.055}"/>`;
  }
  return`<svg width="${w}" height="${h}" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <rect x="18" y="34" width="84" height="10" rx="2" fill="#5a7494"/>
  ${teeth}
  <polygon points="102,32 114,39 102,46" fill="${ac}"/>
  </svg>`;}

export function svgSlittingSaw(w,h,ac='#c8a84b'){
  let teeth='';
  for(let i=0;i<24;i++){
    const a=i*15*Math.PI/180;
    const x1=(55+24*Math.cos(a)).toFixed(1),y1=(38+24*Math.sin(a)).toFixed(1);
    const x2=(55+30*Math.cos(a)).toFixed(1),y2=(38+30*Math.sin(a)).toFixed(1);
    teeth+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ac}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="55" cy="38" r="30" fill="none" stroke="#5a7494" stroke-width="5"/>
  <circle cx="55" cy="38" r="8" fill="#3a5470"/>
  <circle cx="55" cy="38" r="3" fill="${ac}"/>
  ${teeth}
  </svg>`;}

export function svgFaceMill(w,h,ac='#c8a84b'){
  let inserts='';
  for(let i=0;i<6;i++){
    const a=(i*60-30)*Math.PI/180;
    const r=20,x=(55+r*Math.cos(a)).toFixed(1),y=(37+r*Math.sin(a)).toFixed(1);
    inserts+=`<rect x="${(parseFloat(x)-4).toFixed(1)}" y="${(parseFloat(y)-4).toFixed(1)}" width="8" height="8" rx="1.5" fill="${ac}" opacity=".9" transform="rotate(${i*60} ${x} ${y})"/>`;
  }
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="55" cy="37" r="24" fill="#3a5470" opacity=".7"/>
  <circle cx="55" cy="37" r="10" fill="#5a7494"/>
  <circle cx="55" cy="37" r="4" fill="${ac}"/>
  ${inserts}
  <rect x="45" y="4" width="20" height="14" rx="2" fill="#7a8fa8"/>
  </svg>`;}

export function svgHighFeed(w,h,ac='#c8a84b'){
  let inserts='';
  for(let i=0;i<4;i++){
    const a=i*90*Math.PI/180;
    const r=18,x=(55+r*Math.cos(a)).toFixed(1),y=(40+r*Math.sin(a)).toFixed(1);
    inserts+=`<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="${ac}" opacity=".9" transform="rotate(${i*90} ${x} ${y})"/>`;
  }
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 80" xmlns="http://www.w3.org/2000/svg">
  <circle cx="55" cy="40" r="22" fill="#3a5470" opacity=".7"/>
  <circle cx="55" cy="40" r="9" fill="#5a7494"/>
  <circle cx="55" cy="40" r="3" fill="${ac}"/>
  ${inserts}
  <rect x="45" y="4" width="20" height="18" rx="2" fill="#7a8fa8"/>
  </svg>`;}

export function svgChamfer(w,h,ac='#c8a84b'){
  return`<svg width="${w}" height="${h}" viewBox="0 0 110 90" xmlns="http://www.w3.org/2000/svg">
  <rect x="45" y="4" width="20" height="28" rx="2" fill="#7a8fa8"/>
  <polygon points="39,32 71,32 66,58 44,58" fill="#5a7494"/>
  <line x1="39" y1="32" x2="44" y2="58" stroke="${ac}" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="71" y1="32" x2="66" y2="58" stroke="${ac}" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="42" y1="39" x2="68" y2="39" stroke="${ac}" stroke-width="1" opacity=".5"/>
  <line x1="41" y1="46" x2="69" y2="46" stroke="${ac}" stroke-width="1" opacity=".5"/>
  <ellipse cx="55" cy="58" rx="11" ry="3.5" fill="${ac}" opacity=".75"/>
  </svg>`;}

export const CUT_DB_TOOL_SVG_MAP = {
  1:svgEndMill, 2:svgEndMill, 3:svgBallNose, 4:svgEndMill, 5:svgFaceMill,
  6:svgEndMill, 7:svgEndMill,
  8:svgDrill, 9:svgDrill, 10:svgIdxDrill, 11:svgDrill, 12:svgDrill,
  13:svgTurnInsert, 14:svgTurnInsert, 15:svgTurnInsert, 16:svgTurnInsert,
  17:svgBoringBar, 18:svgBoringBar,
  19:svgThreadMill, 20:svgTap, 21:svgTurnInsert, 22:svgTap,
  23:svgReamer, 24:svgReamer,
  25:svgGrooving, 26:svgGrooving,
  27:svgCBN, 28:svgPCD,
  29:svgGearHob, 30:svgShaper,
  31:svgBroach, 32:svgSlittingSaw,
  33:svgEndMill, 34:svgHighFeed, 35:svgChamfer,
  // ONMY Toolings — Changzhou Angmai
  101:svgEndMill,  102:svgEndMill,  103:svgEndMill,  104:svgEndMill,  105:svgEndMill,
  106:svgEndMill,  107:svgChamfer,  108:svgDrill,    109:svgChamfer,  110:svgEndMill,
  111:svgBallNose, 112:svgEndMill,  113:svgEndMill,  114:svgBallNose, 115:svgEndMill,
  116:svgEndMill,  117:svgBallNose, 118:svgEndMill,  119:svgEndMill,  120:svgBallNose,
  121:svgEndMill,  122:svgEndMill,  123:svgBallNose, 124:svgEndMill,  125:svgEndMill,
  126:svgBallNose, 127:svgEndMill,  128:svgEndMill,  129:svgBallNose,
  130:svgEndMill,  131:svgEndMill,  132:svgEndMill,
  133:svgDrill,    134:svgDrill,    135:svgDrill,    136:svgDrill,    137:svgDrill,
  138:svgTap,      139:svgTap,      140:svgTap,      141:svgThreadMill, 142:svgThreadMill,
  143:svgChamfer,  144:svgThreadMill, 145:svgThreadMill,
  146:svgChamfer,  147:svgChamfer,  148:svgChamfer,  149:svgChamfer,  150:svgChamfer,
  151:svgTurnInsert, 152:svgBoringBar,
  153:svgReamer,   154:svgReamer,   155:svgReamer,   156:svgReamer,   157:svgReamer,
  // Extended supplier tools (EMUGE-FRANKEN, Gühring, WIDIA, etc.)
  200:svgTap,      201:svgEndMill,  202:svgEndMill,
  210:svgDrill,    211:svgEndMill,  212:svgTap,
  220:svgTurnInsert, 221:svgEndMill, 222:svgTurnInsert,
  230:svgTurnInsert, 231:svgEndMill,
  240:svgDrill,    241:svgEndMill,
  250:svgEndMill,  251:svgDrill,
  260:svgTurnInsert,
  270:svgGearHob,
  280:svgTap,      281:svgTap,
  290:svgTurnInsert,
  300:svgEndMill,  301:svgDrill,
  310:svgReamer,
};

// =========================================================
// DATA — TOOLS
// =========================================================
const TYPE_ICON = {
  'End Mill': 'svgEndMill',
  'Drill': 'svgDrill',
  'Turning Insert': 'svgTurnInsert',
  'Boring Bar': 'svgBoringBar',
  'Reamer': 'svgReamer',
  'Thread Mill': 'svgThreadMill',
  'Threading Tool': 'svgTap',
  'Grooving Insert': 'svgGrooving',
  'Chamfer Mill': 'svgChamfer',
  'Slitting Saw': 'svgSlittingSaw',
  'Gear Cutting': 'svgGearHob',
  'Broach': 'svgBroach',
  'Deburring Tool': 'svgChamfer',
  'Special Tool': 'svgEndMill',
  'Workholding': 'svgEndMill',
};

const FN = {
  svgEndMill, svgBallNose, svgDrill, svgIdxDrill, svgTurnInsert, svgBoringBar,
  svgThreadMill, svgTap, svgReamer, svgGrooving, svgCBN, svgPCD, svgGearHob,
  svgShaper, svgBroach, svgSlittingSaw, svgFaceMill, svgHighFeed, svgChamfer,
};

function pickBySubtype(tool) {
  const sub = (tool.subtype || '').toLowerCase();
  const name = (tool.name || '').toLowerCase();
  if (sub.includes('ball nose') || name.includes('ball nose')) return svgBallNose;
  if (sub.includes('face mill') || name.includes('face mill')) return svgFaceMill;
  if (sub.includes('high feed') || name.includes('high feed')) return svgHighFeed;
  if (sub.includes('indexable drill')) return svgIdxDrill;
  if (sub.includes('pcd') || sub.includes('polycrystalline diamond')) return svgPCD;
  if (sub.includes('cbn') || sub.includes('cubic boron')) return svgCBN;
  if (sub.includes('gear shaper') || sub.includes('shaper')) return svgShaper;
  return null;
}

/** @param {{ id?: number, type?: string, subtype?: string, name?: string }} tool */
export function renderCutDbToolSvg(tool, width = 100, height = 80) {
  const byId = tool.id != null ? CUT_DB_TOOL_SVG_MAP[tool.id] : null;
  const fn = byId || pickBySubtype(tool) || FN[TYPE_ICON[tool.type || '']] || svgEndMill;
  return fn(width, height);
}
