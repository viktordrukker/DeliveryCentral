import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useDrilldown } from '@/app/drilldown-context';
import { STAFFING_DESK_ROLES, hasAnyRole } from '@/app/route-manifest';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Button, DescriptionList, Pct, Table, WorkflowStages, type Column, type WorkflowStage, type WorkflowStageStatus } from '@/components/ds';
import {
  type PositionCandidate,
  type PositionFillStatus,
  type ProjectPosition,
  getPositionCandidates,
  getProjectPositionById,
  listProjectPositions,
  transitionProjectPositionFill,
} from '@/lib/api/project-positions';
import { autoMatchPosition } from '@/lib/api/staffing-candidates';
import { fetchPersonDirectoryById } from '@/lib/api/person-directory';
import { fetchProjectById, type ProjectDetails } from '@/lib/api/project-registry';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * NEW-LGL-7 / action B-02 — lean ProjectPosition detail + Find-Candidates.
 * URL: `/projects/:projectId/positions/:positionId`. Consumes the lean
 * endpoints only (GET /:id, GET /:id/candidates, POST /:id/transition).
 */

const STATUS_TONE: Record<PositionFillStatus, StatusTone> = {
  DRAFT: 'neutral',
  OPEN: 'info',
  PROPOSED: 'pending',
  BOOKED: 'pending',
  ONBOARDING: 'pending',
  ASSIGNED: 'active',
  ON_HOLD: 'warning',
  RELEASED: 'neutral',
};

// Positions still seeking a fill — Propose is meaningful here.
const PROPOSABLE: ReadonlySet<PositionFillStatus> = new Set(['DRAFT', 'OPEN']);

// Canonical lifecycle order for the workflow visualization. ON_HOLD and
// RELEASED are terminal/branch states and are not part of the linear flow.
const LIFECYCLE_ORDER: PositionFillStatus[] = [
  'DRAFT',
  'OPEN',
  'PROPOSED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
];

const LIFECYCLE_DESCRIPTIONS: Record<PositionFillStatus, string> = {
  DRAFT: 'Position drafted, not yet open to candidates.',
  OPEN: 'Position is open and accepting candidate proposals.',
  PROPOSED: 'Candidate slate submitted; awaiting decision.',
  BOOKED: 'Candidate selected; assignment is committed.',
  ONBOARDING: 'Person is onboarding into the role.',
  ASSIGNED: 'Person is actively assigned to the position.',
  ON_HOLD: 'Position is paused; resume to ASSIGNED when ready.',
  RELEASED: 'Position is closed — person rolled off.',
};

function buildLifecycleStages(current: PositionFillStatus): WorkflowStage[] {
  if (current === 'ON_HOLD' || current === 'RELEASED') {
    return [
      ...LIFECYCLE_ORDER.map((s, i) => ({
        key: s,
        label: s,
        description: LIFECYCLE_DESCRIPTIONS[s],
        status: 'done' as WorkflowStageStatus,
      })),
      {
        key: current,
        label: current.replace('_', '-'),
        description: LIFECYCLE_DESCRIPTIONS[current],
        status: 'current' as WorkflowStageStatus,
      },
    ];
  }
  const idx = LIFECYCLE_ORDER.indexOf(current);
  return LIFECYCLE_ORDER.map((s, i) => {
    let status: WorkflowStageStatus = 'upcoming';
    if (i < idx) status = 'done';
    else if (i === idx) status = 'current';
    return {
      key: s,
      label: s,
      description: LIFECYCLE_DESCRIPTIONS[s],
      status,
    };
  });
}

