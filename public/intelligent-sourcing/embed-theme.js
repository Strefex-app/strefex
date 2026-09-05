/* Recolor sourcing maps/chips when platform theme changes (embed + postMessage). */
(function () {
  var DAY = {
    ocean: '#EEF0F2', land: '#DCE1E6', landStroke: '#F6F7F8',
    plant: '#0A2540', plantStroke: '#fff', plantLabel: '#0A2540',
    lane: '#0A2540', laneFaint: '#7A8794', tip: '#0A2540', tipText: '#ffffff',
    tipMuted: '#9DB1C8', tipStroke: '#C9D0D6', chip: '#ffffff', chipText: '#0A2540'
  };
  var NIGHT = {
    ocean: '#08090b', land: '#2f3644', landStroke: '#1c212b',
    plant: '#00d4ff', plantStroke: '#08090b', plantLabel: '#e8eaf2',
    lane: '#00d4ff', laneFaint: '#4b5563', tip: '#1a1d24', tipText: '#e8eaf2',
    tipMuted: '#9db1c8', tipStroke: 'rgba(255,255,255,0.18)', chip: '#1a1d24', chipText: '#e8eaf2',
    graticule: 'rgba(0,0,0,0.55)'
  };

  function palette() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? NIGHT : DAY;
  }

  function recolor(root) {
    var t = palette();
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var scope = root || document;
    scope.querySelectorAll('svg').forEach(function (svg) {
      var label = (svg.getAttribute('aria-label') || '').toLowerCase();
      if (label.indexOf('supplier') === -1 && label.indexOf('location') === -1) {
        var bg = svg.style && svg.style.background;
        if (!bg || (bg.indexOf('EEF0F2') === -1 && bg.indexOf('eef0f2') === -1 && bg.indexOf('0d0e10') === -1 && bg.indexOf('08090b') === -1)) return;
      }
      svg.style.background = t.ocean;
      svg.querySelectorAll('path').forEach(function (p) {
        var fill = (p.getAttribute('fill') || '').toUpperCase();
        var stroke = (p.getAttribute('stroke') || '').toUpperCase();
        var sw = Number(p.getAttribute('stroke-width') || 0);
        if (fill === '#EEF0F2' || fill === '#0D0E10' || fill === '#08090B') p.setAttribute('fill', t.ocean);
        if (fill === '#DCE1E6' || fill === '#1A1D24' || fill === '#2F3644') p.setAttribute('fill', t.land);
        if (stroke === '#F6F7F8' || stroke === '#13151A' || stroke === '#1C212B') p.setAttribute('stroke', t.landStroke);
        if (stroke === '#0A2540' || stroke === '#00D4FF') p.setAttribute('stroke', t.lane);
        if (stroke === '#7A8794' || stroke === '#6B7280' || stroke === '#4B5563') p.setAttribute('stroke', t.laneFaint);
        if (stroke === '#DDE1E4' || stroke === 'RGBA(0,0,0,0.55)' || stroke === 'RGBA(232, 234, 242, 0.06)') {
          p.setAttribute('stroke', t.graticule || 'rgba(0,0,0,0.55)');
          p.setAttribute('stroke-width', '0.95');
        }
        if ((!fill || fill === 'NONE' || fill === 'TRANSPARENT') && sw > 0 && sw < 1.2) {
          p.setAttribute('stroke', t.graticule || 'rgba(0,0,0,0.55)');
          p.setAttribute('stroke-width', '0.95');
        }
      });
      svg.querySelectorAll('rect').forEach(function (r) {
        var fill = (r.getAttribute('fill') || '').toUpperCase();
        var stroke = (r.getAttribute('stroke') || '').toUpperCase();
        var w = Number(r.getAttribute('width') || 0);
        var h = Number(r.getAttribute('height') || 0);
        var isPlant = w > 0 && w <= 16 && h <= 16;
        var isDayChip = w >= 40 || h >= 18 || fill === '#FFF' || fill === '#FFFFFF';
        if (isPlant) {
          r.setAttribute('fill', t.plant);
          r.setAttribute('stroke', t.plantStroke);
          return;
        }
        if (isDayChip || fill === '#0A2540' || fill === '#1A1D24' || fill === '#00D4FF') {
          r.setAttribute('fill', dark ? t.chip : (fill === '#FFF' || fill === '#FFFFFF' ? t.chip : t.tip));
          if (stroke === '#C9D0D6' || stroke === '#FFF' || stroke === '#FFFFFF' || stroke === 'RGBA(255,255,255,0.18)' || dark) {
            r.setAttribute('stroke', t.tipStroke);
          }
        }
      });
      svg.querySelectorAll('text').forEach(function (tx) {
        var fill = (tx.getAttribute('fill') || '').toUpperCase();
        var content = (tx.textContent || '').trim();
        var lower = content.toLowerCase();
        var isTransitLabel = /[0-9]/.test(content)
          || lower.indexOf('eta') !== -1
          || lower.indexOf('make') !== -1
          || lower.indexOf('total') !== -1
          || lower.indexOf(' d') !== -1;
        if (fill === '#9DB1C8') {
          tx.setAttribute('fill', t.tipMuted);
          return;
        }
        if (fill === '#0A2540' || fill === '#E8EAF2' || fill === '#00D4FF' || fill === '#FFF' || fill === '#FFFFFF') {
          if (dark) {
            tx.setAttribute('fill', isTransitLabel ? t.chipText : t.plantLabel);
          } else if (fill === '#FFF' || fill === '#FFFFFF') {
            tx.setAttribute('fill', t.tipText);
          } else {
            tx.setAttribute('fill', isTransitLabel ? t.chipText : t.plantLabel);
          }
        }
      });
      svg.querySelectorAll('circle').forEach(function (c) {
        var stroke = (c.getAttribute('stroke') || '').toUpperCase();
        if (stroke === '#0A2540' || stroke === '#00D4FF') c.setAttribute('stroke', t.plant);
      });
    });
    scope.querySelectorAll('[data-skel]').forEach(function (el) {
      el.style.background = t.ocean;
    });
  }

  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
    recolor(document);
  }

  window.__STREFEX_APPLY_SOURCING_THEME__ = applyTheme;

  var mo = new MutationObserver(function () { recolor(document); });
  function observe() {
    if (!document.body) return;
    mo.observe(document.body, { childList: true, subtree: true });
    recolor(document);
  }
  if (document.body) observe();
  else document.addEventListener('DOMContentLoaded', observe);

  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.source !== 'strefex-platform' || d.action !== 'set-theme') return;
    applyTheme(d.theme);
  });

  var boot = 'light';
  try {
    var q = new URLSearchParams(location.search || '');
    if (q.get('theme') === 'dark') boot = 'dark';
    else if (window.__STREFEX_PLATFORM_THEME__ === 'dark') boot = 'dark';
  } catch (e) { /* */ }
  applyTheme(boot);
})();
