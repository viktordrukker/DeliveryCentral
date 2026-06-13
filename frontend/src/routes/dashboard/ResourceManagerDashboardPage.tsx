import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DataFreshness } from '@/components/dashboard/DataFreshness';

import { useAuth } from '@/app/auth-context';
import { hasAnyRole, OVERALLOCATION_OVERRIDE_ROLES } from '@/app/route-manifest';
import { useTitleBarActions } from '@/app/title-bar-context';
import { DateRangePreset } from '@/components/common/DateRangePreset';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { TeamCapacityHeatmap } from '@/components/charts/TeamCapacityHeatmap';
import { ResourcePoolUtilizationDonut } from '@/components/charts/ResourcePoolUtilizationDonut';
import { DemandPipelineChart } from '@/components/charts/DemandPipelineChart';
import { PendingApprovalsCard } from '@/components/dashboard/PendingApprovalsCard';
import { RecentActivityRail } from '@/components/dashboard/RecentActivityRail';
import { useResourceManagerDashboard } from '@/features/dashboard/useResourceManagerDashboard';
import { createAndBookPosition, isOverallocationError } from '@/lib/api/project-positions';
import { ORG_DATA_CHANGED_EVENT } from '@/features/org-chart/useOrgChart';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';
import { ResourcePersonAllocationIndicator } from '@/lib/api/dashboard-resource-manager';
import { Button } from '@/components/ds';
import { PersonSelect } from '@/components/common/PersonSelect';

