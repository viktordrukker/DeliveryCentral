import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appRoutes } from './navigation';

/* ══════════════════════════════════════════════════════════════════
   Drilldown Path — tracks the navigation trail for breadcrumb UX.

   How it works:
   - Every page navigation is recorded as a crumb (label + href).
   - If the user navigates "deeper" (new path is a child or different section),
     a crumb is pushed.
   - If the user navigates "back" to a path already in the trail,
     the trail is trimmed to that point.
   - Clicking a crumb navigates to that href and trims the trail.
   - Stored in sessionStorage so it survives page refreshes within a tab.
   ══════════════════════════════════════════════════════════════════ */

export interface Crumb {
  label: string;
  href: string;
}

interface DrilldownContextValue {
  crumbs: Crumb[];
  navigateTo: (href: string, label?: string) => void;
  resetTrail: () => void;
  setCurrentLabel: (label: string) => void;
}

const STORAGE_KEY = 'dc-drilldown-path';
const RESET_FLAG_KEY = 'dc-drilldown-reset';

function loadCrumbs(): Crumb[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Crumb[]) : [];
  } catch { return []; }
}

function saveCrumbs(crumbs: Crumb[]): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(crumbs)); }
  catch { /* ignore */ }
}

/** Look up a human-readable label for a path from the route definitions */
function labelForPath(pathname: string): string {
  // Exact match
  const exact = appRoutes.find((r) => r.path === pathname);
  if (exact) return exact.title;

  // Dynamic routes: /projects/abc → "Projects" detail, /people/abc → "People" detail
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const parentPath = '/' + segments[0];
    const parent = appRoutes.find((r) => r.path === parentPath);
    if (parent) {
      // If last segment looks like an action (new, edit, dashboard)
      const lastSeg = segments[segments.length - 1];
      if (lastSeg === 'new') return `New ${parent.title.replace(/s$/, '')}`;
      if (lastSeg === 'dashboard') return `${parent.title} Dashboard`;
      // Otherwise it's an entity ID — just show parent name as the label
      // The actual entity name will be overridden by the page via setLabel()
      return parent.title;
    }
  }

  // Fallback: humanize the last segment
  const last = segments[segments.length - 1] ?? '';
  return last.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Home';
}

const DrilldownContext = createContext<DrilldownContextValue>({
  crumbs: [],
  navigateTo: () => {},
  resetTrail: () => {},
  setCurrentLabel: () => {},
});

export function DrilldownProvider({ children }: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [crumbs, setCrumbs] = useState<Crumb[]>(loadCrumbs);

  // On every navigation, update the crumb trail
  useEffect(() => {
    const path = location.pathname + location.search;

    // If the sidebar set the reset flag, start a fresh single-crumb trail
    const shouldReset = sessionStorage.getItem(RESET_FLAG_KEY) === 'true';
    if (shouldReset) {
      sessionStorage.removeItem(RESET_FLAG_KEY);
      const fresh = [{ label: labelForPath(location.pathname), href: path }];
      saveCrumbs(fresh);
      setCrumbs(fresh);
      return;
    }

    setCrumbs((prev) => {
      // Extract pathname from a stored crumb href (strip query params)
      const crumbPathname = (href: string) => href.split('?')[0];

      // If the new pathname is already in the trail, trim back to it (going "up")
      // Compare by pathname only to prevent duplicates from different query params
      const existingIdx = prev.findIndex((c) => crumbPathname(c.href) === location.pathname);
      if (existingIdx >= 0) {
        // Update the href to the latest (may have new query params) but keep the label
        const trimmed = prev.slice(0, existingIdx + 1);
        trimmed[existingIdx] = { ...trimmed[existingIdx], href: path };
        saveCrumbs(trimmed);
        return trimmed;
      }

      // If the trail is empty or this is a "root" page (like /), start fresh
      const segments = location.pathname.split('/').filter(Boolean);
      if (segments.length === 0 || prev.length === 0) {
        const fresh = [{ label: labelForPath(location.pathname), href: path }];
        saveCrumbs(fresh);
        return fresh;
      }

      // Otherwise push the new crumb (going "deeper")
      const next = [...prev, { label: labelForPath(location.pathname), href: path }];
      // Cap at 8 levels to prevent unbounded growth
      const capped = next.length > 8 ? next.slice(next.length - 8) : next;
      saveCrumbs(capped);
      return capped;
    });
  }, [location.pathname, location.search]);

  // Navigate to a crumb — trims the trail and navigates
  const navigateTo = useCallback((href: string, label?: string) => {
    setCrumbs((prev) => {
      const hrefPathname = href.split('?')[0];
      const idx = prev.findIndex((c) => c.href.split('?')[0] === hrefPathname);
      if (idx >= 0) {
        const trimmed = prev.slice(0, idx + 1);
        trimmed[idx] = { ...trimmed[idx], href };
        saveCrumbs(trimmed);
        return trimmed;
      }
      // If not in trail (direct link), push it
      const next = [...prev, { label: label ?? labelForPath(href), href }];
      saveCrumbs(next);
      return next;
    });
    navigate(href);
  }, [navigate]);

  // Reset the trail — called before sidebar navigation (outside the provider)
  // via the sessionStorage flag, but also exposed for programmatic use
  const resetTrail = useCallback(() => {
    sessionStorage.setItem(RESET_FLAG_KEY, 'true');
  }, []);

  // Update the label of the current (last) crumb — used by detail pages
  // to replace the auto-generated label with the entity name
  const setCurrentLabel = useCallback((label: string) => {
    setCrumbs((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], label };
      saveCrumbs(updated);
      return updated;
    });
  }, []);

  return (
    <DrilldownContext.Provider value={{ crumbs, navigateTo, resetTrail, setCurrentLabel }}>
      {children}
    </DrilldownContext.Provider>
  );
}

/** Mark the next navigation as a sidebar (direct) navigation.
 *  Call this BEFORE the NavLink triggers the route change.
 *  Works from outside the DrilldownProvider. */
export function markSidebarNavigation(): void {
  try { sessionStorage.setItem(RESET_FLAG_KEY, 'true'); } catch { /* ignore */ }
}

export function useDrilldown(): DrilldownContextValue {
  return useContext(DrilldownContext);
}
