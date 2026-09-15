import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAdsSearchTerms, getGoogleOAuthClient } from '@/lib/google-ads';
import { approveRecommendation, dismissRecommendation } from './actions';

type Recommendation = {
  key: string;
  accountId: string;
  accountName: string;
  customerId: string;
  currency: string;
  searchTerm: string;
  campaignName: string;
  adGroupName: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  conversionValue: number;
  kind: 'negative' | 'watch' | 'promote';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  accountCpa: number;
  reason: string;
};

type AccountBenchmarks = { spend: number; clicks: number; conversions: number; cpa: number };
type ReviewStatus = 'approved' | 'dismissed' | undefined;

const n = (value: string | number | undefined) => Number(value ?? 0) || 0;

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function priorityForWaste(spend: number, clicks: number, accountCpa: number): Recommendation['priority'] {
  const cpaRatio = accountCpa > 0 ? spend / accountCpa : 0;
  if (cpaRatio >= 1.5 || spend >= 300 || clicks >= 50) return 'critical';
  if (cpaRatio >= 1 || spend >= 180 || clicks >= 30) return 'high';
  if (cpaRatio >= 0.6 || spend >= 90 || clicks >= 18) return 'medium';
  return 'low';
}

function confidenceForWaste(spend: number, clicks: number, accountCpa: number, obviousIrrelevance: boolean) {
  const cpaRatio = accountCpa > 0 ? Math.min(spend / accountCpa, 2) : 0;
  const base = obviousIrrelevance ? 72 : 48;
  return Math.min(98, Math.round(base + Math.min(clicks, 18) + cpaRatio * 8));
}

const irrelevantIntentPatterns = [
  /\b(job|jobs|career|careers|salary|salaries|wage|wages|apprentice|apprenticeship)\b/i,
  /\b(course|courses|training|certificate|certification|tafe|university|college)\b/i,
  /\b(diy|do it yourself|how to|tutorial|youtube|reddit|forum)\b/i,
  /\b(free|pdf|manual|diagram|template|meaning|definition|what is)\b/i,
  /\b(parts only|spare parts|wholesale|supplier|suppliers|used|second hand)\b/i,
];

function hasLikelyIrrelevantIntent(term: string) {
  return irrelevantIntentPatterns.some((pattern) => pattern.test(term));
}

function HiddenRecommendationFields({ r }: { r: Recommendation }) {
  return <>
    <input type="hidden" name="recommendation_key" value={r.key}/>
    <input type="hidden" name="ad_account_id" value={r.accountId}/>
    <input type="hidden" name="kind" value={r.kind}/>
    <input type="hidden" name="search_term" value={r.searchTerm}/>
    <input type="hidden" name="account_name" value={r.accountName}/>
    <input type="hidden" name="campaign_name" value={r.campaignName}/>
    <input type="hidden" name="ad_group_name" value={r.adGroupName}/>
    <input type="hidden" name="currency" value={r.currency}/>
    <input type="hidden" name="priority" value={r.priority}/>
    <input type="hidden" name="reason" value={r.reason}/>
    <input type="hidden" name="spend" value={r.spend}/>
    <input type="hidden" name="clicks" value={r.clicks}/>
    <input type="hidden" name="impressions" value={r.impressions}/>
    <input type="hidden" name="conversions" value={r.conversions}/>
    <input type="hidden" name="confidence" value={r.confidence}/>
  </>;
}

function ReviewActions({ r, status }: { r: Recommendation; status: ReviewStatus }) {
  return <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
    {status ? <span style={{ fontSize: 11, fontWeight: 800, padding: '6px 9px', borderRadius: 999, background: status === 'approved' ? '#ecfdf3' : '#f2f4f7', color: status === 'approved' ? '#027a48' : '#475467', textTransform: 'capitalize' }}>{status}</span> : null}
    {status !== 'approved' ? <form action={approveRecommendation}>
      <HiddenRecommendationFields r={r}/>
      <button type="submit" style={{ border: 0, borderRadius: 8, padding: '8px 11px', background: '#2176ff', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Approve</button>
    </form> : null}
    {status !== 'dismissed' ? <form action={dismissRecommendation}>
      <HiddenRecommendationFields r={r}/>
      <button type="submit" style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: '7px 10px', background: 'white', color: '#344054', fontWeight: 800, cursor: 'pointer' }}>Dismiss</button>
    </form> : null}
  </div>;
}

