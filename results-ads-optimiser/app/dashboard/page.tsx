import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { accounts, recommendations, weeklyPerformance } from '@/lib/mock-data';

function Sparkline() {
  const max=Math.max(...weeklyPerformance), min=Math.min(...weeklyPerformance);
  const pts=weeklyPerformance.map((v,i)=>`${(i/(weeklyPerformance.length-1))*100},${46-((v-min)/(max-min))*40}`).join(' ');
  return <svg className="sparkline" viewBox="0 0 100 50" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6C63FF" stopOpacity=".24"/><stop offset="100%" stopColor="#6C63FF" stopOpacity="0"/></linearGradient></defs><polygon points={`0,50 ${pts} 100,50`} fill="url(#fill)"/><polyline points={pts} fill="none" stroke="#6C63FF" strokeWidth="2" vectorEffect="non-scaling-stroke"/><circle cx="100" cy={46-((weeklyPerformance.at(-1)!-min)/(max-min))*40} r="2.2" fill="#6C63FF"/></svg>
}

export default function Dashboard() {
  const totalSpend = accounts.reduce((s,a)=>s+a.spend,0);
  const totalConversions = accounts.reduce((s,a)=>s+a.conversions,0);
  const improvements = accounts.reduce((s,a)=>s+a.improvements,0);
  const avgCpa = totalSpend / totalConversions;
  return (
    <AppShell>
      <div className="page-header">
        <div><div className="eyebrow">TUESDAY, 15 SEPTEMBER</div><h1>Good afternoon, Jamie</h1><p>Here’s what needs your attention across your Google Ads accounts.</p></div>
        <a className="button" href="/api/google-ads/oauth/start"><span>＋</span> Connect Google Ads</a>
      </div>

      <div className="metric-grid">
        <div className="metric-card"><div className="metric-top"><span>Managed spend</span><div className="metric-icon purple">$</div></div><div className="metric-number">${totalSpend.toLocaleString('en-AU')}</div><div className="metric-change up">↗ 8.4% <span>vs last month</span></div></div>
        <div className="metric-card"><div className="metric-top"><span>Conversions</span><div className="metric-icon blue">◎</div></div><div className="metric-number">{totalConversions}</div><div className="metric-change up">↗ 12.1% <span>vs last month</span></div></div>
        <div className="metric-card"><div className="metric-top"><span>Average CPA</span><div className="metric-icon green">↘</div></div><div className="metric-number">${avgCpa.toFixed(0)}</div><div className="metric-change up">↘ 3.7% <span>vs last month</span></div></div>
        <div className="metric-card attention"><div className="metric-top"><span>Open improvements</span><div className="metric-icon amber">✦</div></div><div className="metric-number">{improvements}</div><div className="metric-change warn">18 high priority <span>opportunities</span></div></div>
      </div>

      <div className="dashboard-grid">
        <section className="panel performance-panel">
          <div className="panel-head"><div><h2>Performance overview</h2><p>Combined account performance</p></div><select defaultValue="30"><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
          <div className="chart-summary"><div><span>Conversion value</span><strong>$186,420</strong><em>↗ 11.2%</em></div><div className="chart-legend"><i/> Conversion value</div></div>
          <div className="chart-wrap"><div className="chart-lines"><span/><span/><span/><span/></div><div className="y-labels"><span>$200k</span><span>$150k</span><span>$100k</span><span>$50k</span></div><Sparkline/><div className="x-labels"><span>17 Aug</span><span>24 Aug</span><span>31 Aug</span><span>7 Sep</span><span>14 Sep</span></div></div>
        </section>

        <section className="panel opportunity-panel">
          <div className="panel-head"><div><h2>Opportunity snapshot</h2><p>Potential monthly impact</p></div><button className="text-button">View all</button></div>
          <div className="opportunity-value"><strong>$2,840</strong><span>estimated monthly opportunity</span></div>
          <div className="opportunity-bar"><span className="bar-a"/><span className="bar-b"/><span className="bar-c"/></div>
          <div className="opportunity-list"><div><i className="dot red"/><span>Wasted spend</span><strong>$1,340</strong></div><div><i className="dot violet"/><span>Budget allocation</span><strong>$920</strong></div><div><i className="dot cyan"/><span>Ad improvements</span><strong>$580</strong></div></div>
          <div className="opportunity-foot">Based on 27 open improvements across 5 accounts</div>
        </section>
      </div>

      <section className="panel accounts-panel">
        <div className="panel-head accounts-head"><div><h2>Accounts needing attention</h2><p>Prioritised by performance and opportunity</p></div><button className="text-button">View all accounts →</button></div>
        <div className="account-table">
          <div className="account-row account-row-head"><span>Account</span><span>Health score</span><span>Spend</span><span>CPA</span><span>Performance</span><span>Improvements</span><span/></div>
          {accounts.slice(0,4).map(a=><div className="account-row" key={a.id}>
            <div className="account-name"><div className={`account-avatar ${a.priority}`}>{a.initials}</div><div><Link href={`/accounts/${a.id}`}>{a.name}</Link><small>{a.status}</small></div></div>
            <div className="health-cell"><div className={`health-ring ${a.score<75?'risk':a.score>87?'great':'good'}`}><span>{a.score}</span></div><small>/100</small></div>
            <div><strong>${a.spend.toLocaleString('en-AU')}</strong><small>this month</small></div>
            <div><strong>${a.cpa.toFixed(0)}</strong><small>per conversion</small></div>
            <div><span className={`trend ${a.change>=0?'positive':'negative'}`}>{a.change>=0?'↗':'↘'} {Math.abs(a.change)}%</span><small>vs last month</small></div>
            <div><span className={`improvement-pill ${a.priority}`}>{a.improvements} open</span></div>
            <Link className="row-arrow" href={`/accounts/${a.id}`}>›</Link>
          </div>)}
        </div>
      </section>

      <section className="panel improvements-panel">
        <div className="panel-head"><div><h2>Top improvements</h2><p>Highest-impact recommendations across your workspace</p></div><button className="text-button">View all improvements →</button></div>
        <div className="improvement-cards">{recommendations.slice(0,3).map((r,i)=><div className="improvement-card" key={r.id}>
          <div className={`rec-symbol symbol-${i}`}>{i===0?'$':i===1?'⊘':'◫'}</div>
          <div className="rec-body"><div className="rec-meta-line"><span>{r.category}</span><em className={r.severity}>{r.severity} priority</em></div><h3>{r.title}</h3><p>{r.description}</p><div className="rec-impact"><span>Potential impact</span><strong>{r.impact}</strong><small>{r.confidence}% confidence</small></div></div>
          <button className="review-btn">Review <span>→</span></button>
        </div>)}</div>
      </section>
    </AppShell>
  );
}
