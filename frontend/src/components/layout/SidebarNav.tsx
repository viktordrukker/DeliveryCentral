import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { AppRouteDefinition } from '@/app/navigation';
import { useAuth } from '@/app/auth-context';
import { NavIcon, getIconKey } from '@/components/common/NavIcon';
import { SidebarSection } from './SidebarSection';

interface SidebarNavProps {
  activePath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  routes: AppRouteDefinition[];
}

function loadPins(personId: string | undefined): Set<string> {
  if (!personId) return new Set();
  try {
    const raw = localStorage.getItem(`sidebar-pins:${personId}`);
    return new Set(JSON.parse(raw ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function savePins(personId: string | undefined, pins: Set<string>): void {
  if (!personId) return;
  localStorage.setItem(`sidebar-pins:${personId}`, JSON.stringify([...pins]));
}

const GROUP_LABELS: Record<AppRouteDefinition['group'], string> = {
  dashboard: 'Dashboards',
  'people-org': 'People & Org',
  work: 'Work',
  governance: 'Governance',
  admin: 'Admin',
};

const GROUP_ORDER: AppRouteDefinition['group'][] = [
  'dashboard',
  'people-org',
  'work',
  'governance',
  'admin',
];

export function SidebarNav({
  activePath,
  collapsed = false,
  onNavigate,
  onToggleCollapse,
  routes,
}: SidebarNavProps): JSX.Element {
  const { principal } = useAuth();
  const personId = principal?.personId;
  const [pins, setPins] = useState<Set<string>>(() => loadPins(personId));

  function togglePin(path: string): void {
    setPins((prev) => {
      const next = new Set(prev);
      if (next.has(path)) { next.delete(path); } else { next.add(path); }
      savePins(personId, next);
      return next;
    });
  }

  const visibleRoutes = routes.filter((route) => {
    if (!route.allowedRoles) return true;

    return route.allowedRoles.some((r) => principal?.roles.includes(r));
  });

  const byGroup = GROUP_ORDER.reduce<Record<string, AppRouteDefinition[]>>(
    (acc, group) => {
      acc[group] = visibleRoutes.filter((r) => r.group === group);

      return acc;
    },
    {},
  );

  const myWorkItems = [
    { description: 'Your personal dashboard and overview.', path: '/dashboard/employee', title: 'My Dashboard' },
    { description: 'Update your password and account details.', path: '/settings/account', title: 'Account Settings' },
  ];

  const isActiveGroup = (group: AppRouteDefinition['group']): boolean =>
    (byGroup[group] ?? []).some((r) => r.path === activePath);

  const myWorkPaths = new Set(myWorkItems.map((i) => i.path));
  const allItems = [
    ...myWorkItems.map((item) => ({ description: item.description, path: item.path, title: item.title })),
    ...visibleRoutes.filter((r) => !myWorkPaths.has(r.path)).map((r) => ({ description: r.description ?? '', path: r.path, title: r.title })),
  ];
  const pinnedItems = allItems.filter((item) => pins.has(item.path));

  function renderNavItem(item: { description: string; path: string; title: string }): JSX.Element {
    const iconKey = getIconKey(item.path, item.title);
    return (
      <div className="sidebar-nav__item-row" key={item.path} style={{ alignItems: 'center', display: 'flex' }}>
        <NavLink
          className={
            activePath === item.path
              ? 'sidebar-nav__item sidebar-nav__item--active'
              : 'sidebar-nav__item'
          }
          onClick={onNavigate}
          style={{ alignItems: 'center', display: 'flex', flex: 1, gap: '8px' }}
          title={item.description}
          to={item.path}
        >
          <NavIcon name={iconKey} size={16} />
          <span className="sidebar-nav__item-title">{item.title}</span>
        </NavLink>
        <button
          aria-label={pins.has(item.path) ? `Unpin ${item.title}` : `Pin ${item.title}`}
          onClick={(e) => { e.preventDefault(); togglePin(item.path); }}
          style={{
            background: 'none', border: 'none', color: pins.has(item.path) ? '#f59e0b' : 'transparent',
            cursor: 'pointer', fontSize: '14px', padding: '0 4px',
          }}
          title={pins.has(item.path) ? 'Unpin' : 'Pin to Favorites'}
          type="button"
        >
          ★
        </button>
      </div>
    );
  }

  return (
    <div className={`sidebar-nav${collapsed ? ' sidebar-nav--collapsed' : ''}`}>
      <div className="sidebar-nav__brand">
        {collapsed ? (
          <div className="sidebar-nav__brand-icon" title="Workload Tracking">⊞</div>
        ) : (
          <>
            <div className="sidebar-nav__eyebrow">Platform</div>
            <div className="sidebar-nav__title">Workload Tracking</div>
          </>
        )}
      </div>
      <nav className="sidebar-nav__menu" aria-label="Primary navigation">
        {!collapsed && pinnedItems.length > 0 ? (
          <SidebarSection defaultOpen label="Favorites">
            {pinnedItems.map((item) => renderNavItem(item))}
          </SidebarSection>
        ) : null}
        {collapsed ? (
          <>
            {allItems.map((item) => (
              <NavLink
                className={
                  activePath === item.path
                    ? 'sidebar-nav__item sidebar-nav__item--active sidebar-nav__item--rail'
                    : 'sidebar-nav__item sidebar-nav__item--rail'
                }
                key={item.path}
                onClick={onNavigate}
                title={item.title}
                to={item.path}
              >
                <NavIcon name={getIconKey(item.path, item.title)} size={18} />
              </NavLink>
            ))}
          </>
        ) : (
          <>
            <SidebarSection defaultOpen label="My Work">
              {myWorkItems.map((item) => renderNavItem(item))}
            </SidebarSection>
            {GROUP_ORDER.map((group) => {
              const groupRoutes = byGroup[group];

              if (!groupRoutes || groupRoutes.length === 0) return null;

              return (
                <SidebarSection
                  defaultOpen={isActiveGroup(group)}
                  key={group}
                  label={GROUP_LABELS[group]}
                >
                  {groupRoutes.map((route) => renderNavItem({
                    description: route.description ?? '',
                    path: route.path,
                    title: route.title,
                  }))}
                </SidebarSection>
              );
            })}
          </>
        )}
      </nav>
      {onToggleCollapse ? (
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="sidebar-nav__collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          type="button"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      ) : null}
    </div>
  );
}
