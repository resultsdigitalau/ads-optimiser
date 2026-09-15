import Link from 'next/link';
import Image from 'next/image';

const Icon = ({name}:{name:string}) => {
  const paths: Record<string, React.ReactNode> = {
    accounts:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10M7 12h6M7 16h4"/></>,
    improve:<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.64 5.64l2.12 2.12M16.24 16.24l2.12 2.12M18.36 5.64l-2.12 2.12M7.76 16.24l-2.12 2.12"/><circle cx="12" cy="12" r="4"/></>,
    performance:<><path d="M3 17l5-5 4 3 7-8"/><path d="M14 7h5v5"/></>,
    reports:<><path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 13h8M8 17h6"/></>,
    alerts:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    toolkit:<><path d="M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.4 2.4-3-3z"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.97 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.65 8.94a1.7 1.7 0 0 0-.34-1.88L4.25 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9.02 4.57 1.7 1.7 0 0 0 10.05 3H14a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7.08l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 10H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></>,
  };
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

export function AppShell({ children, active = 'accounts' }: { children: React.ReactNode; active?: string }) {
  const items = [
    ['accounts','Accounts','accounts','/dashboard'],
    ['improvements','Improvements','improve','/improvements'],
    ['performance','Performance','performance','/dashboard'],
    ['reports','Reports','reports','/reports'],
    ['alerts','Alerts','alerts','/alerts'],
    ['toolkit','Toolkit','toolkit','/toolkit'],
  ];
  return <div className="app-shell opteo-shell">
    <aside className="app-sidebar opteo-sidebar">
      <Link href="/dashboard" className="app-logo"><Image src="/pilot-ads-logo.png" alt="Pilot Ads" width={154} height={42} priority/></Link>
      <div className="opteo-workspace-label">WORKSPACE</div>
      <nav className="app-nav" aria-label="Main navigation">{items.map(([key,label,icon,href])=><Link key={key} href={href} className={active===key?'active':''}><Icon name={icon}/><span>{label}</span>{label==='Improvements'&&<em>Live</em>}</Link>)}</nav>
      <div className="sidebar-divider"/>
      <div className="opteo-workspace-label">TOOLS</div>
      <nav className="app-nav compact" aria-label="Optimisation tools">
        <Link href="/toolkit?view=ngrams"><span className="text-icon">⌕</span><span>N-Gram Finder</span></Link>
        <Link href="/toolkit?view=accounts"><span className="text-icon">▦</span><span>Account Manager</span></Link>
        <Link href="/reports?view=scorecard"><span className="text-icon">▤</span><span>Scorecard</span></Link>
        <Link href="/toolkit?view=changes"><span className="text-icon">◇</span><span>Change History</span></Link>
      </nav>
      <div className="sidebar-bottom">
        <Link href="/settings" className="opteo-settings"><Icon name="settings"/><span>Settings</span></Link>
        <div className="trial-card"><strong>Pilot Ads Pro</strong><span>Google Ads optimisation workspace</span><a href="/settings">Manage plan →</a></div>
      </div>
    </aside>
    <main className="app-main">
      <header className="app-topbar opteo-topbar">
        <div className="app-search"><span>⌕</span><input aria-label="Search Pilot Ads" placeholder="Search accounts..."/><kbd>⌘ K</kbd></div>
        <div className="top-actions"><Link href="/alerts" className="bell" aria-label="Open alerts">♢</Link><form action="/auth/signout" method="post"><button className="profile" type="submit" title="Log out"><b>PA</b><span><strong>Pilot Ads</strong><small>Agency workspace</small></span><i>›</i></button></form></div>
      </header>
      <div className="app-content opteo-content">{children}</div>
    </main>
  </div>;
}
