import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getWorkspace, loadAccountSearchTerms, metricNumber, money, type WorkspaceAccount } from '@/lib/workspace';
import { approveRecommendation, dismissRecommendation, restoreRecommendation } from './actions';

type Kind = 'negative_keyword' | 'search_term_review' | 'keyword_opportunity';
type Improvement = {
  key: string;
  accountId: string;
  accountName: string;
  currency: string;
  searchTerm: string;
  campaignName: string;
  campaignId: string;
  adGroupName: string;
  adGroupId: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  kind: Kind;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  accountCpa: number;
  reason: string;
  lookback: number;
};

type ImprovementParams = { account?: string; view?: string; type?: string };

const patterns = [
  /\b(job|jobs|career|salary|apprentice|course|training)\b/i,
  /\b(diy|how to|tutorial|manual|diagram|reddit|youtube)\b/i,
  /\b(free|template|definition|meaning|wholesale|supplier|used)\b/i,
];

const priority = (spend: number, clicks: number, cpa: number): Improvement['priority'] =>
  spend >= Math.max(cpa * 1.5, 300) || clicks >= 50
    ? 'critical'
    : spend >= Math.max(cpa, 180) || clicks >= 30
      ? 'high'
      : spend >= Math.max(cpa * 0.6, 90) || clicks >= 18
        ? 'medium'
        : 'low';

function accountInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';
}

function improvementHref(accountId: string, view: string, type?: string) {
  const query = new URLSearchParams({ account: accountId, view });
  if (type) query.set('type', type);
  return `/improvements?${query.toString()}`;
}

function Hidden({ item }: { item: Improvement }) {
  const values = {
    recommendation_key: item.key,
    ad_account_id: item.accountId,
    kind: item.kind,
    search_term: item.searchTerm,
    account_name: item.accountName,
    campaign_name: item.campaignName,
    campaign_id: item.campaignId,
    ad_group_name: item.adGroupName,
    ad_group_id: item.adGroupId,
    currency: item.currency,
    priority: item.priority,
    reason: item.reason,
    spend: item.spend,
    clicks: item.clicks,
    impressions: item.impressions,
    conversions: item.conversions,
    confidence: item.confidence,
    lookback: item.lookback,
  };
  return <>{Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}</>;
}

function ImprovementCard({ item }: { item: Improvement }) {
  const cpa = item.conversions ? item.spend / item.conversions : 0;
  const annual = item.kind === 'keyword_opportunity' ? 0 : item.spend / item.lookback * 365;
  const label = item.kind === 'negative_keyword'
    ? 'Add negative keyword'
    : item.kind === 'keyword_opportunity'
      ? 'Create keyword'
      : 'Review search term';

  return <details className="improvement-card dash-card">
    <summary>
      <div className={`improvement-type ${item.kind}`}>{item.kind === 'negative_keyword' ? '−' : item.kind === 'keyword_opportunity' ? '+' : '!'}</div>
      <div className="improvement-copy"><span>{label}</span><h3>{item.searchTerm}</h3><p>{item.campaignName} · {item.adGroupName}</p></div>
      <div className="impact"><small>{annual ? 'Potential reallocation' : 'Opportunity'}</small><strong>{annual ? `${money(annual, item.currency)}/year` : `${item.conversions.toFixed(1)} conversions`}</strong></div>
      <b className={`status-pill ${item.priority === 'critical' ? 'critical' : item.priority === 'high' ? 'warning' : item.priority === 'medium' ? 'watch' : 'good'}`}>{item.priority}</b>
      <span className="open-label">Review ›</span>
    </summary>
    <div className="improvement-detail">
      <div className="evidence-copy">
        <span className="eyebrow">WHY PILOT ADS FLAGGED THIS</span>
        <h2>{label}: “{item.searchTerm}”</h2>
        <p>{item.reason}</p>
        <p>Over the last <strong>{item.lookback} days</strong>, this search term spent <strong>{money(item.spend, item.currency, 2)}</strong> and generated <strong>{item.conversions.toFixed(1)} conversions</strong>. The account search-term CPA was approximately <strong>{money(item.accountCpa, item.currency, 2)}</strong>.</p>
        <div className="recommendation-note">
          {item.kind === 'negative_keyword'
            ? 'Review the underlying intent before approval. Approval records this phrase as a negative-keyword decision for the Google Ads apply queue.'
            : item.kind === 'keyword_opportunity'
              ? 'This converting search term may deserve its own phrase-match keyword and a more relevant landing page.'
              : 'This term looks relevant, but its spend and conversion performance justify a manual review.'}
        </div>
      </div>
      <div className="evidence-stats">
        <article><strong>{money(item.spend, item.currency, 2)}</strong><span>Search-term spend</span></article>
        <article><strong>{item.clicks}</strong><span>Clicks</span></article>
        <article><strong>{item.impressions}</strong><span>Impressions</span></article>
        <article><strong>{item.conversions.toFixed(1)}</strong><span>Conversions</span></article>
        <article><strong>{money(cpa, item.currency, 2)}</strong><span>Search-term CPA</span></article>
        <article><strong>{item.confidence}%</strong><span>Confidence</span></article>
      </div>
      <div className="decision-bar">
        <form action={dismissRecommendation}>
          <Hidden item={item} />
          <select name="dismiss_for" aria-label="Dismissal duration"><option value="week">Dismiss for one week</option><option value="month">Dismiss for one month</option><option value="forever">Dismiss indefinitely</option></select>
          <button className="secondary-button" type="submit">Dismiss</button>
        </form>
        <form action={approveRecommendation}><Hidden item={item} /><button className="primary-button" type="submit">Approve improvement</button></form>
      </div>
    </div>
  </details>;
}

