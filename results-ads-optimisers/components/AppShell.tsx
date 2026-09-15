import Link from 'next/link';

const Icon = ({name}:{name:string}) => {
  const paths: Record<string, React.ReactNode> = {
    dashboard:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    accounts:<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20M15 14.5a4 4 0 0 1 5.5 3.7V20"/></>,
    improve:<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12"/><circle cx="12" cy="12" r="4"/></>,
    alerts:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    reports:<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    billing:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.97 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.65 8.94a1.7 1.7 0 0 0-.34-1.88L4.25 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9.02 4.57 1.7 1.7 0 0 0 10.05 3H14a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7.08l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

export function AppShell({ children, active = 'dashboard' }: { children: React.ReactNode; active?: string }) {
  const items = [
    ['dashboard','Dashboard','dashboard','/dashboard'],['accounts','Accounts','accounts','/dashboard/connect-google-ads'],['improvements','Improvements','improve','/dashboard'],['alerts','Alerts','alerts','/dashboard'],['reports','Reports','reports','/dashboard'],['billing','Billing','billing','/dashboard'],['settings','Settings','settings','/dashboard'],
  ];
  return <div className="app-shell">
    <aside className="app-sidebar">
      <Link href="/" className="app-logo"><img src="/pilot-ads-logo.png" alt="Pilot Ads"/></Link>
      <nav className="app-nav">{items.map(([key,label,icon,href])=><Link key={key} href={href} className={active===key?'active':''}><Icon name={icon}/><span>{label}</span>{label==='Improvements'&&<em>12</em>}{label==='Alerts'&&<em className="red-badge">3</em>}</Link>)}</nav>
      <div className="sidebar-divider"/><div className="app-nav-label">TOOLS</div>
      <nav className="app-nav compact"><a href="#"><span className="text-icon">⌕</span><span>Keyword Research</span></a><a href="#"><span className="text-icon">◫</span><span>Ad Preview</span></a><a href="#"><span className="text-icon">▤</span><span>Landing Page Audit</span></a><a href="#"><span className="text-icon">◇</span><span>Competitor Insights</span></a></nav>
      <div className="sidebar-bottom">
        <div className="trial-card"><strong>Trial Pro</strong><span>14 days remaining</span><div><i style={{width:'38%'}}/></div><a href="#">Upgrade plan →</a></div>
      </div>
    </aside>
    <main className="app-main">
      <header className="app-topbar"><div className="app-search"><span>⌕</span><input placeholder="Search accounts, campaigns, keywords..."/><kbd>⌘ K</kbd></div><div className="top-actions"><button className="agency-switch"><b>PA</b><span><strong>Your agency workspace</strong><small>Pilot Ads</small></span><i>⌄</i></button><button className="bell">♢<em>3</em></button><form action="/auth/signout" method="post"><button className="profile" type="submit" title="Log out"><b>PA</b><span><strong>Agency Owner</strong><small>Log out</small></span><i>↗</i></button></form></div></header>
      <div className="app-content">{children}</div>
    </main>
  </div>;
}
