/* Recolor sourcing maps/chips when platform theme changes. */
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
  var applied = '';
  var raf = 0;
  var pendingRoot = null;

  function palette() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? NIGHT : DAY;
  }

  function resolveTheme() {
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        var parentTheme = window.parent.document.documentElement.getAttribute('data-theme');
        if (parentTheme === 'dark' || parentTheme === 'light') return parentTheme;
      }
    } catch (e) { /* */ }
    try {
      var stored = localStorage.getItem('strefex-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (e) { /* */ }
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') return attr;
    return window.__STREFEX_PLATFORM_THEME__ === 'dark' ? 'dark' : 'light';
  }

  function recolor(root) {
    var t = palette();
    var dark = t === NIGHT;
    var scope = root || document;
    var svgs = scope.querySelectorAll ? scope.querySelectorAll('svg') : [];
    if (scope.nodeName === 'svg') svgs = [scope];
    Array.prototype.forEach.call(svgs, function (svg) {
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
    var skelRoot = scope.querySelectorAll ? scope : document;
    if (skelRoot.querySelectorAll) {
      skelRoot.querySelectorAll('[data-skel]').forEach(function (el) {
        el.style.background = t.ocean;
      });
    }
  }

  function scheduleRecolor(root) {
    pendingRoot = !pendingRoot || pendingRoot === document ? (root || document) : document;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var target = pendingRoot;
      pendingRoot = null;
      recolor(target);
    });
  }

  function applyTheme(mode) {
    var next = mode === 'dark' ? 'dark' : 'light';
    var root = document.documentElement;
    applied = next;
    root.setAttribute('data-theme', next);
    root.style.colorScheme = next;
    window.__STREFEX_PLATFORM_THEME__ = next;
    scheduleRecolor(document);
  }

  window.__STREFEX_APPLY_SOURCING_THEME__ = applyTheme;

  function observeMaps() {
    if (!document.body) return;
    var mo = new MutationObserver(function (records) {
      var i;
      var node;
      for (i = 0; i < records.length; i += 1) {
        var added = records[i].addedNodes;
        var n;
        for (n = 0; n < added.length; n += 1) {
          node = added[n];
          if (node.nodeType !== 1) continue;
          if (node.nodeName === 'svg' || (node.querySelector && node.querySelector('svg, [data-skel]'))) {
            scheduleRecolor(node);
            return;
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) observeMaps();
  else document.addEventListener('DOMContentLoaded', observeMaps);

  window.addEventListener('message', function (ev) {
    var origin = ev && ev.origin;
    if (origin && origin !== 'null' && origin !== window.location.origin) return;
    var d = ev && ev.data;
    if (!d || d.source !== 'strefex-platform' || d.action !== 'set-theme') return;
    applyTheme(d.theme);
  });
  window.addEventListener('strefex-map-painted', function () {
    scheduleRecolor(document);
  });

  applyTheme(resolveTheme());
})();
