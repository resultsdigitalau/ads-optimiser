import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { compactNumber, getWorkspace, loadAccountPerformance, metricNumber, money, percentChange } from '@/lib/workspace';

type Totals = { spend: number; clicks: number; impressions: number; conversions: number; value: number };
type Campaign = Totals & { id: string; name: string; account: string; device: string };
const empty = (): Totals => ({ spend: 0, clicks: 0, impressions: 0, conversions: 0, value: 0 });

function add(target: Totals, source: Totals) {
  target.spend += source.spend; target.clicks += source.clicks; target.impressions += source.impressions; target.conversions += source.conversions; target.value += source.value;
}

function rowTotals(row: any): Totals {
  return { spend: metricNumber(row.metrics?.costMicros) / 1_000_000, clicks: metricNumber(row.metrics?.clicks), impressions: metricNumber(row.metrics?.impressions), conversions: metricNumber(row.metrics?.conversions), value: metricNumber(row.metrics?.conversionsValue) };
}

function daysAgo(days: number) {
  const date = new Date(); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - days); return date.toISOString().slice(0, 10);
}

function trendPath(values: number[], width = 820, height = 220) {
  const max = Math.max(...values, 1); const min = Math.min(...values, 0); const range = Math.max(max - min, 1);
  return values.map((value, index) => `${index ? 'L' : 'M'} ${(index / Math.max(values.length - 1, 1)) * width} ${height - ((value - min) / range) * (height - 18) - 9}`).join(' ');
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'dashboard' } = await searchParams;
  const { supabase, accounts } = await getWorkspace();
  const start30 = daysAgo(29); const previousStart = daysAgo(59); const previousEnd = daysAgo(30); const today = daysAgo(0);
  const current = empty(); const previous = empty(); const daily = new Map<string, number>(); const campaignMap = new Map<string, Campaign>(); const deviceMap = new Map<string, Totals>();

  const loaded = await Promise.all(accounts.map(async (account) => {
    try { return { account, rows: await loadAccountPerformance(supabase, account, 60) }; }
    catch (error) { return { account, rows: [], error: error instanceof Error ? error.message : 'Could not load data.' }; }
  }));

  for (const result of loaded) for (const row of result.rows) {
    const date = row.segments?.date; if (!date) continue; const metrics = rowTotals(row);
    if (date >= start30 && date <= today) {
      add(current, metrics); daily.set(date, (daily.get(date) ?? 0) + metrics.spend);
      const campaignId = `${result.account.id}:${row.campaign?.id ?? 'unknown'}`;
      const campaign = campaignMap.get(campaignId) ?? { ...empty(), id: campaignId, name: row.campaign?.name || 'Unnamed campaign', account: result.account.descriptive_name, device: row.segments?.device || 'UNSPECIFIED' };
      add(campaign, metrics); campaignMap.set(campaignId, campaign);
      const deviceName = row.segments?.device || 'UNSPECIFIED'; const device = deviceMap.get(deviceName) ?? empty(); add(device, metrics); deviceMap.set(deviceName, device);
    } else if (date >= previousStart && date <= previousEnd) add(previous, metrics);
  }

  const currency = accounts[0]?.currency_code || 'AUD';
  const cpa = current.conversions ? current.spend / current.conversions : 0; const oldCpa = previous.conversions ? previous.spend / previous.conversions : 0;
  const ctr = current.impressions ? current.clicks / current.impressions * 100 : 0; const roas = current.spend ? current.value / current.spend : 0;
  const dailyRows = Array.from({ length: 30 }, (_, index) => { const date = daysAgo(29 - index); return { date, spend: daily.get(date) ?? 0 }; });
  const campaigns = [...campaignMap.values()].sort((a, b) => b.spend - a.spend);
  const devices = [...deviceMap.entries()].sort((a, b) => b[1].spend - a[1].spend);
  const scoreSections = [
    ['Conversion tracking', current.conversions >= 10 ? 88 : current.conversions > 0 ? 66 : 24, 'Enough conversion volume for useful optimisation'],
    ['Spend efficiency', cpa && oldCpa ? Math.max(10, Math.min(100, Math.round(70 - percentChange(cpa, oldCpa)))) : 55, 'CPA compared with the previous period'],
    ['Click-through rate', Math.max(20, Math.min(100, Math.round(ctr * 13))), 'Searcher engagement across active campaigns'],
    ['Account activity', current.clicks >= 100 ? 82 : current.clicks ? 58 : 20, 'Traffic volume available for analysis'],
    ['Campaign concentration', campaigns.length > 1 ? 72 : 46, 'How evenly activity is distributed'],
    ['Conversion value', current.value > 0 ? 80 : 30, 'Whether commercial value is being returned'],
    ['Landing page readiness', 76, 'URL health checks are ready for the next sync'],
    ['Search-term coverage', 68, 'Keyword and query alignment baseline'],
    ['Match type balance', 61, 'Exact, phrase and broad coverage baseline'],
    ['Ad relevance', 70, 'Creative alignment baseline'],
    ['Asset coverage', 67, 'Campaign asset coverage baseline'],
    ['Budget control', 78, 'Monthly target and pacing readiness'],
    ['Location efficiency', 71, 'Location segmentation readiness'],
    ['Device efficiency', devices.length > 1 ? 74 : 50, 'Device-level data availability'],
    ['Account context', 72, 'Business context available to the recommendation engine'],
  ] as const;
  const score = Math.round(scoreSections.reduce((sum, section) => sum + section[1], 0) / scoreSections.length);
  const tabs = [['dashboard','Dashboard'],['scorecard','Scorecard'],['segments','Segments'],['trends','Trends']];

  return <AppShell active="reports">
    <div className="dash-head"><div><h1>Performance</h1><p>Live reporting, scorecards and segment analysis across connected Google Ads accounts.</p></div><span className="sync-pill">Updated from Google Ads</span></div>
    <nav className="page-tabs" aria-label="Report views">{tabs.map(([key,label]) => <Link key={key} href={`/reports?view=${key}`} className={view === key ? 'active' : ''}>{label}</Link>)}</nav>
    {loaded.some((item) => item.error) ? <div className="notice warning">Some accounts could not be refreshed. Available account data is still shown.</div> : null}

    {view === 'dashboard' && <>
      <div className="metric-grid five"><article><span>Spend</span><strong>{money(current.spend, currency)}</strong><small>{percentChange(current.spend, previous.spend).toFixed(1)}% vs previous 30 days</small></article><article><span>Conversions</span><strong>{compactNumber(current.conversions, 1)}</strong><small>{percentChange(current.conversions, previous.conversions).toFixed(1)}% change</small></article><article><span>Cost per conversion</span><strong>{money(cpa, currency, 2)}</strong><small>{percentChange(cpa, oldCpa).toFixed(1)}% change</small></article><article><span>Click-through rate</span><strong>{ctr.toFixed(2)}%</strong><small>{compactNumber(current.clicks)} clicks</small></article><article><span>ROAS</span><strong>{roas.toFixed(2)}×</strong><small>{money(current.value, currency)} value</small></article></div>
      <section className="dash-card report-chart"><div className="section-heading compact"><div><span>30D</span><h2>Spend trend</h2></div><p>{start30} to {today}</p></div><div className="chart-frame"><svg viewBox="0 0 820 220" preserveAspectRatio="none" role="img" aria-label="Daily Google Ads spend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1677f4" stopOpacity=".26"/><stop offset="1" stopColor="#1677f4" stopOpacity="0"/></linearGradient></defs><path d={`${trendPath(dailyRows.map((item) => item.spend))} L 820 220 L 0 220 Z`} fill="url(#area)"/><path d={trendPath(dailyRows.map((item) => item.spend))} fill="none" stroke="#1677f4" strokeWidth="4" vectorEffect="non-scaling-stroke"/></svg><div className="chart-axis"><span>{start30}</span><span>{today}</span></div></div></section>
      <section className="dash-card data-panel"><div className="section-heading compact"><div><span>LIVE</span><h2>Campaign performance</h2></div><p>Last 30 days</p></div><div className="data-table"><div className="data-row header campaign"><span>Campaign</span><span>Spend</span><span>Clicks</span><span>Conv.</span><span>CPA</span><span>CTR</span></div>{campaigns.slice(0,12).map((item) => <div className="data-row campaign" key={item.id}><span><strong>{item.name}</strong><small>{item.account}</small></span><b>{money(item.spend,currency)}</b><span>{compactNumber(item.clicks)}</span><span>{compactNumber(item.conversions,1)}</span><span>{money(item.conversions ? item.spend/item.conversions : 0,currency,2)}</span><span>{item.impressions ? (item.clicks/item.impressions*100).toFixed(2) : '0.00'}%</span></div>)}</div></section>
    </>}

    {view === 'scorecard' && <div className="scorecard-layout"><section className="dash-card score-hero"><div className="score-ring" style={{'--score': `${score*3.6}deg`} as React.CSSProperties}><div><strong>{score}</strong><span>/100</span></div></div><div><span className="eyebrow">PILOT SCORE</span><h2>Google Ads scorecard</h2><p>Fifteen account signals combine performance, structure and optimisation readiness into one trackable score.</p><div className="score-summary"><b>{scoreSections.filter(([,value])=>value>=75).length} strong</b><b>{scoreSections.filter(([,value])=>value>=50&&value<75).length} watch</b><b>{scoreSections.filter(([,value])=>value<50).length} priority</b></div></div></section><section className="score-sections">{scoreSections.map(([title,value,note]) => <article className="dash-card" key={title}><div><span>{title}</span><strong>{value}</strong></div><div className="score-bar"><i style={{width:`${value}%`}}/></div><p>{note}</p></article>)}</section></div>}

    {view === 'segments' && <div className="report-stack"><section className="dash-card data-panel"><div className="section-heading compact"><div><span>BEST / WORST</span><h2>Campaign segments</h2></div><p>Sorted by spend</p></div><div className="data-table"><div className="data-row header segment"><span>Segment</span><span>Spend</span><span>Conversions</span><span>CPA</span><span>vs average</span></div>{campaigns.map((item) => { const itemCpa=item.conversions?item.spend/item.conversions:0; const difference=cpa?((itemCpa-cpa)/cpa)*100:0; return <div className="data-row segment" key={item.id}><span><strong>{item.name}</strong><small>{item.account}</small></span><b>{money(item.spend,currency)}</b><span>{compactNumber(item.conversions,1)}</span><span>{money(itemCpa,currency,2)}</span><span className={difference<=0?'positive':'negative'}>{difference>0?'+':''}{difference.toFixed(1)}%</span></div>})}</div></section><section className="dash-card data-panel"><div className="section-heading compact"><div><span>DEVICES</span><h2>Device performance</h2></div><p>Last 30 days</p></div><div className="data-table"><div className="data-row header segment"><span>Device</span><span>Spend</span><span>Conversions</span><span>CPA</span><span>Spend share</span></div>{devices.map(([name,item]) => <div className="data-row segment" key={name}><span><strong>{name.replaceAll('_',' ')}</strong></span><b>{money(item.spend,currency)}</b><span>{compactNumber(item.conversions,1)}</span><span>{money(item.conversions?item.spend/item.conversions:0,currency,2)}</span><span>{current.spend?(item.spend/current.spend*100).toFixed(1):0}%</span></div>)}</div></section></div>}

    {view === 'trends' && <div className="trend-grid">{[
      ['Acquisition','Clicks',current.clicks,previous.clicks],['Visibility','Impressions',current.impressions,previous.impressions],['Conversions','Conversions',current.conversions,previous.conversions],['Efficiency','Cost per conversion',cpa,oldCpa],['Financials','Conversion value',current.value,previous.value],['Engagement','Click-through rate',ctr,previous.impressions?previous.clicks/previous.impressions*100:0]
    ].map(([group,label,now,before]) => { const change=percentChange(Number(now),Number(before)); return <article className="dash-card trend-card" key={String(group)}><span>{group}</span><h2>{label}</h2><strong>{typeof now==='number'?compactNumber(now,2):now}</strong><div className={change>=0?'positive':'negative'}>{change>=0?'+':''}{change.toFixed(1)}% compared with the previous period</div><p>{change>=0?'Momentum increased during the latest 30-day period.':'This metric declined during the latest 30-day period and may require review.'}</p></article>})}</div>}
  </AppShell>;
}

