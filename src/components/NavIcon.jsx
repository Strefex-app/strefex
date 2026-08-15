import { useCallback, useRef } from 'react'
import './Icon.css'

const sw = '2'
const lc = 'round'
const lj = 'round'

/** Icons used by chrome (AppLayout, Header, BottomNav) — kept out of the page icon map. */
const NAV_ICONS = {
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
  logout: (s) => (
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  profile: (s) => (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="12" cy="7" r="4" stroke={s} strokeWidth={sw}/>
    </>
  ),
  vendors: (s) => (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <circle cx="9" cy="7" r="4" stroke={s} strokeWidth={sw}/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
  management: (s) => (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={s} strokeWidth={sw}/>
    </>
  ),
  messenger: (s) => (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
  notifications: (s) => (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
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
  shield: (s) => (
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
  ),
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
  support: (s) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={s} strokeWidth={sw}/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M12 17h.01" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
  search: (s) => (
    <>
      <circle cx="11" cy="11" r="8" stroke={s} strokeWidth={sw}/>
      <path d="M21 21l-4.35-4.35" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
    </>
  ),
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
  package: (s) => (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={s} strokeWidth={sw} strokeLinecap={lc} strokeLinejoin={lj}/>
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={s} strokeWidth={sw} strokeLinecap={lc}/>
    </>
  ),
}

export default function NavIcon({ name, size = 24, className = '', color, onClick, style, ...props }) {
  const ref = useRef(null)
  const renderPaths = NAV_ICONS[name]
  const handleClick = useCallback((e) => {
    if (!onClick) return
    onClick(e)
  }, [onClick])
  if (!renderPaths) return null
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
