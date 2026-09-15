import Link from 'next/link';

export default function Home() {
  return <main className="landing">
    <div className="landing-nav"><div className="logo-lockup dark"><div className="logo-mark">O</div><div><strong>Optimiser</strong><span>for Google Ads</span></div></div><div><Link href="/dashboard" className="button secondary">View demo</Link><Link href="/dashboard" className="button">Start free trial</Link></div></div>
    <section className="hero"><div className="hero-chip">Built for performance agencies</div><h1>Find the opportunities<br/>Google Ads misses.</h1><p>Turn account data into clear, prioritised improvements your team can review and apply in minutes.</p><div className="hero-actions"><Link className="button hero-btn" href="/dashboard">Explore the dashboard →</Link><span>No credit card required</span></div></section>
    <div className="landing-preview"><div className="preview-top"><span/><span/><span/></div><div className="preview-body"><aside/><div><div className="preview-head"/><div className="preview-metrics"><i/><i/><i/><i/></div><div className="preview-chart"/></div></div></div>
  </main>
}
