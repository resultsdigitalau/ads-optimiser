import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAdsPerformance, getGoogleOAuthClient, GoogleAdsPerformanceRow } from '@/lib/google-ads';

type Totals = {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
};

type AccountResult = {
  id: string;
  customerId: string;
  name: string;
  currencyCode: string;
  status: string;
  current: Totals;
  previous: Totals;
  campaigns: Array<{ id: string; name: string; status: string; spend: number; clicks: number; conversions: number }>;
  dailySpend: Map<string, number>;
  error?: string;
};

const emptyTotals = (): Totals => ({ impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionValue: 0 });
const numberValue = (value: string | number | undefined) => Number(value ?? 0) || 0;

function addMetrics(target: Totals, row: GoogleAdsPerformanceRow) {
  target.impressions += numberValue(row.metrics?.impressions);
  target.clicks += numberValue(row.metrics?.clicks);
  target.spend += numberValue(row.metrics?.costMicros) / 1_000_000;
  target.conversions += numberValue(row.metrics?.conversions);
  target.conversionValue += numberValue(row.metrics?.conversionsValue);
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function change(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatMoney(value: number, currency = 'AUD', decimals = 0) {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(value);
  } catch {
    return `$${value.toFixed(decimals)}`;
  }
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits }).format(value);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: membership } = userId
    ? await supabase
        .from('organisation_members')
        .select('organisation_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
    : { data: null } as any;

  const { data: accounts } = membership
    ? await supabase
        .from('ad_accounts')
        .select('id, customer_id, descriptive_name, currency_code, status, is_manager, google_connection_id, manager_customer_id')
        .eq('organisation_id', membership.organisation_id)
        .eq('is_manager', false)
        .order('descriptive_name')
    : { data: [] } as any;

  const accessTokens = new Map<string, Promise<string>>();
  const getAccessToken = (connectionId: string) => {
    if (!accessTokens.has(connectionId)) {
      accessTokens.set(connectionId, (async () => {
        const { data: refreshToken, error } = await supabase.rpc('get_google_oauth_refresh_token', {
          p_connection_id: connectionId,
        });
        if (error || !refreshToken) throw new Error('Could not read the Google Ads connection credentials.');
        const oauthClient = getGoogleOAuthClient();
        oauthClient.setCredentials({ refresh_token: refreshToken });
        const access = await oauthClient.getAccessToken();
        const token = typeof access === 'string' ? access : access?.token;
        if (!token) throw new Error('Could not refresh Google Ads access.');
        return token;
      })());
    }
    return accessTokens.get(connectionId)!;
  };

  const currentStart = dateDaysAgo(29);
  const previousStart = dateDaysAgo(59);
  const previousEnd = dateDaysAgo(30);
  const today = dateDaysAgo(0);

  const results: AccountResult[] = await Promise.all((accounts ?? []).map(async (account: any) => {
    const current = emptyTotals();
    const previous = emptyTotals();
    const dailySpend = new Map<string, number>();
    const campaigns = new Map<string, { id: string; name: string; status: string; spend: number; clicks: number; conversions: number }>();

    try {
      if (!account.google_connection_id) throw new Error('This account is missing its Google connection.');
      const accessToken = await getAccessToken(account.google_connection_id);
      const rows = await getGoogleAdsPerformance(accessToken, account.customer_id, account.manager_customer_id || undefined);

      for (const row of rows) {
        const date = row.segments?.date;
        if (!date) continue;
        const isCurrent = date >= currentStart && date <= today;
        const isPrevious = date >= previousStart && date <= previousEnd;
        if (isCurrent) {
          addMetrics(current, row);
          dailySpend.set(date, (dailySpend.get(date) ?? 0) + numberValue(row.metrics?.costMicros) / 1_000_000);

          const campaignId = String(row.campaign?.id ?? 'unknown');
          const existing = campaigns.get(campaignId) ?? {
            id: campaignId,
            name: row.campaign?.name || `Campaign ${campaignId}`,
            status: row.campaign?.status || 'UNKNOWN',
            spend: 0,
            clicks: 0,
            conversions: 0,
          };
          existing.spend += numberValue(row.metrics?.costMicros) / 1_000_000;
          existing.clicks += numberValue(row.metrics?.clicks);
          existing.conversions += numberValue(row.metrics?.conversions);
          campaigns.set(campaignId, existing);
        } else if (isPrevious) {
          addMetrics(previous, row);
        }
      }

      const firstCustomer = rows.find((row) => row.customer)?.customer;
      return {
        id: account.id,
        customerId: account.customer_id,
        name: firstCustomer?.descriptiveName || account.descriptive_name || `Google Ads ${account.customer_id}`,
        currencyCode: firstCustomer?.currencyCode || account.currency_code || 'AUD',
        status: account.status || 'enabled',
        current,
        previous,
        campaigns: [...campaigns.values()].sort((a, b) => b.spend - a.spend),
        dailySpend,
      };
    } catch (error) {
      return {
        id: account.id,
        customerId: account.customer_id,
        name: account.descriptive_name || `Google Ads ${account.customer_id}`,
        currencyCode: account.currency_code || 'AUD',
        status: account.status || 'enabled',
        current,
        previous,
        campaigns: [],
        dailySpend,
        error: error instanceof Error ? error.message : 'Could not load Google Ads performance.',
      };
    }
  }));

  const totalCurrent = results.reduce((total, account) => {
    total.impressions += account.current.impressions;
    total.clicks += account.current.clicks;
    total.spend += account.current.spend;
    total.conversions += account.current.conversions;
    total.conversionValue += account.current.conversionValue;
    return total;
  }, emptyTotals());
  const totalPrevious = results.reduce((total, account) => {
    total.impressions += account.previous.impressions;
    total.clicks += account.previous.clicks;
    total.spend += account.previous.spend;
    total.conversions += account.previous.conversions;
    total.conversionValue += account.previous.conversionValue;
    return total;
  }, emptyTotals());

  const currency = results[0]?.currencyCode || 'AUD';
  const currentCpa = totalCurrent.conversions ? totalCurrent.spend / totalCurrent.conversions : 0;
  const previousCpa = totalPrevious.conversions ? totalPrevious.spend / totalPrevious.conversions : 0;
  const ctr = totalCurrent.impressions ? (totalCurrent.clicks / totalCurrent.impressions) * 100 : 0;
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = dateDaysAgo(29 - index);
    return { date, spend: results.reduce((sum, account) => sum + (account.dailySpend.get(date) ?? 0), 0) };
  });
  const maxDailySpend = Math.max(...daily.map((item) => item.spend), 1);
  const topCampaigns = results.flatMap((account) => account.campaigns.map((campaign) => ({ ...campaign, account }))).sort((a, b) => b.spend - a.spend).slice(0, 10);
  const errors = results.filter((account) => account.error);

  const kpis = [
    { label: 'Managed Spend', value: formatMoney(totalCurrent.spend, currency), change: formatPercent(change(totalCurrent.spend, totalPrevious.spend)), note: 'vs previous 30 days', tone: 'blue' },
    { label: 'Conversions', value: formatNumber(totalCurrent.conversions, 1), change: formatPercent(change(totalCurrent.conversions, totalPrevious.conversions)), note: 'vs previous 30 days', tone: 'green' },
    { label: 'Average CPA', value: formatMoney(currentCpa, currency, 2), change: formatPercent(change(currentCpa, previousCpa)), note: 'vs previous 30 days', tone: 'purple' },
    { label: 'Clicks', value: formatNumber(totalCurrent.clicks), change: formatPercent(change(totalCurrent.clicks, totalPrevious.clicks)), note: 'vs previous 30 days', tone: 'sky' },
    { label: 'CTR', value: `${ctr.toFixed(2)}%`, change: `${formatNumber(totalCurrent.impressions)} impressions`, note: `${results.length} account${results.length === 1 ? '' : 's'} connected`, tone: 'indigo' },
  ];

  return <AppShell>
    <div className="dash-head">
      <div><h1>Google Ads performance</h1><p>Live performance from the accounts connected to Pilot Ads.</p></div>
      <Link href="/dashboard/connect-google-ads" className="outline-button">Manage Google Ads</Link>
    </div>

    {!results.length ? (
      <section className="dash-card" style={{ padding: 32 }}>
        <h2>No Google Ads accounts connected yet</h2>
        <p style={{ color: '#667085' }}>Connect your Google Ads login and import an account to start seeing live performance.</p>
        <Link href="/dashboard/connect-google-ads" className="blue-button">Connect Google Ads →</Link>
      </section>
    ) : <>
      {errors.length ? <div className="auth-error" style={{ marginBottom: 20 }}>
        {errors.length} account{errors.length === 1 ? '' : 's'} could not be refreshed. {errors[0].error}
      </div> : null}

      <div className="kpi-grid">
        {kpis.map((kpi, index) => <article className="kpi-card" key={kpi.label}>
          <div className="kpi-label"><span>{kpi.label}</span><i className={`kpi-icon ${kpi.tone}`}>{index === 0 ? '▤' : index === 1 ? '◎' : index === 2 ? '$' : index === 3 ? '↗' : '%'}</i></div>
          <strong>{kpi.value}</strong>
          <div className="kpi-bottom"><span>{kpi.change}</span><small>{kpi.note}</small></div>
        </article>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 20, marginTop: 20 }}>
        <section className="dash-card" style={{ padding: 24 }}>
          <div className="card-title"><h2>Spend over the last 30 days</h2><span style={{ color: '#667085', fontSize: 13 }}>Live Google Ads data</span></div>
          <div style={{ height: 240, display: 'flex', alignItems: 'flex-end', gap: 4, paddingTop: 22, borderBottom: '1px solid #eaecf0' }}>
            {daily.map((item) => <div key={item.date} title={`${item.date}: ${formatMoney(item.spend, currency, 2)}`} style={{ flex: 1, minWidth: 3, height: `${Math.max((item.spend / maxDailySpend) * 100, item.spend ? 3 : 1)}%`, background: '#2176ff', borderRadius: '5px 5px 0 0', opacity: item.spend ? 1 : 0.15 }} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085', fontSize: 12, paddingTop: 8 }}><span>{currentStart}</span><span>{today}</span></div>
        </section>

        <section className="dash-card" style={{ padding: 24 }}>
          <div className="card-title"><h2>Account summary</h2><span className="systems-ok">● Connected</span></div>
          <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
            {results.map((account) => {
              const cpa = account.current.conversions ? account.current.spend / account.current.conversions : 0;
              return <Link href={`/accounts/${account.id}`} key={account.id} style={{ textDecoration: 'none', color: 'inherit', padding: '14px 0', borderTop: '1px solid #eaecf0', display: 'grid', gridTemplateColumns: '42px 1fr auto', gap: 12, alignItems: 'center' }}>
                <div className="account-avatar">{initials(account.name)}</div>
                <div><strong style={{ display: 'block' }}>{account.name}</strong><small style={{ color: '#667085' }}>{account.customerId}</small></div>
                <div style={{ textAlign: 'right' }}><strong style={{ display: 'block' }}>{formatMoney(account.current.spend, account.currencyCode)}</strong><small style={{ color: '#667085' }}>{formatMoney(cpa, account.currencyCode, 2)} CPA</small></div>
              </Link>;
            })}
          </div>
        </section>
      </div>

      <section className="dash-card" style={{ marginTop: 20, overflow: 'hidden' }}>
        <div className="card-title" style={{ padding: '22px 24px 14px' }}><h2>Top campaigns</h2><span style={{ color: '#667085', fontSize: 13 }}>Last 30 days</span></div>
        {topCampaigns.length ? <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 760 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr .8fr .8fr .8fr', gap: 12, padding: '10px 24px', background: '#f9fafb', color: '#667085', fontSize: 12, fontWeight: 700 }}>
              <span>Campaign</span><span>Account</span><span>Spend</span><span>Clicks</span><span>Conversions</span>
            </div>
            {topCampaigns.map((campaign) => <div key={`${campaign.account.id}-${campaign.id}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr .8fr .8fr .8fr', gap: 12, padding: '15px 24px', borderTop: '1px solid #eaecf0', alignItems: 'center' }}>
              <div><strong>{campaign.name}</strong><small style={{ display: 'block', color: '#667085', marginTop: 3 }}>{campaign.status}</small></div>
              <span>{campaign.account.name}</span>
              <strong>{formatMoney(campaign.spend, campaign.account.currencyCode)}</strong>
              <span>{formatNumber(campaign.clicks)}</span>
              <span>{formatNumber(campaign.conversions, 1)}</span>
            </div>)}
          </div>
        </div> : <div style={{ padding: '0 24px 24px', color: '#667085' }}>No campaign activity was returned for the last 30 days.</div>}
      </section>
    </>}
  </AppShell>;
}
