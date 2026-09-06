/* <supplier-map> — real Natural Earth geometry (d3-geo + world-atlas), STREFEX styling.
   Attributes:
     metric="risk|fit|cap"          pin colour scale
     focus="all|europe|namerica|apac"
     highlight="<supplier name>"    focused supplier (lane drawn on hover/selection)
     lanes='[{"name","lat","lon","lead","transit","eta","mode"}]'
     buyer='{"name","lat","lon"}'
     show-lanes="all"               draw every lane at once (compare delivery time)
     height="520"
   Events: pin-hover (detail: {name}) so the host can sync focus. */
(function () {
  var ATLAS = (window.__resources && window.__resources.worldAtlas) || "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
  var topoPromise = null;

  function libsReady() {
    return new Promise(function (res) {
      (function check() {
        if (window.d3 && window.d3.geoNaturalEarth1 && window.topojson) res(true);
        else setTimeout(check, 60);
      })();
    });
  }

  function escapeXml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shortLabel(name) {
    var raw = String(name || "").trim();
    if (!raw) return "";
    if (raw.length <= 18) return raw;
    return raw.slice(0, 16).trim() + "…";
  }

  var TONE = {
    low: { fill: "#5FB85C", ring: "rgba(95,184,92,.25)" },
    medium: { fill: "#E0A23B", ring: "rgba(224,162,59,.25)" },
    high: { fill: "#D2483F", ring: "rgba(210,72,63,.25)" }
  };
  function toneOf(s, metric) {
    var v = metric === "fit" ? s.fit : metric === "cap" ? s.cap : s.risk;
    if (metric === "risk") return v < 28 ? "low" : v < 48 ? "medium" : "high";
    if (metric === "fit") return v >= 82 ? "low" : v >= 70 ? "medium" : "high";
    return v <= 80 ? "low" : v <= 92 ? "medium" : "high";
  }
  var FOCUS = {
    all: null,
    europe: [[-12, 34], [34, 62]],
    namerica: [[-128, 18], [-62, 52]],
    apac: [[68, 8], [150, 46]]
  };

  class SupplierMap extends HTMLElement {
    static get observedAttributes() { return ["metric", "focus", "highlight", "names", "lanes", "buyer", "show-lanes", "showlanes", "height"]; }
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      this.style.cssText = "position:relative;display:block;width:100%;";
      this.innerHTML =
        '<div data-skel style="height:' + (this.getAttribute("height") || 520) + 'px;display:flex;align-items:center;justify-content:center;background:#EEF0F2;' +
        'border:1px solid #E2E5E7;border-radius:6px;font:600 12px/1 \'IBM Plex Sans Condensed\',system-ui;' +
        'letter-spacing:.12em;text-transform:uppercase;color:#8B9298">Loading supplier geography…</div>';
      this.boot();
      var host = this;
      if (typeof ResizeObserver !== "undefined") {
        var t = null;
        this._ro = new ResizeObserver(function () {
          if (t) clearTimeout(t);
          t = setTimeout(function () { if (host._land) host.paint(); }, 120);
        });
        this._ro.observe(this);
      }
    }
    attributeChangedCallback() { if (this._land) this.paint(); }

    async boot() {
      try {
        await libsReady();
        if (!topoPromise) topoPromise = fetch(ATLAS).then(function (r) { return r.json(); });
        var topo = await topoPromise;
        this._land = topojson.feature(topo, topo.objects.countries);
        this.paint();
      } catch (e) {
        var s = this.querySelector("[data-skel]");
        if (s) s.textContent = "Map geometry unavailable offline";
      }
    }

    json(attr, fallback) {
      try { return JSON.parse(this.getAttribute(attr) || "") || fallback; } catch (e) { return fallback; }
    }

    paint() {
      var host = this;
      var all = (window.SOURCING_DATA && window.SOURCING_DATA.SUPPLIERS) || [];
      var only = (this.getAttribute("names") || "").split("|").filter(function (n) { return n; });
      var metric = this.getAttribute("metric") || "risk";
      var focusKey = this.getAttribute("focus") || "all";
      var highlight = this.getAttribute("highlight") || "";
      /* hyphenated attribute names do not survive every mount path — accept both */
      var showAll = (this.getAttribute("show-lanes") || this.getAttribute("showlanes")) === "all";
      var H = +(this.getAttribute("height") || 520);
      var lanes = this.json("lanes", []);
      var buyer = this.json("buyer", null);
      var laneBy = {};
      lanes.forEach(function (l) { laneBy[l.name] = l; });

      function findSupplier(nm) {
        var lower = String(nm || "").toLowerCase();
        if (!lower) return null;
        for (var i = 0; i < all.length; i += 1) {
          if (String(all[i].name || "").toLowerCase() === lower) return all[i];
        }
        return null;
      }

      /* Prefer lanes (name + lat/lon from the host list) so renamed/registered plants
         still pin even when SOURCING_DATA name matching is fragile. */
      var data;
      function hasCoords(s) {
        return Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lon));
      }
      if (lanes.length) {
        data = lanes.map(function (l) {
          var s = findSupplier(l.name) || {};
          var lat = l.lat != null ? Number(l.lat) : Number(s.lat);
          var lon = l.lon != null ? Number(l.lon) : Number(s.lon);
          return {
            name: l.name || s.name || "Supplier",
            city: s.city || "—",
            cc: s.cc || "—",
            lat: lat,
            lon: lon,
            fit: s.fit != null ? s.fit : 70,
            risk: s.risk != null ? s.risk : 40,
            cap: s.cap != null ? s.cap : 70,
            spend: s.spend != null ? s.spend : 2,
            lead: l.lead != null ? l.lead : s.lead
          };
        }).filter(hasCoords);
      } else if (only.length) {
        data = only.map(findSupplier).filter(function (s) { return s && hasCoords(s); });
      } else {
        data = all.filter(hasCoords);
      }
      /* Never leave the map blank when the host has geo-tagged suppliers */
      if (!data.length && all.length) {
        data = all.filter(hasCoords);
      }

      var hostW = (host.getBoundingClientRect && host.getBoundingClientRect().width) || 1000;
      var compact = hostW > 0 && hostW < 720;
      if (compact && H < 320) H = 320;
      var pinScale = compact ? 1.25 : 1;

      var W = 1000;
      var proj = d3.geoNaturalEarth1();
      var box = FOCUS[focusKey];
      if (box) {
        proj = d3.geoMercator().fitExtent([[24, 24], [W - 24, H - 24]], {
          type: "Polygon",
          coordinates: [[box[0], [box[1][0], box[0][1]], box[1], [box[0][0], box[1][1]], box[0]]]
        });
      } else {
        proj.fitExtent([[14, 10], [W - 14, H - 10]], { type: "Sphere" });
      }
      var path = d3.geoPath(proj);

      var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" style="width:100%;height:' + H + 'px;display:block;background:#EEF0F2;border-radius:6px;touch-action:manipulation" role="img" aria-label="Supplier locations — ' + data.length + ' plants">'];
      svg.push('<path d="' + path({ type: "Sphere" }) + '" fill="#EEF0F2"/>');
      svg.push('<path d="' + path(d3.geoGraticule10()) + '" fill="none" stroke="#DDE1E4" stroke-width=".6"/>');
      this._land.features.forEach(function (f) {
        var d = path(f);
        if (d) svg.push('<path d="' + d + '" fill="#DCE1E6" stroke="#F6F7F8" stroke-width=".7"/>');
      });

      /* ── lanes: dotted great-circle from the receiving plant to the supplier ── */
      function laneMarkup(s, strong) {
        var l = laneBy[s.name];
        if (!buyer || !l) return "";
        var d = path({ type: "LineString", coordinates: [[buyer.lon, buyer.lat], [s.lon, s.lat]] });
        if (!d) return "";
        var mid = proj(d3.geoInterpolate([buyer.lon, buyer.lat], [s.lon, s.lat])(0.5));
        var total = (l.lead || 0) + (l.transit || 0);
        var label = strong
          ? '<g transform="translate(' + mid[0].toFixed(1) + ',' + (mid[1] - 14).toFixed(1) + ')">' +
            '<rect x="-86" y="-17" width="172" height="34" rx="4" fill="#0A2540"/>' +
            '<text x="0" y="-3" text-anchor="middle" font-family="\'IBM Plex Mono\',monospace" font-size="11.5" fill="#fff">' +
            (l.lead || 0) + ' d make + ' + (l.transit || 0) + ' d ' + (l.mode || "") + '</text>' +
            '<text x="0" y="11" text-anchor="middle" font-family="\'IBM Plex Sans Condensed\',system-ui" font-size="10.5" letter-spacing="1" fill="#9DB1C8">' +
            'ETA ' + (l.eta || "—") + ' · ' + total + ' D TOTAL</text></g>'
          : '<g transform="translate(' + mid[0].toFixed(1) + ',' + (mid[1] - 9).toFixed(1) + ')">' +
            '<rect x="-24" y="-11" width="48" height="21" rx="3" fill="#fff" stroke="#C9D0D6"/>' +
            '<text x="0" y="4" text-anchor="middle" font-family="\'IBM Plex Mono\',monospace" font-size="11" fill="#0A2540">' + total + ' d</text></g>';
        return '<path d="' + d + '" fill="none" stroke="' + (strong ? "#0A2540" : "#7A8794") + '" stroke-width="' + (strong ? 2 : 1.3) +
          '" stroke-dasharray="' + (strong ? "6 5" : "4 5") + '" stroke-linecap="round" opacity="' + (strong ? 1 : .75) + '"/>' + label;
      }
      if (buyer) {
        /* every lane is drawn once in both states; hover only flips opacity, so
           pointing at a pin never triggers a repaint of the 179 land paths */
        var laneLayer = data.map(function (s) {
          var faint = laneMarkup(s, false), strongMk = laneMarkup(s, true);
          if (!faint && !strongMk) return "";
          var showFaint = showAll || s.name === highlight;
          return '<g data-lane="' + escapeXml(s.name) + '">' +
            '<g data-lane-faint style="opacity:' + (showFaint && s.name !== highlight ? 1 : 0) + '">' + faint + '</g>' +
            '<g data-lane-strong style="opacity:' + (s.name === highlight ? 1 : 0) + '">' + strongMk + '</g></g>';
        }).join("");
        svg.push('<g data-lanes>' + laneLayer + '</g>');
      }

      /* ── pins + company name labels ── */
      data.forEach(function (s) {
        var p = proj([s.lon, s.lat]);
        if (!p) return;
        var t = TONE[toneOf(s, metric)];
        var spend = Number(s.spend);
        if (!Number.isFinite(spend) || spend < 0) spend = 2;
        var r = (5 + Math.sqrt(spend) * 2.1) * pinScale;
        if (compact) r = Math.max(7.5, r);
        var isStrong = highlight === s.name;
        var pinLabel = compact ? "" : shortLabel(s.name);
        var hit = Math.max(r + 14, 22);
        svg.push(
          '<g data-name="' + escapeXml(s.name) + '" style="cursor:pointer">' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + hit.toFixed(1) + '" fill="transparent"/>' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (r + 7).toFixed(1) + '" fill="' + t.ring + '"/>' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + t.fill + '" stroke="' + (isStrong ? "#0A2540" : "#fff") + '" stroke-width="' + (isStrong ? 2.6 : 1.6) + '"/>' +
          (pinLabel
            ? '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] - r - 9).toFixed(1) + '" text-anchor="middle" font-family="\'IBM Plex Sans Condensed\',system-ui" font-weight="600" font-size="11" letter-spacing=".4" fill="#0A2540">' +
              escapeXml(pinLabel.toUpperCase()) + '</text>'
            : '') +
          '</g>'
        );
      });

      /* ── receiving plant marker ── */
      if (buyer) {
        var b = proj([buyer.lon, buyer.lat]);
        if (b) svg.push(
          '<g><rect x="' + (b[0] - 7).toFixed(1) + '" y="' + (b[1] - 7).toFixed(1) + '" width="14" height="14" rx="2" fill="#0A2540" stroke="#fff" stroke-width="2"/>' +
          '<text x="' + b[0].toFixed(1) + '" y="' + (b[1] - 13).toFixed(1) + '" text-anchor="middle" font-family="\'IBM Plex Sans Condensed\',system-ui" font-weight="600" font-size="11" letter-spacing="1" fill="#0A2540">' +
          escapeXml((buyer.name || "").toUpperCase()) + '</text></g>'
        );
      }
      svg.push("</svg>");

      var legend =
        '<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:12px;font-family:\'IBM Plex Sans\',system-ui">' +
        ["low", "medium", "high"].map(function (k, i) {
          var lbl = metric === "risk" ? ["Low risk", "Watch", "High risk"][i]
            : metric === "fit" ? ["Strong fit", "Adequate", "Weak fit"][i]
              : ["Headroom", "Tight", "At ceiling"][i];
          return '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:#6E767C">' +
            '<span style="width:10px;height:10px;border-radius:50%;background:' + TONE[k].fill + '"></span>' + lbl + '</span>';
        }).join("") +
        '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:#6E767C">' +
        '<span style="width:11px;height:11px;border-radius:2px;background:#0A2540"></span>Receiving plant</span>' +
        '<span style="display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:#6E767C">' +
        '<svg width="26" height="6"><line x1="0" y1="3" x2="26" y2="3" stroke="#7A8794" stroke-width="1.6" stroke-dasharray="4 4"/></svg>' +
        'Lane · make + transit days (ref)</span>' +
        '<span style="margin-left:auto;font-size:12.5px;color:#8B9298">Bubble size = annual spend</span></div>';

      this.innerHTML = svg.join("") + legend +
        '<div data-tip style="position:absolute;pointer-events:none;opacity:0;transition:opacity .12s cubic-bezier(.2,0,.1,1);' +
        'background:#0A2540;color:#fff;border-radius:4px;padding:9px 12px;font-family:\'IBM Plex Sans\',system-ui;font-size:12.5px;' +
        'line-height:1.5;white-space:nowrap;box-shadow:0 6px 18px rgba(6,24,41,.28);z-index:5"></div>';

      var tip = this.querySelector("[data-tip]");
      this.querySelectorAll("g[data-name]").forEach(function (g) {
        var nm = g.getAttribute("data-name");
        function showTip(clientX, clientY) {
          var s = data.filter(function (x) { return x.name === nm; })[0];
          if (!s) return;
          var l = laneBy[nm] || {};
          tip.innerHTML =
            '<strong style="font-weight:600">' + escapeXml(s.name) + '</strong> · ' + escapeXml(s.city) + ', ' + escapeXml(s.cc) +
            '<br><span style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;color:#9DB1C8">' +
            'lead ' + (l.lead || s.lead) + ' d · transit ' + (l.transit || "—") + ' d ' + escapeXml(l.mode || "") + '</span>' +
            '<br><span style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;color:#fff">delivery ' + escapeXml(l.eta || "—") +
            ' <span style="color:#9DB1C8">(' + ((l.lead || 0) + (l.transit || 0)) + ' d total, ref)</span></span>' +
            '<br><span style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;color:#9DB1C8">fit ' + s.fit + ' · risk ' + s.risk + ' · cap ' + s.cap + '%</span>';
          tip.style.opacity = "1";
          tip.style.whiteSpace = "normal";
          tip.style.maxWidth = "min(260px, 86vw)";
          var bb = host.getBoundingClientRect();
          tip.style.left = Math.min(Math.max(8, (clientX || 0) - bb.left + 14), Math.max(8, bb.width - 180)) + "px";
          tip.style.top = Math.max(8, (clientY || 0) - bb.top - 12) + "px";
          host.querySelectorAll("g[data-lane]").forEach(function (lg) {
            var mine = lg.getAttribute("data-lane") === nm;
            lg.querySelector("[data-lane-strong]").style.opacity = mine ? 1 : 0;
            lg.querySelector("[data-lane-faint]").style.opacity = (!mine && showAll) ? 1 : 0;
          });
          host.dispatchEvent(new CustomEvent("pin-hover", { detail: { name: nm }, bubbles: true }));
        }
        function hideTip() {
          tip.style.opacity = "0";
          host.querySelectorAll("g[data-lane]").forEach(function (lg) {
            var isHot = lg.getAttribute("data-lane") === highlight;
            lg.querySelector("[data-lane-strong]").style.opacity = isHot ? 1 : 0;
            lg.querySelector("[data-lane-faint]").style.opacity = (showAll && !isHot) ? 1 : 0;
          });
        }
        g.addEventListener("mouseenter", function (ev) { showTip(ev.clientX, ev.clientY); });
        g.addEventListener("mousemove", function (ev) {
          var bb = host.getBoundingClientRect();
          tip.style.left = Math.min(ev.clientX - bb.left + 14, bb.width - 180) + "px";
          tip.style.top = (ev.clientY - bb.top - 12) + "px";
        });
        g.addEventListener("mouseleave", hideTip);
        g.addEventListener("click", function (ev) {
          ev.preventDefault();
          showTip(ev.clientX, ev.clientY);
        });
        g.addEventListener("touchstart", function (ev) {
          var t = ev.changedTouches && ev.changedTouches[0];
          if (t) showTip(t.clientX, t.clientY);
        }, { passive: true });
      });
    }
  }
  if (!customElements.get("supplier-map")) customElements.define("supplier-map", SupplierMap);
})();
