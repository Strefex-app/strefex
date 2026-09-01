/**
 * Public www.strefex.pro landing — content lives in public/marketing-site/
 * (ported from the STREFEX Website.html design). Auth CTAs use target=_top
 * to /login and /register.
 */
export default function MarketingHome() {
  return (
    <iframe
      className="mkt-site-frame"
      title="STREFEX"
      src="/marketing-site/index.html"
      // Full-bleed landing; scrolling happens inside the frame
    />
  )
}