function HistoryCard({ row }: { row: any }) {
  const payload = row.payload ?? {};
  return <article className="dash-card history-card">
    <div className={`improvement-type ${row.recommendation_type}`}>{row.status === 'dismissed' ? '×' : '✓'}</div>
    <div><span>{String(row.recommendation_type).replaceAll('_', ' ')}</span><h3>{row.title}</h3><p>{row.summary || row.explanation}</p><small>{new Date(row.updated_at || row.detected_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} · {payload.account_name || 'Google Ads account'}</small></div>
    <div className="history-actions"><b className={`status-pill ${row.status === 'dismissed' ? 'watch' : 'good'}`}>{row.status}</b>{row.status === 'dismissed' ? <form action={restoreRecommendation}><input type="hidden" name="recommendation_id" value={row.id} /><button className="secondary-button" type="submit">Restore</button></form> : null}</div>
  </article>;
}

function AccountChooser({ accounts }: { accounts: WorkspaceAccount[] }) {
  return <div className="improvement-account-grid">
    {accounts.map((account) => <Link key={account.id} href={improvementHref(account.id, 'active')} className="dash-card">
      <div className="account-choice-icon">{accountInitials(account.descriptive_name)}</div>
      <div className="account-choice-copy">
        <span>GOOGLE ADS ACCOUNT</span>
        <h2>{account.descriptive_name}</h2>
        <p>{account.customer_id}</p>
      </div>
      <div className="account-choice-meta">
        <b className={`status-pill ${account.status === 'ENABLED' ? 'good' : 'watch'}`}>{account.status.toLowerCase()}</b>
        <strong>Open improvements ›</strong>
      </div>
    </Link>)}
  </div>;
}

export default async function ImprovementsPage({ searchParams }: { searchParams: Promise<ImprovementParams> }) {
  const params = await searchParams;
  const view = params.view ?? 'active';
  const { supabase, organisationId, accounts } = await getWorkspace();
  const selectedAccount = accounts.find((account) => account.id === params.account);

  if (!accounts.length) {
    return <AppShell active="improvements">
      <div className="dash-head"><div><h1>Improvements</h1><p>Evidence-backed Google Ads recommendations, separated by account.</p></div></div>
      <section className="dash-card empty-panel"><h2>Connect a Google Ads account first</h2><p>Each connected account will receive its own recommendations tab.</p><Link className="primary-button empty-action" href="/dashboard/connect-google-ads">Connect Google Ads</Link></section>
    </AppShell>;
  }

  if (!selectedAccount) {
    return <AppShell active="improvements">
      <div className="dash-head">
        <div><span className="eyebrow">ACCOUNT WORKSPACES</span><h1>Choose a Google Ads account</h1><p>Each account has its own improvements, decisions and history.</p></div>
        <span className="sync-pill">{accounts.length} connected accounts</span>
      </div>
      <div className="account-choice-intro"><strong>Accounts stay completely separate</strong><p>Select an account to review its recommendations. No recommendations from other accounts will appear in that workspace.</p></div>
      <AccountChooser accounts={accounts} />
    </AppShell>;
  }

  const improvements: Improvement[] = [];
  let loadError: string | null = null;
  const { data: settings } = organisationId
    ? await supabase.from('account_settings').select('algorithm_settings,active_improvement_types').eq('organisation_id', organisationId).eq('ad_account_id', selectedAccount.id).maybeSingle()
    : { data: null } as any;

  if (view === 'active') {
    try {
      const lookback = Number(settings?.algorithm_settings?.lookback_days || 60);
      const activeTypes = new Set<string>(settings?.active_improvement_types?.length ? settings.active_improvement_types : ['negative_keyword', 'search_term_review', 'keyword_opportunity']);
      const rows = await loadAccountSearchTerms(supabase, selectedAccount, lookback);
      const grouped = new Map<string, Improvement>();
      let totalSpend = 0;
      let totalConversions = 0;

      for (const row of rows) {
        const term = row.searchTermView?.searchTerm?.trim();
        if (!term) continue;
        const spend = metricNumber(row.metrics?.costMicros) / 1_000_000;
        const conversions = metricNumber(row.metrics?.conversions);
        totalSpend += spend;
        totalConversions += conversions;
        const campaignId = String(row.campaign?.id ?? '');
        const adGroupId = String(row.adGroup?.id ?? '');
        const key = `${selectedAccount.id}:${term.toLowerCase()}:${campaignId}:${adGroupId}`;
        const item = grouped.get(key) ?? {
          key,
          accountId: selectedAccount.id,
          accountName: selectedAccount.descriptive_name,
          currency: selectedAccount.currency_code || 'AUD',
          searchTerm: term,
          campaignName: row.campaign?.name || 'Unknown campaign',
          campaignId,
          adGroupName: row.adGroup?.name || 'Unknown ad group',
          adGroupId,
          spend: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          kind: 'search_term_review' as Kind,
          priority: 'low' as const,
          confidence: 0,
          accountCpa: 0,
          reason: '',
          lookback,
        };
        item.spend += spend;
        item.clicks += metricNumber(row.metrics?.clicks);
        item.impressions += metricNumber(row.metrics?.impressions);
        item.conversions += conversions;
        grouped.set(key, item);
      }

      const accountCpa = totalConversions ? totalSpend / totalConversions : 0;
      for (const item of grouped.values()) {
        item.accountCpa = accountCpa;
        const irrelevant = patterns.some((pattern) => pattern.test(item.searchTerm));
        if (irrelevant && item.conversions === 0 && item.clicks >= 3 && item.spend >= 20 && activeTypes.has('negative_keyword')) {
          item.kind = 'negative_keyword';
          item.reason = 'The query contains research, employment, training, DIY or other low-commercial intent signals.';
        } else if (item.conversions === 0 && item.clicks >= 8 && item.spend >= Math.max(50, accountCpa * 0.75) && activeTypes.has('search_term_review')) {
          item.kind = 'search_term_review';
          item.reason = accountCpa ? `The term has spent meaningfully without converting while the account CPA is ${money(accountCpa, item.currency, 2)}.` : 'The term has meaningful spend and click volume without a recorded conversion.';
        } else if (item.conversions >= 2 && item.clicks >= 3 && activeTypes.has('keyword_opportunity')) {
          item.kind = 'keyword_opportunity';
          item.reason = 'This search term has converted multiple times and may deserve dedicated keyword coverage.';
        } else {
          continue;
        }
        item.priority = priority(item.spend, item.clicks, accountCpa);
        item.confidence = Math.min(98, Math.round(52 + Math.min(item.clicks, 18) + (irrelevant ? 18 : 0) + Math.min(item.conversions * 4, 20)));
        improvements.push(item);
      }
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Could not load search terms.';
    }
  }

  const keys = improvements.map((item) => item.key);
  const { data: savedActive } = organisationId && keys.length
    ? await supabase.from('recommendations').select('recommendation_key,status,expires_at').eq('organisation_id', organisationId).eq('ad_account_id', selectedAccount.id).in('recommendation_key', keys)
    : { data: [] } as any;
  const hidden = new Set((savedActive ?? []).filter((row: any) => row.status === 'approved' || row.status === 'applied' || (row.status === 'dismissed' && (!row.expires_at || new Date(row.expires_at) > new Date()))).map((row: any) => row.recommendation_key));
  const activeItems = improvements.filter((item) => !hidden.has(item.key) && (!params.type || item.kind === params.type)).sort((a, b) => b.spend - a.spend);

  const historyStatus = view === 'dismissed' ? ['dismissed'] : ['approved', 'applied'];
  const { data: history } = view !== 'active' && organisationId
    ? await supabase.from('recommendations').select('*').eq('organisation_id', organisationId).eq('ad_account_id', selectedAccount.id).in('status', historyStatus).order('updated_at', { ascending: false }).limit(150)
    : { data: [] } as any;

  const counts = {
    negative: improvements.filter((item) => !hidden.has(item.key) && item.kind === 'negative_keyword').length,
    review: improvements.filter((item) => !hidden.has(item.key) && item.kind === 'search_term_review').length,
    opportunity: improvements.filter((item) => !hidden.has(item.key) && item.kind === 'keyword_opportunity').length,
  };

  return <AppShell active="improvements">
    <div className="dash-head">
      <div><span className="eyebrow">{selectedAccount.descriptive_name}</span><h1>Improvements</h1><p>Recommendations and decision history for this account only.</p></div>
      <span className="sync-pill">Account workspace</span>
    </div>
    <div className="improvement-account-context">
      <Link href="/improvements" className="all-accounts-link">‹ All accounts</Link>
      <div className="account-choice-icon">{accountInitials(selectedAccount.descriptive_name)}</div>
      <div><span>GOOGLE ADS ACCOUNT</span><strong>{selectedAccount.descriptive_name}</strong><small>{selectedAccount.customer_id}</small></div>
      <Link href={`/accounts/${selectedAccount.id}`} className="account-overview-link">Account overview ›</Link>
    </div>
    <nav className="page-tabs">
      <Link href={improvementHref(selectedAccount.id, 'active')} className={view === 'active' ? 'active' : ''}>Active <b>{activeItems.length}</b></Link>
      <Link href={improvementHref(selectedAccount.id, 'completed')} className={view === 'completed' ? 'active' : ''}>Completed</Link>
      <Link href={improvementHref(selectedAccount.id, 'dismissed')} className={view === 'dismissed' ? 'active' : ''}>Dismissed</Link>
    </nav>
    {loadError ? <div className="notice warning">{selectedAccount.descriptive_name}: {loadError}</div> : null}
    {view === 'active' ? <>
      <div className="improvement-summary">
        <Link href={improvementHref(selectedAccount.id, 'active', 'negative_keyword')} className={params.type === 'negative_keyword' ? 'active' : ''}><i className="negative_keyword">−</i><span><strong>{counts.negative}</strong><small>Negative keywords</small></span></Link>
        <Link href={improvementHref(selectedAccount.id, 'active', 'search_term_review')} className={params.type === 'search_term_review' ? 'active' : ''}><i className="search_term_review">!</i><span><strong>{counts.review}</strong><small>Cost reviews</small></span></Link>
        <Link href={improvementHref(selectedAccount.id, 'active', 'keyword_opportunity')} className={params.type === 'keyword_opportunity' ? 'active' : ''}><i className="keyword_opportunity">+</i><span><strong>{counts.opportunity}</strong><small>Keyword opportunities</small></span></Link>
        <Link href={`/settings?account=${selectedAccount.id}`} className="algorithm-link"><span><strong>Algorithm settings</strong><small>{selectedAccount.descriptive_name}</small></span><b>›</b></Link>
      </div>
      <div className="improvement-list">{activeItems.length ? activeItems.map((item) => <ImprovementCard key={item.key} item={item} />) : <section className="dash-card empty-panel"><h2>No active improvements for {selectedAccount.descriptive_name}</h2><p>Pilot Ads will continue checking this account for new opportunities.</p></section>}</div>
    </> : <div className="history-list">
      {(history ?? []).length ? (history ?? []).map((row: any) => <HistoryCard key={row.id} row={row} />) : <section className="dash-card empty-panel"><h2>No {view} improvements for {selectedAccount.descriptive_name}</h2><p>This account’s decision history will appear here.</p></section>}
    </div>}
  </AppShell>;
}
