import { lazy, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import {
  type AppRole,
  CAPITALISATION_ROLES,
  EXCEPTIONS_ROLES,
  EVIDENCE_MANAGEMENT_ROLES,
  EXPORT_CENTRE_ROLES,
  hasAnyRole,
  TIMESHEET_MANAGER_ROLES,
} from '@/app/route-manifest';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';

import { ExceptionsPage } from '@/routes/exceptions/ExceptionsPage';
import { FeatureGuard } from '@/routes/FeatureGuard';
import { WorkEvidencePage } from '@/routes/work-evidence/WorkEvidencePage';

const TimeReportPage = lazy(() =>
  import('@/routes/reports/TimeReportPage').then((m) => ({ default: m.TimeReportPage })),
);
const CapitalisationPage = lazy(() =>
  import('@/routes/reports/CapitalisationPage').then((m) => ({
    default: m.CapitalisationPage,
  })),
);
const ExportCentrePage = lazy(() =>
  import('@/routes/reports/ExportCentrePage').then((m) => ({ default: m.ExportCentrePage })),
);
const UtilizationPage = lazy(() =>
  import('@/routes/reports/UtilizationPage').then((m) => ({ default: m.UtilizationPage })),
);
// SoT PR 17g — Report Builder hidden (V2-done criterion #4: half-built features
// must be hidden). Synthetic preview data, no real API integration; the DS
// canvas does not bless a builder surface for v2. Page remains reachable via
// direct URL for engineering work but is removed from the Reports tab strip.

type ReportsSection =
  | 'exceptions'
  | 'time'
  | 'capitalisation'
  | 'export'
  | 'utilization'
  | 'evidence';

interface ReportsTab {
  id: ReportsSection;
  label: string;
  description: string;
  /** W1-26 — role allowlist matching the underlying route's @RequireRoles. */
  allowedRoles: readonly AppRole[];
  /**
   * Optional feature-flag gate. When set, the tab is only shown if the flag is
   * enabled. CAPEX (`reportsCapitalisation`) is default-OFF and pre-GA
   * (data-starved — nothing populates TimesheetEntry.capex; see
   * docs/qa/capex-gap-list.md), so it stays hidden until GA.
   */
  flag?: Parameters<typeof isFeatureEnabled>[0];
}

const TABS: ReportsTab[] = [
  { id: 'exceptions', label: 'Exceptions', description: 'Unified operational queue', allowedRoles: EXCEPTIONS_ROLES },
  { id: 'time', label: 'Time', description: 'Time analytics: hours, OT, bench, CAPEX/OPEX', allowedRoles: TIMESHEET_MANAGER_ROLES },
  { id: 'capitalisation', label: 'CAPEX', description: 'Capitalisation breakdown', allowedRoles: CAPITALISATION_ROLES, flag: 'reportsCapitalisation' },
  { id: 'export', label: 'Export', description: 'XLSX export center', allowedRoles: EXPORT_CENTRE_ROLES },
  { id: 'utilization', label: 'Utilization', description: 'Available vs assigned vs actual hours', allowedRoles: EXCEPTIONS_ROLES },
  { id: 'evidence', label: 'Evidence', description: 'Observed-work records + diagnostics', allowedRoles: EVIDENCE_MANAGEMENT_ROLES },
];

function isValidSection(s: string | null): s is ReportsSection {
  return !!s && TABS.some((t) => t.id === s);
}

/**
 * Phase E3 — Reports umbrella shell.
 *
 * Replaces 7 separate sidebar entries with a single canvas "Reports" tab.
 * Each former route lives as a tab under `/reports?section=...`. No
 * underlying pages are modified — they're embedded as-is so behavior
 * stays identical; only the parent layout changes.
 *
 * URL pattern: `/reports?section=exceptions|time|capitalisation|export|utilization|builder|evidence`
 *
 * The legacy routes (`/exceptions`, `/reports/time`, etc.) remain
 * reachable directly — marked `obsoleteInV2: true` in the manifest
 * (Phase E0) so they're hidden from the v2 sidebar but resolve to
 * their original pages for deep links and bookmarks.
 *
 * Reference: `/home/drukker/.claude/plans/v2-lean-restructure-phase-e.md` §4.2 + E3
 */
export function ReportsPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section');
  const { principal } = useAuth();

  // W1-26 — tabs are filtered by role so HR-only tabs are hidden from PM and
  // PM-/RM-only tabs are hidden from HR. The underlying sub-pages keep their
  // own role guards, but the umbrella tab strip must also enforce the gate so
  // the surface is consistent with the in-page RBAC. If the deep-linked
  // `?section=X` is not visible for this role, fall back to the first visible
  // tab (or `exceptions` if none — page entry already requires EXCEPTIONS_ROLES).
  const visibleTabs = useMemo(
    () => TABS.filter((t) => hasAnyRole(principal?.roles, [...t.allowedRoles]) && (!t.flag || isFeatureEnabled(t.flag))),
    [principal?.roles],
  );
  const requestedTab = isValidSection(sectionParam) ? sectionParam : null;
  const requestedAllowed = requestedTab && visibleTabs.some((t) => t.id === requestedTab);
  const activeTab: ReportsSection = requestedAllowed
    ? (requestedTab as ReportsSection)
    : (visibleTabs[0]?.id ?? 'exceptions');
  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  // V2 Scope §4 item 15 — when dsRefresh is on, the umbrella shell renders
  // the DS Tabs atom above the embedded sub-page instead of using the
  // PageHeader's built-in TabBar. Both paths drive the same ?section= URL
  // param so deep links + bookmarks remain stable.
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');

  const onTabChange = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('section', id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <PageContainer testId="reports-page">
      {dsRefreshEnabled ? (
        <PageHeader
          eyebrow="Workspace"
          title="Reports"
          subtitle={activeMeta.description}
        />
      ) : (
        <PageHeader
          eyebrow="Workspace"
          title="Reports"
          subtitle={activeMeta.description}
          tabs={visibleTabs.map((t) => ({ id: t.id, label: t.label }))}
          activeTab={activeTab}
          onTabChange={onTabChange}
        />
      )}

      {dsRefreshEnabled ? (
        <Tabs
          tabs={visibleTabs.map((t) => ({ id: t.id, label: t.label }))}
          value={activeTab}
          onValueChange={onTabChange}
          ariaLabel="Reports sections"
          idPrefix="reports-tab"
          testId="reports-ds-tabs"
          style={{ marginBottom: 'var(--space-3)' }}
        />
      ) : null}

      <div data-testid={`reports-tab-${activeTab}`} style={{ marginTop: 12 }}>
        <Suspense fallback={<LoadingState variant="skeleton" skeletonType="page" />}>
          {activeTab === 'exceptions' ? <ExceptionsPage /> : null}
          {activeTab === 'time' ? <TimeReportPage /> : null}
          {activeTab === 'capitalisation' ? <CapitalisationPage /> : null}
          {activeTab === 'export' ? <ExportCentrePage /> : null}
          {activeTab === 'utilization' ? <UtilizationPage /> : null}
          {activeTab === 'evidence' ? (
            <FeatureGuard feature="evidenceManagement">
              <WorkEvidencePage />
            </FeatureGuard>
          ) : null}
        </Suspense>
      </div>
    </PageContainer>
  );
}
