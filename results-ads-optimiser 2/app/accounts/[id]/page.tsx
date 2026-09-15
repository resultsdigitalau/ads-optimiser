import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { accounts, recommendations } from '@/lib/mock-data';

export default async function AccountPage({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const account = accounts.find(a=>a.id===id);
  if(!account) notFound();
  return <AppShell active="accounts">
    <div className="breadcrumb">Accounts <span>›</span> {account.name}</div>
    <div className="account-page-head">
      <div className="account-title"><div className={`account-avatar large ${account.priority}`}>{account.initials}</div><div><h1>{account.name}</h1><p>Google Ads account <span>•</span> Last synced 4 minutes ago</p></div></div>
      <div className="head-actions"><button className="button secondary">↻ Sync now</button><button className="button">Open Google Ads ↗</button></div>
    </div>
    <div className="account-tabs"><button className="active">Overview</button><button>Improvements <span>{account.improvements}</span></button><button>Search terms</button><button>Budget</button><button>Ads</button><button>Reports</button></div>

    <div className="account-overview-grid">
      <div className="panel score-panel"><div className="score-gauge"><div className={`health-ring giant ${account.score<75?'risk':account.score>87?'great':'good'}`}><span>{account.score}</span></div><div><small>Account health</small><strong>{account.status}</strong><p>8 points below agency average</p></div></div><div className="score-breakdown"><div><span>Efficiency</span><div><i style={{width:'74%'}}/></div><strong>74</strong></div><div><span>Growth</span><div><i style={{width:'82%'}}/></div><strong>82</strong></div><div><span>Waste</span><div><i style={{width:'61%'}}/></div><strong>61</strong></div></div></div>
      <div className="metric-card"><div className="metric-top"><span>Spend</span><div className="metric-icon purple">$</div></div><div className="metric-number">${account.spend.toLocaleString('en-AU')}</div><div className="metric-change up">↗ 4.2% <span>vs previous period</span></div></div>
      <div className="metric-card"><div className="metric-top"><span>Conversions</span><div className="metric-icon blue">◎</div></div><div className="metric-number">{account.conversions}</div><div className="metric-change down">↘ 7.7% <span>vs previous period</span></div></div>
      <div className="metric-card"><div className="metric-top"><span>Cost / conversion</span><div className="metric-icon amber">↗</div></div><div className="metric-number">${account.cpa.toFixed(0)}</div><div className="metric-change down">↗ 13.1% <span>vs previous period</span></div></div>
    </div>

    <div className="section-heading"><div><h2>Recommended improvements</h2><p>Prioritised by expected impact on this account</p></div><div className="filter-pills"><button className="active">All {account.improvements}</button><button>High 3</button><button>Medium 4</button><button>Low 1</button></div></div>
    <div className="account-recs">{recommendations.map((r,i)=><div className="account-rec-card" key={r.id}>
      <div className={`rec-symbol symbol-${i%3}`}>{i===0?'$':i===1?'⊘':i===2?'◫':'⚑'}</div>
      <div className="rec-main"><div className="rec-meta-line"><em className={r.severity}>{r.severity} priority</em><span>{r.category}</span></div><h3>{r.title}</h3><p>{r.description}</p><div className="confidence-row"><span>Confidence</span><div><i style={{width:`${r.confidence}%`}}/></div><strong>{r.confidence}%</strong></div></div>
      <div className="rec-value"><small>Potential impact</small><strong>{r.impact}</strong><span>estimated monthly</span></div>
      <div className="rec-actions"><button className="button secondary">Dismiss</button><button className="button">Review improvement</button></div>
    </div>)}</div>
  </AppShell>;
}
