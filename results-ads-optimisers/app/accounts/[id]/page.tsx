import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAdsPerformance, getGoogleOAuthClient } from '@/lib/google-ads';

const n = (value: string | number | undefined) => Number(value ?? 0) || 0;

function money(value: number, currency: string, decimals = 0) {
  try { return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value); }
  catch { return `$${value.toFixed(decimals)}`; }
}
function number(value: number, decimals = 0) { return new Intl.NumberFormat('en-AU', { maximumFractionDigits: decimals }).format(value); }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA'; }
function change(now:number,before:number){ if(!before) return now?100:0; return ((now-before)/before)*100; }
function pct(value:number){ return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`; }
function dateKey(daysAgo:number){ const d=new Date(); d.setUTCHours(0,0,0,0); d.setUTCDate(d.getUTCDate()-daysAgo); return d.toISOString().slice(0,10); }
function trendPath(values:number[], width=820, height=210){ const max=Math.max(...values,1); const min=Math.min(...values,0); const range=Math.max(max-min,1); return values.map((v,i)=>`${i?'L':'M'} ${(i/Math.max(values.length-1,1))*width} ${height-((v-min)/range)*(height-18)-9}`).join(' '); }

type Totals={spend:number;clicks:number;impressions:number;conversions:number;value:number};
const empty=():Totals=>({spend:0,clicks:0,impressions:0,conversions:0,value:0});
function add(target:Totals,row:any){ target.spend+=n(row.metrics?.costMicros)/1_000_000; target.clicks+=n(row.metrics?.clicks); target.impressions+=n(row.metrics?.impressions); target.conversions+=n(row.metrics?.conversions); target.value+=n(row.metrics?.conversionsValue); }

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: account } = await supabase.from('ad_accounts').select('id, customer_id, descriptive_name, currency_code, status, google_connection_id, manager_customer_id, optimisation_score, last_synced_at').eq('id', id).maybeSingle();
  if (!account) notFound();

  let rows: Awaited<ReturnType<typeof getGoogleAdsPerformance>> = [];
  let loadError: string | null = null;
  try {
    if (!account.google_connection_id) throw new Error('This account is missing its Google connection.');
    const { data: refreshToken, error } = await supabase.rpc('get_google_oauth_refresh_token', { p_connection_id: account.google_connection_id });
    if (error || !refreshToken) throw new Error('Could not read the Google Ads connection credentials.');
    const oauthClient = getGoogleOAuthClient(); oauthClient.setCredentials({ refresh_token: refreshToken });
    const access = await oauthClient.getAccessToken(); const accessToken = typeof access === 'string' ? access : access?.token;
    if (!accessToken) throw new Error('Could not refresh Google Ads access.');
    rows = await getGoogleAdsPerformance(accessToken, account.customer_id, account.manager_customer_id || undefined);
  } catch (error) { loadError = error instanceof Error ? error.message : 'Could not load Google Ads performance.'; }

  const current=empty(), previous=empty();
  const daily=new Map<string,Totals>();
  const campaigns=new Map<string,{id:string;name:string;status:string;current:Totals;previous:Totals}>();
  const currentStart=dateKey(29), previousStart=dateKey(59), previousEnd=dateKey(30), today=dateKey(0);

  for(const row of rows){
    const date=row.segments?.date; if(!date) continue;
    const campaignId=String(row.campaign?.id??'unknown');
    const campaign=campaigns.get(campaignId)??{id:campaignId,name:row.campaign?.name||`Campaign ${campaignId}`,status:row.campaign?.status||'UNKNOWN',current:empty(),previous:empty()};
    if(date>=currentStart&&date<=today){ add(current,row); add(campaign.current,row); const day=daily.get(date)??empty(); add(day,row); daily.set(date,day); }
    else if(date>=previousStart&&date<=previousEnd){ add(previous,row); add(campaign.previous,row); }
    campaigns.set(campaignId,campaign);
  }

  const apiCustomer=rows.find((row)=>row.customer)?.customer;
  const name=apiCustomer?.descriptiveName||account.descriptive_name||`Google Ads ${account.customer_id}`;
  const currency=apiCustomer?.currencyCode||account.currency_code||'AUD';
  const cpa=current.conversions?current.spend/current.conversions:0, oldCpa=previous.conversions?previous.spend/previous.conversions:0;
  const ctr=current.impressions?(current.clicks/current.impressions)*100:0, oldCtr=previous.impressions?(previous.clicks/previous.impressions)*100:0;
  const roas=current.spend?current.value/current.spend:0, oldRoas=previous.spend?previous.value/previous.spend:0;
  const campaignRows=[...campaigns.values()].sort((a,b)=>b.current.spend-a.current.spend);
  const activeCampaigns=campaignRows.filter(c=>c.status==='ENABLED').length;
  const improving=campaignRows.filter(c=>change(c.current.conversions,c.previous.conversions)>0).length;
  const declining=campaignRows.filter(c=>change(c.current.conversions,c.previous.conversions)<-10).length;
  const inefficient=campaignRows.filter(c=>c.current.conversions>0&&cpa>0&&(c.current.spend/c.current.conversions)>cpa*1.35).length;
  const days=Array.from({length:30},(_,i)=>{const d=dateKey(29-i);return {date:d,metrics:daily.get(d)??empty()};});
  const score=Math.round(account.optimisation_score ?? Math.max(42,Math.min(93,70+(current.conversions>0?8:0)+(ctr>4?6:0)+(roas>2?5:0)-inefficient*2-declining)));

  const { count: improvementCount } = await supabase.from('recommendations').select('id',{count:'exact',head:true}).eq('ad_account_id',account.id).eq('status','pending');
  const { data: recentChanges } = await supabase.from('audit_logs').select('id,event_type,metadata,created_at').eq('entity_id',account.id).order('created_at',{ascending:false}).limit(5);

  return <AppShell active="performance">
    <div className="pro-account-head">
      <div className="pro-account-title"><div className="account-avatar large good">{initials(name)}</div><div><div className="breadcrumb"><Link href="/dashboard">Accounts</Link><span>›</span>{name}</div><h1>{name}</h1><p>{account.customer_id} · {account.status} · Last 30 days</p></div></div>
      <div className="head-actions"><Link href={`/improvements?account=${account.id}&view=active`} className="button secondary">{improvementCount ?? 0} improvements</Link><Link href="/dashboard/connect-google-ads" className="button">Manage connection</Link></div>
    </div>

    {loadError ? <div className="auth-error" style={{ marginBottom: 20 }}>{loadError}</div> : null}

    <div className="account-tabs"><span className="active">Overview</span><a href="#campaigns">Campaigns <span>{campaignRows.length}</span></a><Link href={`/improvements?account=${account.id}&view=active`}>Improvements</Link><Link href={`/reports?account=${account.id}&view=dashboard`}>Reports</Link><Link href={`/toolkit?view=ngrams&account=${account.id}`}>Search terms</Link><Link href={`/settings?account=${account.id}`}>Targets</Link></div>

    <div className="pro-kpi-grid">
      <article><span>Spend</span><strong>{money(current.spend,currency)}</strong><small className={change(current.spend,previous.spend)>=0?'negative':'positive'}>{pct(change(current.spend,previous.spend))} vs previous</small></article>
      <article><span>Conversions</span><strong>{number(current.conversions,1)}</strong><small className={change(current.conversions,previous.conversions)>=0?'positive':'negative'}>{pct(change(current.conversions,previous.conversions))} vs previous</small></article>
      <article><span>Cost / conv.</span><strong>{money(cpa,currency,2)}</strong><small className={change(cpa,oldCpa)<=0?'positive':'negative'}>{pct(change(cpa,oldCpa))} vs previous</small></article>
      <article><span>CTR</span><strong>{ctr.toFixed(2)}%</strong><small className={change(ctr,oldCtr)>=0?'positive':'negative'}>{pct(change(ctr,oldCtr))} vs previous</small></article>
      <article><span>ROAS</span><strong>{roas.toFixed(2)}x</strong><small className={change(roas,oldRoas)>=0?'positive':'negative'}>{pct(change(roas,oldRoas))} vs previous</small></article>
    </div>

    <div className="pro-overview-grid">
      <section className="dash-card pro-chart-card"><div className="section-heading compact"><div><span>PERFORMANCE</span><h2>30-day spend trend</h2></div><p>{currentStart} to {today}</p></div><div className="chart-frame"><svg viewBox="0 0 820 210" preserveAspectRatio="none"><defs><linearGradient id="accountArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#246bfd" stopOpacity=".22"/><stop offset="1" stopColor="#246bfd" stopOpacity="0"/></linearGradient></defs><path d={`${trendPath(days.map(d=>d.metrics.spend))} L 820 210 L 0 210 Z`} fill="url(#accountArea)"/><path d={trendPath(days.map(d=>d.metrics.spend))} fill="none" stroke="#246bfd" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="chart-axis"><span>{currentStart}</span><span>{today}</span></div></div></section>
      <aside className="dash-card pro-health-card"><div className="pro-score"><span>Optimisation score</span><strong>{score}</strong><small>/100</small></div><div className="score-bar"><i style={{width:`${score}%`}}/></div><div className="health-stat"><span>Active campaigns</span><b>{activeCampaigns}</b></div><div className="health-stat"><span>Improving</span><b className="positive">{improving}</b></div><div className="health-stat"><span>Declining</span><b className="negative">{declining}</b></div><div className="health-stat"><span>High CPA campaigns</span><b>{inefficient}</b></div><Link href={`/improvements?account=${account.id}&view=active`} className="primary-button">Review improvements</Link></aside>
    </div>

    <section id="campaigns" className="dash-card data-panel pro-campaigns"><div className="section-heading compact"><div><span>CAMPAIGNS</span><h2>Performance by campaign</h2></div><p>{campaignRows.length} campaigns · last 30 days</p></div><div className="data-table wide"><div className="data-row header pro-campaign-row"><span>Campaign</span><span>Status</span><span>Spend</span><span>Clicks</span><span>Conv.</span><span>CPA</span><span>CTR</span><span>Conv. trend</span></div>{campaignRows.map(c=>{const campaignCpa=c.current.conversions?c.current.spend/c.current.conversions:0;const campaignCtr=c.current.impressions?c.current.clicks/c.current.impressions*100:0;const convChange=change(c.current.conversions,c.previous.conversions);return <div className="data-row pro-campaign-row" key={c.id}><span><strong>{c.name}</strong><small>ID {c.id}</small></span><span className={`status-pill ${c.status==='ENABLED'?'good':'watch'}`}>{c.status.toLowerCase()}</span><b>{money(c.current.spend,currency)}</b><span>{number(c.current.clicks)}</span><span>{number(c.current.conversions,1)}</span><span>{money(campaignCpa,currency,2)}</span><span>{campaignCtr.toFixed(2)}%</span><span className={convChange>=0?'positive':'negative'}>{pct(convChange)}</span></div>})}</div></section>

    <div className="pro-bottom-grid">
      <section className="dash-card pro-action-card"><div className="section-heading compact"><div><span>PILOT ADS</span><h2>Optimisation engine</h2></div><span className="status-pill good">Active</span></div><div className="action-list"><Link href={`/improvements?account=${account.id}&view=active`}><div><strong>Review account improvements</strong><small>Search terms, keyword opportunities and efficiency issues</small></div><span>›</span></Link><Link href={`/toolkit?view=ngrams&account=${account.id}`}><div><strong>Open N-Gram Finder</strong><small>Find repeated words and phrases consuming budget</small></div><span>›</span></Link><Link href={`/reports?account=${account.id}&view=scorecard`}><div><strong>View scorecard</strong><small>Structure, performance and optimisation readiness</small></div><span>›</span></Link></div></section>
      <section className="dash-card pro-changes"><div className="section-heading compact"><div><span>ACTIVITY</span><h2>Recent changes</h2></div><Link href={`/toolkit?view=changes&account=${account.id}`}>View all</Link></div>{recentChanges?.length?recentChanges.map((log:any)=><div className="mini-change" key={log.id}><span>✓</span><div><strong>{String(log.event_type).replaceAll('_',' ')}</strong><small>{new Date(log.created_at).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short'})}</small></div></div>):<p className="muted-copy">No optimisation changes recorded yet.</p>}</section>
    </div>
  </AppShell>;
}