export function ProjectPositionDetailPage(): JSX.Element {
  // Unified entry point — works for /projects/:projectId/positions/:positionId
  // AND /positions/:id AND /staffing-requests/:id AND /assignments/:id (where
  // :id is treated as positionId; if that 404s, we fall back to a legacy id
  // lookup via the parent placeholder pages' redirect).
  const params = useParams<{ projectId?: string; positionId?: string; id?: string }>();
  const projectId = params.projectId;
  const positionId = params.positionId ?? params.id;
  const { principal } = useAuth();
  const canStaff = hasAnyRole(principal?.roles, STAFFING_DESK_ROLES);

  const [position, setPosition] = useState<ProjectPosition | null>(null);
  const [candidates, setCandidates] = useState<PositionCandidate[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposeFor, setProposeFor] = useState<PositionCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [activePersonName, setActivePersonName] = useState<string | null>(null);
  const [projectMeta, setProjectMeta] = useState<ProjectDetails | null>(null);
  // LEAN-P4-missing-3 — RM auto-match by skill (gated on dsRefresh).
  const [autoMatchBusy, setAutoMatchBusy] = useState(false);
  const [autoMatchMessage, setAutoMatchMessage] = useState<string | null>(null);
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const { setCurrentLabel } = useDrilldown();

  // Push a human-readable label into the breadcrumb trail (never raw UUID).
  useEffect(() => {
    if (!position) return;
    const projectLabel = projectMeta ? `${projectMeta.projectCode} — ${projectMeta.name}` : '';
    const label = projectLabel ? `${position.role} · ${projectLabel}` : position.role;
    setCurrentLabel(label);
  }, [position, projectMeta, setCurrentLabel]);

  const load = useCallback(async (): Promise<void> => {
    if (!positionId) {
      setError('No positionId in route.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Two-pronged lookup so this page works for callers that pass either
      // a canonical ProjectPosition id OR a legacy ProjectAssignment id.
      // The staffing-desk's "assignment" rows carry the legacy id; the seed
      // populates that id on ProjectPosition.legacyAssignmentId. We try the
      // direct GET first (fast path for canonical ids), then fall back to
      // a listing filtered by legacyAssignmentId.
      let pos: ProjectPosition | null = null;
      try {
        pos = await getProjectPositionById(positionId);
      } catch {
        const { positions } = await listProjectPositions({ take: 500 });
        pos = positions.find((p) => p.legacyAssignmentId === positionId) ?? null;
        if (!pos) {
          throw new Error(`ProjectPosition ${positionId} not found.`);
        }
      }
      setPosition(pos);
      const realId = pos.id;
      // Resolve active-person + project labels in parallel — never show
      // raw UUIDs to the user (per feedback-no-uuids-in-browser).
      void Promise.allSettled([
        pos.activePersonId
          ? fetchPersonDirectoryById(pos.activePersonId).then(
              (p) => setActivePersonName(p.displayName),
              () => setActivePersonName(null),
            )
          : Promise.resolve(setActivePersonName(null)),
        pos.projectId
          ? fetchProjectById(pos.projectId).then(
              (proj) => setProjectMeta(proj),
              () => setProjectMeta(null),
            )
          : Promise.resolve(setProjectMeta(null)),
      ]);
      if (PROPOSABLE.has(pos.fillStatus)) {
        const res = await getPositionCandidates(realId, 5);
        setCandidates(res.candidates);
        setRequiredSkills(res.requiredSkills);
      } else {
        setCandidates([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load position.');
    } finally {
      setIsLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAutoMatch(): Promise<void> {
    if (!position) return;
    setAutoMatchBusy(true);
    setAutoMatchMessage(null);
    try {
      const res = await autoMatchPosition(position.id, { topN: 5 });
      setAutoMatchMessage(
        res.created === 0
          ? 'Auto-match found no candidates meeting the 80% skill floor.'
          : `Auto-matched ${res.created} candidate${res.created === 1 ? '' : 's'} into the slate.`,
      );
      await load();
    } catch (err: unknown) {
      setAutoMatchMessage(err instanceof Error ? err.message : 'Auto-match failed.');
    } finally {
      setAutoMatchBusy(false);
    }
  }

  async function confirmPropose(): Promise<void> {
    if (!proposeFor || !position) return;
    setBusy(true);
    try {
      // Use the canonical position.id (resolved through the legacy-id fallback)
      // rather than the URL :id, which may be a legacyAssignmentId.
      await transitionProjectPositionFill(position.id, {
        toStatus: 'PROPOSED',
        personId: proposeFor.personId,
        allocationPercent: position.requiredAllocationPercent,
      });
      setProposeFor(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to propose candidate.');
    } finally {
      setBusy(false);
    }
  }

  const candidateColumns: Array<Column<PositionCandidate>> = [
    { key: 'name', title: 'Candidate', render: (c) => c.name },
    { key: 'role', title: 'Role', render: (c) => c.role || '—' },
    { key: 'grade', title: 'Grade', render: (c) => c.grade ?? '—' },
    {
      key: 'match',
      title: 'Match',
      align: 'right',
      render: (c) => <Pct value={Math.round(c.matchScore * 100)} fractionDigits={0} />,
    },
    {
      key: 'matched',
      title: 'Matched skills',
      render: (c) => (c.matchedSkills.length > 0 ? c.matchedSkills.join(', ') : '—'),
    },
    {
      key: 'missing',
      title: 'Missing',
      render: (c) =>
        c.missingSkills.length > 0 ? (
          <span style={{ color: 'var(--color-status-warning)' }}>{c.missingSkills.join(', ')}</span>
        ) : (
          '—'
        ),
    },
    ...(canStaff
      ? [
          {
            key: 'action',
            title: '',
            render: (c: PositionCandidate) => (
              <Button variant="secondary" size="sm" onClick={() => setProposeFor(c)} type="button">
                Propose
              </Button>
            ),
          } as Column<PositionCandidate>,
        ]
      : []),
  ];

  return (
    <PageContainer testId="project-position-detail-page">
      <div style={{ fontSize: 13, marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
        <Link to="/projects" style={{ color: 'var(--color-accent)' }}>Projects</Link>
        {' / '}
        {projectId ? (
          <Link to={`/projects/${projectId}/positions`} style={{ color: 'var(--color-accent)' }}>Positions</Link>
        ) : (
          'Positions'
        )}
        {' / '}
        <span>{position?.role ?? 'Position'}</span>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState description={error} />}

      {!isLoading && !error && position && (
        <>
          <SectionCard
            title={
              projectMeta
                ? `${position.role} · ${projectMeta.projectCode} ${projectMeta.name}`
                : position.role
            }
          >
            <DescriptionList
              items={[
                { label: 'Status', value: <StatusBadge tone={STATUS_TONE[position.fillStatus]} label={position.fillStatus} /> },
                { label: 'Required allocation', value: <Pct value={position.requiredAllocationPercent} fractionDigits={0} /> },
                {
                  label: 'Active person',
                  value: position.activePersonId
                    ? activePersonName ?? <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>resolving…</span>
                    : '—',
                },
                {
                  label: 'Active allocation',
                  value:
                    position.activeAllocationPercent !== undefined ? (
                      <Pct value={position.activeAllocationPercent} fractionDigits={0} />
                    ) : (
                      '—'
                    ),
                },
                { label: 'Required skills', value: requiredSkills.length > 0 ? requiredSkills.join(', ') : '—' },
              ]}
            />
          </SectionCard>

          <SectionCard title="Position lifecycle">
            <WorkflowStages
              stages={buildLifecycleStages(position.fillStatus)}
              orientation="horizontal"
              ariaLabel="Position lifecycle stages"
            />
          </SectionCard>

          <SectionCard title={`Suggested candidates${candidates.length > 0 ? ` (${candidates.length})` : ''}`}>
            {dsRefreshEnabled && canStaff && PROPOSABLE.has(position.fillStatus) ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-3)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Auto-match populates the slate with the top-5 skill-matched + available people. Review and adjust before proposing.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => void runAutoMatch()}
                  disabled={autoMatchBusy}
                  data-testid="auto-match-button"
                >
                  {autoMatchBusy ? 'Auto-matching…' : 'Auto-match'}
                </Button>
              </div>
            ) : null}
            {autoMatchMessage ? (
              <div
                role="status"
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-muted)',
                  marginBottom: 'var(--space-3)',
                }}
                data-testid="auto-match-message"
              >
                {autoMatchMessage}
              </div>
            ) : null}
            {!PROPOSABLE.has(position.fillStatus) ? (
              <EmptyState
                title="Position not seeking a fill"
                description={`This position is ${position.fillStatus}. Candidate suggestions show for DRAFT/OPEN positions.`}
              />
            ) : candidates.length === 0 ? (
              <EmptyState
                title="No candidates found"
                description="No available bench people match this position's role and skills."
              />
            ) : (
              <Table<PositionCandidate>
                variant="compact"
                getRowKey={(c) => c.personId}
                rows={candidates}
                columns={candidateColumns}
              />
            )}
          </SectionCard>
        </>
      )}

      <ConfirmDialog
        open={proposeFor !== null}
        title="Propose candidate?"
        message={
          proposeFor
            ? `Propose ${proposeFor.name} for "${position?.role}" at ${position?.requiredAllocationPercent ?? 0}% allocation? The position moves to PROPOSED.`
            : ''
        }
        confirmLabel={busy ? 'Proposing…' : 'Propose'}
        onCancel={() => setProposeFor(null)}
        onConfirm={() => void confirmPropose()}
      />
    </PageContainer>
  );
}
