/* Merge platform payload into SOURCING_DATA (runs after mock dataset).
 * When embedded in the STREFEX shell (?embed=1 or iframe), hide the design's
 * own sidebar so AppLayout is the only main menu, and wire night theme.
 * Seller lists always come from the platform registry — never canvas demo seed.
 *
 * iPhone Safari (browser and PWA) often drops large structured-clone postMessage
 * objects; the parent therefore sends payloadJson strings in small chunks. */
(function () {
  var FONT = "'Quattrocento Sans', Candara, Calibri, 'Segoe UI', Roboto, Arial, sans-serif";
  var stored = { suppliers: [], buyers: [], rfqs: [], registeredIndustryIds: [] };

  function isEmbed() {
    try {
      if (/\bembed=1\b/.test(String(location.search || ''))) return true;
      if (window.parent && window.parent !== window) return true;
    } catch (e) { /* cross-origin */ }
    return false;
  }

  function ensureStylesheet(id, href) {
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  }

  function markNarrowFromShell() {
    try {
      var w = window.strefexShellWidth ? window.strefexShellWidth() : window.innerWidth;
      document.documentElement.setAttribute('data-stx-narrow', w < 720 ? '1' : '0');
    } catch (e) { /* */ }
  }

  function ensureEmbedShell() {
    if (!isEmbed()) return;
    if (!document.getElementById('strefex-embed-shell')) {
      var style = document.createElement('style');
      style.id = 'strefex-embed-shell';
      style.textContent = [
        'aside { display: none !important; width: 0 !important; min-width: 0 !important; padding: 0 !important; overflow: hidden !important; }',
        'button[aria-label="Menu"] { display: none !important; }',
        'main > header { box-sizing: border-box !important; min-height: 56px !important; height: auto !important; max-height: none !important; padding: 10px 16px !important; align-items: center !important; flex-wrap: wrap !important; gap: 8px 12px !important; }',
        '@media (min-width: 901px) { main > header { height: 77px !important; min-height: 77px !important; max-height: 77px !important; padding: 0 24px !important; flex-wrap: nowrap !important; } }',
        '@media (max-width: 640px) { main > header { padding: 8px 12px !important; } }',
        'html:not([data-stx-narrow="1"]) [data-stx-supplier-cards] { display: none !important; }',
        'html[data-stx-narrow="1"] [data-stx-supplier-cards][data-stx-filled="1"] { display: flex !important; flex-direction: column; gap: 10px; }',
        'html[data-stx-narrow="1"] [data-stx-supplier-table] { overflow-x: auto !important; max-width: 100%; }',
        '.stx-summary-head, .stx-listed-head, .stx-empty-state { min-width: 0; }',
        '@media (max-width: 640px) { .stx-summary-head, .stx-listed-head, .stx-empty-state { flex-direction: column !important; align-items: stretch !important; } .stx-empty-state > [style*="width:320px"] { width: 100% !important; } .stx-summary-head > [style*="margin-left:auto"] { margin-left: 0 !important; flex-wrap: wrap !important; } }',
        '@media (max-width: 900px) {',
        '  .stx-page-head { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }',
        '  .stx-page-head__title, .stx-page-head__tools { flex: 1 1 auto !important; width: 100% !important; max-width: 100% !important; min-width: 0 !important; }',
        '  .stx-page-head__tools { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; }',
        '  .stx-page-head h1 { font-size: clamp(20px, 6vw, 28px) !important; line-height: 1.2 !important; max-width: 100% !important; overflow-wrap: normal !important; word-break: normal !important; }',
        '  .stx-page-head p { font-size: 13px !important; max-width: none !important; }',
        '  .stx-page-head__tools input, .stx-page-head__tools input[style*="width:250px"] { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }',
        '  .stx-kpi-strip--4, .stx-kpi-strip--5 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }',
        '}',
        'html, body { max-width: 100%; width: 100%; overflow-x: clip; }',
        ':root {',
        '  --font-serif: ' + FONT + ' !important;',
        '  --font-serif-text: ' + FONT + ' !important;',
        '  --font-sans: ' + FONT + ' !important;',
        '  --font-condensed: ' + FONT + ' !important;',
        '  --font-mono: ' + FONT + ' !important;',
        '  --eyebrow-family: ' + FONT + ' !important;',
        '}',
        'html, body, button, input, select, textarea { font-family: ' + FONT + ' !important; }',
      ].join('\n');
      (document.head || document.documentElement).appendChild(style);
    }
    ensureStylesheet('strefex-embed-night-css', '/intelligent-sourcing/embed-night.css');
    try {
      document.documentElement.setAttribute('data-strefex-embed', '1');
    } catch (e) { /* */ }
    markNarrowFromShell();
  }

  function listed(s) {
    return s && (s.source === 'registered' || s.platformId);
  }

  function mergeStored(plat) {
    if (!plat || typeof plat !== 'object') return stored;
    if (plat.appendSuppliers && Array.isArray(plat.suppliers) && plat.suppliers.length > 0) {
      var have = {};
      stored.suppliers.forEach(function (s) {
        have[String((s && (s.platformId || s.name)) || '')] = true;
      });
      plat.suppliers.filter(listed).forEach(function (s) {
        var k = String((s && (s.platformId || s.name)) || '');
        if (!k || have[k]) return;
        have[k] = true;
        stored.suppliers.push(s);
      });
    } else if (Array.isArray(plat.suppliers) && plat.suppliers.length > 0) {
      stored.suppliers = plat.suppliers.filter(listed);
    }
    if (Array.isArray(plat.buyers) && plat.buyers.length > 0) stored.buyers = plat.buyers.slice();
    if (Array.isArray(plat.rfqs)) stored.rfqs = plat.rfqs.slice();
    if (Array.isArray(plat.registeredIndustryIds)) {
      stored.registeredIndustryIds = plat.registeredIndustryIds.slice();
    }
    if (plat.userInitials) stored.userInitials = plat.userInitials;
    if (plat.taxonomy) stored.taxonomy = plat.taxonomy;
    window.__STREFEX_PLATFORM_SOURCING__ = stored;
    return stored;
  }

  function clearNonRegisteredSuppliers() {
    try {
      window.__STREFEX_ALLOW_DEMO_SEED__ = false;
      window.__STREFEX_SOURCING_DEMO_SEED__ = null;
      if (!window.SOURCING_DATA) return;
      var list = window.SOURCING_DATA.SUPPLIERS;
      if (!Array.isArray(list)) {
        window.SOURCING_DATA.SUPPLIERS = [];
        return;
      }
      window.SOURCING_DATA.SUPPLIERS = list.filter(listed);
    } catch (e) { /* */ }
  }

  function decodePayload(d) {
    if (!d) return null;
    if (typeof d.payloadJson === 'string' && d.payloadJson) {
      try { return JSON.parse(d.payloadJson); } catch (e) { return null; }
    }
    return d.payload || null;
  }

  function apply(plat) {
    try {
      if (!plat) return;
      var merged = mergeStored(plat);
      if (window.__STREFEX_SOURCING_BRIDGE__ && typeof window.__STREFEX_SOURCING_BRIDGE__.applyPlatform === 'function') {
        window.__STREFEX_SOURCING_BRIDGE__.applyPlatform(plat);
      } else if (window.SOURCING_DATA && Array.isArray(merged.suppliers) && merged.suppliers.length > 0) {
        window.SOURCING_DATA.SUPPLIERS = merged.suppliers.slice();
        clearNonRegisteredSuppliers();
      }
      if (window.SOURCING_DATA && Array.isArray(merged.buyers) && merged.buyers.length > 0) {
        window.SOURCING_DATA.BUYERS = merged.buyers.slice();
      }
    } catch (e) { /* */ }
  }

  function applyTheme(theme) {
    try {
      if (typeof window.__STREFEX_APPLY_SOURCING_THEME__ === 'function') {
        window.__STREFEX_APPLY_SOURCING_THEME__(theme);
        return;
      }
      document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    } catch (e) { /* */ }
  }

  function flushStored() {
    if (!stored.suppliers.length) return;
    apply({
      suppliers: stored.suppliers.slice(),
      buyers: stored.buyers,
      rfqs: stored.rfqs,
      registeredIndustryIds: stored.registeredIndustryIds,
      userInitials: stored.userInitials,
      taxonomy: stored.taxonomy,
    });
  }

  ensureEmbedShell();
  clearNonRegisteredSuppliers();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureEmbedShell();
      clearNonRegisteredSuppliers();
      flushStored();
    });
  }

  try {
    apply(window.__STREFEX_PLATFORM_SOURCING__);
  } catch (e) { /* */ }

  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.source !== 'strefex-platform') return;
    ensureEmbedShell();
    if (d.action === 'apply-platform') apply(decodePayload(d));
    if (d.action === 'set-theme') applyTheme(d.theme);
    if (d.action === 'set-viewport') {
      var w = Number(d.width || 0);
      if (w > 20) {
        window.__STREFEX_SHELL_WIDTH__ = w;
        markNarrowFromShell();
        try {
          if (window.__STREFEX_SOURCING_APP__ && typeof window.__STREFEX_SOURCING_APP__.setState === 'function') {
            window.__STREFEX_SOURCING_APP__.setState({ vw: w });
          }
        } catch (err) { /* */ }
      }
    }
  });

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'strefex-intelligent-sourcing', action: 'ready' }, '*');
    }
  } catch (e) { /* */ }

  window.__STREFEX_FLUSH_PLATFORM_SOURCING__ = flushStored;
})();
