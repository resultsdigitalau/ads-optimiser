import Link from 'next/link';

const Icon = ({name}:{name:string}) => {
  const paths: Record<string, React.ReactNode> = {
    dashboard:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    accounts:<><path d="M4 19V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11"/><path d="M8 6V4h8v2M3 19h18M8 11h3M8 15h3M14 11h2M14 15h2"/></>,
    improve:<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12"/><circle cx="12" cy="12" r="4"/></>,
    alerts:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    reports:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.97 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.65 8.94a1.7 1.7 0 0 0-.34-1.88L4.25 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9.02 4.57 1.7 1.7 0 0 0 10.05 3H10V3h4v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7.08l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export function AppShell({ children, active = 'dashboard' }: { children: React.ReactNode; active?: string }) {
  const items = [
    ['dashboard','Dashboard','dashboard','/dashboard'],
    ['accounts','Accounts','accounts','/dashboard'],
    ['improvements','Improvements','improve','/dashboard'],
    ['alerts','Alerts','alerts','/dashboard'],
    ['reports','Reports','reports','/dashboard'],
  ];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo-lockup">
          <div className="logo-mark">O</div>
          <div><strong>Optimiser</strong><span>for Google Ads</span></div>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-avatar">SD</div>
          <div className="workspace-copy"><strong>Smith Digital</strong><span>Agency workspace</span></div>
          <span className="chevron">⌄</span>
        </div>
        <nav className="nav">
          <div className="nav-label">Workspace</div>
          {items.map(([key,label,icon,href]) => (
            <Link key={key} className={active === key ? 'active' : ''} href={href}>
              <Icon name={icon}/><span>{label}</span>{label==='Improvements' && <em>27</em>}
            </Link>
          ))}
          <div className="nav-label nav-label-spaced">Manage</div>
          <Link className={active==='settings'?'active':''} href="/dashboard"><Icon name="settings"/><span>Settings</span></Link>
        </nav>
        <div className="sidebar-plan">
          <div className="plan-row"><span>Agency plan</span><strong>12 / 25</strong></div>
          <div className="plan-track"><span style={{width:'48%'}}/></div>
          <p>12 connected accounts</p>
          <button>Manage plan</button>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">JS</div>
          <div><strong>Jamie Smith</strong><span>jamie@agency.com</span></div>
          <span>•••</span>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="search"><span>⌕</span><input aria-label="Search" placeholder="Search accounts, improvements..."/><kbd>⌘ K</kbd></div>
          <div className="topbar-actions"><button className="icon-button">?</button><button className="icon-button notification">♢<i/></button></div>
        </div>
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