import { RmActionItems } from './rm-sections/RmActionItems';
import {
  RmAllocationIndicatorsTable,
  RmFuturePipelineTable,
  RmIdleResourcesTable,
} from './rm-sections/RmDetailTables';
import { RmKpiStrip } from './rm-sections/RmKpiStrip';
import { RmQuickAssignModal, type QuickAssignForm } from './rm-sections/RmQuickAssignModal';
import { RmTeamCapacitySection } from './rm-sections/RmTeamCapacitySection';

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Build 8 week labels starting from asOf */
function buildWeekLabels(asOf: string): string[] {
  const base = new Date(asOf);
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

/** Compute allocation per week for a person from pipeline */
function allocationByWeek(
  personId: string,
  indicators: ResourcePersonAllocationIndicator[],
  weeks: string[],
): number[] {
  const indicator = indicators.find((p) => p.personId === personId);
  if (!indicator) return weeks.map(() => 0);
  return weeks.map(() => indicator.totalAllocationPercent);
}

const INITIAL_QUICK_ASSIGN: QuickAssignForm = {
  allocationPercent: '100',
  error: null,
  isSubmitting: false,
  personId: '',
  projectId: '',
  staffingRole: '',
  startDate: '',
  success: null,
  overallocBlocked: false,
  allowOverallocation: false,
};

/* ── Component ───────────────────────────────────────────────────── */

export function ResourceManagerDashboardPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal, isLoading: authLoading } = useAuth();
  const { setActions } = useTitleBarActions();
  const effectivePersonId = authLoading ? null : (searchParams.get('personId') ?? principal?.personId ?? undefined);
  const state = useResourceManagerDashboard(effectivePersonId);
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [lastFetch, setLastFetch] = useState(new Date());
  const [quickForm, setQuickForm] = useState<QuickAssignForm>(INITIAL_QUICK_ASSIGN);
  const canOverrideOveralloc = hasAnyRole(principal?.roles, OVERALLOCATION_OVERRIDE_ROLES);

  useEffect(() => {
    void fetchProjectDirectory({ status: 'ACTIVE' }).then((res) => setProjects(res.items));
  }, []);

  function handlePersonChange(value: string): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('personId', value);
      return next;
    });
    state.setPersonId(value);
  }

  // Title bar actions
  useEffect(() => {
    setActions(
      <>
        <DateRangePreset
          compact
          value={{ from: state.asOf.slice(0, 10), to: '' }}
          onChange={(r) => { if (r.from) state.setAsOf(`${r.from}T00:00:00.000Z`); }}
        />
        {/* W4-01 — switched from raw <input>+<datalist> to DS PersonSelect
            (passes state.people through to preserve the resource_manager
            role filter the dashboard hook applies). */}
        <PersonSelect
          label="Resource manager"
          onChange={handlePersonChange}
          people={state.people}
          value={state.personId}
        />
        <Button as={Link} variant="secondary" size="sm" to="/resource-pools">Resource pools</Button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.asOf, state.personId, state.people]);

  // Track fetch time
  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  const managedPeople = useMemo(() => {
    if (!state.data) return [];
    return [
      ...(state.data.allocationIndicators ?? []).map((p) => ({ id: p.personId, displayName: p.displayName })),
      ...(state.data.peopleWithoutAssignments ?? []).map((p) => ({ id: p.personId, displayName: p.displayName })),
    ].filter((person, idx, arr) => arr.findIndex((p) => p.id === person.id) === idx);
  }, [state.data]);

  async function handleQuickAssign(e: FormEvent): Promise<void> {
    e.preventDefault();
    setQuickForm((prev) => ({ ...prev, error: null, isSubmitting: true, success: null }));
    try {
      // Atomic create-and-book: one POST creates the demand record and books
      // the person inside a single backend transaction — replaces the
      // create(OPEN) + transition(BOOKED) pair that hit the nonexistent
      // OPEN→BOOKED edge and orphaned OPEN positions.
      const allocation = Number(quickForm.allocationPercent);
      const startIso = `${quickForm.startDate}T00:00:00.000Z`;
      const overrideArmed = quickForm.allowOverallocation && canOverrideOveralloc;
      await createAndBookPosition({
        projectId: quickForm.projectId,
        personId: quickForm.personId,
        role: quickForm.staffingRole,
        allocationPercent: allocation,
        startDate: startIso,
        endDate: startIso,
        ...(overrideArmed ? { allowOverallocation: true } : {}),
      });
      setQuickForm({
        ...INITIAL_QUICK_ASSIGN,
        success: 'Position created and filled.',
      });
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
    } catch (err) {
      // PR-20 (issue 679) — Σ-allocation guard 409 keeps the modal open with
      // the server message; RM/DM/admin get an override-and-retry checkbox.
      setQuickForm((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to create assignment.',
        overallocBlocked: isOverallocationError(err),
        isSubmitting: false,
      }));
    }
  }

  /* ── Derived data ────────────────────────────────────────────── */
  const d = state.data;
  const totalPeople = d?.summary.totalManagedPeopleCount ?? 0;
  const idlePeople = d?.summary.peopleWithoutAssignmentsCount ?? 0;
  const allocatedPeople = Math.max(0, totalPeople - idlePeople);
  const utilPct = totalPeople > 0 ? Math.round((allocatedPeople / totalPeople) * 100) : 0;
  const overallocated = d?.allocationIndicators.filter((i) => i.indicator === 'OVERALLOCATED') ?? [];
  const pendingApprovals = d?.pendingAssignmentApprovals ?? [];
  const incomingRequests = d?.incomingRequests ?? [];

  // Heatmap
  const weeks = buildWeekLabels(state.asOf);
  const heatmapPeople = (d?.allocationIndicators ?? []).map((p) => ({
    allocationByWeek: allocationByWeek(p.personId, d?.allocationIndicators ?? [], weeks),
    name: p.displayName,
    personId: p.personId,
  }));

  // Demand pipeline
  const pipelineData: Array<Record<string, number | string> & { week: string }> = weeks.slice(0, 4).map((week) => {
    const weekDate = new Date(week);
    const nextWeek = new Date(weekDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const row: Record<string, number | string> & { week: string } = { week };
    for (const item of (d?.futureAssignmentPipeline ?? [])) {
      const startDate = new Date(item.startDate);
      if (startDate >= weekDate && startDate < nextWeek) {
        const role = item.projectName;
        row[role] = ((row[role] as number | undefined) ?? 0) + 1;
      }
    }
    return row;
  });

  // Sparklines
  const utilSpark = useMemo(() => {
    if (!d) return [];
    const indicators = d.allocationIndicators;
    return indicators.slice(-12).map((ind) => ind.totalAllocationPercent);
  }, [d]);

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="resource-manager-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading resource manager dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {d.person.displayName && (
            <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>
              {d.person.displayName}
            </h2>
          )}

          <RmKpiStrip
            utilPct={utilPct}
            utilSpark={utilSpark}
            managedTeamCount={d.summary.managedTeamCount}
            totalPeople={totalPeople}
            allocatedPeople={allocatedPeople}
            idlePeople={idlePeople}
            overallocatedCount={overallocated.length}
          />

          <PendingApprovalsCard personId={state.personId || undefined} />

          {/* ── HERO: Team Capacity Heatmap ── */}
          <div className="dashboard-hero" style={{ position: 'relative' }}>
            <TipBalloon
              tip="Heatmap shows allocation % per person per week. Dark = over-allocated, light = idle. Hover for details. Click to view person."
              arrow="left"
            />
            <div className="dashboard-hero__header">
              <div>
                <div className="dashboard-hero__title">Team Capacity Heatmap (8 Weeks)</div>
                <div className="dashboard-hero__subtitle">
                  Allocation per person — hover for detail, identify gaps and overloads
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => { setShowModal(true); setQuickForm((p) => ({ ...p, error: null, success: null })); }}
                type="button"
              >
                Quick assignment
              </Button>
            </div>
            <div className="dashboard-hero__chart">
              {heatmapPeople.length > 0 ? (
                <TeamCapacityHeatmap people={heatmapPeople} weeks={weeks} />
              ) : (
                <EmptyState
                  description="No active assignments found for managed resources. Try adjusting the date range."
                  title="No workload data"
                  action={{ label: 'Open staffing desk', href: '/staffing-desk?view=table&kind=assignment&status=APPROVED,ACTIVE' }}
                />
              )}
            </div>
          </div>

          <RmActionItems
            overallocated={overallocated}
            pendingApprovals={pendingApprovals}
            incomingRequests={incomingRequests}
          />

          {/* ── SUPPORTING CHARTS GRID ── */}
          <div className="dashboard-main-grid">
            <SectionCard
              title="Resource Pool Utilization"
              collapsible
              chartExport={{
                headers: ['Status', 'Count'],
                rows: [
                  { Status: 'Allocated', Count: String(allocatedPeople) },
                  { Status: 'Idle', Count: String(idlePeople) },
                ],
              }}
            >
              <ResourcePoolUtilizationDonut allocated={allocatedPeople} idle={idlePeople} />
            </SectionCard>

            {pipelineData.some((row) => Object.keys(row).length > 1) ? (
              <SectionCard title="Demand Pipeline (Next 4 Weeks)" collapsible>
                <DemandPipelineChart data={pipelineData} />
              </SectionCard>
            ) : (
              <SectionCard title="Demand Pipeline (Next 4 Weeks)" collapsible>
                <EmptyState description="No future assignments are queued for the next 4 weeks." title="No upcoming demand" action={{ href: '/staffing-desk?view=board', label: 'Open staffing desk' }} />
              </SectionCard>
            )}
          </div>

          <RmTeamCapacitySection rows={d.teamCapacitySummary} />

          <RmAllocationIndicatorsTable rows={d.allocationIndicators} />

          <RmFuturePipelineTable rows={d.futureAssignmentPipeline} />

          <RmIdleResourcesTable
            rows={d.peopleWithoutAssignments}
            onQuickAssign={(personId) => {
              setQuickForm((prev) => ({ ...prev, personId }));
              setShowModal(true);
            }}
          />

          <RecentActivityRail role="rm" />

          {/* ── DATA FRESHNESS ── */}
          <DataFreshness
            lastFetch={lastFetch}
            onRefresh={refetch}
            tip={<TipBalloon tip="Shows when data was last loaded. Click Refresh to pull the latest numbers from the server." arrow="top" />}
          />
        </>
      ) : null}

      <RmQuickAssignModal
        open={showModal}
        form={quickForm}
        managedPeople={managedPeople}
        projects={projects}
        canOverrideOveralloc={canOverrideOveralloc}
        onClose={() => setShowModal(false)}
        onChange={(patch) => setQuickForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={(e) => { void handleQuickAssign(e); }}
      />
    </PageContainer>
  );
}
