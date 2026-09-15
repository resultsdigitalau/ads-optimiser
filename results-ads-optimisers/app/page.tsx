import Link from 'next/link';

const FeatureIcon = ({type}:{type:string}) => {
  const glyphs: Record<string,string> = {recommend:'✦', alerts:'!', budget:'◔', report:'▥', search:'⌕', shield:'✓'};
  return <span className={`feature-icon ${type}`}>{glyphs[type]}</span>;
};

export default function Home() {
  return <main className="marketing-site">
    <header className="marketing-nav-wrap">
      <nav className="marketing-nav">
        <Link href="/" className="brand-logo" aria-label="Pilot Ads home">
          <img src="/pilot-ads-logo.png" alt="Pilot Ads" />
        </Link>
        <div className="marketing-links">
          <a href="#product">Product <span>⌄</span></a>
          <a href="#solutions">Solutions <span>⌄</span></a>
          <a href="#pricing">Pricing</a>
          <a href="#reviews">Reviews</a>
        </div>
        <div className="marketing-actions">
          <Link href="/dashboard" className="nav-login">Log in</Link>
          <Link href="/dashboard" className="blue-button">Start free trial <span>→</span></Link>
        </div>
      </nav>
    </header>

    <section className="marketing-hero">
      <div className="hero-copy">
        <div className="blue-kicker">BUILT FOR GOOGLE ADS AGENCIES</div>
        <h1>Smarter Google Ads<br/>optimisation for<br/>growing agencies.</h1>
        <p>Pilot Ads helps agency teams save time, find bigger opportunities and deliver better results across every client account. Monitor performance, surface improvements and keep optimisation moving from one workspace.</p>
        <div className="hero-ctas">
          <Link className="blue-button large" href="/dashboard">Explore the dashboard <span>→</span></Link>
          <a className="outline-button large" href="#product">See how it works</a>
        </div>
        <div className="hero-promises">
          <span>✓ Agency-first workspace</span><span>✓ Client data isolated by workspace</span><span>✓ Approval-led changes</span>
        </div>
      </div>
      <div className="hero-product">
        <div className="browser-shell">
          <div className="browser-bar"><i/><i/><i/><span>app.pilotads.com.au/dashboard</span></div>
          <div className="mini-app">
            <aside className="mini-sidebar">
              <div className="mini-logo">PA</div>
              <b className="selected">Overview</b><b>Improvements</b><b>Alerts</b><b>Accounts</b><b>Reports</b><b>Settings</b>
            </aside>
            <div className="mini-main">
              <div className="mini-head"><div><small>ACME MARKETING</small><strong>Performance</strong></div><button>Last 30 days⌄</button></div>
              <div className="mini-metrics">
                <div><span>Managed spend</span><strong>$399,280</strong><em>↗ 8.4%</em></div>
                <div><span>Conversions</span><strong>15,625</strong><em>↗ 12.1%</em></div>
                <div><span>Avg. CPA</span><strong>$25.56</strong><em>↘ 11.3%</em></div>
                <div><span>Accounts</span><strong>12</strong><em>+2 this month</em></div>
              </div>
              <div className="mini-opps"><div className="mini-opps-title"><strong>Top opportunities</strong><span>View all →</span></div>
                <div><i className="green">↗</i><b>Increase budgets on high-ROAS campaigns</b><span className="positive-pill">+12% potential</span><button>Apply</button></div>
                <div><i className="blue">⌕</i><b>Add negative keyword opportunities</b><span>Save $2,430/mo</span><button>Review</button></div>
                <div><i className="purple">✦</i><b>Improve ad copy with high CTR assets</b><span>87% confidence</span><button>Review</button></div>
                <div><i className="red">!</i><b>Fix disapproved ads</b><span className="warning-pill">Needs attention</span><button>Review</button></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="trust-band">
      <p>BUILT TO FIT THE WAY PERFORMANCE AGENCIES WORK</p>
      <div className="trust-logos"><span>◈ North & Co.</span><span>◆ BrightPeak</span><span>◫ StudioNorth</span><span>✦ Momentum</span><span>⬡ Arc Media</span><span>◒ GrowthLab</span></div>
    </section>

    <section className="proof-strip">
      <div><FeatureIcon type="search"/><strong>40+</strong><span>planned optimisation checks</span></div>
      <div><FeatureIcon type="shield"/><strong>Multi-tenant</strong><span>agency data isolation</span></div>
      <div><FeatureIcon type="report"/><strong>One workspace</strong><span>accounts, alerts and reporting</span></div>
      <div><FeatureIcon type="recommend"/><strong>Approval-led</strong><span>review before changes apply</span></div>
    </section>

    <section className="section-block features" id="product">
      <div className="section-intro"><span>EVERYTHING A PPC AGENCY NEEDS</span><h2>Powerful tools. Clear priorities.</h2><p>Spend less time hunting through accounts and more time acting on the opportunities that matter.</p></div>
      <div className="feature-grid">
        <article><FeatureIcon type="recommend"/><h3>Recommendations</h3><p>Prioritised improvements based on performance, wasted spend, search terms, budgets and account goals.</p><a href="#opportunities">Learn more →</a></article>
        <article><FeatureIcon type="alerts"/><h3>Alerts</h3><p>Catch sudden CPA changes, spend spikes, conversion drops and account issues before clients do.</p><a href="#opportunities">Learn more →</a></article>
        <article><FeatureIcon type="budget"/><h3>Budget pacing</h3><p>Track monthly pacing, projected spend and underspend or overspend risks across every account.</p><a href="#opportunities">Learn more →</a></article>
        <article><FeatureIcon type="report"/><h3>Reporting</h3><p>Turn key account metrics, opportunities and completed optimisation work into agency-ready reports.</p><a href="#opportunities">Learn more →</a></article>
      </div>
    </section>

    <section className="opportunity-showcase" id="opportunities">
      <div className="opportunity-copy"><div className="blue-kicker">FIND AND FIX OPPORTUNITIES</div><h2>See what needs attention.<br/>Take action faster.</h2><p>Pilot Ads reviews account signals and organises improvements by potential impact, urgency and confidence. Your team stays in control of what gets changed.</p><div className="hero-ctas"><Link className="blue-button" href="/dashboard">See it in action →</Link><a className="outline-button" href="#reviews">View reviews</a></div></div>
      <div className="opportunity-demo">
        <div className="opp-tabs"><b>All <em>12</em></b><span>Budget 4</span><span>Keywords 3</span><span>Ads 3</span><span>Bidding 2</span></div>
        <div className="opp-row"><i className="opp-up">↗</i><div><strong>Increase budget for high-performing campaigns</strong><small>Campaigns are being limited by budget while hitting target CPA</small></div><em>+12% conversions</em><button>Apply</button></div>
        <div className="opp-row"><i className="opp-search">⌕</i><div><strong>Add 42 negative keyword opportunities</strong><small>Low-intent search terms are consuming spend without conversions</small></div><em>Save $2,430/mo</em><button>Review</button></div>
        <div className="opp-row"><i className="opp-pause">Ⅱ</i><div><strong>Pause underperforming keywords</strong><small>23 keywords have high spend and low conversion volume</small></div><em>92% confidence</em><button>Review</button></div>
        <div className="opp-row"><i className="opp-alert">!</i><div><strong>Fix disapproved ads</strong><small>Three ads require attention before they can serve again</small></div><em className="needs">Needs attention</em><button>Review</button></div>
      </div>
    </section>

    <section className="section-block security" id="solutions">
      <div className="section-intro"><span>TRUST IS PART OF THE PRODUCT</span><h2>Built for agencies managing client access.</h2><p>Your customers connect their own Google Ads accounts. Pilot Ads is designed around separate agency workspaces rather than a shared master account.</p></div>
      <div className="security-grid">
        <article><div>01</div><h3>Separate agency workspaces</h3><p>Every organisation has its own users, connected accounts, preferences and recommendations.</p></article>
        <article><div>02</div><h3>Approval history</h3><p>Track what was recommended, who reviewed it and what was ultimately applied or dismissed.</p></article>
        <article><div>03</div><h3>Role-based access</h3><p>Structure account owners, team members and approvals without exposing another agency’s client data.</p></article>
      </div>
    </section>

    <section className="reviews-section" id="reviews">
      <div className="reviews-heading"><div><span>TESTIMONIAL DESIGN PREVIEW</span><h2>What agency leaders could say.</h2><p>These cards are sample placeholders for the website design. Replace them with verified customer reviews before public launch.</p></div><div className="sample-badge">DEMO CONTENT</div></div>
      <div className="reviews-grid">
        <article><div className="stars">★★★★★</div><blockquote>“Pilot Ads gives our team one clear place to see what needs attention across our client accounts. The improvement workflow is exactly the kind of visibility we wanted.”</blockquote><div className="review-person"><span>DK</span><div><strong>Daniel Kim</strong><small>Sample agency owner</small></div></div></article>
        <article><div className="stars">★★★★★</div><blockquote>“The biggest win is prioritisation. Instead of checking every account manually, the team can start with the opportunities that have the highest potential impact.”</blockquote><div className="review-person"><span>SL</span><div><strong>Sophie Lawson</strong><small>Sample PPC director</small></div></div></article>
        <article><div className="stars">★★★★★</div><blockquote>“The interface makes account health, budget pacing and improvements easy to understand. It feels built for agencies rather than adapted from a client tool.”</blockquote><div className="review-person"><span>ML</span><div><strong>Marcus Lee</strong><small>Sample agency founder</small></div></div></article>
      </div>
    </section>

    <section className="pricing-section" id="pricing">
      <div className="section-intro"><span>SIMPLE AGENCY PRICING</span><h2>Start small. Scale with your client base.</h2><p>Pricing shown below is a front-end concept and can be finalised before billing is connected.</p></div>
      <div className="pricing-grid">
        <article><small>FREELANCER</small><h3>$79<span>/month</span></h3><p>For solo PPC specialists and small account portfolios.</p><ul><li>Up to 10 client accounts</li><li>Improvement feed</li><li>Budget pacing</li><li>Alerts and audit history</li></ul><Link href="/dashboard" className="outline-button full">Start trial</Link></article>
        <article className="featured-price"><div className="popular">MOST POPULAR</div><small>AGENCY</small><h3>$199<span>/month</span></h3><p>For growing performance teams managing multiple clients.</p><ul><li>Up to 30 client accounts</li><li>Everything in Freelancer</li><li>Team roles and approvals</li><li>Agency reporting</li></ul><Link href="/dashboard" className="blue-button full">Start trial</Link></article>
        <article><small>AGENCY PRO</small><h3>$399<span>/month</span></h3><p>For larger teams that need capacity and stronger controls.</p><ul><li>Up to 100 client accounts</li><li>Everything in Agency</li><li>Advanced audit controls</li><li>Priority support</li></ul><Link href="/dashboard" className="outline-button full">Start trial</Link></article>
      </div>
    </section>

    <section className="final-cta"><img src="/pilot-ads-logo.png" alt="Pilot Ads"/><div><h2>A faster, smarter way to run Google Ads optimisation.</h2><p>Clear priorities. Better workflows. More time for clients.</p></div><Link href="/dashboard" className="blue-button large">Explore Pilot Ads →</Link></section>
    <footer className="site-footer"><span>© 2026 Pilot Ads</span><div><a href="#product">Product</a><a href="#pricing">Pricing</a><a href="#reviews">Reviews</a><a href="#">Privacy</a><a href="#">Terms</a></div></footer>
  </main>;
}
