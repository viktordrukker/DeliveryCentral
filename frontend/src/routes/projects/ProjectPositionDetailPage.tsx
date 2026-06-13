import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useDrilldown } from '@/app/drilldown-context';
import { STAFFING_DESK_ROLES, hasAnyRole } from '@/app/route-manifest';
import { AssignmentHistoryTimeline } from '@/components/assignments/AssignmentHistoryTimeline';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { TipBalloon } from '@/components/common/TipBalloon';
import { Avatar, Button, DescriptionList, Pct, Table, WorkflowStages, type Column, type WorkflowStage, type WorkflowStageStatus } from '@/components/ds';
import {
  type ApprovalQueueItemDto,
  fetchUnifiedApprovals,
} from '@/lib/api/approvals-unified';
import {
  type PositionCandidate,
  type PositionFillStatus,
  type ProjectPosition,
  type ProjectPositionFillHistory,
  fetchPositionHistory,
  getPositionCandidates,
  getProjectPositionById,
  listProjectPositions,
  transitionProjectPositionFill,
} from '@/lib/api/project-positions';
import { fetchPersonDirectoryById } from '@/lib/api/person-directory';
import { fetchProjectById, type ProjectDetails } from '@/lib/api/project-registry';
import { formatDateTime } from '@/lib/format-date';

