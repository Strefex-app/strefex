/* Merge platform payload into SOURCING_DATA (runs after mock dataset).
 * When embedded in the STREFEX shell (?embed=1 or iframe), hide the design's
 * own sidebar so AppLayout is the only main menu, and wire night theme. */
(function () {
  var FONT = "'Quattrocento Sans', Candara, Calibri, 'Segoe UI', Roboto, Arial, sans-serif";

  function isEmbed() {
    try {
      if (/\bembed=1\b/.test(String(location.search || ''))) return true;
      if (window.parent && window.parent !== window) return true;
    } catch (e) { /* cross-origin */ }
    return false;
  }

  function queryTheme() {
    try {
      return new URLSearchParams(location.search || '').get('theme') === 'dark' ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function ensureStylesheet(id, href) {
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    (document.head || document.documentElement).appendChild(link);
  }

  function ensureScript(id, src) {
    if (document.getElementById(id)) return;
    var s = document.createElement('script');
    s.id = id;
    s.src = src;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensureEmbedShell() {
    if (!isEmbed()) return;
    if (!document.getElementById('strefex-embed-shell')) {
      var style = document.createElement('style');
      style.id = 'strefex-embed-shell';
      style.textContent = [
        'aside { display: none !important; width: 0 !important; min-width: 0 !important; padding: 0 !important; overflow: hidden !important; }',
        'button[aria-label="Menu"] { display: none !important; }',
        /* Match AppLayout .sidebar-brand (--stx-chrome-top-h: 77px) so header rule lines up with nav rule */
        'main > header { box-sizing: border-box !important; height: 77px !important; min-height: 77px !important; max-height: 77px !important; padding-top: 0 !important; padding-bottom: 0 !important; padding-left: 24px !important; padding-right: 24px !important; align-items: center !important; flex-wrap: nowrap !important; }',
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
    ensureScript('strefex-embed-theme-js', '/intelligent-sourcing/embed-theme.js');
    try {
      document.documentElement.setAttribute('data-strefex-embed', '1');
    } catch (e) { /* */ }
  }

  function apply(plat) {
    try {
      if (!plat) return;
      window.__STREFEX_PLATFORM_SOURCING__ = plat;
      if (window.__STREFEX_SOURCING_BRIDGE__ && typeof window.__STREFEX_SOURCING_BRIDGE__.applyPlatform === 'function') {
        window.__STREFEX_SOURCING_BRIDGE__.applyPlatform(plat);
      }
    } catch (e) { /* keep mock data */ }
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

  ensureEmbedShell();
  applyTheme(queryTheme());
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureEmbedShell();
      applyTheme(queryTheme());
    });
  }

  try {
    apply(window.__STREFEX_PLATFORM_SOURCING__);
  } catch (e) { /* keep mock data */ }

  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.source !== 'strefex-platform') return;
    ensureEmbedShell();
    if (d.action === 'apply-platform') apply(d.payload);
    if (d.action === 'set-theme') applyTheme(d.theme);
  });

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'strefex-intelligent-sourcing', action: 'ready' }, '*');
    }
  } catch (e) { /* */ }
})();
