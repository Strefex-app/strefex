/* @ds-bundle: {"format":3,"namespace":"STREFEXDesignSystem_b5f82d","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"EyebrowLabel","sourcePath":"components/core/EyebrowLabel.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"StatusChip","sourcePath":"components/core/StatusChip.jsx"},{"name":"AlarmRow","sourcePath":"components/data/AlarmRow.jsx"},{"name":"GaugeMeter","sourcePath":"components/data/GaugeMeter.jsx"},{"name":"Metric","sourcePath":"components/data/Metric.jsx"},{"name":"PanelTile","sourcePath":"components/data/PanelTile.jsx"},{"name":"Icon","sourcePath":"components/icons/Icon.jsx"},{"name":"ICONS","sourcePath":"components/icons/icon-data.js"},{"name":"ICON_GROUPS","sourcePath":"components/icons/icon-data.js"},{"name":"SidebarNav","sourcePath":"components/navigation/SidebarNav.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"ProgressBar","sourcePath":"components/reporting/ProgressBar.jsx"},{"name":"StatCard","sourcePath":"components/reporting/StatCard.jsx"},{"name":"Timeline","sourcePath":"components/reporting/Timeline.jsx"}],"sourceHashes":{"assets/icon-registry.js":"17dc071582cc","components/core/Badge.jsx":"f48e6fbd2426","components/core/Button.jsx":"84d13ff82ce0","components/core/Card.jsx":"8d52ebdf5093","components/core/EyebrowLabel.jsx":"304377485223","components/core/IconButton.jsx":"7c86cfa6d905","components/core/Input.jsx":"96b0fab81cf7","components/core/StatusChip.jsx":"1a2667ab24c2","components/data/AlarmRow.jsx":"537629920aa4","components/data/GaugeMeter.jsx":"9d6aaa9fc8de","components/data/Metric.jsx":"11e8a7dd9426","components/data/PanelTile.jsx":"609a2dfee89a","components/icons/Icon.jsx":"bca9a3da28f9","components/icons/icon-data.js":"9a06b0e46b8f","components/navigation/SidebarNav.jsx":"4ebed5dd81b2","components/navigation/Tabs.jsx":"9b9b7107d466","components/reporting/ProgressBar.jsx":"4313b5254247","components/reporting/StatCard.jsx":"c14acbc2480f","components/reporting/Timeline.jsx":"2abd83e637f6","ui_kits/dashboard/app.jsx":"64d6c12e017f","ui_kits/dashboard/components.jsx":"2c175fd29bdf","ui_kits/marketing/app.jsx":"ce1b7912b34d","ui_kits/marketing/components.jsx":"5770fb58049f","ui_kits/marketing/sections.jsx":"3fd250c319dc","ui_kits/platform/app.jsx":"c7def3891dc2","ui_kits/platform/components.jsx":"e06856bf3ef3","ui_kits/platform/screens.jsx":"8ee4ddcf04ba"},"inlinedExternals":[],"unexposedExports":[{"name":"iconNames","sourcePath":"components/icons/Icon.jsx"}]} */

