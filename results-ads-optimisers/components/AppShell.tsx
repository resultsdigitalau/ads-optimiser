import Link from 'next/link';

const Icon = ({name}:{name:string}) => {
  const paths: Record<string, React.ReactNode> = {
    improve:<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12"/><circle cx="12" cy="12" r="4"/></>,
    performance:<><path d="M3 17l5-5 4 3 7-8"/><path d="M14 7h5v5"/></>,
    reports:<><path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></>,
    toolkit:<><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z"/></>,
    accounts:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10M7 12h6M7 16h4"/></>,
    help:<><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.2.9-1.2 1.8M12 17h.01"/></>,
    bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

export function AppShell({ children, active = 'accounts' }: { children: React.ReactNode; active?: string }) {
  const nav = [
    ['improvements','Improvements','improve','/improvements'],
    ['performance','Performance','performance','/dashboard'],
    ['reports','Reports','reports','/reports'],
    ['toolkit','Toolkit','toolkit','/toolkit'],
  ];

  return <div className="op-app">
    <aside className="op-rail" aria-label="Pilot Ads shortcuts">
      <Link className="op-rail-brand" href="/dashboard" aria-label="Pilot Ads home">P</Link>
      <Link className={active === 'accounts' ? 'active' : ''} href="/dashboard" title="Accounts"><Icon name="accounts"/></Link>
      <div className="op-rail-spacer"/>
      <Link href="/alerts" title="Alerts"><Icon name="bell"/><span className="op-alert-dot"/></Link>
      <Link href="/settings" title="Help and settings"><Icon name="help"/></Link>
      <form action="/auth/signout" method="post"><button type="submit" className="op-avatar" title="Log out">PA</button></form>
    </aside>

    <div className="op-stage">
      <header className="op-topbar">
        <Link href="/dashboard" className="op-account-switcher">
          <span className="op-account-badge">PA</span>
          <span><strong>Pilot Ads</strong><small>All accounts</small></span>
          <i>⌄</i>
        </Link>

        <nav className="op-main-nav" aria-label="Account navigation">
          {nav.map(([key,label,icon,href]) => <Link key={key} href={href} className={active === key ? 'active' : ''}>
            <Icon name={icon}/><span>{label}</span>
          </Link>)}
        </nav>

        <div className="op-top-actions">
          <Link href="/alerts">Notes</Link>
          <Link href="/settings">Settings</Link>
          <Link href="/dashboard/connect-google-ads" className="op-circle-action">+</Link>
          <button className="op-menu-button" aria-label="Open menu">☰</button>
        </div>
      </header>
      <main className="op-content">{children}</main>
    </div>
  </div>;
}
