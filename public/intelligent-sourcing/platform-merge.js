/* Merge platform payload into SOURCING_DATA (runs after mock dataset). */
(function () {
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

  try {
    apply(window.__STREFEX_PLATFORM_SOURCING__);
  } catch (e) { /* keep mock data */ }

  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.source !== 'strefex-platform') return;
    if (d.action === 'apply-platform') apply(d.payload);
    if (d.action === 'set-theme') applyTheme(d.theme);
  });

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: 'strefex-intelligent-sourcing', action: 'ready' }, '*');
    }
  } catch (e) { /* */ }
})();
