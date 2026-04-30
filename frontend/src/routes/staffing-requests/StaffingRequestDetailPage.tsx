import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { RM_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { useDrilldown } from '@/app/drilldown-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProposalBuilderDrawer } from '@/components/staffing-requests/ProposalBuilderDrawer';
import { ProposalReviewPanel } from '@/components/staffing-requests/ProposalReviewPanel';
import type { SkillMatchCell } from '@/components/staffing-requests/SkillMatchHeatmap';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { ApiError } from '@/lib/api/http-client';
import { fetchPersonDirectoryById } from '@/lib/api/person-directory';
import { fetchPersonSkills } from '@/lib/api/skills';
import { fetchProjectById, type ProjectDetails } from '@/lib/api/project-registry';
import {
  cancelStaffingRequest,
  duplicateStaffingRequest,
  fetchProposalSlate,
  fetchStaffingRequestById,
  type DerivedStaffingRequestStatus,
  type ProposalSlateDto,
  type StaffingRequest,
} from '@/lib/api/staffing-requests';
import {
  Button,
  WorkflowStages,
  type WorkflowStage,
  type WorkflowStageStatus,
} from '@/components/ds';

const DERIVED_STATUS_TONE: Record<
  DerivedStaffingRequestStatus,
  'info' | 'pending' | 'active' | 'neutral' | 'danger'
> = {
  Open: 'info',
  'In progress': 'pending',
  Filled: 'active',
  Closed: 'neutral',
  Cancelled: 'danger',
};

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'High',
  LOW: 'Low',
  MEDIUM: 'Medium',
  URGENT: 'Urgent',
};

const PRIORITY_TONE: Record<string, 'info' | 'warning' | 'danger' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

const PROJECT_STATUS_TONE: Record<string, 'active' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'active',
  ON_HOLD: 'warning',
  AT_RISK: 'warning',
  DRAFT: 'neutral',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
  COMPLETED: 'active',
};

interface TimelineStageMeta {
  key: 'DRAFT' | 'OPEN' | 'IN_REVIEW' | 'FULFILLED';
  label: string;
}

const TIMELINE_STAGES: readonly TimelineStageMeta[] = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'OPEN', label: 'Open' },
  { key: 'IN_REVIEW', label: 'In review' },
  { key: 'FULFILLED', label: 'Filled' },
];

function buildWorkflowStages(request: StaffingRequest): WorkflowStage[] {
  const cancelled = request.status === 'CANCELLED';
  const reachedIndex = (() => {
    if (cancelled) return -1;
    const i = TIMELINE_STAGES.findIndex((s) => s.key === request.status);
    return i;
  })();

  if (cancelled) {
    return [
      {
        key: 'cancelled',
        label: 'Cancelled',
        status: 'blocked' as WorkflowStageStatus,
        timestamp: request.cancelledAt,
      },
    ];
  }

  return TIMELINE_STAGES.map((stage, index) => {
    let status: WorkflowStageStatus;
    if (index < reachedIndex) status = 'done';
    else if (index === reachedIndex) status = 'current';
    else status = 'upcoming';
    let timestamp: string | undefined;
    if (stage.key === 'DRAFT') timestamp = request.createdAt;
    if (stage.key === 'FULFILLED' && status !== 'upcoming') timestamp = request.updatedAt;
    return { key: stage.key, label: stage.label, status, timestamp };
  });
}

