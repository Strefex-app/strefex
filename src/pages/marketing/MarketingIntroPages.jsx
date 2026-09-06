import { Link } from 'react-router-dom'

function IntroLayout({ kicker, title, lead, registerTo = '/register', children }) {
  return (
    <main className="mkt-main mkt-intro">
      <section className="mkt-intro__hero">
        <p className="mkt-kicker">{kicker}</p>
        <h1 className="mkt-intro__title">{title}</h1>
        <p className="mkt-intro__lead">{lead}</p>
        <div className="mkt-hero__cta">
          <Link to={registerTo} className="mkt-btn mkt-btn--primary mkt-btn--sm">Sign up</Link>
          <Link to="/login" className="mkt-btn mkt-btn--outline mkt-btn--sm">Sign in</Link>
        </div>
      </section>
      <section className="mkt-section mkt-intro__body">
        {children}
        <div className="mkt-section__cta">
          <Link to={registerTo} className="mkt-btn mkt-btn--primary mkt-btn--sm">Sign up</Link>
          <Link to="/login" className="mkt-btn mkt-btn--outline mkt-btn--sm">Sign in</Link>
          <Link to="/" className="mkt-btn mkt-btn--ghost-dark mkt-btn--sm">← Back to home</Link>
        </div>
      </section>
    </main>
  )
}

export function IntroBuyers() {
  return (
    <IntroLayout
      kicker="For buyers"
      title="Find plants with quality evidence on file"
      lead="STREFEX helps procurement teams shortlist manufacturers by industry standards — then send RFQs in one guided flow."
      registerTo="/register?type=buyer"
    >
      <ol className="mkt-steps">
        <li>
          <strong>Discover</strong>
          <span>Browse by industry and category. Filter by IATF, ISO 13485, or your primary standard.</span>
        </li>
        <li>
          <strong>Shortlist &amp; compare</strong>
          <span>See evidence scores, standards, traceability, and gaps before you invite anyone.</span>
        </li>
        <li>
          <strong>Create &amp; send RFQ</strong>
          <span>Industry-aware requirements (PPAP, medical design controls). NDA gate for drawings.</span>
        </li>
        <li>
          <strong>Track responses</strong>
          <span>Follow status in Buyer Workspace — same place you started.</span>
        </li>
      </ol>
    </IntroLayout>
  )
}

export function IntroManufacturers() {
  return (
    <IntroLayout
      kicker="For manufacturers"
      title="Turn plant QMS into buyer-ready proof"
      lead="Publish a reliability card once. Keep plant files in order, close certification gaps, and answer RFQs with on-file vs gap hints — without leaking customer data."
      registerTo="/register?type=seller"
    >
      <ol className="mkt-steps">
        <li>
          <strong>Trust setup (15 minutes)</strong>
          <span>Pick plant industry, add primary certificate, choose what buyers may see, publish.</span>
        </li>
        <li>
          <strong>Plant files in order</strong>
          <span>Company Database folders for QMS, commercial, and HR — industry-aware structure with controlled documents.</span>
        </li>
        <li>
          <strong>Preparation audit &amp; certification</strong>
          <span>Run a gap assessment before a formal audit; keep evidence packs ready for auditors and RFQ replies.</span>
        </li>
        <li>
          <strong>RFQ inbox</strong>
          <span>See what the buyer asked for and what you already have on file before you quote.</span>
        </li>
        <li>
          <strong>Award → project binder</strong>
          <span>Winning work opens a plant project and commercial binder automatically.</span>
        </li>
      </ol>
    </IntroLayout>
  )
}

export function IntroHowItWorks() {
  return (
    <IntroLayout
      kicker="How it works"
      title="Network for sourcing. Company mode for the plant."
      lead="Buyers live in the Network. Manufacturers switch to Company mode for QMS, people, and commercial records — without mixing the two."
    >
      <div className="mkt-pillars">
        <article className="mkt-pillar">
          <h3>1. Register</h3>
          <p>Create a buyer or manufacturer account. Choose industries you buy from or serve.</p>
        </article>
        <article className="mkt-pillar">
          <h3>2. Connect evidence</h3>
          <p>Buyers search with reliability filters. Sellers publish opted-in standards only.</p>
        </article>
        <article className="mkt-pillar">
          <h3>3. RFQ &amp; execute</h3>
          <p>Send RFQs, track responses, award, and continue into plant projects with binders.</p>
        </article>
      </div>
      <p className="mkt-section__lead" style={{ marginTop: 28 }}>
        Your customer data stays yours. Lots, NCRs, and other-customer packs never appear on marketplace cards.
      </p>
    </IntroLayout>
  )
}
