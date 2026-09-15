import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAdsPerformance, getGoogleOAuthClient } from '@/lib/google-ads';

const n = (value: string | number | undefined) => Number(value ?? 0) || 0;

function money(value: number, currency: string, decimals = 0) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);
  } catch {
    return `$${value.toFixed(decimals)}`;
  }
}

function number(value: number, decimals = 0) {
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: decimals }).format(value);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';
}

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: account } = await supabase
    .from('ad_accounts')
    .select('id, customer_id, descriptive_name, currency_code, status, google_connection_id, manager_customer_id, last_synced_at')
    .eq('id', id)
    .maybeSingle();

  if (!account) notFound();

  let rows: Awaited<ReturnType<typeof getGoogleAdsPerformance>> = [];
  let loadError: string | null = null;
  try {
    if (!account.google_connection_id) throw new Error('This account is missing its Google connection.');
    const { data: refreshToken, error } = await supabase.rpc('get_google_oauth_refresh_token', { p_connection_id: account.google_connection_id });
    if (error || !refreshToken) throw new Error('Could not read the Google Ads connection credentials.');
    const oauthClient = getGoogleOAuthClient();
    oauthClient.setCredentials({ refresh_token: refreshToken });
    const access = await oauthClient.getAccessToken();
    const accessToken = typeof access === 'string' ? access : access?.token;
    if (!accessToken) throw new Error('Could not refresh Google Ads access.');
    rows = await getGoogleAdsPerformance(accessToken, account.customer_id, account.manager_customer_id || undefined);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load Google Ads performance.';
  }

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);
  const startKey = start.toISOString().slice(0, 10);

  let spend = 0;
  let clicks = 0;
  let impressions = 0;
  let conversions = 0;
  let conversionValue = 0;
  const campaigns = new Map<string, { id: string; name: string; status: string; spend: number; clicks: number; impressions: number; conversions: number }>();

  for (const row of rows) {
    const date = row.segments?.date;
    if (!date || date < startKey) continue;
    const rowSpend = n(row.metrics?.costMicros) / 1_000_000;
    const rowClicks = n(row.metrics?.clicks);
    const rowImpressions = n(row.metrics?.impressions);
    const rowConversions = n(row.metrics?.conversions);
    spend += rowSpend;
    clicks += rowClicks;
    impressions += rowImpressions;
    conversions += rowConversions;
    conversionValue += n(row.metrics?.conversionsValue);

    const campaignId = String(row.campaign?.id ?? 'unknown');
    const campaign = campaigns.get(campaignId) ?? {
      id: campaignId,
      name: row.campaign?.name || `Campaign ${campaignId}`,
      status: row.campaign?.status || 'UNKNOWN',
      spend: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
    };
    campaign.spend += rowSpend;
    campaign.clicks += rowClicks;
    campaign.impressions += rowImpressions;
    campaign.conversions += rowConversions;
    campaigns.set(campaignId, campaign);
  }

  const apiCustomer = rows.find((row) => row.customer)?.customer;
  const name = apiCustomer?.descriptiveName || account.descriptive_name || `Google Ads ${account.customer_id}`;
  const currency = apiCustomer?.currencyCode || account.currency_code || 'AUD';
  const cpa = conversions ? spend / conversions : 0;
  const ctr = impressions ? (clicks / impressions) * 100 : 0;
  const roas = spend ? conversionValue / spend : 0;
  const campaignRows = [...campaigns.values()].sort((a, b) => b.spend - a.spend);

  return <AppShell active="accounts">
    <div className="breadcrumb"><Link href="/dashboard">Dashboard</Link> <span>›</span> {name}</div>
    <div className="account-page-head">
      <div className="account-title"><div className="account-avatar large good">{initials(name)}</div><div><h1>{name}</h1><p>Google Ads account <span>•</span> {account.customer_id}</p></div></div>
      <div className="head-actions"><Link href="/dashboard" className="button secondary">Back to dashboard</Link><Link href="/dashboard/connect-google-ads" className="button">Manage connection</Link></div>
    </div>

    {loadError ? <div className="auth-error" style={{ marginBottom: 20 }}>{loadError}</div> : null}

    <div className="account-tabs"><span className="active">Overview</span><a href="#campaigns">Campaigns <span>{campaignRows.length}</span></a><Link href="/improvements">Improvements</Link><Link href={`/toolkit?view=ngrams&account=${account.id}`}>Search terms</Link><Link href={`/settings?account=${account.id}`}>Budget and targets</Link></div>

    <div className="account-overview-grid">
      <div className="metric-card"><div className="metric-top"><span>Spend</span><div className="metric-icon purple">$</div></div><div className="metric-number">{money(spend, currency)}</div><div className="metric-change"><span>Last 30 days</span></div></div>
      <div className="metric-card"><div className="metric-top"><span>Conversions</span><div className="metric-icon blue">◎</div></div><div className="metric-number">{number(conversions, 1)}</div><div className="metric-change"><span>{number(clicks)} clicks</span></div></div>
      <div className="metric-card"><div className="metric-top"><span>Cost / conversion</span><div className="metric-icon amber">↗</div></div><div className="metric-number">{money(cpa, currency, 2)}</div><div className="metric-change"><span>{ctr.toFixed(2)}% CTR</span></div></div>
      <div className="metric-card"><div className="metric-top"><span>ROAS</span><div className="metric-icon blue">×</div></div><div className="metric-number">{roas.toFixed(2)}x</div><div className="metric-change"><span>{money(conversionValue, currency)} conversion value</span></div></div>
    </div>

    <section id="campaigns" className="dash-card" style={{ marginTop: 24, overflow: 'hidden' }}>
      <div className="card-title" style={{ padding: '22px 24px 14px' }}><h2>Campaign performance</h2><span style={{ color: '#667085', fontSize: 13 }}>Last 30 days</span></div>
      {campaignRows.length ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 760 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr .8fr .8fr .8fr .8fr', gap: 12, padding: '10px 24px', background: '#f9fafb', color: '#667085', fontSize: 12, fontWeight: 700 }}><span>Campaign</span><span>Spend</span><span>Clicks</span><span>CTR</span><span>Conversions</span></div>
        {campaignRows.map((campaign) => <div key={campaign.id} style={{ display: 'grid', gridTemplateColumns: '2fr .8fr .8fr .8fr .8fr', gap: 12, padding: '15px 24px', borderTop: '1px solid #eaecf0', alignItems: 'center' }}>
          <div><strong>{campaign.name}</strong><small style={{ display: 'block', color: '#667085', marginTop: 3 }}>{campaign.status}</small></div>
          <strong>{money(campaign.spend, currency)}</strong>
          <span>{number(campaign.clicks)}</span>
          <span>{campaign.impressions ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00'}%</span>
          <span>{number(campaign.conversions, 1)}</span>
        </div>)}
      </div></div> : <div style={{ padding: '0 24px 24px', color: '#667085' }}>No campaign activity was returned for the last 30 days.</div>}
    </section>

    <section className="dash-card" style={{ marginTop: 24, padding: 24 }}>
      <div className="card-title"><h2>Optimisation engine</h2><span style={{ color: '#078a5b', fontSize: 13, fontWeight: 800 }}>Active</span></div>
      <p style={{ color: '#667085' }}>Pilot Ads is analysing search terms, campaign efficiency, budgets and account health for this account.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link href="/improvements" className="blue-button">Review improvements</Link><Link href={`/toolkit?view=ngrams&account=${account.id}`} className="outline-button">Open N-Gram Finder</Link><Link href={`/settings?account=${account.id}`} className="outline-button">Set account safeguards</Link></div>
    </section>
  </AppShell>;
}
