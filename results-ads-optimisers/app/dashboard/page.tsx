import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getWorkspace, loadAccountPerformance, metricNumber, money, percentChange } from '@/lib/workspace';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

type Totals = { spend: number; conversions: number; clicks: number; impressions: number; conversionValue: number };
const emptyTotals = (): Totals => ({ spend: 0, conversions: 0, clicks: 0, impressions: 0, conversionValue: 0 });

function addRow(target: Totals, row: any) {
  target.spend += metricNumber(row.metrics?.costMicros) / 1_000_000;
  target.conversions += metricNumber(row.metrics?.conversions);
  target.clicks += metricNumber(row.metrics?.clicks);
  target.impressions += metricNumber(row.metrics?.impressions);
  target.conversionValue += metricNumber(row.metrics?.conversionsValue);
}

function pct(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export default async function Dashboard() {
  const { accounts, supabase, organisationId } = await getWorkspace();
  const currentStart = dateDaysAgo(29);
  const previousStart = dateDaysAgo(59);
  const previousEnd = dateDaysAgo(30);
  const today = dateDaysAgo(0);

  const summaries = await Promise.all(accounts.map(async (account) => {
    const current = emptyTotals();
    const previous = emptyTotals();
    const daily = new Map<string, number>();
    const campaigns = new Map<string, { name: string; spend: number; conversions: number }>();
    let error: string | null = null;

    try {
      const rows = await loadAccountPerformance(supabase, account, 60);
      for (const row of rows) {
        const date = row.segments?.date;
        if (!date) continue;
        if (date >= currentStart && date <= today) {
          addRow(current, row);
          const rowSpend = metricNumber(row.metrics?.costMicros) / 1_000_000;
          daily.set(date, (daily.get(date) ?? 0) + rowSpend);
          const campaignId = String(row.campaign?.id ?? row.campaign?.name ?? 'unknown');
          const campaign = campaigns.get(campaignId) ?? { name: row.campaign?.name || 'Campaign', spend: 0, conversions: 0 };
          campaign.spend += rowSpend;
          campaign.conversions += metricNumber(row.metrics?.conversions);
          campaigns.set(campaignId, campaign);
        } else if (date >= previousStart && date <= previousEnd) {
          addRow(previous, row);
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not refresh account';
    }

    const cpa = current.conversions ? current.spend / current.conversions : 0;
    const previousCpa = previous.conversions ? previous.spend / previous.conversions : 0;
    const ctr = current.impressions ? current.clicks / current.impressions * 100 : 0;
    const roas = current.spend ? current.conversionValue / current.spend : 0;
    const topCampaign = [...campaigns.values()].sort((a, b) => b.spend - a.spend)[0];
    const spark = Array.from({ length: 14 }, (_, index) => daily.get(dateDaysAgo(13 - index)) ?? 0);
    const maxSpark = Math.max(...spark, 1);

    return {
      account,
      current,
      previous,
      cpa,
      previousCpa,
      ctr,
      roas,
      topCampaign,
      spark,
      maxSpark,
      error,
      conversionChange: percentChange(current.conversions, previous.conversions),
      spendChange: percentChange(current.spend, previous.spend),
      cpaChange: percentChange(cpa, previousCpa),
    };
  }));

  const total = summaries.reduce((out, item) => {
    out.spend += item.current.spend;
    out.conversions += item.current.conversions;
    out.clicks += item.current.clicks;
    out.impressions += item.current.impressions;
    out.conversionValue += item.current.conversionValue;
    return out;
  }, emptyTotals());
  const previousTotal = summaries.reduce((out, item) => {
    out.spend += item.previous.spend;
    out.conversions += item.previous.conversions;
    out.clicks += item.previous.clicks;
    out.impressions += item.previous.impressions;
    out.conversionValue += item.previous.conversionValue;
    return out;
  }, emptyTotals());
  const currency = accounts[0]?.currency_code || 'AUD';
  const totalCpa = total.conversions ? total.spend / total.conversions : 0;
  const previousTotalCpa = previousTotal.conversions ? previousTotal.spend / previousTotal.conversions : 0;

  const { data: recentActivity } = organisationId
    ? await supabase
        .from('recommendations')
        .select('id,title,status,updated_at,ad_account_id,recommendation_type')
        .eq('organisation_id', organisationId)
        .order('updated_at', { ascending: false })
        .limit(6)
    : { data: [] } as any;

  const accountNames = new Map(accounts.map((account) => [account.id, account.descriptive_name]));
  const attention = summaries
    .filter((item) => item.error || item.cpaChange > 20 || item.conversionChange < -15)
    .sort((a, b) => Math.abs(b.cpaChange) - Math.abs(a.cpaChange))
    .slice(0, 4);

  return <AppShell active="accounts">
    <div className="opteo-account-centre-head rich-head">
      <div>
        <h1>Account Centre</h1>
        <p>Monitor every Google Ads account, spot performance changes and jump straight into the work that needs attention.</p>
      </div>
      <div className="head-actions"><Link href="/reports?view=scorecard" className="outline-button">View scorecards</Link><Link href="/dashboard/connect-google-ads" className="primary-button">+ Link account</Link></div>
    </div>

    <section className="portfolio-strip">
      <article><span>Managed spend</span><strong>{money(total.spend, currency)}</strong><em className={total.spend >= previousTotal.spend ? 'up' : 'down'}>{pct(percentChange(total.spend, previousTotal.spend))}</em></article>
      <article><span>Conversions</span><strong>{total.conversions.toFixed(1)}</strong><em className={total.conversions >= previousTotal.conversions ? 'up' : 'down'}>{pct(percentChange(total.conversions, previousTotal.conversions))}</em></article>
      <article><span>Avg. cost / conv.</span><strong>{money(totalCpa, currency, 2)}</strong><em className={totalCpa <= previousTotalCpa ? 'up' : 'down'}>{pct(percentChange(totalCpa, previousTotalCpa))}</em></article>
      <article><span>Accounts</span><strong>{accounts.length}</strong><em>{summaries.filter((item) => !item.error).length} synced</em></article>
      <article><span>Needs attention</span><strong>{attention.length}</strong><em>{attention.length ? 'Review now' : 'All clear'}</em></article>
    </section>

    <div className="account-centre-grid">
      <div className="account-centre-main">
        <div className="opteo-account-toolbar rich-toolbar">
          <div className="opteo-account-search">⌕ <span>Search accounts</span></div>
          <div className="account-toolbar-actions"><button type="button">All accounts ▾</button><button type="button">Last 30 days ▾</button><span>{accounts.length} accounts</span></div>
        </div>

        {!accounts.length ? <section className="dash-card empty-panel">
          <div className="account-choice-icon">GA</div><h2>Link your first Google Ads account</h2><p>Performance, improvements and account health will appear here.</p><Link href="/dashboard/connect-google-ads" className="primary-button empty-action">Connect Google Ads</Link>
        </section> : <div className="rich-account-list">
          <div className="account-table-head"><span>Account</span><span>Spend</span><span>Conversions</span><span>CPA</span><span>Trend</span><span>Health</span><span></span></div>
          {summaries.map((item) => {
            const health = item.error ? 'Issue' : item.cpaChange > 20 || item.conversionChange < -15 ? 'Watch' : 'Healthy';
            const healthClass = health === 'Healthy' ? 'good' : health === 'Watch' ? 'watch' : 'bad';
            return <article className="rich-account-row" key={item.account.id}>
              <Link href={`/accounts/${item.account.id}`} className="rich-account-main">
                <div className="rich-account-identity"><div className="account-choice-icon">{initials(item.account.descriptive_name)}</div><div><h2>{item.account.descriptive_name}</h2><p>{item.account.customer_id} · {item.topCampaign?.name || 'No campaign activity'}</p></div></div>
                <div className="table-metric"><strong>{money(item.current.spend, item.account.currency_code || 'AUD')}</strong><small className={item.spendChange > 0 ? 'neutral' : 'positive'}>{pct(item.spendChange)}</small></div>
                <div className="table-metric"><strong>{item.current.conversions.toFixed(1)}</strong><small className={item.conversionChange >= 0 ? 'positive' : 'negative'}>{pct(item.conversionChange)}</small></div>
                <div className="table-metric"><strong>{money(item.cpa, item.account.currency_code || 'AUD', 2)}</strong><small className={item.cpaChange <= 0 ? 'positive' : 'negative'}>{pct(item.cpaChange)}</small></div>
                <div className="mini-spark" aria-label="14 day spend trend">{item.spark.map((value, index) => <i key={index} style={{ height: `${Math.max(8, value / item.maxSpark * 100)}%` }} />)}</div>
                <div><span className={`health-pill ${healthClass}`}>{health}</span>{item.account.optimisation_score != null ? <small className="score-caption">{Math.round(item.account.optimisation_score)} score</small> : null}</div>
                <span className="row-chevron">›</span>
              </Link>
              <div className="rich-account-links"><Link href={`/improvements?account=${item.account.id}&view=active`}>Improvements</Link><Link href={`/accounts/${item.account.id}`}>Performance</Link><Link href={`/reports?account=${item.account.id}`}>Reports</Link><Link href={`/alerts?account=${item.account.id}`}>Alerts</Link><Link href={`/toolkit?account=${item.account.id}&view=ngrams`}>N-Grams</Link><Link href={`/settings?account=${item.account.id}`}>Settings</Link></div>
            </article>;
          })}
        </div>}
      </div>

      <aside className="account-centre-side">
        <section className="side-panel"><div className="side-panel-head"><h2>Needs attention</h2><Link href="/alerts">View alerts</Link></div>{attention.length ? <div className="attention-list">{attention.map((item) => <Link key={item.account.id} href={`/accounts/${item.account.id}`}><span className={`attention-dot ${item.error ? 'bad' : 'watch'}`}/><div><strong>{item.account.descriptive_name}</strong><small>{item.error ? 'Account refresh issue' : item.cpaChange > 20 ? `CPA up ${pct(item.cpaChange)}` : `Conversions ${pct(item.conversionChange)}`}</small></div><b>›</b></Link>)}</div> : <div className="side-empty"><span>✓</span><strong>Everything looks stable</strong><small>No major performance changes detected.</small></div>}</section>

        <section className="side-panel"><div className="side-panel-head"><h2>Recent activity</h2><Link href="/toolkit?view=changes">Change log</Link></div>{recentActivity?.length ? <div className="activity-list">{recentActivity.map((row: any) => <div key={row.id}><span className={`activity-icon ${row.status}`}>{row.status === 'dismissed' ? '×' : '✓'}</span><div><strong>{row.title}</strong><small>{accountNames.get(row.ad_account_id) || 'Google Ads account'} · {new Date(row.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</small></div></div>)}</div> : <div className="side-empty compact"><strong>No decisions yet</strong><small>Approved and dismissed improvements will appear here.</small></div>}</section>

        <section className="side-panel quick-tools"><div className="side-panel-head"><h2>Toolkit</h2></div><Link href="/toolkit?view=ngrams"><span>⌕</span><div><strong>N-Gram Finder</strong><small>Find waste across search terms</small></div><b>›</b></Link><Link href="/reports?view=scorecard"><span>▤</span><div><strong>Scorecard</strong><small>Account health snapshots</small></div><b>›</b></Link><Link href="/toolkit?view=changes"><span>◇</span><div><strong>Change History</strong><small>Track optimisation decisions</small></div><b>›</b></Link></section>
      </aside>
    </div>
  </AppShell>;
}
