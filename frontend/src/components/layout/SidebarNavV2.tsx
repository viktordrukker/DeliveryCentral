import { NavLink } from 'react-router-dom';

import { AppRouteDefinition, canAccessRoute } from '@/app/navigation';
import { groupV2For, type RouteGroupV2 } from '@/app/route-manifest';
import { markSidebarNavigation } from '@/app/drilldown-context';
import { useAuth } from '@/app/auth-context';
import { NavIcon, getIconKey } from '@/components/common/NavIcon';
import { Avatar } from '@/components/ds/Avatar';
import { SidebarSection } from './SidebarSection';

interface SidebarNavV2Props {
  activePath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  routes: AppRouteDefinition[];
}

const GROUP_LABELS: Record<RouteGroupV2, string> = {
  workspace: 'Workspace',
  workforce: 'Workforce',
  operations: 'Operations',
};

const GROUP_ORDER: RouteGroupV2[] = ['workspace', 'workforce', 'operations'];

/**
 * Phase A2.2 — DS-redesign sidebar (DS/chrome.jsx:32-66).
 *
 * Collapses the legacy 9-group sidebar into 3 sections: Workspace,
 * Workforce, Operations. Gated by `dsRefresh`; AppShell renders this
 * when the flag is on and the original `SidebarNav` when it is off.
 *
 * Differences from `SidebarNav`:
 *   - 3-group taxonomy via `groupV2For`
 *   - DS Avatar for the user card at the bottom
 *   - No Favorites pinning (deferred — DS canvas doesn't include it)
 *
 * Note: the V2 sidebar deliberately omits the per-route pin star to
 * match the DS canvas's cleaner visual rhythm. If pinning is needed
 * later it can be reintroduced as a sub-section above the groups.
 */
export function SidebarNavV2({
  activePath,
  collapsed = false,
  onNavigate,
  onToggleCollapse,
  routes,
}: SidebarNavV2Props): JSX.Element {
  const { principal } = useAuth();

  // Phase E — exclude routes flagged `obsoleteInV2: true`. The route stays
  // reachable by URL (router still mounts it); only sidebar visibility is
  // suppressed in v2. Legacy SidebarNav (when `dsRefresh` OFF) is unaffected.
  const visibleRoutes = routes.filter(
    (route) =>
      canAccessRoute(route.path, principal?.roles) && route.obsoleteInV2 !== true,
  );

  const byGroup = GROUP_ORDER.reduce<Record<RouteGroupV2, AppRouteDefinition[]>>(
    (acc, group) => {
      acc[group] = visibleRoutes.filter((r) => {
        const v2 = r.groupV2 ?? groupV2For(r.group);
        return v2 === group;
      });
      return acc;
    },
    { workspace: [], workforce: [], operations: [] },
  );

  const isActiveGroup = (group: RouteGroupV2): boolean =>
    byGroup[group].some((r) => r.path === activePath);

  function renderNavItem(route: AppRouteDefinition): JSX.Element {
    // Phase E — sidebar label override (e.g. /cases → "HR Queue", /me → "Home").
    // Canonical `title` still used for tooltip + icon resolution.
    const label = route.titleV2 ?? route.title;
    const iconKey = getIconKey(route.path, route.title);
    return (
      <NavLink
        aria-current={activePath === route.path ? 'page' : undefined}
        className={
          activePath === route.path
            ? 'sidebar-nav__item sidebar-nav__item--active'
            : 'sidebar-nav__item'
        }
        key={route.path}
        onClick={() => {
          markSidebarNavigation();
          onNavigate?.();
        }}
        style={{ alignItems: 'center', display: 'flex', gap: 8 }}
        title={route.description ?? route.title}
        to={route.path}
      >
        <NavIcon name={iconKey} size={16} />
        <span className="sidebar-nav__item-title">{label}</span>
      </NavLink>
    );
  }

  return (
    <div className={`sidebar-nav sidebar-nav--v2${collapsed ? ' sidebar-nav--collapsed' : ''}`}>
      <div className="sidebar-nav__brand">
        {collapsed ? (
          <div className="sidebar-nav__brand-icon" title="DeliverIT">
            ⊞
          </div>
        ) : (
          <>
            <div className="sidebar-nav__eyebrow">Platform</div>
            <div className="sidebar-nav__title">DeliverIT</div>
          </>
        )}
      </div>
      <nav className="sidebar-nav__menu" aria-label="Primary navigation">
        {collapsed ? (
          <>
            {visibleRoutes.map((route) => (
              <NavLink
                className={
                  activePath === route.path
                    ? 'sidebar-nav__item sidebar-nav__item--active sidebar-nav__item--rail'
                    : 'sidebar-nav__item sidebar-nav__item--rail'
                }
                key={route.path}
                onClick={() => {
                  markSidebarNavigation();
                  onNavigate?.();
                }}
                title={route.titleV2 ?? route.title}
                to={route.path}
              >
                <NavIcon name={getIconKey(route.path, route.title)} size={18} />
              </NavLink>
            ))}
          </>
        ) : (
          <>
            {GROUP_ORDER.map((group) => {
              const groupRoutes = byGroup[group];
              if (groupRoutes.length === 0) return null;
              return (
                <SidebarSection
                  defaultOpen={isActiveGroup(group)}
                  key={group}
                  label={GROUP_LABELS[group]}
                >
                  {groupRoutes.map((route) => renderNavItem(route))}
                </SidebarSection>
              );
            })}
          </>
        )}
      </nav>
      {!collapsed && principal?.displayName ? (
        <div
          className="sidebar-nav__user"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <Avatar name={principal.displayName} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {principal.displayName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {principal.roles?.[0] ?? 'user'}
            </div>
          </div>
        </div>
      ) : null}
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
