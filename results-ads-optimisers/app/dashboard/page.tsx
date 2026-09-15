import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getWorkspace } from '@/lib/workspace';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'GA';
}

export default async function Dashboard() {
  const { accounts } = await getWorkspace();

  return <AppShell active="accounts">
    <div className="opteo-account-centre-head">
      <div>
        <span className="eyebrow">ACCOUNT CENTRE</span>
        <h1>Your Google Ads accounts</h1>
        <p>Choose an account to open its own performance, improvements, reports and optimisation tools.</p>
      </div>
      <Link href="/dashboard/connect-google-ads" className="primary-button">+ Link account</Link>
    </div>

    <div className="opteo-account-toolbar">
      <div className="opteo-account-search">⌕ <span>Search accounts</span></div>
      <div className="opteo-account-count">{accounts.length} linked account{accounts.length === 1 ? '' : 's'}</div>
    </div>

    {!accounts.length ? <section className="dash-card empty-panel">
      <div className="account-choice-icon">GA</div>
      <h2>Link your first Google Ads account</h2>
      <p>Pilot Ads will keep each client account in its own workspace, just like Opteo.</p>
      <Link href="/dashboard/connect-google-ads" className="primary-button empty-action">Connect Google Ads</Link>
    </section> : <div className="opteo-account-list">
      {accounts.map((account) => <article className="opteo-account-row" key={account.id}>
        <Link href={`/accounts/${account.id}`} className="opteo-account-main">
          <div className="account-choice-icon">{initials(account.descriptive_name)}</div>
          <div className="opteo-account-name">
            <h2>{account.descriptive_name}</h2>
            <p>{account.customer_id}</p>
          </div>
          <div className="opteo-account-status"><span className="status-dot"/> Active</div>
          <div className="opteo-account-score">
            <small>Optimisation score</small>
            <strong>{account.optimisation_score == null ? 'Ready' : `${Math.round(account.optimisation_score)}%`}</strong>
          </div>
          <span className="opteo-open">Open account ›</span>
        </Link>
        <div className="opteo-account-links">
          <Link href={`/accounts/${account.id}`}>Performance</Link>
          <Link href={`/improvements?account=${account.id}&view=active`}>Improvements</Link>
          <Link href={`/reports?account=${account.id}`}>Reports</Link>
          <Link href={`/alerts?account=${account.id}`}>Alerts</Link>
          <Link href={`/toolkit?account=${account.id}`}>Toolkit</Link>
        </div>
      </article>)}
    </div>}
  </AppShell>;
}
