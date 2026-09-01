/**
 * Marketing landing interactions (language menu, module toggles, hover).
 * Kept as an external file so CSP script-src 'self' allows it.
 */
(function () {
  window.__strefexLoadPhrases = function () {
    if (window.STREFEX_PHRASES || window.__strefexPhrasesLoading) {
      return Promise.resolve(window.STREFEX_PHRASES)
    }
    window.__strefexPhrasesLoading = true
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script')
      s.src = 'i18n-phrases.js'
      s.onload = function () {
        window.__strefexPhrasesLoading = false
        resolve(window.STREFEX_PHRASES)
      }
      s.onerror = function () {
        window.__strefexPhrasesLoading = false
        reject(new Error('phrases'))
      }
      document.head.appendChild(s)
    })
  }

  var state = {
    lang: 'EN',
    langMenuOpen: false,
    open: { People: true, Sourcing: true, Compliance: true, Finance: true, Ops: true, Platform: true },
  }
  var origText = new WeakMap()

  function ui() {
    return (window.STREFEX_I18N && (window.STREFEX_I18N[state.lang] || window.STREFEX_I18N.EN)) || {}
  }

  function syncUiStrings() {
    var t = ui()
    document.querySelectorAll('[data-i18n-ui]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ui')
      if (k === 'langCode') el.textContent = state.lang
      else if (t[k] != null) el.textContent = t[k]
    })
  }

  function syncIf() {
    var flags = {
      langMenuOpen: state.langMenuOpen,
      showProofBand: true,
      openPeople: state.open.People,
      openSourcing: state.open.Sourcing,
      openCompliance: state.open.Compliance,
      openFinance: state.open.Finance,
      openOps: state.open.Ops,
      openPlatform: state.open.Platform,
    }
    document.querySelectorAll('[data-if]').forEach(function (el) {
      var key = el.getAttribute('data-if')
      el.hidden = !flags[key]
    })
  }

  function applyPhrases() {
    var dict = window.STREFEX_PHRASES
    var table = state.lang === 'EN' || !dict ? null : dict[state.lang]
    document.documentElement.setAttribute('lang', state.lang.toLowerCase())
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement
        if (!p || !n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT
        var tag = p.tagName
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return NodeFilter.FILTER_REJECT
        if (p.closest('[data-i18n-skip]') || p.closest('[data-i18n-ui]')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    var nodes = []
    for (var n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n)
    nodes.forEach(function (node) {
      if (!origText.has(node)) origText.set(node, node.nodeValue)
      var src = origText.get(node)
      var key = src.trim()
      if (!table) {
        if (node.nodeValue !== src) node.nodeValue = src
        return
      }
      var hit = table[key]
      if (hit && node.nodeValue !== hit) node.nodeValue = src.replace(key, hit)
    })
  }

  function render() {
    syncUiStrings()
    syncIf()
    applyPhrases()
  }

  function setLang(code) {
    state.lang = code
    state.langMenuOpen = false
    if (code === 'EN') {
      render()
      return
    }
    window.__strefexLoadPhrases().then(render).catch(render)
  }

  var actions = {
    toggleLangMenu: function () {
      state.langMenuOpen = !state.langMenuOpen
      render()
    },
    setEn: function () { setLang('EN') },
    setDe: function () { setLang('DE') },
    setFr: function () { setLang('FR') },
    setIt: function () { setLang('IT') },
    setEs: function () { setLang('ES') },
    setPt: function () { setLang('PT') },
    setRu: function () { setLang('RU') },
    setZh: function () { setLang('ZH') },
    togglePeople: function () { state.open.People = !state.open.People; render() },
    toggleSourcing: function () { state.open.Sourcing = !state.open.Sourcing; render() },
    toggleCompliance: function () { state.open.Compliance = !state.open.Compliance; render() },
    toggleFinance: function () { state.open.Finance = !state.open.Finance; render() },
    toggleOps: function () { state.open.Ops = !state.open.Ops; render() },
    togglePlatform: function () { state.open.Platform = !state.open.Platform; render() },
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]')
    if (!el) {
      if (
        state.langMenuOpen &&
        !e.target.closest('[data-if="langMenuOpen"]') &&
        !e.target.closest('[data-action="toggleLangMenu"]')
      ) {
        state.langMenuOpen = false
        render()
      }
      return
    }
    var name = el.getAttribute('data-action')
    if (actions[name]) {
      e.preventDefault()
      actions[name]()
    }
  })

  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest('[data-hover]')
    if (!el || el.__hoverOn) return
    el.__hoverOn = true
    el.__hoverPrev = el.getAttribute('style') || ''
    var extra = el.getAttribute('data-hover')
    el.style.cssText =
      el.__hoverPrev + (el.__hoverPrev && !el.__hoverPrev.endsWith(';') ? ';' : '') + extra
  }, true)

  document.addEventListener('mouseout', function (e) {
    var el = e.target.closest('[data-hover]')
    if (!el || !el.__hoverOn) return
    if (e.relatedTarget && el.contains(e.relatedTarget)) return
    el.__hoverOn = false
    el.style.cssText = el.__hoverPrev || ''
  }, true)

  render()
})()
