import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { AppRouteDefinition } from '@/app/navigation';
import { CommandPalette, RecentPage } from '@/components/common/CommandPalette';
import { ImpersonationBanner } from './ImpersonationBanner';
import { PageTitleBar } from './PageTitleBar';
import { SidebarNav } from './SidebarNav';
import { TopHeader } from './TopHeader';

const RECENT_PAGES_KEY = 'dc_recent_pages';
const RECENT_PAGES_MAX = 10;
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_ROLES = [
  { role: 'Director',          email: 'catherine.monroe@apexdigital.demo', password: 'InvestorDemo1!' },
  { role: 'HR Manager',        email: 'laura.petrov@apexdigital.demo',     password: 'InvestorDemo1!' },
  { role: 'Resource Manager',  email: 'ethan.grant@apexdigital.demo',      password: 'InvestorDemo1!' },
  { role: 'Project Manager',   email: 'rafael.moreno@apexdigital.demo',    password: 'InvestorDemo1!' },
  { role: 'Delivery Manager',  email: 'amara.diallo@apexdigital.demo',     password: 'InvestorDemo1!' },
  { role: 'Employee',          email: 'aisha.patel@apexdigital.demo',      password: 'InvestorDemo1!' },
];

function loadRecentPages(): RecentPage[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PAGES_KEY) ?? '[]') as RecentPage[];
  } catch {
    return [];
  }
}

function pushRecentPage(page: RecentPage): RecentPage[] {
  const existing = loadRecentPages().filter((p) => p.path !== page.path);
  const updated = [page, ...existing].slice(0, RECENT_PAGES_MAX);
  localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
  return updated;
}

interface AppShellProps {
  routes: AppRouteDefinition[];
}

function loadSidebarCollapsed(): boolean {
  try {
    const stored = sessionStorage.getItem('dc:sidebar-collapsed');
    if (stored !== null) return stored === 'true';
  } catch { /* ignore */ }
  return window.innerWidth <= 768;
}

export function AppShell({ routes }: AppShellProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadSidebarCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [demoPanelOpen, setDemoPanelOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<RecentPage[]>(loadRecentPages);

  /** Find the best matching route for a pathname.
   *  1. Exact match wins.
   *  2. Otherwise, the route whose path is the longest prefix of the pathname wins
   *     (only matching on segment boundaries so /teams does not match /timesheets). */
  function findRoute(pathname: string): AppRouteDefinition | undefined {
    const exact = routes.find((r) => r.path === pathname);
    if (exact) return exact;

    let best: AppRouteDefinition | undefined;
    let bestLen = 0;
    for (const route of routes) {
      if (route.path === '/') continue; // root would match everything
      // Check that pathname starts with the route path and the next char is '/' or end-of-string
      if (
        pathname.startsWith(route.path) &&
        (pathname.length === route.path.length || pathname[route.path.length] === '/')
      ) {
        if (route.path.length > bestLen) {
          best = route;
          bestLen = route.path.length;
        }
      }
    }
    return best;
  }

  function toggleSidebarCollapse(): void {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { sessionStorage.setItem('dc:sidebar-collapsed', String(next)); } catch { /* ignore */ }
      return next;
    });
  }

  useEffect(() => {
    const route = findRoute(location.pathname);
    if (route) {
      setRecentPages(pushRecentPage({ path: route.path, title: route.title }));
    }
  }, [location.pathname, routes]);

  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
      if (DEMO_MODE && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDemoPanelOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  const activeRoute = findRoute(location.pathname) ?? routes[0];

  function closeSidebar(): void {
    setSidebarOpen(false);
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--collapsed' : ''}`}>
      <CommandPalette onClose={() => setPaletteOpen(false)} open={paletteOpen} recentPages={recentPages} />
      {DEMO_MODE && demoPanelOpen ? (
        <div
          aria-modal="true"
          role="dialog"
          style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
        >
          <div style={{ background: '#fff', borderRadius: 8, padding: '24px 28px', minWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Demo Control Panel</span>
              <button onClick={() => setDemoPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }} type="button">✕</button>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Switch role — all accounts use password <strong>InvestorDemo1!</strong></p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <tbody>
                {DEMO_ROLES.map((r) => (
                  <tr key={r.role}>
                    <td style={{ padding: '5px 0', color: '#374151', width: 140 }}>{r.role}</td>
                    <td style={{ padding: '5px 0', color: '#6b7280', fontFamily: 'monospace', fontSize: 11 }}>{r.email}</td>
                    <td style={{ padding: '5px 4px', textAlign: 'right' }}>
                      <button
                        onClick={() => { void navigate('/login'); setDemoPanelOpen(false); }}
                        style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer', background: '#f3f4f6' }}
                        type="button"
                      >
                        Switch
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => { void navigate('/login'); setDemoPanelOpen(false); }}
              style={{ width: '100%', padding: '8px 0', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              type="button"
            >
              Go to Login
            </button>
          </div>
        </div>
      ) : null}
      {sidebarOpen ? (
        <div
          aria-hidden="true"
          className="app-shell__overlay"
          onClick={closeSidebar}
        />
      ) : null}
      <aside className={`app-shell__sidebar${sidebarOpen ? ' app-shell__sidebar--open' : ''}`}>
        <SidebarNav activePath={location.pathname} collapsed={sidebarCollapsed} onNavigate={closeSidebar} onToggleCollapse={toggleSidebarCollapse} routes={routes} />
      </aside>
      <div className="app-shell__main">
        <ImpersonationBanner />
        <div className="app-shell__topbar">
          <button
            aria-label="Toggle navigation"
            className="app-shell__hamburger"
            onClick={() => setSidebarOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <TopHeader />
        </div>
        <PageTitleBar
          description={activeRoute?.description ?? ''}
          title={activeRoute?.title ?? 'Workload Tracking Platform'}
        />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