(() => {

const __ds_ns = (window.STREFEXDesignSystem_b5f82d = window.STREFEXDesignSystem_b5f82d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/icon-registry.js
try { (() => {
/* STREFEX icon registry (global) — mirrors components/icons/icon-data.js for
   self-contained UI kits that don't load the compiled bundle.
   window.STREFEX_ICONS[name] = inner SVG markup. */
window.STREFEX_ICONS = {
  dashboard: '<rect x="3" y="3" width="7.5" height="9" rx="1"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1"/><rect x="13.5" y="12" width="7.5" height="9" rx="1"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="1"/>',
  kanban: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7.5 7v8"/><path d="M12 7v10"/><path d="M16.5 7v5"/>',
  project: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3 13h18"/>',
  task: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7.5 12 3 3 6-6.5"/>',
  milestone: '<path d="M6 21V4"/><path d="M6 4h11l-2.2 3.5L17 11H6"/>',
  gantt: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 13h6"/><path d="M9 16.5h8.5"/>',
  workflow: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 6h4a5 5 0 0 1 5 5v4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  dollar: '<path d="M12 2.5v19"/><path d="M16.5 6.5A4.2 4.2 0 0 0 12.7 5h-1.9a3.3 3.3 0 0 0 0 6.6h2.4a3.3 3.3 0 0 1 0 6.6h-2.1A4.2 4.2 0 0 1 7.3 17"/>',
  trendUp: '<path d="m3 16.5 6-6 4 4 8-8"/><path d="M16 6.5h5v5"/>',
  trendDown: '<path d="m3 7.5 6 6 4-4 8 8"/><path d="M16 17.5h5v-5"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v9h9a9 9 0 0 0-9-9Z"/>',
  barChart: '<path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="7" rx="0.6"/><rect x="10.25" y="6" width="3.5" height="12" rx="0.6"/><rect x="15.5" y="13.5" width="3.5" height="4.5" rx="0.6"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" stroke="none"/>',
  receipt: '<path d="M5 3.5 6.5 5 8 3.5 9.5 5 11 3.5 12.5 5 14 3.5 15.5 5 17 3.5 18.5 5V21l-1.5-1.3L15.5 21 14 19.7 12.5 21 11 19.7 9.5 21 8 19.7 6.5 21 5 19.7Z"/><path d="M8 9h8"/><path d="M8 13h8"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>',
  calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="3" rx="0.6"/><path d="M8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01M8.5 16h.01M12 16h.01M15.5 16h.01M8.5 19h.01M12 19h.01M15.5 19h.01"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.66 2.7 3 6 3s6-1.34 6-3"/><path d="M15 11.5c2.7-.3 6-1.5 6-3.5"/><path d="M9 14v3c0 1.66 2.7 3 6 3s6-1.34 6-3v-7"/>',
  factory: '<path d="M3 21V11l5.5 3.5V11l5.5 3.5V8l5.5 3.5V21Z"/><path d="M3 21h18"/><path d="M8 21v-3.5M14 21v-3.5"/>',
  building: '<rect x="5" y="2.5" width="14" height="18.5" rx="1"/><path d="M9 6.5h2M13 6.5h2M9 10.5h2M13 10.5h2M9 14.5h2M13 14.5h2"/><path d="M10 21v-3h4v3"/>',
  truck: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H14v10.5H3Z"/><path d="M14 9h3.8l3.2 3.3v3.2H14Z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  package: '<path d="M12 2.5 4 6.8v10.4l8 4.3 8-4.3V6.8Z"/><path d="m4 6.8 8 4.3 8-4.3"/><path d="M12 11.1V21.5"/><path d="m8 4.6 8 4.4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z"/>',
  network: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v3.8"/><path d="m11 11-4.5 6"/><path d="m13 11 4.5 6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M21 20a6 6 0 0 0-4-5.7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
  shieldCheck: '<path d="M12 3 5 5.8v5.4c0 4.2 3 7.3 7 8.8 4-1.5 7-4.6 7-8.8V5.8Z"/><path d="m9 11.5 2 2 4-4"/>',
  clipboardCheck: '<rect x="5.5" y="4" width="13" height="17" rx="2"/><path d="M9 4V3a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 3v1"/><path d="m9 13 2 2 4-4"/>',
  verified: '<path d="m12 2.5 2.4 1.8 3-.3 1 2.8 2.7 1.3-.7 2.9.7 2.9-2.7 1.3-1 2.8-3-.3L12 21.5l-2.4-1.8-3 .3-1-2.8-2.7-1.3.7-2.9-.7-2.9 2.7-1.3 1-2.8 3 .3Z"/><path d="m9 12 2 2 4-4"/>',
  scale: '<path d="M12 3v18"/><path d="M7.5 21h9"/><path d="M5 7.5h14"/><path d="m5 7.5-2.5 6a3 3 0 0 0 5 0Z"/><path d="m19 7.5 2.5 6a3 3 0 0 1-5 0Z"/><path d="M12 3.5 5 7.5M12 3.5l7 4"/>',
  gauge: '<path d="M4 18.5a8.5 8.5 0 1 1 16 0"/><path d="M12 18.5 15.5 10"/><circle cx="12" cy="18.5" r="1.6" fill="currentColor" stroke="none"/>',
  cog: '<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
  wrench: '<path d="M14.7 6.3a4.2 4.2 0 0 0-5.6 5.6l-6 6 2.9 2.9 6-6a4.2 4.2 0 0 0 5.6-5.6l-2.7 2.7-2.1-2.1Z"/>',
  ruler: '<path d="M3 15.5 15.5 3l5.5 5.5L8.5 21Z"/><path d="m7 11 1.8 1.8M10.5 7.5l1.8 1.8M14 4l1.8 1.8"/>',
  cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="0.6"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  hardHat: '<path d="M4 16a8 8 0 0 1 16 0"/><rect x="2.5" y="16" width="19" height="2.5" rx="1"/><path d="M9.5 7.5V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1.5"/><path d="M7 12a5.5 5.5 0 0 1 2-4M17 12a5.5 5.5 0 0 0-2-4"/>',
  layers: '<path d="m12 3 9 4.8-9 4.8-9-4.8Z"/><path d="m3 12.5 9 4.8 9-4.8"/><path d="m3 17 9 4.8 9-4.8"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5Z"/>',
  arrowRight: '<path d="M4.5 12h15"/><path d="m13 5.5 6.5 6.5-6.5 6.5"/>',
  chevronRight: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3.5v11.5"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>',
  filter: '<path d="M3.5 5.5h17l-6.5 7.5v6l-4-2.2v-3.8Z"/>',
  bell: '<path d="M6 9.5a6 6 0 0 1 12 0c0 5 2.2 6.2 2.2 6.2H3.8S6 14.5 6 9.5Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>',
  externalLink: '<path d="M14 3.5h6.5V10"/><path d="M20.5 3.5 11 13"/><path d="M18.5 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5h5"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 6.5"/>',
  alert: '<path d="M12 3.5 2.5 20.5h19Z"/><path d="M12 10v4.5"/><path d="M12 18h.01"/>',
  fileText: '<path d="M7 3.5h7l5 5v12H7Z"/><path d="M14 3.5v5h5"/><path d="M10 13h6M10 16.5h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'
};
window.STREFEX_ICON_GROUPS = {
  "Project Management": ["dashboard", "kanban", "project", "task", "milestone", "gantt", "workflow", "target", "calendar", "clock"],
  Finance: ["dollar", "trendUp", "trendDown", "pie", "barChart", "wallet", "receipt", "percent", "calculator", "coins"],
  "Sourcing & Supply": ["factory", "building", "truck", "package", "globe", "network", "users", "search"],
  "Audit & Quality": ["shieldCheck", "clipboardCheck", "verified", "scale", "gauge"],
  "Engineering & Technical": ["cog", "wrench", "ruler", "cpu", "hardHat", "layers", "compass"],
  Interface: ["arrowRight", "chevronRight", "plus", "download", "filter", "bell", "externalLink", "more", "check", "alert", "fileText", "folder"]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/icon-registry.js", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const variants = {
  navy: {
    background: "var(--navy-800)",
    color: "var(--white)",
    border: "transparent"
  },
  steel: {
    background: "var(--steel-200)",
    color: "var(--navy-700)",
    border: "transparent"
  },
  outline: {
    background: "transparent",
    color: "var(--navy-700)",
    border: "var(--border-strong)"
  },
  solidsteel: {
    background: "var(--steel-500)",
    color: "var(--navy-800)",
    border: "transparent"
  }
};

/**
 * Small label / count. Square-cornered (radius-xs) — a machined tag, not a pill.
 */
function Badge({
  children,
  variant = "steel",
  style = {},
  ...rest
}) {
  const v = variants[variant] || variants.steel;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: "11px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      lineHeight: 1,
      padding: "4px 8px",
      background: v.background,
      color: v.color,
      border: `1px solid ${v.border}`,
      borderRadius: "var(--radius-xs)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: {
    padding: "7px 14px",
    fontSize: "13px",
    height: "32px"
  },
  md: {
    padding: "10px 20px",
    fontSize: "14px",
    height: "40px"
  },
  lg: {
    padding: "13px 28px",
    fontSize: "16px",
    height: "48px"
  }
};
const palettes = {
  primary: {
    background: "var(--action-primary)",
    color: "var(--white)",
    border: "1px solid var(--action-primary)",
    "--hover-bg": "var(--action-primary-hover)",
    "--active-bg": "var(--action-primary-active)"
  },
  secondary: {
    background: "var(--white)",
    color: "var(--navy-800)",
    border: "1px solid var(--border-strong)",
    "--hover-bg": "var(--steel-200)",
    "--active-bg": "var(--steel-300)"
  },
  ghost: {
    background: "transparent",
    color: "var(--navy-800)",
    border: "1px solid transparent",
    "--hover-bg": "var(--steel-200)",
    "--active-bg": "var(--steel-300)"
  },
  danger: {
    background: "var(--signal-fault)",
    color: "var(--white)",
    border: "1px solid var(--signal-fault)",
    "--hover-bg": "#b83d35",
    "--active-bg": "#9e342d"
  }
};

/**
 * STREFEX primary action. Serif-adjacent confidence: square-ish corners,
 * navy fill, no scale on hover — darkens instead.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  icon = null,
  iconRight = null,
  disabled = false,
  fullWidth = false,
  type = "button",
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const pal = palettes[variant] || palettes.primary;
  const sz = sizes[size] || sizes.md;
  const bg = disabled ? "var(--steel-300)" : active ? pal["--active-bg"] : hover ? pal["--hover-bg"] : pal.background;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: sz.fontSize,
      padding: sz.padding,
      minHeight: sz.height,
      width: fullWidth ? "100%" : "auto",
      background: bg,
      color: disabled ? "var(--steel-600)" : pal.color,
      border: pal.border,
      borderColor: disabled ? "var(--steel-300)" : undefined,
      borderRadius: "var(--radius-md)",
      cursor: disabled ? "not-allowed" : "pointer",
      letterSpacing: "0.01em",
      boxShadow: active ? "inset 0 1px 2px rgba(0,0,0,0.18)" : "none",
      transition: "background var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
      ...style
    }
  }, rest), icon, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Surface container. White, hairline border, crisp navy-tinted shadow.
 * `rule` adds the signature 3px navy left edge. `dark` renders a console panel.
 */
function Card({
  children,
  rule = false,
  dark = false,
  interactive = false,
  padding = "var(--space-6)",
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const base = dark ? {
    background: "var(--surface-panel)",
    border: "1px solid var(--border-on-dark)",
    boxShadow: "var(--shadow-console)",
    color: "var(--text-on-dark)"
  } : {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    boxShadow: hover && interactive ? "var(--shadow-md)" : "var(--shadow-sm)",
    color: "var(--text-body)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      borderRadius: "var(--radius-md)",
      borderLeft: rule ? "var(--rule-accent) solid var(--navy-800)" : base.border,
      padding,
      cursor: interactive ? "pointer" : "default",
      transition: "box-shadow var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)",
      transform: hover && interactive ? "translateY(-2px)" : "none",
      ...base,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/EyebrowLabel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Section eyebrow — the canonical STREFEX label that precedes a serif headline.
 * Condensed caps, wide tracking, optional 3px navy left rule.
 */
function EyebrowLabel({
  children,
  rule = true,
  dark = false,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "inline-block",
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: "13px",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: dark ? "var(--steel-400)" : "var(--navy-600)",
      borderLeft: rule ? `var(--rule-accent) solid ${dark ? "var(--steel-500)" : "var(--navy-800)"}` : "none",
      paddingLeft: rule ? "10px" : 0,
      lineHeight: 1.1,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { EyebrowLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/EyebrowLabel.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const sizes = {
  sm: 32,
  md: 40,
  lg: 48
};

/**
 * Square icon-only button. Same press/hover language as Button.
 */
function IconButton({
  children,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const dim = sizes[size] || sizes.md;
  const palettes = {
    primary: {
      bg: "var(--action-primary)",
      hbg: "var(--action-primary-hover)",
      fg: "var(--white)",
      bd: "var(--action-primary)"
    },
    secondary: {
      bg: "var(--white)",
      hbg: "var(--steel-200)",
      fg: "var(--navy-800)",
      bd: "var(--border-strong)"
    },
    ghost: {
      bg: "transparent",
      hbg: "var(--steel-200)",
      fg: "var(--navy-700)",
      bd: "transparent"
    }
  };
  const p = palettes[variant] || palettes.ghost;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: dim,
      height: dim,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: disabled ? "var(--steel-200)" : hover ? p.hbg : p.bg,
      color: disabled ? "var(--steel-600)" : p.fg,
      border: `1px solid ${p.bd}`,
      borderRadius: "var(--radius-sm)",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background var(--duration-fast) var(--ease-standard)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Text field with optional label and leading icon. Hairline steel border,
 * navy focus ring, square-ish corners.
 */
function Input({
  label,
  id,
  type = "text",
  placeholder,
  value,
  defaultValue,
  onChange,
  icon = null,
  hint,
  error,
  disabled = false,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  const borderColor = error ? "var(--signal-fault)" : focus ? "var(--navy-500)" : "var(--border-strong)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: "12px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: disabled ? "var(--steel-200)" : "var(--white)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-sm)",
      padding: "0 12px",
      boxShadow: focus ? "0 0 0 3px var(--focus-ring)" : "none",
      transition: "border-color var(--duration-fast), box-shadow var(--duration-fast)"
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      color: "var(--text-faint)"
    }
  }, icon), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    placeholder: placeholder,
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-sans)",
      fontSize: "15px",
      color: "var(--text-strong)",
      padding: "11px 0",
      minWidth: 0
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      color: error ? "var(--signal-fault)" : "var(--text-faint)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const tones = {
  running: {
    dot: "var(--signal-running)",
    fg: "#2F7A2C",
    bg: "var(--signal-running-bg)"
  },
  warning: {
    dot: "var(--signal-warning)",
    fg: "#9A6B12",
    bg: "var(--signal-warning-bg)"
  },
  fault: {
    dot: "var(--signal-fault)",
    fg: "#A8362E",
    bg: "var(--signal-fault-bg)"
  },
  data: {
    dot: "var(--signal-data)",
    fg: "#1F7B98",
    bg: "var(--signal-data-bg)"
  },
  idle: {
    dot: "var(--steel-500)",
    fg: "var(--steel-700)",
    bg: "var(--steel-200)"
  }
};
const darkTones = {
  running: {
    dot: "var(--signal-running)",
    fg: "#8FDB8C"
  },
  warning: {
    dot: "var(--signal-warning)",
    fg: "#F0C77C"
  },
  fault: {
    dot: "var(--signal-fault)",
    fg: "#F09A92"
  },
  data: {
    dot: "var(--signal-data)",
    fg: "#84D2E8"
  },
  idle: {
    dot: "var(--steel-500)",
    fg: "var(--steel-400)"
  }
};

/**
 * Instrument-style status indicator: a filled signal dot + caps label.
 * `pulse` animates the dot for live "on-track" state.
 */
function StatusChip({
  tone = "running",
  children,
  pulse = false,
  dark = false,
  style = {},
  ...rest
}) {
  const t = dark ? darkTones[tone] || darkTones.idle : tones[tone] || tones.idle;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: "12px",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      lineHeight: 1,
      padding: dark ? "0" : "5px 10px 5px 9px",
      background: dark ? "transparent" : t.bg,
      color: t.fg,
      borderRadius: "var(--radius-pill)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: "9px",
      height: "9px",
      borderRadius: "var(--radius-pill)",
      background: t.dot,
      boxShadow: pulse ? `0 0 0 0 ${t.dot}` : "none",
      animation: pulse ? "strefex-pulse 1.6s var(--ease-standard) infinite" : "none",
      flex: "none"
    }
  }), children, /*#__PURE__*/React.createElement("style", null, `@keyframes strefex-pulse{0%{box-shadow:0 0 0 0 rgba(95,184,92,.5)}70%{box-shadow:0 0 0 7px rgba(95,184,92,0)}100%{box-shadow:0 0 0 0 rgba(95,184,92,0)}}@media (prefers-reduced-motion: reduce){[style*="strefex-pulse"]{animation:none!important}}`));
}
Object.assign(__ds_scope, { StatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusChip.jsx", error: String((e && e.message) || e) }); }

// components/data/AlarmRow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const statusColor = {
  resolved: "var(--signal-running)",
  cleared: "var(--signal-running)",
  completed: "var(--signal-running)",
  fixed: "var(--signal-running)",
  passed: "var(--signal-running)",
  signed: "var(--signal-running)",
  active: "var(--signal-fault)",
  flagged: "var(--signal-fault)",
  warning: "var(--signal-warning)",
  pending: "var(--signal-warning)"
};

/**
 * One activity-log entry: timestamp · message · status.
 * Mono time, sans message, signal-colored status word.
 */
function AlarmRow({
  time,
  message,
  status,
  dark = true,
  style = {},
  ...rest
}) {
  const key = (status || "").toLowerCase();
  const color = statusColor[key] || "var(--signal-data)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "12px",
      padding: "9px 0",
      borderBottom: `1px solid ${dark ? "var(--border-on-dark)" : "var(--border-hairline)"}`,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "12px",
      color: dark ? "var(--text-on-dark-muted)" : "var(--text-muted)",
      flex: "none",
      minWidth: "62px"
    }
  }, time), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      color: dark ? "var(--text-on-dark)" : "var(--text-body)",
      flex: 1
    }
  }, message), status && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: "11px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color,
      flex: "none"
    }
  }, status));
}
Object.assign(__ds_scope, { AlarmRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/AlarmRow.jsx", error: String((e && e.message) || e) }); }

// components/data/GaugeMeter.jsx
try { (() => {
/**
 * Semicircular performance/score gauge — red→amber→green track with a
 * marker at the current value and a large centered mono percentage.
 * Used for composite supplier scores, on-time %, capability indices.
 */
function GaugeMeter({
  value = 0,
  label = "Score",
  size = 180,
  dark = true,
  style = {}
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 72,
    cx = 100,
    cy = 104;
  const polar = deg => {
    const a = Math.PI * deg / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const arc = (s, e) => {
    const [x1, y1] = polar(s);
    const [x2, y2] = polar(e);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${Math.abs(e - s) > 180 ? 1 : 0} ${s > e ? 1 : 0} ${x2} ${y2}`;
  };
  const valDeg = 180 - pct / 100 * 180;
  const [mx, my] = polar(valDeg);
  const valColor = pct >= 85 ? "var(--signal-running)" : pct >= 60 ? "var(--signal-warning)" : "var(--signal-fault)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: size,
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 132",
    style: {
      width: "100%",
      overflow: "visible"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: arc(180, 122),
    fill: "none",
    stroke: "var(--signal-fault)",
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("path", {
    d: arc(122, 58),
    fill: "none",
    stroke: "var(--signal-warning)",
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("path", {
    d: arc(58, 0),
    fill: "none",
    stroke: "var(--signal-running)",
    strokeWidth: "12"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: mx,
    cy: my,
    r: "7",
    fill: dark ? "#fff" : "var(--navy-800)",
    stroke: valColor,
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("text", {
    x: "100",
    y: "96",
    textAnchor: "middle",
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 46,
      fill: valColor
    }
  }, pct, /*#__PURE__*/React.createElement("tspan", {
    style: {
      fontSize: 20
    }
  }, "%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: dark ? "var(--text-on-dark-muted)" : "var(--text-muted)",
      marginTop: 6
    }
  }, label));
}
Object.assign(__ds_scope, { GaugeMeter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/GaugeMeter.jsx", error: String((e && e.message) || e) }); }

// components/data/Metric.jsx
try { (() => {
/**
 * A single KPI readout — mono value + unit with a caps label.
 * Use in dark console panels or light report cards.
 */
function Metric({
  label,
  value,
  unit,
  sub,
  tone,
  dark = false,
  align = "left",
  style = {}
}) {
  const toneColors = {
    running: "var(--signal-running)",
    warning: "var(--signal-warning)",
    fault: "var(--signal-fault)",
    data: "var(--signal-data)"
  };
  const valueColor = tone ? toneColors[tone] : dark ? "var(--text-on-dark)" : "var(--text-strong)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "5px",
      alignItems: align === "right" ? "flex-end" : "flex-start",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: "12px",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: dark ? "var(--text-on-dark-muted)" : "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "baseline",
      gap: "5px",
      fontFamily: "var(--font-mono)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "30px",
      fontWeight: 600,
      lineHeight: 1,
      color: valueColor,
      letterSpacing: "0.01em"
    }
  }, value), unit && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "15px",
      fontWeight: 500,
      color: dark ? "var(--text-on-dark-muted)" : "var(--text-muted)"
    }
  }, unit)), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "12px",
      color: dark ? "var(--text-on-dark-muted)" : "var(--text-faint)"
    }
  }, sub));
}
Object.assign(__ds_scope, { Metric });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Metric.jsx", error: String((e && e.message) || e) }); }

// components/data/PanelTile.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dark dashboard panel with a caps header and optional right-side action/status.
 * The tile unit of the operations / live-panel grid.
 */
function PanelTile({
  title,
  action,
  children,
  accent,
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: "var(--surface-panel)",
      border: "1px solid var(--border-on-dark)",
      borderTop: accent ? `2px solid ${accent}` : "1px solid var(--border-on-dark)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-console)",
      padding: "var(--space-5)",
      color: "var(--text-on-dark)",
      ...style
    }
  }, rest), (title || action) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginBottom: "var(--space-4)",
      paddingBottom: "var(--space-3)",
      borderBottom: "1px solid var(--border-on-dark)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: "15px",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-on-dark)"
    }
  }, title), action), children);
}
Object.assign(__ds_scope, { PanelTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PanelTile.jsx", error: String((e && e.message) || e) }); }

// components/icons/icon-data.js
try { (() => {
// STREFEX icon registry — Lucide-style line icons, 24×24, 1.75 stroke.
// Inner SVG markup per name; the <Icon> wrapper supplies stroke/fill.
// Substitution note: no icon set was supplied in source material; these are
// an original Lucide-aligned set (even stroke, square caps) for the brand.
const ICONS = {
  // — Project Management —
  dashboard: '<rect x="3" y="3" width="7.5" height="9" rx="1"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1"/><rect x="13.5" y="12" width="7.5" height="9" rx="1"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="1"/>',
  kanban: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7.5 7v8"/><path d="M12 7v10"/><path d="M16.5 7v5"/>',
  project: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3 13h18"/>',
  task: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7.5 12 3 3 6-6.5"/>',
  milestone: '<path d="M6 21V4"/><path d="M6 4h11l-2.2 3.5L17 11H6"/>',
  gantt: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M6.5 13h6"/><path d="M9 16.5h8.5"/>',
  workflow: '<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M9 6h4a5 5 0 0 1 5 5v4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
  // — Finance —
  dollar: '<path d="M12 2.5v19"/><path d="M16.5 6.5A4.2 4.2 0 0 0 12.7 5h-1.9a3.3 3.3 0 0 0 0 6.6h2.4a3.3 3.3 0 0 1 0 6.6h-2.1A4.2 4.2 0 0 1 7.3 17"/>',
  trendUp: '<path d="m3 16.5 6-6 4 4 8-8"/><path d="M16 6.5h5v5"/>',
  trendDown: '<path d="m3 7.5 6 6 4-4 8 8"/><path d="M16 17.5h5v-5"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v9h9a9 9 0 0 0-9-9Z"/>',
  barChart: '<path d="M3 21h18"/><rect x="5" y="11" width="3.5" height="7" rx="0.6"/><rect x="10.25" y="6" width="3.5" height="12" rx="0.6"/><rect x="15.5" y="13.5" width="3.5" height="4.5" rx="0.6"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" stroke="none"/>',
  receipt: '<path d="M5 3.5 6.5 5 8 3.5 9.5 5 11 3.5 12.5 5 14 3.5 15.5 5 17 3.5 18.5 5V21l-1.5-1.3L15.5 21 14 19.7 12.5 21 11 19.7 9.5 21 8 19.7 6.5 21 5 19.7Z"/><path d="M8 9h8"/><path d="M8 13h8"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>',
  calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="3" rx="0.6"/><path d="M8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01M8.5 16h.01M12 16h.01M15.5 16h.01M8.5 19h.01M12 19h.01M15.5 19h.01"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.66 2.7 3 6 3s6-1.34 6-3"/><path d="M15 11.5c2.7-.3 6-1.5 6-3.5"/><path d="M9 14v3c0 1.66 2.7 3 6 3s6-1.34 6-3v-7"/>',
  // — Sourcing & Supply —
  factory: '<path d="M3 21V11l5.5 3.5V11l5.5 3.5V8l5.5 3.5V21Z"/><path d="M3 21h18"/><path d="M8 21v-3.5M14 21v-3.5"/>',
  building: '<rect x="5" y="2.5" width="14" height="18.5" rx="1"/><path d="M9 6.5h2M13 6.5h2M9 10.5h2M13 10.5h2M9 14.5h2M13 14.5h2"/><path d="M10 21v-3h4v3"/>',
  truck: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H14v10.5H3Z"/><path d="M14 9h3.8l3.2 3.3v3.2H14Z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  package: '<path d="M12 2.5 4 6.8v10.4l8 4.3 8-4.3V6.8Z"/><path d="m4 6.8 8 4.3 8-4.3"/><path d="M12 11.1V21.5"/><path d="m8 4.6 8 4.4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z"/>',
  network: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v3.8"/><path d="m11 11-4.5 6"/><path d="m13 11 4.5 6"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M21 20a6 6 0 0 0-4-5.7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
  // — Audit & Quality —
  shieldCheck: '<path d="M12 3 5 5.8v5.4c0 4.2 3 7.3 7 8.8 4-1.5 7-4.6 7-8.8V5.8Z"/><path d="m9 11.5 2 2 4-4"/>',
  clipboardCheck: '<rect x="5.5" y="4" width="13" height="17" rx="2"/><path d="M9 4V3a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 3v1"/><path d="m9 13 2 2 4-4"/>',
  verified: '<path d="m12 2.5 2.4 1.8 3-.3 1 2.8 2.7 1.3-.7 2.9.7 2.9-2.7 1.3-1 2.8-3-.3L12 21.5l-2.4-1.8-3 .3-1-2.8-2.7-1.3.7-2.9-.7-2.9 2.7-1.3 1-2.8 3 .3Z"/><path d="m9 12 2 2 4-4"/>',
  scale: '<path d="M12 3v18"/><path d="M7.5 21h9"/><path d="M5 7.5h14"/><path d="m5 7.5-2.5 6a3 3 0 0 0 5 0Z"/><path d="m19 7.5 2.5 6a3 3 0 0 1-5 0Z"/><path d="M12 3.5 5 7.5M12 3.5l7 4"/>',
  gauge: '<path d="M4 18.5a8.5 8.5 0 1 1 16 0"/><path d="M12 18.5 15.5 10"/><circle cx="12" cy="18.5" r="1.6" fill="currentColor" stroke="none"/>',
  // — Engineering & Technical —
  cog: '<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
  wrench: '<path d="M14.7 6.3a4.2 4.2 0 0 0-5.6 5.6l-6 6 2.9 2.9 6-6a4.2 4.2 0 0 0 5.6-5.6l-2.7 2.7-2.1-2.1Z"/>',
  ruler: '<path d="M3 15.5 15.5 3l5.5 5.5L8.5 21Z"/><path d="m7 11 1.8 1.8M10.5 7.5l1.8 1.8M14 4l1.8 1.8"/>',
  cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="0.6"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  hardHat: '<path d="M4 16a8 8 0 0 1 16 0"/><rect x="2.5" y="16" width="19" height="2.5" rx="1"/><path d="M9.5 7.5V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v1.5"/><path d="M7 12a5.5 5.5 0 0 1 2-4M17 12a5.5 5.5 0 0 0-2-4"/>',
  layers: '<path d="m12 3 9 4.8-9 4.8-9-4.8Z"/><path d="m3 12.5 9 4.8 9-4.8"/><path d="m3 17 9 4.8 9-4.8"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5Z"/>',
  // — Interface —
  arrowRight: '<path d="M4.5 12h15"/><path d="m13 5.5 6.5 6.5-6.5 6.5"/>',
  chevronRight: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3.5v11.5"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>',
  filter: '<path d="M3.5 5.5h17l-6.5 7.5v6l-4-2.2v-3.8Z"/>',
  bell: '<path d="M6 9.5a6 6 0 0 1 12 0c0 5 2.2 6.2 2.2 6.2H3.8S6 14.5 6 9.5Z"/><path d="M10 19.5a2 2 0 0 0 4 0"/>',
  externalLink: '<path d="M14 3.5h6.5V10"/><path d="M20.5 3.5 11 13"/><path d="M18.5 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5h5"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 6.5"/>',
  alert: '<path d="M12 3.5 2.5 20.5h19Z"/><path d="M12 10v4.5"/><path d="M12 18h.01"/>',
  fileText: '<path d="M7 3.5h7l5 5v12H7Z"/><path d="M14 3.5v5h5"/><path d="M10 13h6M10 16.5h6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>'
};
const ICON_GROUPS = {
  "Project Management": ["dashboard", "kanban", "project", "task", "milestone", "gantt", "workflow", "target", "calendar", "clock"],
  Finance: ["dollar", "trendUp", "trendDown", "pie", "barChart", "wallet", "receipt", "percent", "calculator", "coins"],
  "Sourcing & Supply": ["factory", "building", "truck", "package", "globe", "network", "users", "search"],
  "Audit & Quality": ["shieldCheck", "clipboardCheck", "verified", "scale", "gauge"],
  "Engineering & Technical": ["cog", "wrench", "ruler", "cpu", "hardHat", "layers", "compass"],
  Interface: ["arrowRight", "chevronRight", "plus", "download", "filter", "bell", "externalLink", "more", "check", "alert", "fileText", "folder"]
};
Object.assign(__ds_scope, { ICONS, ICON_GROUPS });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icons/icon-data.js", error: String((e && e.message) || e) }); }

// components/icons/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * STREFEX line icon. Lucide-aligned, 24×24, inherits text color via
 * `currentColor`. Stroke 1.75 to match the engineering sans.
 */
function Icon({
  name,
  size = 22,
  stroke = 1.75,
  color = "currentColor",
  title,
  style = {},
  ...rest
}) {
  const inner = __ds_scope.ICONS[name] || "";
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: title ? "img" : "presentation",
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      flex: "none",
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: (title ? `<title>${title}</title>` : "") + inner
    }
  }, rest));
}

/** All available icon names. */
const iconNames = Object.keys(__ds_scope.ICONS);
Object.assign(__ds_scope, { Icon, iconNames });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/icons/Icon.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SidebarNav.jsx
try { (() => {
/**
 * Vertical app sidebar — the STREFEX platform chrome. Dark navy rail with the
 * brand mark, a list of module items (icon + label, optional badge), and an
 * optional footer node. Controlled via `active` / `onSelect`.
 */
function SidebarNav({
  items = [],
  active,
  onSelect,
  brand = "STREFEX",
  footer,
  width = 240,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width,
      minHeight: "100%",
      background: "var(--navy-900)",
      borderRight: "1px solid var(--border-on-dark)",
      display: "flex",
      flexDirection: "column",
      padding: "20px 14px",
      boxSizing: "border-box",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 8px 22px"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 172 92",
    width: "30",
    style: {
      fill: "var(--white)",
      flex: "none"
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "8,8 103,8 116,26 20,26"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "32,40 127,40 140,56 44,56"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "56,70 151,70 164,86 68,86"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: 18,
      letterSpacing: "0.12em",
      color: "var(--white)"
    }
  }, brand)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      flex: 1
    }
  }, items.map(it => {
    const on = it.key === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      onClick: () => onSelect && onSelect(it.key),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        border: "none",
        borderLeft: on ? "3px solid var(--steel-400)" : "3px solid transparent",
        background: on ? "var(--navy-700)" : "transparent",
        color: on ? "var(--white)" : "var(--text-on-dark-muted)",
        fontFamily: "var(--font-sans)",
        fontWeight: on ? 600 : 500,
        fontSize: 14.5,
        transition: "background var(--duration-fast) var(--ease-standard), color var(--duration-fast)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        flex: "none",
        color: on ? "var(--steel-300)" : "var(--text-on-dark-muted)"
      }
    }, it.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, it.label), it.badge != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color: on ? "var(--white)" : "var(--text-on-dark-muted)",
        background: on ? "var(--navy-600)" : "rgba(255,255,255,0.06)",
        borderRadius: "var(--radius-pill)",
        padding: "1px 8px"
      }
    }, it.badge));
  })), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 16,
      marginTop: 16,
      borderTop: "1px solid var(--border-on-dark)"
    }
  }, footer));
}
Object.assign(__ds_scope, { SidebarNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SidebarNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Horizontal tabs. `line` (underline, default) for in-page section switching;
 * `segment` (boxed control) for compact filters.
 */
function Tabs({
  tabs = [],
  active,
  onChange,
  variant = "line",
  style = {}
}) {
  if (variant === "segment") {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        ...style
      }
    }, tabs.map(t => {
      const on = t.key === active;
      return /*#__PURE__*/React.createElement("button", {
        key: t.key,
        onClick: () => onChange && onChange(t.key),
        style: {
          fontFamily: "var(--font-condensed)",
          fontWeight: 600,
          fontSize: 12.5,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: "8px 16px",
          border: "none",
          cursor: "pointer",
          background: on ? "var(--navy-800)" : "var(--white)",
          color: on ? "var(--white)" : "var(--text-muted)"
        }
      }, t.label);
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, tabs.map(t => {
    const on = t.key === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.key,
      onClick: () => onChange && onChange(t.key),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: 14.5,
        padding: "11px 14px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: on ? "var(--navy-800)" : "var(--text-muted)",
        borderBottom: on ? "2px solid var(--navy-800)" : "2px solid transparent",
        marginBottom: -1,
        transition: "color var(--duration-fast)"
      }
    }, t.icon, t.label, t.count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-faint)",
        background: "var(--steel-200)",
        borderRadius: "var(--radius-pill)",
        padding: "1px 7px"
      }
    }, t.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/reporting/ProgressBar.jsx
try { (() => {
const tones = {
  navy: "var(--navy-600)",
  running: "var(--signal-running)",
  warning: "var(--signal-warning)",
  fault: "var(--signal-fault)"
};

/**
 * Labeled progress / completion bar. Auto-colors by value unless `tone` is set;
 * optional target marker for budget-vs-plan readouts.
 */
function ProgressBar({
  value = 0,
  label,
  tone,
  showValue = true,
  target,
  height = 8,
  style = {}
}) {
  const pct = Math.max(0, Math.min(100, value));
  const auto = pct >= 80 ? "running" : pct >= 50 ? "warning" : "fault";
  const color = tones[tone] || tones[auto];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...style
    }
  }, (label || showValue) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 7
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      fontWeight: 500,
      color: "var(--text-body)"
    }
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13,
      color: "var(--navy-800)"
    }
  }, pct, "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height,
      background: "var(--steel-200)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      height: "100%",
      background: color,
      borderRadius: "var(--radius-pill)",
      transition: "width var(--duration-slow) var(--ease-out)"
    }
  }), target != null && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: -2,
      bottom: -2,
      left: `calc(${Math.max(0, Math.min(100, target))}% - 1px)`,
      width: 2,
      background: "var(--navy-800)",
      borderRadius: 1
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/reporting/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/reporting/StatCard.jsx
try { (() => {
const toneColor = {
  navy: "var(--navy-800)",
  running: "var(--signal-running)",
  warning: "var(--signal-warning)",
  fault: "var(--signal-fault)",
  data: "var(--signal-data)"
};

/**
 * Light KPI tile — icon chip, caps label, mono value, optional delta.
 * The atom of the platform's light management screens (vs. dark Metric).
 */
function StatCard({
  icon,
  label,
  value,
  unit,
  delta,
  invert = false,
  accent = "var(--navy-800)",
  style = {}
}) {
  const up = typeof delta === "number" && delta >= 0;
  const good = invert ? !up : up;
  const deltaColor = good ? "var(--signal-running)" : "var(--signal-fault)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderLeft: `3px solid ${accent}`,
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
      padding: "16px 18px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "var(--radius-sm)",
      background: "var(--steel-100)",
      border: "1px solid var(--border-hairline)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--navy-700)",
      flex: "none"
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 30,
      color: "var(--navy-800)",
      lineHeight: 1
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--text-muted)"
    }
  }, unit ? unit : "")), delta !== undefined && delta !== null && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 12.5,
      color: deltaColor
    }
  }, up ? "▲" : "▼", " ", Math.abs(delta), "%")));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/reporting/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/reporting/Timeline.jsx
try { (() => {
const dotColor = {
  done: "var(--signal-running)",
  active: "var(--signal-data)",
  pending: "var(--steel-500)",
  late: "var(--signal-fault)",
  warning: "var(--signal-warning)"
};

/**
 * Vertical milestone timeline — status dot + connecting rail, title, date,
 * optional note. For turnkey-project phases and audit/sourcing stage tracking.
 */
function Timeline({
  items = [],
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      ...style
    }
  }, items.map((it, i) => {
    const last = i === items.length - 1;
    const color = dotColor[it.status] || dotColor.pending;
    const active = it.status === "active";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 13,
        height: 13,
        borderRadius: "var(--radius-pill)",
        background: active ? "var(--white)" : color,
        border: `2.5px solid ${color}`,
        marginTop: 3,
        flex: "none",
        boxShadow: active ? "0 0 0 3px rgba(58,166,201,0.18)" : "none"
      }
    }), !last && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 2,
        flex: 1,
        minHeight: 26,
        background: "var(--border-hairline)",
        marginTop: 2
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingBottom: last ? 0 : 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: 14.5,
        color: "var(--navy-800)"
      }
    }, it.title), it.date && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--text-faint)"
      }
    }, it.date)), it.note && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--text-muted)",
        marginTop: 3,
        lineHeight: 1.45
      }
    }, it.note)));
  }));
}
Object.assign(__ds_scope, { Timeline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/reporting/Timeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/app.jsx
try { (() => {
// STREFEX management-intelligence dashboard — full assembly.
const {
  useState: useStateApp
} = React;
const SUPPLIERS = [{
  name: "Meridian Forge",
  cat: "Castings",
  score: 94,
  risk: "low",
  onTime: 99,
  spend: "$8.4M"
}, {
  name: "Apex Driveline",
  cat: "Powertrain",
  score: 88,
  risk: "low",
  onTime: 97,
  spend: "$12.1M"
}, {
  name: "Kessler Precision",
  cat: "Machining",
  score: 81,
  risk: "medium",
  onTime: 92,
  spend: "$5.7M"
}, {
  name: "Nordic Stamping",
  cat: "Stamping",
  score: 76,
  risk: "medium",
  onTime: 89,
  spend: "$4.2M"
}, {
  name: "Vantage Polymers",
  cat: "Plastics",
  score: 63,
  risk: "high",
  onTime: 81,
  spend: "$3.0M"
}];
const RANGES = ["30 Days", "Quarter", "YTD"];
function Header({
  range,
  setRange
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 28px",
      background: "var(--surface-card)",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.logoNavy || "../../assets/logo-navy.png",
    alt: "STREFEX",
    style: {
      height: 22
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 24,
      background: "var(--border-hairline)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 17,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--navy-800)"
    }
  }, "Operations Intelligence")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius-sm)",
      overflow: "hidden"
    }
  }, RANGES.map(r => /*#__PURE__*/React.createElement("button", {
    key: r,
    onClick: () => setRange(r),
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12.5,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "8px 14px",
      border: "none",
      cursor: "pointer",
      background: range === r ? "var(--navy-800)" : "#fff",
      color: range === r ? "#fff" : "var(--text-muted)"
    }
  }, r))), /*#__PURE__*/React.createElement("button", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14,
      padding: "9px 18px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--navy-800)",
      background: "var(--navy-800)",
      color: "#fff",
      cursor: "pointer"
    }
  }, "Export Brief")));
}
function Scorecard() {
  const [sel, setSel] = useStateApp(0);
  const cols = ["Supplier", "Category", "Capability Score", "Risk", "On-Time", "Annual Spend"];
  return /*#__PURE__*/React.createElement(Panel, {
    title: "Supplier Scorecard",
    action: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--navy-600)",
        cursor: "pointer",
        fontWeight: 600
      }
    }, "View all 140 \u2192")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr 1.4fr 0.9fr 0.7fr 0.9fr",
      gap: 12,
      padding: "0 0 10px",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, cols.map(c => /*#__PURE__*/React.createElement("span", {
    key: c,
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, c))), SUPPLIERS.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.name,
    onClick: () => setSel(i),
    style: {
      display: "grid",
      gridTemplateColumns: "1.6fr 1fr 1.4fr 0.9fr 0.7fr 0.9fr",
      gap: 12,
      alignItems: "center",
      padding: "12px 8px",
      margin: "0 -8px",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      background: sel === i ? "var(--steel-100)" : "transparent",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Initials, {
    name: s.name
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14.5,
      color: "var(--navy-800)"
    }
  }, s.name)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, s.cat), /*#__PURE__*/React.createElement(ScoreBar, {
    score: s.score
  }), /*#__PURE__*/React.createElement(RiskChip, {
    level: s.risk
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, s.onTime, "%"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      color: "var(--navy-800)",
      fontWeight: 500
    }
  }, s.spend))));
}
function RiskMix() {
  const mix = [["Low", 96, "var(--signal-running)"], ["Medium", 32, "var(--signal-warning)"], ["High", 12, "var(--signal-fault)"]];
  const total = mix.reduce((a, m) => a + m[1], 0);
  return /*#__PURE__*/React.createElement(Panel, {
    title: "Risk Distribution"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: 12,
      borderRadius: "var(--radius-pill)",
      overflow: "hidden",
      marginBottom: 18
    }
  }, mix.map(m => /*#__PURE__*/React.createElement("div", {
    key: m[0],
    style: {
      width: m[1] / total * 100 + "%",
      background: m[2]
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, mix.map(m => /*#__PURE__*/React.createElement("div", {
    key: m[0],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: m[2]
    }
  }), m[0], " Risk"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--navy-800)"
    }
  }, m[1])))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      paddingTop: 16,
      borderTop: "1px solid var(--border-hairline)",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      lineHeight: 1.5,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--navy-800)"
    }
  }, "12 suppliers"), " flagged high-risk \u2014 concentrated in Plastics & Electronics. Diversification brief recommended."));
}
function App() {
  const [range, setRange] = useStateApp("Quarter");
  const trend = [78, 80, 79, 82, 84, 83, 86, 88, 87, 89, 91, 90];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement(Header, {
    range: range,
    setRange: setRange
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "24px 28px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--navy-600)",
      borderLeft: "3px solid var(--navy-800)",
      paddingLeft: 10
    }
  }, "Automotive & Machinery \xB7 ", range), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 400,
      fontSize: 34,
      color: "var(--navy-800)",
      letterSpacing: "-0.02em",
      margin: "12px 0 0"
    }
  }, "Supply Base Performance"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Kpi, {
    label: "Supplier Risk Index",
    value: "87",
    unit: "/100",
    delta: 4
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "On-Time Delivery",
    value: "94",
    unit: "%",
    delta: 2
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Sourcing Savings",
    value: "$24",
    unit: "M",
    delta: 11
  }), /*#__PURE__*/React.createElement(Kpi, {
    label: "Active Suppliers",
    value: "140",
    delta: -3,
    invert: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.9fr 1fr",
      gap: 16,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Scorecard, null), /*#__PURE__*/React.createElement(RiskMix, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.9fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Performance Trend",
    action: /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 13,
        color: "var(--navy-600)"
      }
    }, "Composite score \xB7 +13 YTD")
  }, /*#__PURE__*/React.createElement(AreaTrend, {
    points: trend
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-faint)",
      marginTop: 8
    }
  }, ["Jan", "Mar", "May", "Jul", "Sep", "Nov"].map(m => /*#__PURE__*/React.createElement("span", {
    key: m
  }, m)))), /*#__PURE__*/React.createElement(Panel, {
    title: "Recent Activity"
  }, /*#__PURE__*/React.createElement(EventRow, {
    time: "Today",
    message: "Meridian Forge audit completed",
    status: "Passed",
    statusTone: "running"
  }), /*#__PURE__*/React.createElement(EventRow, {
    time: "Tue",
    message: "Vantage Polymers risk escalated",
    status: "Flagged",
    statusTone: "fault"
  }), /*#__PURE__*/React.createElement(EventRow, {
    time: "Mon",
    message: "Apex Driveline contract renewed",
    status: "Signed",
    statusTone: "running"
  }), /*#__PURE__*/React.createElement(EventRow, {
    time: "Apr 2",
    message: "Nordic Stamping review due",
    status: "Pending",
    statusTone: "warning"
  })))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/components.jsx
try { (() => {
// STREFEX management-intelligence dashboard — light executive primitives (self-contained, token-styled).
const {
  useState: useStateD
} = React;
function Panel({
  title,
  action,
  accent,
  children,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderTop: accent ? `3px solid ${accent}` : "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
      padding: 20,
      ...style
    }
  }, (title || action) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: "0.11em",
      textTransform: "uppercase",
      color: "var(--navy-800)"
    }
  }, title), action), children);
}
const RISK = {
  low: ["#2F7A2C", "var(--signal-running-bg)"],
  medium: ["#9A6B12", "var(--signal-warning-bg)"],
  high: ["#A8362E", "var(--signal-fault-bg)"]
};
function RiskChip({
  level
}) {
  const c = RISK[level] || RISK.low;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: c[0],
      background: c[1],
      padding: "3px 9px",
      borderRadius: "var(--radius-pill)"
    }
  }, level, " Risk");
}
function Delta({
  v,
  invert
}) {
  const up = v >= 0;
  const good = invert ? !up : up;
  const color = good ? "var(--signal-running)" : "var(--signal-fault)";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 12,
      color
    }
  }, up ? "▲" : "▼", " ", Math.abs(v), typeof v === "number" && !Number.isInteger(v) ? "" : "", "%");
}
function Kpi({
  label,
  value,
  unit,
  delta,
  invert
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-hairline)",
      borderLeft: "3px solid var(--navy-800)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
      padding: "18px 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 32,
      color: "var(--navy-800)",
      lineHeight: 1
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      color: "var(--text-muted)"
    }
  }, unit && unit)), delta !== undefined && /*#__PURE__*/React.createElement(Delta, {
    v: delta,
    invert: invert
  })));
}
function ScoreBar({
  score
}) {
  const col = score >= 85 ? "var(--signal-running)" : score >= 70 ? "var(--signal-warning)" : "var(--signal-fault)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 6,
      background: "var(--steel-200)",
      borderRadius: "var(--radius-pill)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: score + "%",
      height: "100%",
      background: col,
      borderRadius: "var(--radius-pill)"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13,
      color: "var(--navy-800)",
      minWidth: 26,
      textAlign: "right"
    }
  }, score));
}
function AreaTrend({
  points,
  w = 640,
  h = 150
}) {
  const max = Math.max(...points) * 1.04,
    min = Math.min(...points) * 0.96;
  const pts = points.map((p, i) => [i / (points.length - 1) * w, h - (p - min) / (max - min || 1) * (h - 16) - 8]);
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    style: {
      width: "100%",
      height: "auto",
      display: "block"
    },
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "strefexArea",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(30,67,110,0.16)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(30,67,110,0)"
  }))), /*#__PURE__*/React.createElement("path", {
    d: `${line} L ${w} ${h} L 0 ${h} Z`,
    fill: "url(#strefexArea)"
  }), /*#__PURE__*/React.createElement("path", {
    d: line,
    fill: "none",
    stroke: "var(--navy-600)",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }), pts.filter((_, i) => i % 2 === 0).map((p, i) => /*#__PURE__*/React.createElement("circle", {
    key: i,
    cx: p[0],
    cy: p[1],
    r: "3",
    fill: "#fff",
    stroke: "var(--navy-600)",
    strokeWidth: "2"
  })));
}
function Initials({
  name
}) {
  const i = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: "var(--radius-sm)",
      background: "var(--navy-800)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: "0.04em",
      flex: "none"
    }
  }, i);
}
function EventRow({
  time,
  message,
  status,
  statusTone = "running"
}) {
  const c = {
    running: "var(--signal-running)",
    warning: "var(--signal-warning)",
    fault: "var(--signal-fault)",
    data: "var(--signal-data)"
  }[statusTone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 12,
      padding: "9px 0",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-muted)",
      minWidth: 56,
      flex: "none"
    }
  }, time), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-body)",
      flex: 1
    }
  }, message), status && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: c,
      flex: "none"
    }
  }, status));
}
Object.assign(window, {
  Panel,
  RiskChip,
  Delta,
  Kpi,
  ScoreBar,
  AreaTrend,
  Initials,
  EventRow
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/app.jsx
try { (() => {
// STREFEX marketing kit — CTA form section + page assembly.
const {
  useState: useStateA
} = React;
function CTASection() {
  const [sent, setSent] = useStateA(false);
  const [form, setForm] = useStateA({
    name: "",
    email: "",
    company: ""
  });
  const field = (label, key, type = "text", ph = "") => /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: type,
    value: form[key],
    placeholder: ph,
    onChange: e => setForm({
      ...form,
      [key]: e.target.value
    }),
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--text-strong)",
      padding: "12px 14px",
      border: "1px solid var(--border-strong)",
      borderRadius: "var(--radius-sm)",
      outline: "none",
      background: "#fff"
    }
  }));
  return /*#__PURE__*/React.createElement("section", {
    id: "strategy",
    style: {
      background: "var(--surface-page)",
      padding: "88px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 860,
      margin: "0 auto",
      background: "#fff",
      border: "1px solid var(--border-hairline)",
      borderTop: "3px solid var(--navy-800)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      padding: 48,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 44
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, "Get Started"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 400,
      fontSize: 36,
      color: "var(--navy-800)",
      letterSpacing: "-0.02em",
      margin: "16px 0 0"
    }
  }, "Request a Strategy Session"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      lineHeight: 1.6,
      color: "var(--text-body)",
      marginTop: 14
    }
  }, "A senior strategist reviews your supplier base and operations data, then walks you through where the leverage is. No obligation."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, ["Supplier risk & capability baseline", "Performance benchmark across one plant", "90-minute findings review"].map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--signal-running)"
    }
  }, /*#__PURE__*/React.createElement(IconCheck, {
    size: 18
  })), t)))), /*#__PURE__*/React.createElement("div", null, sent ? /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-start",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--signal-running)"
    }
  }, /*#__PURE__*/React.createElement(IconCheck, {
    size: 40
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 400,
      fontSize: 26,
      color: "var(--navy-800)",
      margin: 0
    }
  }, "Request received"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      color: "var(--text-body)",
      margin: 0
    }
  }, "A strategist will reach out within one business day", form.name ? `, ${form.name.split(" ")[0]}` : "", ".")) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, field("Full Name", "name", "text", "Jordan Avery"), field("Work Email", "email", "email", "you@company.com"), field("Company", "company", "text", "Acme Machining"), /*#__PURE__*/React.createElement(MButton, {
    kind: "primary",
    size: "lg",
    icon: true,
    onClick: () => setSent(true),
    style: {
      marginTop: 4,
      justifyContent: "center"
    }
  }, "Request Session")))));
}
function App() {
  const scrollToCTA = () => {
    const el = document.getElementById("strategy");
    if (el) window.scrollTo({
      top: el.offsetTop - 40,
      behavior: "smooth"
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement(Nav, {
    onCTA: scrollToCTA
  }), /*#__PURE__*/React.createElement(Hero, {
    onCTA: scrollToCTA
  }), /*#__PURE__*/React.createElement(Capabilities, null), /*#__PURE__*/React.createElement(ProofBand, null), /*#__PURE__*/React.createElement(CTASection, null), /*#__PURE__*/React.createElement(Footer, null));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/components.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// STREFEX marketing kit — shared primitives & icons (self-contained, token-styled).
const {
  useState
} = React;

// ---- Icons (Lucide-style, 1.75px stroke) ----
const icoProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24"
};
function Icon({
  d,
  size = 22,
  children,
  ...r
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size
  }, icoProps, r), d ? /*#__PURE__*/React.createElement("path", {
    d: d
  }) : children);
}
const IconShield = p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
}), /*#__PURE__*/React.createElement("path", {
  d: "m9 12 2 2 4-4"
}));
const IconGauge = p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
  d: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
}), /*#__PURE__*/React.createElement("path", {
  d: "M13.4 12.6 19 7"
}), /*#__PURE__*/React.createElement("path", {
  d: "M6.34 17.66A8 8 0 1 1 20 12"
}));
const IconRoute = p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("circle", {
  cx: "6",
  cy: "19",
  r: "3"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "18",
  cy: "5",
  r: "3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M9 19h6a3 3 0 0 0 3-3V8"
}));
const IconArrow = p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}), /*#__PURE__*/React.createElement("path", {
  d: "m12 5 7 7-7 7"
}));
const IconCheck = p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
  d: "M20 6 9 17l-5-5"
}));
const IconMenu = p => /*#__PURE__*/React.createElement(Icon, p, /*#__PURE__*/React.createElement("path", {
  d: "M3 6h18M3 12h18M3 18h18"
}));

// ---- Logo (uses transparent PNG wordmark) ----
function Logo({
  variant = "white",
  height = 26
}) {
  const src = variant === "white" ? "../../assets/logo-white.png" : "../../assets/logo-navy.png";
  return /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "STREFEX",
    style: {
      height,
      width: "auto",
      display: "block"
    }
  });
}

// ---- Button ----
function MButton({
  children,
  kind = "primary",
  size = "md",
  icon,
  onClick,
  style = {}
}) {
  const [h, setH] = useState(false);
  const sizes = {
    md: {
      padding: "12px 22px",
      fontSize: 15
    },
    lg: {
      padding: "15px 30px",
      fontSize: 16
    }
  };
  const kinds = {
    primary: {
      background: h ? "var(--navy-700)" : "var(--navy-800)",
      color: "#fff",
      border: "1px solid var(--navy-800)"
    },
    onnavy: {
      background: h ? "#fff" : "var(--steel-200)",
      color: "var(--navy-800)",
      border: "1px solid #fff"
    },
    outline: {
      background: h ? "rgba(255,255,255,.08)" : "transparent",
      color: "#fff",
      border: "1px solid rgba(255,255,255,.45)"
    },
    ghost: {
      background: h ? "var(--steel-200)" : "transparent",
      color: "var(--navy-800)",
      border: "1px solid transparent"
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 9,
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      transition: "background var(--duration-fast) var(--ease-standard)",
      ...sizes[size],
      ...kinds[kind],
      ...style
    }
  }, children, icon && /*#__PURE__*/React.createElement(IconArrow, {
    size: 18
  }));
}

// ---- Eyebrow ----
function Eyebrow({
  children,
  dark
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-block",
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: dark ? "var(--steel-400)" : "var(--navy-600)",
      borderLeft: `3px solid ${dark ? "var(--steel-500)" : "var(--navy-800)"}`,
      paddingLeft: 10
    }
  }, children);
}
Object.assign(window, {
  Logo,
  MButton,
  Eyebrow,
  Icon,
  IconShield,
  IconGauge,
  IconRoute,
  IconArrow,
  IconCheck,
  IconMenu
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/sections.jsx
try { (() => {
// STREFEX marketing kit — page sections.
const {
  useState: useStateS
} = React;
function Nav({
  onCTA
}) {
  const links = ["Capabilities", "Industries", "Insights", "About"];
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 30,
      background: "rgba(6,24,41,0.92)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid rgba(255,255,255,.08)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "0 32px",
      height: 72,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    variant: "white",
    height: 24
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 32
    }
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14.5,
      fontWeight: 500,
      color: "var(--text-on-dark-muted)",
      textDecoration: "none"
    }
  }, l)), /*#__PURE__*/React.createElement(MButton, {
    kind: "onnavy",
    size: "md",
    onClick: onCTA
  }, "Request Strategy Session"))));
}
function Hero({
  onCTA
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: "relative",
      background: "linear-gradient(160deg,#0A2540 0%,#061829 100%)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      color: "var(--navy-500)",
      opacity: 0.5,
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/circuit-traces.svg",
    alt: "",
    style: {
      position: "absolute",
      top: -20,
      right: -40,
      width: 720,
      filter: "brightness(1.6)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      padding: "96px 32px 104px",
      display: "grid",
      gridTemplateColumns: "1.15fr 0.85fr",
      gap: 56,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
    dark: true
  }, "Strategic Supplier Intelligence"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 400,
      fontSize: 64,
      lineHeight: 1.04,
      letterSpacing: "-0.02em",
      color: "#fff",
      margin: "22px 0 0"
    }
  }, "Supplier Intelligence", /*#__PURE__*/React.createElement("br", null), "Reimagined"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 18,
      lineHeight: 1.6,
      color: "var(--text-on-dark-muted)",
      maxWidth: 480,
      margin: "22px 0 0"
    }
  }, "STREFEX turns supplier, sourcing, and operations data into decisions \u2014 capability scoring, performance analytics, and the strategy work for automotive and machinery manufacturers."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement(MButton, {
    kind: "onnavy",
    size: "lg",
    icon: true,
    onClick: onCTA
  }, "Request Strategy Session"), /*#__PURE__*/React.createElement(MButton, {
    kind: "outline",
    size: "lg"
  }, "See the Platform"))), /*#__PURE__*/React.createElement(HeroPanel, null)));
}
function HeroPanel() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-panel)",
      border: "1px solid var(--border-on-dark)",
      borderTop: "2px solid var(--signal-running)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "0 24px 60px rgba(0,0,0,.4)",
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#fff"
    }
  }, "Supply Base \xB7 Q2"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#84D2E8"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: "var(--signal-data)"
    }
  }), "Live")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14
    }
  }, [["Risk Index", "87", "/100", "var(--signal-running)"], ["On-Time", "94", "%", "#fff"], ["Savings YTD", "$24", "M", "#fff"], ["Suppliers", "140", "", "#fff"]].map(([k, v, u, c]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      background: "var(--surface-field)",
      borderRadius: "var(--radius-sm)",
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--text-on-dark-muted)"
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 26,
      color: c,
      marginTop: 6
    }
  }, v, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-on-dark-muted)"
    }
  }, u && " " + u))))));
}
const CAPS = [{
  icon: IconShield,
  t: "Supplier Risk Scoring",
  d: "Capability, capacity, and financial risk scored across your full supplier base — see what they won't tell you."
}, {
  icon: IconGauge,
  t: "Manufacturing Performance",
  d: "On-time delivery, quality, and throughput tracked across every plant and supplier in your network."
}, {
  icon: IconRoute,
  t: "Strategic Sourcing",
  d: "Senior-strategist guidance that turns the data into negotiation leverage and resilient supply."
}];
function Capabilities() {
  const [hi, setHi] = useStateS(-1);
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--surface-page)",
      padding: "88px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "What We Do"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 400,
      fontSize: 42,
      color: "var(--navy-800)",
      letterSpacing: "-0.02em",
      margin: "18px 0 0"
    }
  }, "Intelligence across the supply chain"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 22,
      marginTop: 44
    }
  }, CAPS.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c.t,
    onMouseEnter: () => setHi(i),
    onMouseLeave: () => setHi(-1),
    style: {
      background: "#fff",
      border: "1px solid var(--border-hairline)",
      borderTop: "3px solid var(--navy-800)",
      borderRadius: "var(--radius-md)",
      padding: 28,
      boxShadow: hi === i ? "var(--shadow-md)" : "var(--shadow-sm)",
      transform: hi === i ? "translateY(-3px)" : "none",
      transition: "all var(--duration-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: "var(--radius-sm)",
      background: "var(--steel-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--navy-800)"
    }
  }, /*#__PURE__*/React.createElement(c.icon, {
    size: 24
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 400,
      fontSize: 24,
      color: "var(--navy-800)",
      margin: "20px 0 0"
    }
  }, c.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 15,
      lineHeight: 1.6,
      color: "var(--text-body)",
      margin: "12px 0 0"
    }
  }, c.d))))));
}
function ProofBand() {
  const stats = [["$24M", "Sourcing cost reduction, last 12 months"], ["140+", "Suppliers scored & continuously ranked"], ["94%", "On-time delivery across the network"], ["4×", "Faster supplier risk decisions"]];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--navy-800)",
      padding: "64px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 28
    }
  }, stats.map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: v,
    style: {
      borderLeft: "1px solid rgba(255,255,255,.14)",
      paddingLeft: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 42,
      color: "#fff",
      lineHeight: 1
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      lineHeight: 1.5,
      color: "var(--text-on-dark-muted)",
      marginTop: 12
    }
  }, l)))));
}
function Footer() {
  const cols = {
    Platform: ["Supplier Scoring", "Performance Analytics", "Reports"],
    Company: ["About", "Insights", "Careers"],
    Contact: ["Request Session", "Support", "j.locke@strefex.com"]
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "var(--navy-900)",
      padding: "56px 32px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    variant: "white",
    height: 24
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-serif)",
      fontStyle: "italic",
      fontSize: 15,
      color: "var(--text-on-dark-muted)",
      marginTop: 16
    }
  }, "Strategic Consultant \u2014 Automotive & Machinery Intelligence")), Object.entries(cols).map(([h, items]) => /*#__PURE__*/React.createElement("div", {
    key: h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--steel-400)"
    }
  }, h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      marginTop: 16
    }
  }, items.map(i => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: "#",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--text-on-dark-muted)",
      textDecoration: "none"
    }
  }, i)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--container-max)",
      margin: "40px auto 0",
      paddingTop: 24,
      borderTop: "1px solid rgba(255,255,255,.08)",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--text-on-dark-muted)"
    }
  }, "\xA9 2026 STREFEX \xB7 Supplier Intelligence Reimagined"));
}
Object.assign(window, {
  Nav,
  Hero,
  Capabilities,
  ProofBand,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform/app.jsx
try { (() => {
// STREFEX Platform kit — app shell + routing.
const {
  useState: useSApp
} = React;
const NAV = [{
  key: "suppliers",
  label: "Supplier Selection",
  icon: "network",
  badge: 140
}, {
  key: "projects",
  label: "Project Management",
  icon: "kanban",
  badge: 12
}, {
  key: "purchasing",
  label: "Purchasing Research",
  icon: "search",
  badge: 9
}, {
  key: "finance",
  label: "Financial Control",
  icon: "dollar"
}];
const SECONDARY = [{
  key: "audits",
  label: "Audits & Quality",
  icon: "shieldCheck"
}, {
  key: "engineering",
  label: "Engineering",
  icon: "cog"
}];
function Sidebar({
  active,
  onSelect
}) {
  const Item = it => {
    const on = it.key === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.key,
      onClick: () => onSelect(it.key),
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        border: "none",
        borderLeft: on ? "3px solid var(--steel-400)" : "3px solid transparent",
        background: on ? "var(--navy-700)" : "transparent",
        color: on ? "#fff" : "var(--text-on-dark-muted)",
        fontFamily: "var(--font-sans)",
        fontWeight: on ? 600 : 500,
        fontSize: 14.5,
        transition: "background var(--duration-fast)"
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.icon,
      size: 20,
      color: on ? "var(--steel-300)" : "var(--text-on-dark-muted)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, it.label), it.badge != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color: on ? "#fff" : "var(--text-on-dark-muted)",
        background: on ? "var(--navy-600)" : "rgba(255,255,255,0.06)",
        borderRadius: 999,
        padding: "1px 8px"
      }
    }, it.badge));
  };
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      width: 248,
      background: "var(--navy-900)",
      borderRight: "1px solid var(--border-on-dark)",
      display: "flex",
      flexDirection: "column",
      padding: "20px 14px",
      boxSizing: "border-box",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 10px 26px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.sidebarLogo || "../../assets/logo-white.png",
    alt: "STREFEX",
    style: {
      width: "100%",
      maxWidth: 172,
      height: "auto",
      display: "block"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 10.5,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--navy-400)",
      padding: "0 12px 8px"
    }
  }, "Platform"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3
    }
  }, NAV.map(Item)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 10.5,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--navy-400)",
      padding: "20px 12px 8px"
    }
  }, "Operations"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      flex: 1
    }
  }, SECONDARY.map(Item)), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 16,
      marginTop: 16,
      borderTop: "1px solid var(--border-on-dark)",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: "var(--radius-sm)",
      background: "var(--navy-600)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: 12
    }
  }, "JL"), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.3
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 13,
      color: "#fff"
    }
  }, "J. Locke"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 11.5,
      color: "var(--text-on-dark-muted)"
    }
  }, "Strategic Consultant"))));
}
function Topbar() {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      height: 64,
      background: "#fff",
      borderBottom: "1px solid var(--border-hairline)",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: 360,
      maxWidth: "40%",
      background: "var(--steel-100)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-sm)",
      padding: "9px 12px",
      color: "var(--text-faint)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 14
    }
  }, "Search suppliers, RFQs, projects\u2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 7,
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--signal-running)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 999,
      background: "var(--signal-running)"
    }
  }), "Automotive & Machinery"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 1,
      height: 24,
      background: "var(--border-hairline)"
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border-hairline)",
      background: "#fff",
      color: "var(--navy-700)",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 19
  })), /*#__PURE__*/React.createElement(Btn, {
    kind: "primary",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    })
  }, "New")));
}
const SCREENS = {
  suppliers: SupplierSelection,
  projects: ProjectManagement,
  purchasing: PurchasingResearch,
  finance: FinancialControl,
  audits: SupplierSelection,
  engineering: ProjectManagement
};
function App() {
  const [view, setView] = useSApp("suppliers");
  const Screen = SCREENS[view] || SupplierSelection;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      minHeight: "100vh",
      background: "var(--surface-page)"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: view,
    onSelect: setView
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Topbar, null), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      padding: "26px 28px",
      overflow: "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1180,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Screen, null)))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform/components.jsx
try { (() => {
// STREFEX Platform kit — shared primitives (self-contained; icons from registry global).
const {
  useState: useS
} = React;
function Icon({
  name,
  size = 22,
  stroke = 1.75,
  color = "currentColor",
  style = {}
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      flex: "none",
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: window.STREFEX_ICONS && window.STREFEX_ICONS[name] || ""
    }
  });
}
function Panel({
  title,
  action,
  children,
  pad = 20,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
      padding: pad,
      ...style
    }
  }, (title || action) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: 14,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--navy-800)"
    }
  }, title), action), children);
}
function Eyebrow({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-block",
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 12,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "var(--navy-600)",
      borderLeft: "3px solid var(--navy-800)",
      paddingLeft: 10
    }
  }, children);
}
function Btn({
  children,
  kind = "primary",
  size = "md",
  icon,
  onClick,
  style = {}
}) {
  const [h, setH] = useS(false);
  const sz = size === "sm" ? {
    padding: "7px 13px",
    fontSize: 13
  } : {
    padding: "10px 18px",
    fontSize: 14
  };
  const kinds = {
    primary: {
      background: h ? "var(--navy-700)" : "var(--navy-800)",
      color: "#fff",
      border: "1px solid var(--navy-800)"
    },
    secondary: {
      background: h ? "var(--steel-200)" : "#fff",
      color: "var(--navy-800)",
      border: "1px solid var(--border-strong)"
    },
    ghost: {
      background: h ? "var(--steel-200)" : "transparent",
      color: "var(--navy-700)",
      border: "1px solid transparent"
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      borderRadius: "var(--radius-md)",
      cursor: "pointer",
      transition: "background var(--duration-fast)",
      ...sz,
      ...kinds[kind],
      ...style
    }
  }, icon, children);
}
function StatCard({
  icon,
  label,
  value,
  unit,
  delta,
  invert,
  accent = "var(--navy-800)"
}) {
  const up = typeof delta === "number" && delta >= 0;
  const good = invert ? !up : up;
  const dc = good ? "var(--signal-running)" : "var(--signal-fault)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-hairline)",
      borderLeft: `3px solid ${accent}`,
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
      padding: "15px 17px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: "var(--radius-sm)",
      background: "var(--steel-100)",
      border: "1px solid var(--border-hairline)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--navy-700)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11.5,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 27,
      color: "var(--navy-800)",
      lineHeight: 1
    }
  }, value, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--text-muted)"
    }
  }, unit || "")), delta !== undefined && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 12,
      color: dc
    }
  }, up ? "▲" : "▼", " ", Math.abs(delta), "%")));
}
function ProgressBar({
  value = 0,
  label,
  tone,
  sub,
  target
}) {
  const pct = Math.max(0, Math.min(100, value));
  const auto = pct >= 80 ? "var(--signal-running)" : pct >= 50 ? "var(--signal-warning)" : "var(--signal-fault)";
  const colors = {
    navy: "var(--navy-600)",
    running: "var(--signal-running)",
    warning: "var(--signal-warning)",
    fault: "var(--signal-fault)"
  };
  const color = colors[tone] || auto;
  return /*#__PURE__*/React.createElement("div", null, (label || sub) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      fontWeight: 500,
      color: "var(--text-body)"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 12.5,
      color: "var(--navy-800)"
    }
  }, sub != null ? sub : pct + "%")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      height: 8,
      background: "var(--steel-200)",
      borderRadius: 999,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: pct + "%",
      height: "100%",
      background: color,
      borderRadius: 999
    }
  }), target != null && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: -2,
      bottom: -2,
      left: `calc(${target}% - 1px)`,
      width: 2,
      background: "var(--navy-800)"
    }
  })));
}
const RISK = {
  low: ["#2F7A2C", "var(--signal-running-bg)"],
  medium: ["#9A6B12", "var(--signal-warning-bg)"],
  high: ["#A8362E", "var(--signal-fault-bg)"]
};
function Chip({
  level,
  children
}) {
  const c = RISK[level] || ["var(--navy-700)", "var(--steel-200)"];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: c[0],
      background: c[1],
      padding: "3px 9px",
      borderRadius: 999
    }
  }, children || level + " risk");
}
function ScoreBar({
  score
}) {
  const col = score >= 85 ? "var(--signal-running)" : score >= 70 ? "var(--signal-warning)" : "var(--signal-fault)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 6,
      background: "var(--steel-200)",
      borderRadius: 999,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: score + "%",
      height: "100%",
      background: col,
      borderRadius: 999
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13,
      color: "var(--navy-800)",
      minWidth: 22,
      textAlign: "right"
    }
  }, score));
}
function Initials({
  name,
  tone = "var(--navy-800)"
}) {
  const i = name.split(" ").map(w => w[0]).slice(0, 2).join("");
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: "var(--radius-sm)",
      background: tone,
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-condensed)",
      fontWeight: 700,
      fontSize: 12,
      flex: "none"
    }
  }, i);
}
function Timeline({
  items
}) {
  const dc = {
    done: "var(--signal-running)",
    active: "var(--signal-data)",
    pending: "var(--steel-500)",
    late: "var(--signal-fault)",
    warning: "var(--signal-warning)"
  };
  return /*#__PURE__*/React.createElement("div", null, items.map((it, i) => {
    const last = i === items.length - 1;
    const color = dc[it.status] || dc.pending;
    const active = it.status === "active";
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 13
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 12,
        borderRadius: 999,
        background: active ? "#fff" : color,
        border: `2.5px solid ${color}`,
        marginTop: 3,
        boxShadow: active ? "0 0 0 3px rgba(58,166,201,0.18)" : "none"
      }
    }), !last && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 2,
        flex: 1,
        minHeight: 22,
        background: "var(--border-hairline)",
        marginTop: 2
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingBottom: last ? 0 : 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize: 14,
        color: "var(--navy-800)"
      }
    }, it.title), it.date && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: "var(--text-faint)"
      }
    }, it.date)), it.note && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-sans)",
        fontSize: 12.5,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, it.note)));
  }));
}
function Donut({
  segments,
  size = 132,
  thickness = 18,
  center
}) {
  let acc = 0;
  const stops = [];
  segments.forEach(s => {
    const from = acc;
    acc += s.value;
    stops.push(`${s.color} ${from}% ${acc}%`);
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      background: `conic-gradient(${stops.join(",")})`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: size - thickness * 2,
      height: size - thickness * 2,
      borderRadius: "50%",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }
  }, center));
}
function MiniBars({
  data,
  height = 120
}) {
  const max = Math.max(...data.map(d => d.value));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 14,
      height
    }
  }, data.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.label,
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      color: "var(--text-muted)"
    }
  }, d.cap), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 46,
      height: d.value / max * (height - 38),
      background: d.color || "var(--navy-600)",
      borderRadius: "var(--radius-xs)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      textAlign: "center"
    }
  }, d.label))));
}
function Th({
  children,
  align = "left"
}) {
  return /*#__PURE__*/React.createElement("th", {
    style: {
      textAlign: align,
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      padding: "0 0 11px",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, children);
}
Object.assign(window, {
  Icon,
  Panel,
  Eyebrow,
  Btn,
  StatCard,
  ProgressBar,
  Chip,
  ScoreBar,
  Initials,
  Timeline,
  Donut,
  MiniBars,
  Th
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform/screens.jsx
try { (() => {
// STREFEX Platform kit — the four pillar screens.

const SUPPLIERS = [{
  name: "Meridian Forge",
  cat: "Castings",
  region: "DE",
  score: 94,
  risk: "low",
  onTime: 99,
  spend: "$8.4M",
  audit: "Passed"
}, {
  name: "Apex Driveline",
  cat: "Powertrain",
  region: "US",
  score: 88,
  risk: "low",
  onTime: 97,
  spend: "$12.1M",
  audit: "Passed"
}, {
  name: "Kessler Precision",
  cat: "Machining",
  region: "CZ",
  score: 81,
  risk: "medium",
  onTime: 92,
  spend: "$5.7M",
  audit: "Due"
}, {
  name: "Nordic Stamping",
  cat: "Stamping",
  region: "SE",
  score: 76,
  risk: "medium",
  onTime: 89,
  spend: "$4.2M",
  audit: "Due"
}, {
  name: "Vantage Polymers",
  cat: "Plastics",
  region: "PL",
  score: 63,
  risk: "high",
  onTime: 81,
  spend: "$3.0M",
  audit: "Flagged"
}];
function ScreenHeader({
  eyebrow,
  title,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, null, eyebrow), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: 400,
      fontSize: 32,
      color: "var(--navy-800)",
      letterSpacing: "-0.02em",
      margin: "12px 0 0"
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, children));
}
const auditColor = {
  Passed: "var(--signal-running)",
  Due: "var(--signal-warning)",
  Flagged: "var(--signal-fault)"
};
function SupplierSelection() {
  const [cat, setCat] = useS("All");
  const cats = ["All", "Castings", "Powertrain", "Machining"];
  const rows = SUPPLIERS.filter(s => cat === "All" || s.cat === cat);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ScreenHeader, {
    eyebrow: "Supplier Selection",
    title: "Source & Qualify Suppliers"
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "filter",
      size: 17
    })
  }, "Filters"), /*#__PURE__*/React.createElement(Btn, {
    kind: "primary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    })
  }, "Source Supplier")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "network",
    label: "Qualified Suppliers",
    value: "140",
    delta: 3
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "gauge",
    label: "Avg Capability",
    value: "87",
    unit: "/100",
    delta: 4
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "globe",
    label: "Active Regions",
    value: "18"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "clock",
    label: "Avg Lead Time",
    value: "34",
    unit: "d",
    delta: -2,
    invert: true,
    accent: "var(--signal-running)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.85fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Supplier Comparison",
    action: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "inline-flex",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden"
      }
    }, cats.map(c => /*#__PURE__*/React.createElement("button", {
      key: c,
      onClick: () => setCat(c),
      style: {
        fontFamily: "var(--font-condensed)",
        fontWeight: 600,
        fontSize: 11.5,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        padding: "6px 11px",
        border: "none",
        cursor: "pointer",
        background: cat === c ? "var(--navy-800)" : "#fff",
        color: cat === c ? "#fff" : "var(--text-muted)"
      }
    }, c)))
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(Th, null, "Supplier"), /*#__PURE__*/React.createElement(Th, null, "Region"), /*#__PURE__*/React.createElement(Th, null, "Capability"), /*#__PURE__*/React.createElement(Th, null, "Risk"), /*#__PURE__*/React.createElement(Th, {
    align: "right"
  }, "On-Time"), /*#__PURE__*/React.createElement(Th, {
    align: "right"
  }, "Spend"), /*#__PURE__*/React.createElement(Th, {
    align: "right"
  }, "Audit"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(s => /*#__PURE__*/React.createElement("tr", {
    key: s.name
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 0",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Initials, {
    name: s.name
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14,
      color: "var(--navy-800)",
      display: "block"
    }
  }, s.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-faint)"
    }
  }, s.cat)))), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-body)"
    }
  }, s.region), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      width: 130
    }
  }, /*#__PURE__*/React.createElement(ScoreBar, {
    score: s.score
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    level: s.risk
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      textAlign: "right",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-body)"
    }
  }, s.onTime, "%"), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      textAlign: "right",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--navy-800)",
      fontWeight: 500
    }
  }, s.spend), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      textAlign: "right",
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: auditColor[s.audit]
    }
  }, s.audit)))))), /*#__PURE__*/React.createElement(Panel, {
    title: "Sourcing Pipeline"
  }, /*#__PURE__*/React.createElement(Timeline, {
    items: [{
      title: "RFI issued — 14 suppliers",
      date: "Mar 1",
      status: "done"
    }, {
      title: "Capability scoring",
      date: "Mar 20",
      status: "done"
    }, {
      title: "On-site audits",
      date: "Apr 18",
      status: "active",
      note: "3 of 5 complete."
    }, {
      title: "Award & onboarding",
      date: "Jun 2",
      status: "pending"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      paddingTop: 16,
      borderTop: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      marginBottom: 8
    }
  }, "Recommended"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Initials, {
    name: "Meridian Forge",
    tone: "var(--signal-running)"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14,
      color: "var(--navy-800)"
    }
  }, "Meridian Forge"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-muted)"
    }
  }, "Score 94 \xB7 low risk \xB7 DE")))))));
}
const PROJECTS = [{
  name: "Turnkey Line B — Powertrain",
  client: "Internal · Plant 2",
  progress: 72,
  status: "active",
  due: "Jun 2",
  risk: "low"
}, {
  name: "Stamping Cell Retrofit",
  client: "Nordic Stamping",
  progress: 45,
  status: "active",
  due: "Jul 18",
  risk: "medium"
}, {
  name: "CNC Capacity Expansion",
  client: "Kessler Precision",
  progress: 88,
  status: "active",
  due: "May 30",
  risk: "low"
}, {
  name: "Polymer Line Audit & Fix",
  client: "Vantage Polymers",
  progress: 22,
  status: "late",
  due: "Apr 28",
  risk: "high"
}];
function ProjectManagement() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ScreenHeader, {
    eyebrow: "Project Management",
    title: "Turnkey Projects & Engineering"
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "calendar",
      size: 17
    })
  }, "Schedule"), /*#__PURE__*/React.createElement(Btn, {
    kind: "primary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    })
  }, "New Project")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "kanban",
    label: "Active Projects",
    value: "12"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "task",
    label: "On-Time",
    value: "94",
    unit: "%",
    delta: 2
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "dollar",
    label: "Budget Used",
    value: "64",
    unit: "%"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "alert",
    label: "Open Risks",
    value: "7",
    delta: -3,
    invert: true,
    accent: "var(--signal-fault)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.85fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Project Portfolio"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, PROJECTS.map(p => /*#__PURE__*/React.createElement("div", {
    key: p.name,
    style: {
      border: "1px solid var(--border-hairline)",
      borderLeft: `3px solid ${p.status === "late" ? "var(--signal-fault)" : "var(--navy-800)"}`,
      borderRadius: "var(--radius-md)",
      padding: "14px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 15,
      color: "var(--navy-800)"
    }
  }, p.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12.5,
      color: "var(--text-muted)",
      marginTop: 2
    }
  }, p.client)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Chip, {
    level: p.risk
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--font-mono)",
      fontSize: 12.5,
      color: p.status === "late" ? "var(--signal-fault)" : "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clock",
    size: 14
  }), p.due))), /*#__PURE__*/React.createElement(ProgressBar, {
    value: p.progress,
    tone: p.status === "late" ? "fault" : undefined,
    sub: p.progress + "%",
    label: "Completion"
  }))))), /*#__PURE__*/React.createElement(Panel, {
    title: "Line B \u2014 Milestones"
  }, /*#__PURE__*/React.createElement(Timeline, {
    items: [{
      title: "Engineering & layout",
      date: "Feb 10",
      status: "done"
    }, {
      title: "Equipment procurement",
      date: "Mar 22",
      status: "done"
    }, {
      title: "Installation",
      date: "Apr 30",
      status: "active",
      note: "Robotics cell in progress."
    }, {
      title: "Commissioning & SAT",
      date: "May 24",
      status: "pending"
    }, {
      title: "Handover",
      date: "Jun 2",
      status: "pending"
    }]
  }))));
}
const RFQS = [{
  item: "Aluminum Knuckle Casting",
  cat: "Castings",
  bids: 5,
  best: "$18.40",
  target: "$19.00",
  status: "Open"
}, {
  item: "Gear Set — Helical",
  cat: "Powertrain",
  bids: 4,
  best: "$42.10",
  target: "$40.00",
  status: "Review"
}, {
  item: "Stamped Bracket Assy",
  cat: "Stamping",
  bids: 6,
  best: "$6.85",
  target: "$7.20",
  status: "Awarded"
}, {
  item: "Injection Housing",
  cat: "Plastics",
  bids: 3,
  best: "$11.90",
  target: "$11.00",
  status: "Open"
}];
const rfqColor = {
  Open: "var(--signal-data)",
  Review: "var(--signal-warning)",
  Awarded: "var(--signal-running)"
};
function PurchasingResearch() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ScreenHeader, {
    eyebrow: "Purchasing Research",
    title: "RFQs & Market Intelligence"
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "download",
      size: 17
    })
  }, "Export"), /*#__PURE__*/React.createElement(Btn, {
    kind: "primary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 17
    })
  }, "New RFQ")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "search",
    label: "Open RFQs",
    value: "9"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "wallet",
    label: "Spend YTD",
    value: "$48",
    unit: "M"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "trendUp",
    label: "Realized Savings",
    value: "$24",
    unit: "M",
    delta: 11,
    accent: "var(--signal-running)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "percent",
    label: "Price Index",
    value: "102",
    delta: -1,
    invert: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.85fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Active RFQs"
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement(Th, null, "Item"), /*#__PURE__*/React.createElement(Th, {
    align: "center"
  }, "Bids"), /*#__PURE__*/React.createElement(Th, {
    align: "right"
  }, "Best Quote"), /*#__PURE__*/React.createElement(Th, {
    align: "right"
  }, "Target"), /*#__PURE__*/React.createElement(Th, {
    align: "right"
  }, "Status"))), /*#__PURE__*/React.createElement("tbody", null, RFQS.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.item
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "13px 0",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 14,
      color: "var(--navy-800)",
      display: "block"
    }
  }, r.item), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      color: "var(--text-faint)"
    }
  }, r.cat)), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      textAlign: "center",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-body)"
    }
  }, r.bids), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      textAlign: "right",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      fontWeight: 600,
      color: "var(--navy-800)"
    }
  }, r.best), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      textAlign: "right",
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, r.target), /*#__PURE__*/React.createElement("td", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      textAlign: "right",
      fontFamily: "var(--font-condensed)",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: rfqColor[r.status]
    }
  }, r.status)))))), /*#__PURE__*/React.createElement(Panel, {
    title: "Spend by Category"
  }, /*#__PURE__*/React.createElement(MiniBars, {
    data: [{
      label: "Cast",
      cap: "$14M",
      value: 14,
      color: "var(--navy-700)"
    }, {
      label: "Power",
      cap: "$18M",
      value: 18,
      color: "var(--navy-600)"
    }, {
      label: "Stamp",
      cap: "$9M",
      value: 9,
      color: "var(--navy-500)"
    }, {
      label: "Plas",
      cap: "$7M",
      value: 7,
      color: "var(--steel-500)"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      paddingTop: 14,
      borderTop: "1px solid var(--border-hairline)",
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      lineHeight: 1.5,
      color: "var(--text-muted)"
    }
  }, "Powertrain is ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--navy-800)"
    }
  }, "38%"), " of spend \u2014 consolidate to 2 strategic suppliers for ~", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--signal-running)"
    }
  }, "$2.1M"), " savings."))));
}
function FinancialControl() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ScreenHeader, {
    eyebrow: "Financial Control",
    title: "Budgets, Costs & Approvals"
  }, /*#__PURE__*/React.createElement(Btn, {
    kind: "secondary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "download",
      size: 17
    })
  }, "Export Brief"), /*#__PURE__*/React.createElement(Btn, {
    kind: "primary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 17
    })
  }, "Approve Queue")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 14,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "wallet",
    label: "Annual Budget",
    value: "$62",
    unit: "M"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "coins",
    label: "Committed",
    value: "$41",
    unit: "M"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "trendUp",
    label: "Savings",
    value: "$24",
    unit: "M",
    delta: 11,
    accent: "var(--signal-running)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "scale",
    label: "Variance",
    value: "-3",
    unit: "%",
    delta: -3,
    invert: true,
    accent: "var(--signal-running)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.85fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Budget vs. Actual"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Castings",
    value: 72,
    target: 80,
    tone: "navy",
    sub: "$10.1M / $14M"
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Powertrain",
    value: 91,
    target: 85,
    tone: "warning",
    sub: "$16.4M / $18M"
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Stamping",
    value: 58,
    target: 70,
    tone: "navy",
    sub: "$5.2M / $9M"
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Plastics",
    value: 44,
    target: 60,
    tone: "navy",
    sub: "$3.1M / $7M"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      paddingTop: 14,
      borderTop: "1px solid var(--border-hairline)",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "var(--font-sans)",
      fontSize: 13,
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "alert",
    size: 15,
    color: "var(--signal-warning)"
  }), " Powertrain is tracking ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--navy-800)"
    }
  }, "6% over plan"), " \u2014 review committed POs.")), /*#__PURE__*/React.createElement(Panel, {
    title: "Cost Breakdown"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Donut, {
    segments: [{
      value: 30,
      color: "var(--navy-700)"
    }, {
      value: 38,
      color: "var(--navy-500)"
    }, {
      value: 18,
      color: "var(--steel-500)"
    }, {
      value: 14,
      color: "var(--steel-400)"
    }],
    center: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: 22,
        color: "var(--navy-800)"
      }
    }, "$41M"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-condensed)",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--text-faint)"
      }
    }, "Committed"))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, [["Castings", "30%", "var(--navy-700)"], ["Powertrain", "38%", "var(--navy-500)"], ["Stamping", "18%", "var(--steel-500)"], ["Plastics", "14%", "var(--steel-400)"]].map(([l, v, c]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "var(--font-sans)",
      fontSize: 13.5,
      color: "var(--text-body)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: c
    }
  }), l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13,
      color: "var(--navy-800)"
    }
  }, v))))))));
}
Object.assign(window, {
  SupplierSelection,
  ProjectManagement,
  PurchasingResearch,
  FinancialControl
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform/screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.EyebrowLabel = __ds_scope.EyebrowLabel;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.StatusChip = __ds_scope.StatusChip;

__ds_ns.AlarmRow = __ds_scope.AlarmRow;

__ds_ns.GaugeMeter = __ds_scope.GaugeMeter;

__ds_ns.Metric = __ds_scope.Metric;

__ds_ns.PanelTile = __ds_scope.PanelTile;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICONS = __ds_scope.ICONS;

__ds_ns.ICON_GROUPS = __ds_scope.ICON_GROUPS;

__ds_ns.SidebarNav = __ds_scope.SidebarNav;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Timeline = __ds_scope.Timeline;

})();
