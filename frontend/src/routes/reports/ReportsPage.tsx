import { lazy, Suspense, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';

import { ExceptionsPage } from '@/routes/exceptions/ExceptionsPage';
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
const ReportBuilderPage = lazy(() =>
  import('@/routes/reports/ReportBuilderPage').then((m) => ({ default: m.ReportBuilderPage })),
);

type ReportsSection =
  | 'exceptions'
  | 'time'
  | 'capitalisation'
  | 'export'
  | 'utilization'
  | 'builder'
  | 'evidence';

interface ReportsTab {
  id: ReportsSection;
  label: string;
  description: string;
}

const TABS: ReportsTab[] = [
  { id: 'exceptions', label: 'Exceptions', description: 'Unified operational queue' },
  { id: 'time', label: 'Time', description: 'Time analytics: hours, OT, bench, CAPEX/OPEX' },
  { id: 'capitalisation', label: 'CAPEX', description: 'Capitalisation breakdown' },
  { id: 'export', label: 'Export', description: 'XLSX export center' },
  { id: 'utilization', label: 'Utilization', description: 'Available vs assigned vs actual hours' },
  { id: 'builder', label: 'Builder', description: 'Custom report builder + saved templates' },
  { id: 'evidence', label: 'Evidence', description: 'Observed-work records + diagnostics' },
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
  const activeTab: ReportsSection = isValidSection(sectionParam) ? sectionParam : 'exceptions';
  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];

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
      <PageHeader
        eyebrow="Workspace"
        title="Reports"
        subtitle={activeMeta.description}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label }))}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      <div data-testid={`reports-tab-${activeTab}`} style={{ marginTop: 12 }}>
        <Suspense fallback={<LoadingState variant="skeleton" skeletonType="page" />}>
          {activeTab === 'exceptions' ? <ExceptionsPage /> : null}
          {activeTab === 'time' ? <TimeReportPage /> : null}
          {activeTab === 'capitalisation' ? <CapitalisationPage /> : null}
          {activeTab === 'export' ? <ExportCentrePage /> : null}
          {activeTab === 'utilization' ? <UtilizationPage /> : null}
          {activeTab === 'builder' ? <ReportBuilderPage /> : null}
          {activeTab === 'evidence' ? <WorkEvidencePage /> : null}
        </Suspense>
      </div>
    </PageContainer>
  );
}