/**
 * V2 SoT PR 17h-position — ProjectPositionDetailPage 2-col DS-canvas
 * conformance. Spec: DS/page-extras.jsx → `PositionDetail` block (lines
 * 240-432). Main column shows the proposed-fill card, position spec,
 * other-candidates table and fill-history timeline. Right rail (320px)
 * holds quick actions + linked entities.
 *
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

// Statuses where a "current fill" is meaningful — the canvas's emphasized
// "Current fill — proposed" card.
const HAS_FILL: ReadonlySet<PositionFillStatus> = new Set([
  'PROPOSED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
]);

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

// W2-04 — match an approval queue item to the current position. The unified
// queue exposes `meta.positionId` on position-proposal sources; we also fall
// back to the `href` field which contains `/projects/.../positions/<id>`.
function isApprovalForPosition(item: ApprovalQueueItemDto, positionId: string): boolean {
  const meta = item.meta as { positionId?: string } | undefined;
  if (meta && typeof meta.positionId === 'string' && meta.positionId === positionId) {
    return true;
  }
  return typeof item.href === 'string' && item.href.includes(positionId);
}

function renderSlaBadge(stage: 'on-track' | 'due-soon' | 'breached' | null): JSX.Element {
  if (stage === 'breached') {
    return <StatusBadge tone="danger" label="Breached" variant="chip" />;
  }
  if (stage === 'due-soon') {
    return <StatusBadge tone="warning" label="Due soon" variant="chip" />;
  }
  if (stage === 'on-track') {
    return <StatusBadge tone="active" label="On track" variant="chip" />;
  }
  return <StatusBadge tone="neutral" label="—" variant="text" />;
}

function buildLifecycleStages(current: PositionFillStatus): WorkflowStage[] {
  if (current === 'ON_HOLD' || current === 'RELEASED') {
    return [
      ...LIFECYCLE_ORDER.map((s) => ({
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
  const params = useParams<{ projectId?: string; positionId?: string; id?: string }>();
  const location = useLocation();
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
  // PR-20 — `?proposePersonId=` (from the issue-673 bench propose-failure
  // deep-link) pre-arms the propose dialog once the slate has loaded. The ref
  // guards single-shot arming so a dismissal isn't undone by a re-render.
  const armedProposeRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [activePersonName, setActivePersonName] = useState<string | null>(null);
  const [projectMeta, setProjectMeta] = useState<ProjectDetails | null>(null);
  // W2-04 — lifecycle history + pending approvals for this position.
  const [history, setHistory] = useState<ProjectPositionFillHistory[]>([]);
  const [approvals, setApprovals] = useState<ApprovalQueueItemDto[]>([]);
  const { setCurrentLabel } = useDrilldown();

  useEffect(() => {
    if (!position) return;
    const projectLabel = projectMeta ? `${projectMeta.projectCode} — ${projectMeta.name}` : '';
    const label = projectLabel ? `${position.role} · ${projectLabel}` : position.role;
    setCurrentLabel(label);
  }, [position, projectMeta, setCurrentLabel]);

  // W1-11 — swap UUID-shaped param for publicId in URL when known.
  useEffect(() => {
    if (!position?.publicId) return;
    if (!positionId) return;
    if (positionId === position.publicId) return;
    if (!/^[0-9a-f-]{36}$/i.test(positionId)) return;
    if (typeof window === 'undefined' || !window.history) return;
    const nextPath = location.pathname.replace(positionId, position.publicId);
    if (nextPath === location.pathname) return;
    window.history.replaceState(null, '', `${nextPath}${location.search}${location.hash}`);
  }, [position, positionId, location.pathname, location.search, location.hash]);

  const load = useCallback(async (): Promise<void> => {
    if (!positionId) {
      setError('No positionId in route.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
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
      const realId = pos.publicId ?? pos.id;
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
      void Promise.allSettled([
        fetchPositionHistory(realId).then(
          (r) => setHistory(r.history),
          () => setHistory([]),
        ),
        fetchUnifiedApprovals({ sources: ['position-proposal'], pageSize: 100 }).then(
          (r) => setApprovals(r.items.filter((it) => isApprovalForPosition(it, realId))),
          () => setApprovals([]),
        ),
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load position.');
    } finally {
      setIsLoading(false);
    }
  }, [positionId]);

  useEffect(() => {
    void load();
  }, [load]);

  // PR-20 — honor `?proposePersonId=` deep-link: once the candidate slate is
  // loaded, pre-arm the propose dialog with the matching candidate. Fires once.
  useEffect(() => {
    if (armedProposeRef.current) return;
    if (candidates.length === 0) return;
    const proposePersonId = new URLSearchParams(location.search).get('proposePersonId');
    if (!proposePersonId) return;
    const candidate = candidates.find((c) => c.personId === proposePersonId);
    if (!candidate) return;
    armedProposeRef.current = true;
    setProposeFor(candidate);
  }, [candidates, location.search]);

  async function confirmPropose(): Promise<void> {
    if (!proposeFor || !position) return;
    setBusy(true);
    try {
      await transitionProjectPositionFill(position.publicId ?? position.id, {
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
    {
      key: 'name',
      title: 'Candidate',
      render: (c) => (
        <span style={{ alignItems: 'center', display: 'inline-flex', gap: 'var(--space-2)' }}>
          <Avatar name={c.name} size="sm" />
          {c.name}
        </span>
      ),
    },
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setProposeFor(c)}
                type="button"
                data-testid="position-propose-candidate"
              >
                Propose
              </Button>
            ),
          } as Column<PositionCandidate>,
        ]
      : []),
  ];

  // The proposed/active candidate's match score in the slate — surfaces in the
  // "Current fill" emphasized card next to the avatar.
  const activeCandidate =
    position?.activePersonId
      ? candidates.find((c) => c.personId === position.activePersonId)
      : undefined;
  const activeMatchPct = activeCandidate
    ? Math.round(activeCandidate.matchScore * 100)
    : null;

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
        <div
          data-testid="position-detail-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            gap: 'var(--space-5)',
            alignItems: 'flex-start',
          }}
        >
          {/* Main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Current fill — proposed (emphasized card) */}
            <section
              data-testid="position-current-fill"
              className="section-card section-card-emphasized"
              style={{ borderLeft: '3px solid var(--color-status-info)' }}
            >
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  gap: 'var(--space-2)',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-3)',
                }}
              >
                <h3 className="section-card__title" style={{ margin: 0 }}>
                  Current fill{position.fillStatus === 'PROPOSED' ? ' — proposed' : ''}
                </h3>
                <span data-testid="position-fill-status" data-status={position.fillStatus}>
                  <StatusBadge
                    tone={STATUS_TONE[position.fillStatus]}
                    label={position.fillStatus}
                    variant="chip"
                  />
                </span>
              </div>
              {HAS_FILL.has(position.fillStatus) && position.activePersonId ? (
                <div
                  style={{
                    alignItems: 'center',
                    display: 'grid',
                    gap: 'var(--space-4)',
                    gridTemplateColumns: 'auto 1fr auto',
                  }}
                >
                  <Avatar name={activePersonName ?? 'Proposed person'} size="xl" />
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      {activePersonName ?? (
                        <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          resolving…
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
                      {position.role}
                      {position.activeAllocationPercent !== undefined
                        ? ` · ${position.activeAllocationPercent}%`
                        : ''}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gap: 'var(--space-4)',
                        gridTemplateColumns: 'repeat(4, minmax(0, auto))',
                        marginTop: 'var(--space-3)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: 'var(--color-text-muted)',
                            fontSize: 11,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Match{' '}
                          {activeMatchPct === null ? (
                            <TipBalloon
                              tip="Match score for this person is not yet computed by the backend."
                              arrow="top"
                            />
                          ) : null}
                        </div>
                        <div style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {activeMatchPct === null ? '—' : `${activeMatchPct}%`}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: 'var(--color-text-muted)',
                            fontSize: 11,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Cost{' '}
                          <TipBalloon
                            tip="Per-person cost band is not yet exposed by the backend."
                            arrow="top"
                          />
                        </div>
                        <div style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>—</div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: 'var(--color-text-muted)',
                            fontSize: 11,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Available
                        </div>
                        <div style={{ fontSize: 16, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                          {position.activeValidFrom
                            ? new Date(position.activeValidFrom).toLocaleDateString()
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: 'var(--color-text-muted)',
                            fontSize: 11,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Conflict{' '}
                          <TipBalloon
                            tip="Allocation conflict detection is not yet wired into this view."
                            arrow="top"
                          />
                        </div>
                        <div
                          style={{
                            color: 'var(--color-status-active)',
                            fontSize: 16,
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                          }}
                        >
                          None
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                    }}
                  >
                    {position.fillStatus === 'PROPOSED' ? (
                      <>
                        <Button variant="primary" size="md" type="button" disabled>
                          Confirm · Book
                        </Button>
                        <Button variant="secondary" size="md" type="button" disabled>
                          View profile
                        </Button>
                        <Button variant="ghost" size="md" type="button" disabled>
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="md" type="button" disabled>
                        View profile
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No proposed fill yet"
                  description={
                    PROPOSABLE.has(position.fillStatus)
                      ? 'Review the candidates below and propose someone to start the fill.'
                      : `Position is ${position.fillStatus}.`
                  }
                />
              )}
            </section>

            {/* Position spec — 2-col description list */}
            <SectionCard title="Position spec">
              <div
                style={{
                  display: 'grid',
                  gap: 'var(--space-4)',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                }}
              >
                <DescriptionList
                  items={[
                    { label: 'Role', value: position.role },
                    {
                      label: 'Required allocation',
                      value: <Pct value={position.requiredAllocationPercent} fractionDigits={0} />,
                    },
                    {
                      label: 'Status',
                      value: (
                        <StatusBadge tone={STATUS_TONE[position.fillStatus]} label={position.fillStatus} />
                      ),
                    },
                    {
                      label: 'Start',
                      value: position.startDate
                        ? new Date(position.startDate).toLocaleDateString()
                        : '—',
                    },
                    {
                      label: 'End',
                      value: position.endDate
                        ? new Date(position.endDate).toLocaleDateString()
                        : '—',
                    },
                  ]}
                />
                <DescriptionList
                  items={[
                    {
                      label: 'Required skills',
                      value: requiredSkills.length > 0 ? requiredSkills.join(', ') : '—',
                    },
                    {
                      label: 'Active person',
                      value: position.activePersonId
                        ? activePersonName ?? (
                            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              resolving…
                            </span>
                          )
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
                    {
                      label: 'Priority',
                      value: position.priority ?? '—',
                    },
                    {
                      label: 'Position ID',
                      value: (
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {position.publicId ?? '—'}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </SectionCard>

            <SectionCard title="Position lifecycle">
              <WorkflowStages
                stages={buildLifecycleStages(position.fillStatus)}
                orientation="horizontal"
                ariaLabel="Position lifecycle stages"
              />
            </SectionCard>

            {/* Other candidates considered */}
            <SectionCard title={`Other candidates considered${candidates.length > 0 ? ` (${candidates.length})` : ''}`}>
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

            <SectionCard title={`Pending approvals${approvals.length > 0 ? ` (${approvals.length})` : ''}`}>
              {approvals.length === 0 ? (
                <EmptyState
                  title="No pending approvals"
                  description="This position has no open proposals awaiting a decision."
                />
              ) : (
                <Table<ApprovalQueueItemDto>
                  variant="compact"
                  getRowKey={(a) => a.id}
                  rows={approvals}
                  columns={[
                    { key: 'title', title: 'Title', render: (a) => a.title },
                    {
                      key: 'submittedBy',
                      title: 'Submitted by',
                      render: (a) => a.submittedBy?.displayName ?? '—',
                    },
                    {
                      key: 'submittedAt',
                      title: 'Submitted',
                      render: (a) => formatDateTime(a.submittedAt),
                    },
                    {
                      key: 'sla',
                      title: 'SLA',
                      render: (a) => renderSlaBadge(a.slaStage),
                    },
                    {
                      key: 'action',
                      title: '',
                      render: (a) => (
                        <Link
                          to={`/approvals?focus=${encodeURIComponent(a.id)}`}
                          style={{ color: 'var(--color-accent)' }}
                        >
                          Review
                        </Link>
                      ),
                    },
                  ]}
                />
              )}
            </SectionCard>

            {/* Fill history timeline */}
            <SectionCard title="Fill history" collapsible>
              <AssignmentHistoryTimeline items={history} />
            </SectionCard>
          </div>

          {/* Right rail (320px) */}
          <aside
            data-testid="position-right-rail"
            style={{
              alignSelf: 'stretch',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              position: 'sticky',
              top: 'var(--space-4)',
            }}
          >
            <SectionCard title="Quick actions">
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                {projectId ? (
                  <Link to={`/projects/${projectId}/positions`} style={{ color: 'var(--color-accent)', fontSize: 13 }}>
                    Edit position
                  </Link>
                ) : null}
                {PROPOSABLE.has(position.fillStatus) ? (
                  <Button variant="secondary" size="sm" type="button" disabled>
                    Cancel position
                  </Button>
                ) : null}
                {position.fillStatus === 'ON_HOLD' || position.fillStatus === 'RELEASED' ? (
                  <Button variant="secondary" size="sm" type="button" disabled>
                    Re-open
                  </Button>
                ) : null}
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                  Edit + lifecycle actions ship in the next slice.
                </span>
              </div>
            </SectionCard>

            <SectionCard title="Linked">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {projectId ? (
                  <Link
                    to={`/projects/${projectId}/dashboard`}
                    style={{
                      color: 'var(--color-text)',
                      display: 'flex',
                      fontSize: 13,
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2)',
                    }}
                  >
                    {projectMeta
                      ? `${projectMeta.projectCode} — ${projectMeta.name}`
                      : 'Parent project'}
                  </Link>
                ) : null}
                {projectId ? (
                  <Link
                    to={`/projects/${projectId}/positions`}
                    style={{
                      color: 'var(--color-text)',
                      display: 'flex',
                      fontSize: 13,
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2)',
                    }}
                  >
                    All positions on this project
                  </Link>
                ) : null}
                <Link
                  to="/staffing-desk"
                  style={{
                    color: 'var(--color-text)',
                    display: 'flex',
                    fontSize: 13,
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2)',
                  }}
                >
                  Staffing desk
                </Link>
                <Link
                  to="/approvals"
                  style={{
                    color: 'var(--color-text)',
                    display: 'flex',
                    fontSize: 13,
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2)',
                  }}
                >
                  Approvals queue
                </Link>
              </div>
            </SectionCard>
          </aside>
        </div>
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
