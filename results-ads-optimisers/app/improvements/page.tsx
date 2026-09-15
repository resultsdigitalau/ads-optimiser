import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { getGoogleAdsSearchTerms, getGoogleOAuthClient } from '@/lib/google-ads';

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
  kind: 'negative' | 'promote';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
};

const n = (value: string | number | undefined) => Number(value ?? 0) || 0;

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function priorityForWaste(spend: number, clicks: number): Recommendation['priority'] {
  if (spend >= 250 || clicks >= 50) return 'critical';
  if (spend >= 120 || clicks >= 30) return 'high';
  if (spend >= 50 || clicks >= 15) return 'medium';
  return 'low';
}

function confidenceForWaste(spend: number, clicks: number) {
  return Math.min(98, Math.round(55 + Math.min(spend / 10, 25) + Math.min(clicks, 18)));
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

      for (const row of rows) {
        const searchTerm = row.searchTermView?.searchTerm?.trim();
        if (!searchTerm) continue;
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
          kind: 'negative' as const,
          priority: 'low' as const,
          confidence: 0,
        };
        existing.spend += n(row.metrics?.costMicros) / 1_000_000;
        existing.clicks += n(row.metrics?.clicks);
        existing.impressions += n(row.metrics?.impressions);
        existing.conversions += n(row.metrics?.conversions);
        existing.conversionValue += n(row.metrics?.conversionsValue);
        grouped.set(key, existing);
      }

      for (const item of grouped.values()) {
        if (item.conversions === 0 && item.clicks >= 5 && item.spend >= 20) {
          item.kind = 'negative';
          item.priority = priorityForWaste(item.spend, item.clicks);
          item.confidence = confidenceForWaste(item.spend, item.clicks);
          recommendations.push(item);
        } else if (item.conversions >= 2 && item.clicks >= 3) {
          item.kind = 'promote';
          item.priority = item.conversions >= 8 ? 'high' : item.conversions >= 4 ? 'medium' : 'low';
          item.confidence = Math.min(98, Math.round(65 + Math.min(item.conversions * 4, 28)));
          recommendations.push(item);
        }
      }
    } catch (error) {
      errors.push(`${account.descriptive_name || account.customer_id}: ${error instanceof Error ? error.message : 'Could not load search terms.'}`);
    }
  }

  const negatives = recommendations.filter((r) => r.kind === 'negative').sort((a, b) => b.spend - a.spend);
  const winners = recommendations.filter((r) => r.kind === 'promote').sort((a, b) => b.conversions - a.conversions);
  const potentialWaste = negatives.reduce((sum, item) => sum + item.spend, 0);
  const currency = (accounts?.[0]?.currency_code || 'AUD') as string;

  return <AppShell active="improvements">
    <div className="dash-head">
      <div>
        <h1>Improvements</h1>
        <p>Search-term opportunities generated from the last 60 days of live Google Ads data.</p>
      </div>
    </div>

    {errors.length ? <div className="auth-error" style={{ marginBottom: 20 }}>{errors[0]}</div> : null}

    <div className="kpi-grid" style={{ marginBottom: 20 }}>
      <article className="kpi-card"><div className="kpi-label"><span>Negative keyword reviews</span></div><strong>{negatives.length}</strong><div className="kpi-bottom"><small>Zero-conversion search terms</small></div></article>
      <article className="kpi-card"><div className="kpi-label"><span>Potential wasted spend</span></div><strong>{money(potentialWaste, currency)}</strong><div className="kpi-bottom"><small>Spend on flagged terms over 60 days</small></div></article>
      <article className="kpi-card"><div className="kpi-label"><span>Winning search terms</span></div><strong>{winners.length}</strong><div className="kpi-bottom"><small>Terms worth reviewing as keywords</small></div></article>
      <article className="kpi-card"><div className="kpi-label"><span>Accounts analysed</span></div><strong>{accounts?.length ?? 0}</strong><div className="kpi-bottom"><small>Live client accounts</small></div></article>
    </div>

    <section className="dash-card" style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div className="card-title" style={{ padding: '22px 24px 8px' }}>
        <div><h2>Review as negative keywords</h2><p style={{ margin: '4px 0 0', color: '#667085' }}>Terms with at least 5 clicks, at least $20 spend and zero recorded conversions.</p></div>
      </div>
      {negatives.length ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 980 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.5fr .7fr .7fr .8fr .7fr', gap: 12, padding: '10px 24px', background: '#f9fafb', color: '#667085', fontSize: 12, fontWeight: 700 }}>
          <span>Search term</span><span>Account</span><span>Campaign</span><span>Spend</span><span>Clicks</span><span>Priority</span><span>Confidence</span>
        </div>
        {negatives.slice(0, 100).map((r) => <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.5fr .7fr .7fr .8fr .7fr', gap: 12, padding: '15px 24px', borderTop: '1px solid #eaecf0', alignItems: 'center' }}>
          <div><strong>{r.searchTerm}</strong><small style={{ display: 'block', color: '#667085', marginTop: 3 }}>{r.adGroupName}</small></div>
          <span>{r.accountName}</span>
          <span>{r.campaignName}</span>
          <strong>{money(r.spend, r.currency)}</strong>
          <span>{r.clicks.toLocaleString('en-AU')}</span>
          <span className={`status-pill ${r.priority === 'critical' ? 'critical' : r.priority === 'high' ? 'warning' : r.priority === 'medium' ? 'watch' : 'good'}`}>{r.priority}</span>
          <strong>{r.confidence}%</strong>
        </div>)}
      </div></div> : <div style={{ padding: 28, color: '#667085' }}>No zero-conversion search terms currently meet the review threshold.</div>}
    </section>

    <section className="dash-card" style={{ overflow: 'hidden' }}>
      <div className="card-title" style={{ padding: '22px 24px 8px' }}>
        <div><h2>Strong converting search terms</h2><p style={{ margin: '4px 0 0', color: '#667085' }}>Useful candidates to review for exact or phrase-match keyword coverage.</p></div>
      </div>
      {winners.length ? <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 900 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.5fr .7fr .7fr .7fr', gap: 12, padding: '10px 24px', background: '#f9fafb', color: '#667085', fontSize: 12, fontWeight: 700 }}>
          <span>Search term</span><span>Account</span><span>Campaign</span><span>Conversions</span><span>Spend</span><span>Confidence</span>
        </div>
        {winners.slice(0, 100).map((r) => <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.5fr .7fr .7fr .7fr', gap: 12, padding: '15px 24px', borderTop: '1px solid #eaecf0', alignItems: 'center' }}>
          <div><strong>{r.searchTerm}</strong><small style={{ display: 'block', color: '#667085', marginTop: 3 }}>{r.adGroupName}</small></div>
          <span>{r.accountName}</span>
          <span>{r.campaignName}</span>
          <strong>{r.conversions.toFixed(1)}</strong>
          <span>{money(r.spend, r.currency)}</span>
          <strong>{r.confidence}%</strong>
        </div>)}
      </div></div> : <div style={{ padding: 28, color: '#667085' }}>No search terms currently meet the converting-term threshold.</div>}
    </section>
  </AppShell>;
}