export default async function ImprovementsPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  const { data: membership } = userId
    ? await supabase.from('organisation_members').select('organisation_id').eq('user_id', userId).limit(1).maybeSingle()
    : { data: null } as any;

  const { data: accounts } = membership
    ? await supabase
        .from('ad_accounts')
        .select('id, customer_id, descriptive_name, currency_code, google_connection_id, manager_customer_id, is_manager')
        .eq('organisation_id', membership.organisation_id)
        .eq('is_manager', false)
        .order('descriptive_name')
    : { data: [] } as any;

  const tokenCache = new Map<string, Promise<string>>();
  const getAccessToken = (connectionId: string) => {
    if (!tokenCache.has(connectionId)) {
      tokenCache.set(connectionId, (async () => {
        const { data: refreshToken, error } = await supabase.rpc('get_google_oauth_refresh_token', { p_connection_id: connectionId });
        if (error || !refreshToken) throw new Error('Could not read Google Ads credentials.');
        const oauth = getGoogleOAuthClient();
        oauth.setCredentials({ refresh_token: refreshToken });
        const access = await oauth.getAccessToken();
        const token = typeof access === 'string' ? access : access?.token;
        if (!token) throw new Error('Could not refresh Google Ads access.');
        return token;
      })());
    }
    return tokenCache.get(connectionId)!;
  };

  const recommendations: Recommendation[] = [];
  const errors: string[] = [];

  for (const account of accounts ?? []) {
    try {
      if (!account.google_connection_id) continue;
      const accessToken = await getAccessToken(account.google_connection_id);
      const rows = await getGoogleAdsSearchTerms(accessToken, account.customer_id, account.manager_customer_id, 60);
      const grouped = new Map<string, Recommendation>();
      const benchmark: AccountBenchmarks = { spend: 0, clicks: 0, conversions: 0, cpa: 0 };

      for (const row of rows) {
        const searchTerm = row.searchTermView?.searchTerm?.trim();
        if (!searchTerm) continue;
        const spend = n(row.metrics?.costMicros) / 1_000_000;
        const clicks = n(row.metrics?.clicks);
        const conversions = n(row.metrics?.conversions);
        benchmark.spend += spend;
        benchmark.clicks += clicks;
        benchmark.conversions += conversions;

        const campaignName = row.campaign?.name || 'Unknown campaign';
        const adGroupName = row.adGroup?.name || 'Unknown ad group';
        const key = `${searchTerm.toLowerCase()}|${String(row.campaign?.id ?? '')}|${String(row.adGroup?.id ?? '')}`;
        const existing = grouped.get(key) ?? {
          key: `${account.id}:${key}`,
          accountId: account.id,
          accountName: account.descriptive_name || `Google Ads ${account.customer_id}`,
          customerId: account.customer_id,
          currency: account.currency_code || 'AUD',
          searchTerm,
          campaignName,
          adGroupName,
          spend: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          conversionValue: 0,
          kind: 'watch' as const,
          priority: 'low' as const,
          confidence: 0,
          accountCpa: 0,
          reason: '',
        };
        existing.spend += spend;
        existing.clicks += clicks;
        existing.impressions += n(row.metrics?.impressions);
        existing.conversions += conversions;
        existing.conversionValue += n(row.metrics?.conversionsValue);
        grouped.set(key, existing);
      }

      benchmark.cpa = benchmark.conversions > 0 ? benchmark.spend / benchmark.conversions : 0;
      const nonConverterFloor = Math.max(50, benchmark.cpa > 0 ? benchmark.cpa * 0.75 : 100);

      for (const item of grouped.values()) {
        item.accountCpa = benchmark.cpa;
        const obviousIrrelevance = hasLikelyIrrelevantIntent(item.searchTerm);

        if (item.conversions === 0 && item.clicks >= 4 && item.spend >= 20 && obviousIrrelevance) {
          item.kind = 'negative';
          item.priority = priorityForWaste(item.spend, item.clicks, benchmark.cpa);
          item.confidence = confidenceForWaste(item.spend, item.clicks, benchmark.cpa, true);
          item.reason = 'The query contains signals commonly associated with research, employment, training, DIY or other low-commercial intent.';
          recommendations.push(item);
        } else if (item.conversions === 0 && item.clicks >= 8 && item.spend >= nonConverterFloor) {
          item.kind = 'watch';
          item.priority = priorityForWaste(item.spend, item.clicks, benchmark.cpa);
          item.confidence = confidenceForWaste(item.spend, item.clicks, benchmark.cpa, false);
          item.reason = benchmark.cpa > 0
            ? `This term has spent ${money(item.spend, item.currency)} without a conversion. The account search-term CPA is about ${money(benchmark.cpa, item.currency)}.`
            : 'This term has significant spend and click volume without a recorded conversion.';
          recommendations.push(item);
        } else if (item.conversions >= 2 && item.clicks >= 3) {
          item.kind = 'promote';
          item.priority = item.conversions >= 8 ? 'high' : item.conversions >= 4 ? 'medium' : 'low';
          item.confidence = Math.min(98, Math.round(65 + Math.min(item.conversions * 4, 28)));
          item.reason = 'This search term has converted multiple times and may deserve dedicated keyword coverage.';
          recommendations.push(item);
        }
      }
    } catch (error) {
      errors.push(`${account.descriptive_name || account.customer_id}: ${error instanceof Error ? error.message : 'Could not load search terms.'}`);
    }
  }

  const keys = recommendations.map((r) => r.key);
  const { data: savedReviews } = membership && keys.length
    ? await supabase.from('recommendations').select('recommendation_key,status').eq('organisation_id', membership.organisation_id).in('recommendation_key', keys)
    : { data: [] } as any;
  const statusMap = new Map<string, ReviewStatus>((savedReviews ?? []).map((row: any) => [row.recommendation_key, row.status]));

  const negatives = recommendations.filter((r) => r.kind === 'negative').sort((a, b) => b.spend - a.spend);
  const watchlist = recommendations.filter((r) => r.kind === 'watch').sort((a, b) => b.spend - a.spend);
  const winners = recommendations.filter((r) => r.kind === 'promote').sort((a, b) => b.conversions - a.conversions);
  const negativeSpend = negatives.reduce((sum, item) => sum + item.spend, 0);
  const watchSpend = watchlist.reduce((sum, item) => sum + item.spend, 0);
  const approvedCount = [...statusMap.values()].filter((status) => status === 'approved').length;
  const dismissedCount = [...statusMap.values()].filter((status) => status === 'dismissed').length;
  const currency = (accounts?.[0]?.currency_code || 'AUD') as string;

  return <AppShell active="improvements">
    <div className="dash-head"><div><h1>Improvements</h1><p>Search-term opportunities generated from the last 60 days of live Google Ads data.</p></div></div>
    {errors.length ? <div className="auth-error" style={{ marginBottom: 20 }}>{errors[0]}</div> : null}

    <div className="kpi-grid" style={{ marginBottom: 20 }}>
      <article className="kpi-card"><div className="kpi-label"><span>Likely negative keywords</span></div><strong>{negatives.length}</strong><div className="kpi-bottom"><small>Terms with low-commercial intent signals</small></div></article>
      <article className="kpi-card"><div className="kpi-label"><span>Negative-candidate spend</span></div><strong>{money(negativeSpend, currency)}</strong><div className="kpi-bottom"><small>Spend on likely irrelevant terms</small></div></article>
      <article className="kpi-card"><div className="kpi-label"><span>High-cost watchlist</span></div><strong>{watchlist.length}</strong><div className="kpi-bottom"><small>{money(watchSpend, currency)} spent on non-converters</small></div></article>
      <article className="kpi-card"><div className="kpi-label"><span>Reviewed</span></div><strong>{approvedCount + dismissedCount}</strong><div className="kpi-bottom"><small>{approvedCount} approved · {dismissedCount} dismissed</small></div></article>
    </div>

    <section className="dash-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div className="card-title" style={{ padding: '22px 24px 8px' }}><div><h2>Likely negative keywords</h2><p style={{ margin: '4px 0 0', color: '#667085' }}>Approve stores the recommendation for the future Apply queue. It does not change Google Ads yet.</p></div></div>
      {negatives.length ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 1240 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.25fr .65fr .55fr .7fr .65fr 1.25fr', gap: 12, padding: '10px 24px', background: '#f9fafb', color: '#667085', fontSize: 12, fontWeight: 700 }}><span>Search term</span><span>Account</span><span>Campaign</span><span>Spend</span><span>Clicks</span><span>Priority</span><span>Confidence</span><span>Decision</span></div>
        {negatives.slice(0, 100).map((r) => <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.25fr .65fr .55fr .7fr .65fr 1.25fr', gap: 12, padding: '15px 24px', borderTop: '1px solid #eaecf0', alignItems: 'center' }}>
          <div><strong>{r.searchTerm}</strong><small style={{ display: 'block', color: '#667085', marginTop: 3 }}>{r.adGroupName}</small></div><span>{r.accountName}</span><span>{r.campaignName}</span><strong>{money(r.spend, r.currency)}</strong><span>{r.clicks.toLocaleString('en-AU')}</span><span className={`status-pill ${r.priority === 'critical' ? 'critical' : r.priority === 'high' ? 'warning' : r.priority === 'medium' ? 'watch' : 'good'}`}>{r.priority}</span><strong>{r.confidence}%</strong><ReviewActions r={r} status={statusMap.get(r.key)}/>
        </div>)}
      </div></div> : <div style={{ padding: 28, color: '#667085' }}>No search terms currently meet the stricter likely-negative criteria.</div>}
    </section>

    <section className="dash-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div className="card-title" style={{ padding: '22px 24px 8px' }}><div><h2>High-cost non-converters</h2><p style={{ margin: '4px 0 0', color: '#667085' }}>Relevant-looking terms stay separate from likely negatives. Approving means “keep this in the review queue”, not “block this search”.</p></div></div>
      {watchlist.length ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 1320 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1.2fr .65fr .55fr .7fr 1.4fr 1.2fr', gap: 12, padding: '10px 24px', background: '#f9fafb', color: '#667085', fontSize: 12, fontWeight: 700 }}><span>Search term</span><span>Account</span><span>Campaign</span><span>Spend</span><span>Clicks</span><span>Priority</span><span>Why flagged</span><span>Decision</span></div>
        {watchlist.slice(0, 100).map((r) => <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1.2fr .65fr .55fr .7fr 1.4fr 1.2fr', gap: 12, padding: '15px 24px', borderTop: '1px solid #eaecf0', alignItems: 'center' }}>
          <div><strong>{r.searchTerm}</strong><small style={{ display: 'block', color: '#667085', marginTop: 3 }}>{r.adGroupName}</small></div><span>{r.accountName}</span><span>{r.campaignName}</span><strong>{money(r.spend, r.currency)}</strong><span>{r.clicks.toLocaleString('en-AU')}</span><span className={`status-pill ${r.priority === 'critical' ? 'critical' : r.priority === 'high' ? 'warning' : r.priority === 'medium' ? 'watch' : 'good'}`}>{r.priority}</span><small style={{ color: '#667085', lineHeight: 1.4 }}>{r.reason}</small><ReviewActions r={r} status={statusMap.get(r.key)}/>
        </div>)}
      </div></div> : <div style={{ padding: 28, color: '#667085' }}>No relevant-looking terms currently exceed the account-aware non-converter threshold.</div>}
    </section>

    <section className="dash-card" style={{ overflow: 'hidden' }}>
      <div className="card-title" style={{ padding: '22px 24px 8px' }}><div><h2>Strong converting search terms</h2><p style={{ margin: '4px 0 0', color: '#667085' }}>Approve stores these as keyword opportunities for the future Apply queue.</p></div></div>
      {winners.length ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 1100 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.3fr .65fr .65fr .65fr 1.2fr', gap: 12, padding: '10px 24px', background: '#f9fafb', color: '#667085', fontSize: 12, fontWeight: 700 }}><span>Search term</span><span>Account</span><span>Campaign</span><span>Conversions</span><span>Spend</span><span>Confidence</span><span>Decision</span></div>
        {winners.slice(0, 100).map((r) => <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1.3fr .65fr .65fr .65fr 1.2fr', gap: 12, padding: '15px 24px', borderTop: '1px solid #eaecf0', alignItems: 'center' }}>
          <div><strong>{r.searchTerm}</strong><small style={{ display: 'block', color: '#667085', marginTop: 3 }}>{r.adGroupName}</small></div><span>{r.accountName}</span><span>{r.campaignName}</span><strong>{r.conversions.toFixed(1)}</strong><span>{money(r.spend, r.currency)}</span><strong>{r.confidence}%</strong><ReviewActions r={r} status={statusMap.get(r.key)}/>
        </div>)}
      </div></div> : <div style={{ padding: 28, color: '#667085' }}>No search terms currently meet the converting-term threshold.</div>}
    </section>
  </AppShell>;
}
