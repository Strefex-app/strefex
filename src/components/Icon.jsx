import { useCallback, useRef } from 'react'
import './Icon.css'

/*
 * Centralised STREFEX icon system.
 * Every icon uses a consistent 24×24 viewBox, stroke-based design,
 * strokeWidth 2, round caps/joins, currentColor for theming.
 *
 * Usage:
 *   <Icon name="home" />
 *   <Icon name="home" size={20} />
 *   <Icon name="home" size={28} color="#000888" onClick={fn} />
 */

const sw = '2'
const lc = 'round'
const lj = 'round'

const ICONS = {
  /* ── Navigation ──────────────────────────────────────── */
  home: (s) => (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M9 22V12h6v10" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  menu: (s) => (
    <path d="M3 12h18M3 6h18M3 18h18" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
  ),
  close: (s) => (
    <path d="M18 6L6 18M6 6l12 12" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'arrow-left': (s) => (
    <path d="M19 12H5M12 19l-7-7 7-7" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'arrow-right': (s) => (
    <path d="M5 12h14M12 5l7 7-7 7" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'chevron-right': (s) => (
    <path d="M9 18l6-6-6-6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'chevron-down': (s) => (
    <path d="M6 9l6 6 6-6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'chevron-up': (s) => (
    <path d="M18 15l-6-6-6 6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  logout: (s) => (
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),

  /* ── People / Users ─────────────────────────────────── */
  profile: (s) => (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="12" cy="7" r="4" stroke={s} strokeWidth={sw}/>
    </>
  ),
  team: (s) => (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="9" cy="7" r="4" stroke={s} strokeWidth={sw}/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  vendors: (s) => (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="9" cy="7" r="4" stroke={s} strokeWidth={sw}/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  'user-plus': (s) => (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="8.5" cy="7" r="4" stroke={s} strokeWidth={sw}/>
      <path d="M20 8v6M23 11h-6" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),

  /* ── Dashboard / Layout ─────────────────────────────── */
  management: (s) => (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
    </>
  ),
  'admin-dashboard': (s) => (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke={s} strokeWidth={sw}/>
      <rect x="14" y="3" width="7" height="7" rx="1" stroke={s} strokeWidth={sw}/>
      <rect x="3" y="14" width="7" height="7" rx="1" stroke={s} strokeWidth={sw}/>
      <rect x="14" y="14" width="7" height="7" rx="1" stroke={s} strokeWidth={sw}/>
    </>
  ),
  grid: (s) => (
    <>
      <rect x="3" y="3" width="7" height="7" stroke={s} strokeWidth={sw} rx="1"/>
      <rect x="14" y="3" width="7" height="7" stroke={s} strokeWidth={sw} rx="1"/>
      <rect x="3" y="14" width="7" height="7" stroke={s} strokeWidth={sw} rx="1"/>
      <rect x="14" y="14" width="7" height="7" stroke={s} strokeWidth={sw} rx="1"/>
    </>
  ),
  templates: (s) => (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M3 9h18M9 21V9" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),

  /* ── Communication ──────────────────────────────────── */
  messenger: (s) => (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  notifications: (s) => (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  mail: (s) => (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M22 7l-10 7L2 7" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  phone: (s) => (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),

  /* ── Documents / Files ──────────────────────────────── */
  document: (s) => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 2v6h6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  'service-requests': (s) => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 2v6h6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M16 13H8M16 17H8" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  contracts: (s) => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 2v6h6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M16 13H8M16 17H8M10 9H8" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  report: (s) => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  audit: (s) => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 2v6h6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M12 18v-6M9 15l3 3 3-3" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  clipboard: (s) => (
    <>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <rect x="8" y="2" width="8" height="4" rx="1" stroke={s} strokeWidth={sw}/>
      <path d="M9 14h6M9 18h6" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  folder: (s) => (
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  book: (s) => (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),

  /* ── Finance / Payment ──────────────────────────────── */
  wallet: (s) => (
    <>
      <rect x="2" y="6" width="20" height="14" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M2 10h20" stroke={s} strokeWidth={sw}/>
      <circle cx="17" cy="14" r="1.5" fill={s}/>
      <path d="M6 6V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke={s} strokeWidth={sw}/>
    </>
  ),
  card: (s) => (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M2 10h20" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  cost: (s) => (
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  spend: (s) => (
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),

  /* ── Plan / Settings ────────────────────────────────── */
  plan: (s) => (
    <>
      <rect x="2" y="3" width="20" height="18" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M8 7h8M8 11h8M8 15h4" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  settings: (s) => (
    <>
      <circle cx="12" cy="12" r="3" stroke={s} strokeWidth={sw}/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),

  /* ── Industry / Production ──────────────────────────── */
  production: (s) => (
    <>
      <path d="M2 20h20M5 20V8l7-5 7 5v12" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M9 20v-6h6v6M9 10h6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  enterprise: (s) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M9 6h6M9 10h6M9 14h4M9 18h2" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  factory: (s) => (
    <>
      <path d="M2 20h20" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <path d="M4 20V10l5 3V7l5 3V4l5 3v13" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),

  /* ── Security / Compliance ──────────────────────────── */
  compliance: (s) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M9 12l2 2 4-4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  shield: (s) => (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  lock: (s) => (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  key: (s) => (
    <>
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),

  /* ── AI / Intelligence (robot silhouette) ────────────── */
  ai: (s) => (
    <>
      <path d="M12 1v2" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <rect x="5" y="3" width="14" height="10" rx="5" stroke={s} strokeWidth={sw}/>
      <circle cx="9" cy="8" r="1.5" fill={s}/>
      <circle cx="15" cy="8" r="1.5" fill={s}/>
      <rect x="2" y="6" width="3" height="4" rx="1" stroke={s} strokeWidth="1.5"/>
      <rect x="19" y="6" width="3" height="4" rx="1" stroke={s} strokeWidth="1.5"/>
      <rect x="7" y="14" width="10" height="8" rx="2" stroke={s} strokeWidth={sw}/>
      <rect x="9" y="16" width="6" height="3" rx="1" stroke={s} strokeWidth="1.5"/>
    </>
  ),

  /* ── Procurement / Tasks ────────────────────────────── */
  procurement: (s) => (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <rect x="9" y="3" width="6" height="4" rx="1" stroke={s} strokeWidth={sw}/>
      <path d="M9 14l2 2 4-4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),

  /* ── Integration / Code ─────────────────────────────── */
  erp: (s) => (
    <>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 17h6M14 20h4M17 14v3" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  developer: (s) => (
    <>
      <path d="M16 18l6-6-6-6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M8 6l-6 6 6 6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  link: (s) => (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  globe: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),

  /* ── Help / Info ────────────────────────────────────── */
  support: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M12 17h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  info: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <path d="M12 16v-4M12 8h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  alert: (s) => (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M12 9v4M12 17h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),

  /* ── Charts / Analytics ─────────────────────────────── */
  chart: (s) => (
    <path d="M18 20V10M12 20V4M6 20v-6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'pie-chart': (s) => (
    <>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M22 12A10 10 0 0 0 12 2v10z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  'trending-up': (s) => (
    <path d="M23 6l-9.5 9.5-5-5L1 18" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),

  /* ── Actions ────────────────────────────────────────── */
  plus: (s) => (
    <path d="M12 5v14M5 12h14" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  check: (s) => (
    <path d="M20 6L9 17l-5-5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'check-square': (s) => (
    <>
      <path d="M9 11l3 3L22 4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  edit: (s) => (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  trash: (s) => (
    <>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M10 11v6M14 11v6" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  search: (s) => (
    <>
      <circle cx="11" cy="11" r="8" stroke={s} strokeWidth={sw}/>
      <path d="M21 21l-4.35-4.35" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  filter: (s) => (
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  download: (s) => (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M7 10l5 5 5-5M12 15V3" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  upload: (s) => (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M17 8l-5-5-5 5M12 3v12" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  refresh: (s) => (
    <>
      <path d="M1 4v6h6M23 20v-6h-6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  eye: (s) => (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="12" cy="12" r="3" stroke={s} strokeWidth={sw}/>
    </>
  ),
  copy: (s) => (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),

  /* ── Time / Calendar ────────────────────────────────── */
  clock: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <path d="M12 6v6l4 2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  calendar: (s) => (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  history: (s) => (
    <>
      <path d="M1 12s4-8 11-8a11 11 0 0 1 0 16" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <path d="M1 4v6h6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="12" cy="12" r="3" stroke={s} strokeWidth={sw}/>
    </>
  ),

  /* ── Misc / Tools ───────────────────────────────────── */
  monitor: (s) => (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M8 21h8M12 17v4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  gantt: (s) => (
    <>
      <path d="M3 6h18M3 10h18M3 14h14M3 18h10" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <rect x="7" y="8" width="4" height="2" rx=".5" fill={s} opacity=".7"/>
      <rect x="7" y="12" width="6" height="2" rx=".5" fill={s} opacity=".7"/>
    </>
  ),
  calculator: (s) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M8 6h8M8 10h8M8 14h2M8 18h2M14 14h2M14 18h2" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  list: (s) => (
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  compare: (s) => (
    <path d="M16 3h5v5M8 3H3v5M3 16v5h5M21 16v5h-5M21 3l-8 8M3 21l8-8" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  whatif: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M12 17h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  target: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <circle cx="12" cy="12" r="6" stroke={s} strokeWidth={sw}/>
      <circle cx="12" cy="12" r="2" stroke={s} strokeWidth={sw}/>
    </>
  ),
  layers: (s) => (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  flag: (s) => (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M4 22v-7" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  star: (s) => (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  database: (s) => (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke={s} strokeWidth={sw}/>
      <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" stroke={s} strokeWidth={sw}/>
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" stroke={s} strokeWidth={sw}/>
    </>
  ),
  certificate: (s) => (
    <>
      <circle cx="12" cy="10" r="6" stroke={s} strokeWidth={sw}/>
      <path d="M9 16v5l3-2 3 2v-5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M12 8v4M10 10h4" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  gauge: (s) => (
    <>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={s} strokeWidth={sw}/>
      <path d="M12 6v2M12 12l3.5-3.5" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <circle cx="12" cy="12" r="1" fill={s}/>
    </>
  ),
  boxes: (s) => (
    <>
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-4.5l-5-3-4.03 1.42z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M7 16.5l-4.03-2.42M7 16.5v4.88" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <path d="M12 14.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8A2 2 0 0 0 22 17.87v-3.24a2 2 0 0 0-.97-1.71L17 11.5l-5 3z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M17 16.5l4.03-2.42M17 16.5v4.88" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <path d="M7.97 4.42A2 2 0 0 1 10.03 4.42l3 1.8a2 2 0 0 1 .97 1.71v3.24a2 2 0 0 1-.97 1.71l-3 1.8a2 2 0 0 1-2.06 0l-3-1.8A2 2 0 0 1 5 9.37V6.13a2 2 0 0 1 .97-1.71l2-1.2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  process: (s) => (
    <>
      <circle cx="12" cy="12" r="3" stroke={s} strokeWidth={sw}/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  map: (s) => (
    <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'package': (s) => (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  wrench: (s) => (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  car: (s) => (
    <>
      <path d="M5 17h14v-5l-2-5H7l-2 5v5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  quality: (s) => (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  trend: (s) => (
    <>
      <path d="M23 6l-9.5 9.5-5-5L1 18" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M17 6h6v6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  chip: (s) => (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M9 4V2M15 4V2M9 20v2M15 20v2M4 9H2M4 15H2M20 9h2M20 15h2" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  medical: (s) => (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  raw: (s) => (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  robot: (s) => (
    <>
      <rect x="9" y="9" width="6" height="6" rx="1" stroke={s} strokeWidth={sw}/>
      <path d="M12 2v4M12 18v4M22 12h-4M6 12H2M19.07 4.93l-2.83 2.83M7.76 16.24l-2.83 2.83M19.07 19.07l-2.83-2.83M7.76 7.76L4.93 4.93" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  gear: (s) => (
    <>
      <circle cx="12" cy="12" r="3" stroke={s} strokeWidth={sw}/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  /* SystemManagement icons */
  ases: (s) => (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  stf: (s) => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  mono: (s) => (
    <>
      <circle cx="12" cy="12" r="3" stroke={s} strokeWidth={sw}/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.2.45.5.84.9 1.11V10h.09a2 2 0 0 1 0 4H21a1.65 1.65 0 0 0-1.51 1z" stroke={s} strokeWidth={sw}/>
    </>
  ),
  kaizen: (s) => (
    <>
      <path d="M23 6l-9.5 9.5-5-5L1 18" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M17 6h6v6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  rule: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <path d="M12 6v6l4 2" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <path d="M8 2h8M12 2v4" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  qms: (s) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M9 12l2 2 4-4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  apqp: (s) => (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <line x1="4" y1="22" x2="4" y2="15" stroke={s} strokeWidth={sw}/>
    </>
  ),
  fmea: (s) => (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <line x1="12" y1="9" x2="12" y2="13" stroke={s} strokeWidth={sw}/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke={s} strokeWidth={sw}/>
    </>
  ),
  spc: (s) => (
    <path d="M18 20V10M12 20V4M6 20v-6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  eightd: (s) => (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={s} strokeWidth={sw}/>
      <path d="M14 2v6h6" stroke={s} strokeWidth={sw}/>
      <path d="M8 13h8M8 17h8M8 9h2" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  lean: (s) => (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={s} strokeWidth={sw}/>
      <path d="M22 6l-10 7L2 6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  tpm: (s) => (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  poka: (s) => (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={s} strokeWidth={sw}/>
      <path d="M12 8v4M12 16h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  /* HeadcountManagement icons */
  stars: (s) => (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  dialogue: (s) => (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  training: (s) => (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M12 8v8M9 11l3-3 3 3" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  workforce: (s) => (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="9" cy="7" r="4" stroke={s} strokeWidth={sw}/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  onboarding: (s) => (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="8.5" cy="7" r="4" stroke={s} strokeWidth={sw}/>
      <path d="M20 8v6M23 11h-6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  /* EnterpriseManagement icons */
  trending: (s) => (
    <>
      <path d="M23 6l-9.5 9.5-5-5L1 18" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M17 6h6v6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  split: (s) => (
    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  activity: (s) => (
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  building: (s) => (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  users: (s) => (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="9" cy="7" r="4" stroke={s} strokeWidth={sw}/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  percent: (s) => (
    <>
      <path d="M19 5L5 19" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="6.5" cy="6.5" r="2.5" stroke={s} strokeWidth={sw}/>
      <circle cx="17.5" cy="17.5" r="2.5" stroke={s} strokeWidth={sw}/>
    </>
  ),
  play: (s) => (
    <polygon points="5,3 19,12 5,21" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj} fill="none"/>
  ),
  pie: (s) => (
    <>
      <path d="M12 2v10l8 2M12 2a10 10 0 1 0 10 10" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  dollar: (s) => (
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'check-circle': (s) => (
    <>
      <path d="M9 11l3 3L22 4" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  'mold-grid': (s) => (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke={s} strokeWidth={sw}/>
    </>
  ),
  'robot-face': (s) => (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={s} strokeWidth={sw}/>
      <circle cx="9" cy="9" r="1" fill={s}/>
      <circle cx="15" cy="9" r="1" fill={s}/>
      <path d="M8 14h8" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  plastic: (s) => (
    <>
      <rect x="8" y="10" width="8" height="8" rx="1" stroke={s} strokeWidth={sw}/>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  metal: (s) => (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M6 12h12M12 6v12" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  other: (s) => (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  trial: (s) => (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  industry: (s) => (
    <>
      <circle cx="12" cy="12" r="3" stroke={s} strokeWidth={sw}/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  project: (s) => (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M9 22V12h6v10" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  'folder-open': (s) => (
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  rubber: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <circle cx="12" cy="12" r="4" stroke={s} strokeWidth={sw}/>
    </>
  ),
  composites: (s) => (
    <>
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke={s} strokeWidth={sw} strokeLinejoin={lj}/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  ceramics: (s) => (
    <path d="M12 22c5.5 0 8-3.582 8-8V4l-8-2-8 2v10c0 4.418 2.5 8 8 8z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  'electronics-assembly': (s) => (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  glass: (s) => (
    <>
      <path d="M8 2h8l-1 10H9L8 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M6 22h12M12 12v10" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  textile: (s) => (
    <>
      <path d="M3 6h18M3 10h18M3 14h18M3 18h18" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
      <path d="M7 3v18M12 3v18M17 3v18" stroke={s} strokeWidth="1.5" strokeLinecap={lc} opacity="0.4"/>
    </>
  ),
  hexagon: (s) => (
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={s} strokeWidth={sw}/>
  ),
  'grid-cols': (s) => (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={s} strokeWidth={sw}/>
      <path d="M9 3v18M15 3v18" stroke={s} strokeWidth={sw}/>
    </>
  ),
}

export default function Icon({ name, size = 24, className = '', color, onClick, style, ...props }) {
  const ref = useRef(null)
  const renderPaths = ICONS[name]

  const handleClick = useCallback((e) => {
    if (!onClick) return
    const el = ref.current
    if (el) {
      el.classList.remove('stx-icon-pressed')
      void el.offsetWidth
      el.classList.add('stx-icon-pressed')
    }
    onClick(e)
  }, [onClick])

  if (!renderPaths) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Icon] Unknown icon name: "${name}"`)
    }
    return null
  }

  const stroke = color || 'currentColor'

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`stx-icon ${onClick ? 'stx-icon-clickable' : ''} ${className}`}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
      {...props}
    >
      {renderPaths(stroke)}
    </svg>
  )
}

/* ICONS kept module-private — use <Icon name="…" /> instead */
