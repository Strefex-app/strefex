/* Merge platform payload into SOURCING_DATA (runs after mock dataset). */
(function () {
  try {
    var plat = window.__STREFEX_PLATFORM_SOURCING__;
    if (plat && window.__STREFEX_SOURCING_BRIDGE__ && window.__STREFEX_SOURCING_BRIDGE__.applyPlatform) {
      window.__STREFEX_SOURCING_BRIDGE__.applyPlatform(plat);
    }
  } catch (e) { /* keep mock data */ }
})();