export function StaffingRequestDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { principal } = useAuth();
  const { setCurrentLabel } = useDrilldown();

  const [request, setRequest] = useState<StaffingRequest | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [slate, setSlate] = useState<ProposalSlateDto | null>(null);
  const [duplicating, setDuplicating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const [actionLoading, setActionLoading] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [proficiencyCells, setProficiencyCells] = useState<SkillMatchCell[]>([]);
  const [personNames, setPersonNames] = useState<Record<string, string>>({});

  const isRM = hasAnyRole(principal?.roles, RM_MANAGE_ROLES);
  const isPM = hasAnyRole(principal?.roles, ['project_manager', 'delivery_manager', 'director', 'admin']);

  useEffect(() => {
    if (request?.role) setCurrentLabel(request.role);
  }, [request?.role, setCurrentLabel]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await fetchStaffingRequestById(id);
        if (!active) return;
        setRequest(data);
        const [projectResult, slateResult] = await Promise.all([
          fetchProjectById(data.projectId).catch(() => null),
          fetchProposalSlate(data.id).catch(() => null),
        ]);
        if (!active) return;
        setProject(projectResult);
        setSlate(slateResult);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError('Failed to load staffing request.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, refreshToken]);

  // Build a real proficiency feed for the heatmap by reading each candidate's
  // PersonSkill records, and resolve their display names. Without the real
  // PersonSkill feed, the heatmap had to fabricate cells from the (often-empty)
  // mismatchedSkills field — that is what produced the misleading all-Strong
  // matrix for manually-added candidates.
  useEffect(() => {
    if (!slate || !request) {
      setProficiencyCells([]);
      setPersonNames({});
      return;
    }
    const requiredSkills = request.skills ?? [];
    if (slate.candidates.length === 0) {
      setProficiencyCells([]);
      setPersonNames({});
      return;
    }
    let active = true;
    void (async () => {
      try {
        // Resolve every distinct person on the slate (candidates + proposer) so
        // the panel and the "Proposed by" line show display names rather than
        // raw UUIDs.
        const personIds = Array.from(
          new Set([
            slate.proposedByPersonId,
            ...slate.candidates.map((c) => c.candidatePersonId),
          ]),
        );
        const perPerson = await Promise.all(
          personIds.map(async (personId) => ({
            personId,
            person: await fetchPersonDirectoryById(personId).catch(() => null),
          })),
        );
        const names: Record<string, string> = {};
        for (const { personId, person } of perPerson) {
          if (person?.displayName) names[personId] = person.displayName;
        }

        const perCandidate = await Promise.all(
          slate.candidates.map(async (c) => ({
            candidatePersonId: c.candidatePersonId,
            skills:
              requiredSkills.length === 0
                ? []
                : await fetchPersonSkills(c.candidatePersonId).catch(() => []),
          })),
        );
        if (!active) return;
        const cells: SkillMatchCell[] = [];
        for (const { candidatePersonId, skills } of perCandidate) {
          const byName = new Map(skills.map((s) => [s.skillName, s.proficiency]));
          for (const skillName of requiredSkills) {
            const level = byName.get(skillName);
            // Skill catalog proficiency is on a 1–4 scale (Skill DTO Min(1)/Max(4)).
            // Normalise to 0..1 so the heatmap thresholds (>=0.85 Strong, >=0.5
            // Partial, >0 Weak, 0 Missing) reflect the real level.
            const proficiency = level === undefined ? 0 : level / 4;
            cells.push({ candidatePersonId, skillName, proficiency });
          }
        }
        setProficiencyCells(cells);
        setPersonNames(names);
      } catch {
        if (active) {
          setProficiencyCells([]);
          setPersonNames({});
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [slate, request]);

  const stages = useMemo(() => (request ? buildWorkflowStages(request) : []), [request]);

  if (isLoading) {
    return <LoadingState label="Loading staffing request..." variant="skeleton" skeletonType="detail" />;
  }
  if (notFound) {
    return (
      <PageContainer>
        <EmptyState
          description={`No staffing request was found for ${id ?? 'this ID'}.`}
          title="Request not found"
        />
      </PageContainer>
    );
  }
  if (!request) {
    return <ErrorState description={error ?? 'Unknown error.'} />;
  }

  async function handleCancel(): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await cancelStaffingRequest(id);
      setRequest(updated);
    } catch {
      setError('Failed to cancel request.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDuplicate(): Promise<void> {
    if (!request) return;
    setDuplicating(true);
    try {
      const dup = await duplicateStaffingRequest(request.id);
      navigate(`/staffing-requests/${dup.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate request.');
    } finally {
      setDuplicating(false);
    }
  }

  const showBuildSlateCta =
    isRM &&
    !slate &&
    (request.status === 'OPEN' || request.status === 'IN_REVIEW' || request.status === 'DRAFT');
  const canDecideSlate = Boolean(isPM && slate && slate.status === 'OPEN');

  return (
    <PageContainer>
      <PageHeader
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <Button
              variant="secondary"
              disabled={duplicating}
              onClick={() => void handleDuplicate()}
              title="One request = one person. Duplicate this request to staff another person on the same role."
            >
              {duplicating ? 'Duplicating…' : 'Duplicate request'}
            </Button>
            <Button as={Link} variant="secondary" to="/staffing-requests">
              Back to requests
            </Button>
          </div>
        }
        eyebrow="Staffing Request"
        subtitle={request.summary ?? 'No summary provided.'}
        title={`${request.role} — ${request.projectName ?? request.projectId}`}
      />

      {error ? <ErrorState description={error} /> : null}

      {/* ─── Project context strip — sticky header with the data the PM needs at a glance. */}
      <SectionCard title="Project context">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--space-2)',
            fontSize: 12,
          }}
        >
          <ContextField label="Project">
            <Link to={`/projects/${request.projectId}`}>{project?.name ?? request.projectName ?? request.projectId}</Link>
          </ContextField>
          <ContextField label="Project status">
            {project ? (
              <StatusBadge
                label={project.status}
                tone={PROJECT_STATUS_TONE[project.status] ?? 'neutral'}
                variant="chip"
              />
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
            )}
          </ContextField>
          <ContextField label="Project Manager">
            {project?.projectManagerId ? (
              <Link to={`/people/${project.projectManagerId}`}>
                {project.projectManagerDisplayName ?? project.projectManagerId}
              </Link>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
            )}
          </ContextField>
          <ContextField label="Delivery Manager">
            {project?.deliveryManagerId ? (
              <Link to={`/people/${project.deliveryManagerId}`}>
                {project.deliveryManagerDisplayName ?? project.deliveryManagerId}
              </Link>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
            )}
          </ContextField>
          <ContextField label="Role">{request.role}</ContextField>
          <ContextField label="Allocation">{request.allocationPercent}%</ContextField>
          <ContextField label="Date range">
            {request.startDate} → {request.endDate}
          </ContextField>
          <ContextField label="Priority">
            <StatusBadge
              label={PRIORITY_LABELS[request.priority] ?? request.priority}
              tone={PRIORITY_TONE[request.priority] ?? 'neutral'}
              variant="chip"
            />
          </ContextField>
          <ContextField label="Headcount">
            {request.headcountFulfilled} / {request.headcountRequired} filled
          </ContextField>
          <ContextField label="Derived status">
            <StatusBadge
              label={request.derivedStatus}
              tone={DERIVED_STATUS_TONE[request.derivedStatus]}
              variant="chip"
            />
          </ContextField>
          {request.skills.length > 0 ? (
            <ContextField label="Required skills">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {request.skills.map((s) => (
                  <span
                    key={s}
                    style={{
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: 'var(--color-surface-alt)',
                      color: 'var(--color-text)',
                      fontSize: 11,
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </ContextField>
          ) : null}
          {request.candidatePersonId ? (
            <ContextField label="Endorsed by PM">
              <Link to={`/people/${request.candidatePersonId}`}>{request.candidatePersonId}</Link>
            </ContextField>
          ) : null}
        </div>
      </SectionCard>

      {/* ─── Workflow timeline */}
      <SectionCard title="Workflow timeline">
        <WorkflowStages stages={stages} ariaLabel="Staffing request workflow" />
      </SectionCard>

      {/* ─── Workload timeline. Only shown pre-slate — once a slate exists,
            the per-candidate timeline lives inline in the side-by-side
            comparison column below (staffing-desk row pattern). */}
      {!slate ? (
        <SectionCard title="Timeline">
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              marginBottom: 4,
            }}
          >
            {request.candidatePersonId ? 'Endorsed candidate timeline' : 'Assignment slot'}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-1)',
            }}
          >
            {request.candidatePersonId
              ? `Existing assignments + the proposed allocation overlaid for ${request.startDate} → ${request.endDate}.`
              : `Proposed allocation for ${request.startDate} → ${request.endDate}. Build a slate to compare candidate timelines side-by-side.`}
          </div>
          <WorkloadTimeline
            personId={request.candidatePersonId ?? undefined}
            planned={{
              allocationPercent: request.allocationPercent,
              startDate: request.startDate,
              endDate: request.endDate,
              projectName: project?.name ?? request.projectName ?? 'This request',
            }}
            compact
          />
        </SectionCard>
      ) : null}

      {/* ─── Slate review — RM build CTA, or PM review surface (inline) */}
      <SectionCard title="Proposal slate">
        {showBuildSlateCta ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-1)',
              marginBottom: 'var(--space-2)',
            }}
          >
            <Button variant="primary" size="sm" onClick={() => setBuilderOpen(true)}>
              Build proposal slate…
            </Button>
          </div>
        ) : null}
        {!slate ? (
          <EmptyState
            description={
              isRM
                ? 'No slate yet. Build a slate of suggested candidates so the Project Manager can pick one.'
                : 'The Resource Manager has not yet proposed any candidates for this request.'
            }
            title="No proposal slate yet"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <StatusBadge
                label={slate.status}
                tone={slate.status === 'OPEN' ? 'pending' : slate.status === 'DECIDED' ? 'active' : 'neutral'}
                variant="chip"
              />
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                Proposed by{' '}
                <Link to={`/people/${slate.proposedByPersonId}`}>
                  {personNames[slate.proposedByPersonId] ?? slate.proposedByPersonId}
                </Link>{' '}
                on {new Date(slate.proposedAt).toLocaleString()}
              </span>
            </div>
            <ProposalReviewPanel
              slate={slate}
              staffingRequestId={request.id}
              requiredSkills={request.skills}
              proficiencyCells={proficiencyCells}
              personNames={personNames}
              canDecide={canDecideSlate}
              plannedOverlay={{
                allocationPercent: request.allocationPercent,
                startDate: request.startDate,
                endDate: request.endDate,
                projectName: project?.name ?? request.projectName ?? 'This request',
              }}
              onPicked={(assignmentId) => {
                navigate(`/assignments/${assignmentId}`);
              }}
              onRejected={() => {
                setRefreshToken((n) => n + 1);
              }}
            />
          </div>
        )}
      </SectionCard>

      {(isPM || isRM) &&
      request.status !== 'CANCELLED' &&
      request.status !== 'FULFILLED' ? (
        <SectionCard title="Cancel request" collapsible defaultCollapsed>
          <p style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 12 }}>
            Cancelling removes the request from the RM queue. Use only when the role is no longer needed.
          </p>
          <Button variant="danger" disabled={actionLoading} onClick={() => setConfirmCancelOpen(true)} type="button">
            Cancel request
          </Button>
          <ConfirmDialog
            open={confirmCancelOpen}
            message="This will cancel the staffing request and remove it from the RM queue. This action cannot be undone."
            onCancel={() => setConfirmCancelOpen(false)}
            onConfirm={() => {
              setConfirmCancelOpen(false);
              void handleCancel();
            }}
            title="Cancel staffing request?"
          />
        </SectionCard>
      ) : null}

      <ProposalBuilderDrawer
        open={builderOpen}
        request={request}
        onClose={() => setBuilderOpen(false)}
        onSubmitted={() => {
          setBuilderOpen(false);
          setRefreshToken((n) => n + 1);
        }}
      />
    </PageContainer>
  );
}

function ContextField({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: 'var(--color-text-muted)',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text)' }}>{children}</div>
    </div>
  );
}
