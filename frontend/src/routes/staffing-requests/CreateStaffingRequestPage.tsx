import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StaffingRequestForm } from '@/components/staffing-requests/StaffingRequestForm';
import { type StaffingRequestFormValues } from '@/components/staffing-requests/staffing-request-form.validation';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { Button } from '@/components/ds';
import { fetchProjectById, type ProjectDetails } from '@/lib/api/project-registry';

const CLOSED_PROJECT_STATUSES = new Set(['CLOSED', 'ARCHIVED', 'CANCELLED', 'COMPLETED']);

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

function formatDate(iso: string): string {
  if (!iso) return '—';
  return iso;
}

function durationLabel(start: string, end: string): string {
  if (!start || !end) return '—';
  const days = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (Number.isNaN(days) || days < 0) return '—';
  if (days < 7) return `${days + 1} day${days === 0 ? '' : 's'}`;
  const weeks = Math.round(days / 7);
  if (weeks < 13) return `~${weeks} week${weeks === 1 ? '' : 's'}`;
  const months = Math.round(days / 30);
  return `~${months} month${months === 1 ? '' : 's'}`;
}

export function CreateStaffingRequestPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillProjectId = searchParams.get('projectId') ?? '';

  const [liveValues, setLiveValues] = useState<StaffingRequestFormValues | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [projectLookupError, setProjectLookupError] = useState<string | null>(null);

  const projectId = liveValues?.projectId ?? prefillProjectId;

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setProjectLookupError(null);
      return;
    }
    let active = true;
    setProjectLookupError(null);
    void fetchProjectById(projectId)
      .then((p) => {
        if (active) setProject(p);
      })
      .catch((err: unknown) => {
        if (active) {
          setProject(null);
          setProjectLookupError(err instanceof Error ? err.message : 'Could not load project.');
        }
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const closedBlocker = useMemo(() => {
    if (!project) return null;
    if (CLOSED_PROJECT_STATUSES.has(project.status)) {
      return {
        projectName: project.name,
        status: project.status,
      };
    }
    return null;
  }, [project]);

  const initialValues = useMemo(
    () => (prefillProjectId ? { projectId: prefillProjectId } : undefined),
    [prefillProjectId],
  );

  return (
    <PageContainer testId="create-staffing-request-page">
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/staffing-requests">
            Back to requests
          </Button>
        }
        eyebrow="Supply & Demand"
        subtitle="One request = one person. Need three? Create one and use Duplicate on the detail page."
        title="Create Staffing Request"
      />

      {closedBlocker ? (
        <SectionCard>
          <div
            role="alert"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
              padding: 'var(--space-2)',
              background: 'var(--color-status-danger-soft, var(--color-surface-alt))',
              border: '1px solid var(--color-status-danger)',
              borderRadius: 4,
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--color-status-danger)' }}>
              Project "{closedBlocker.projectName}" is {closedBlocker.status.toLowerCase()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Staffing requests can't be filed against closed or archived projects. If there's an
              active issue on this project, open a Case instead.
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              <Button as={Link} variant="primary" to={`/cases/new?relatedProjectId=${projectId}`}>
                Open a Case
              </Button>
              <Button as={Link} variant="secondary" to="/staffing-requests">
                Back to requests
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {projectLookupError && !closedBlocker ? (
        <ErrorState description={projectLookupError} />
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 'var(--space-3)',
          alignItems: 'start',
        }}
      >
        <SectionCard title="Request details">
          <StaffingRequestForm
            mode="page"
            initialValues={initialValues}
            onSubmitted={(req) => navigate(`/staffing-requests/${req.id}`)}
            onValuesChange={setLiveValues}
          />
        </SectionCard>

        <div style={{ position: 'sticky', top: 'var(--space-3)' }}>
          <SectionCard title="Preview">
            <PreviewBody values={liveValues} project={project} />
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}

interface PreviewBodyProps {
  values: StaffingRequestFormValues | null;
  project: ProjectDetails | null;
}

function PreviewBody({ values, project }: PreviewBodyProps): JSX.Element {
  if (!values || !values.projectId) {
    return (
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        Pick a project to see the request preview update live.
      </div>
    );
  }

  // Timeline shows whenever the slot is bounded (start + end). When a
  // candidate is endorsed we also feed in their personId so the bar overlays
  // their existing workload; without a candidate, the timeline is the
  // assignment slot alone — same shape, less context.
  const hasDateRange = Boolean(values.startDate && values.endDate);
  const hasCandidate = Boolean(values.candidateKnown && values.candidatePersonId);
  const showTimeline = hasDateRange;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        rowGap: 'var(--space-1)',
        columnGap: 'var(--space-2)',
        margin: 0,
        fontSize: 13,
      }}
    >
      <PreviewRow label="Status" value={<StatusPill text="DRAFT" tone="neutral" />} />
      <PreviewRow
        label="Project"
        value={
          project ? (
            <span>
              {project.name}
              {project.projectCode ? (
                <span style={{ color: 'var(--color-text-muted)' }}> ({project.projectCode})</span>
              ) : null}
              {project.status && project.status !== 'ACTIVE' ? (
                <span style={{ marginLeft: 6 }}>
                  <StatusPill text={project.status} tone="warning" />
                </span>
              ) : null}
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>Loading…</span>
          )
        }
      />
      <PreviewRow label="Role" value={values.role || <Muted>Pick a role</Muted>} />
      <PreviewRow
        label="Priority"
        value={
          <StatusPill
            text={PRIORITY_LABEL[values.priority] ?? values.priority}
            tone={
              values.priority === 'URGENT'
                ? 'danger'
                : values.priority === 'HIGH'
                ? 'warning'
                : 'info'
            }
          />
        }
      />
      <PreviewRow
        label="Allocation"
        value={
          values.allocationPercent !== null && !Number.isNaN(values.allocationPercent)
            ? `${values.allocationPercent}%`
            : '—'
        }
      />
      <PreviewRow
        label="Date range"
        value={
          values.startDate && values.endDate ? (
            <span>
              {formatDate(values.startDate)} → {formatDate(values.endDate)}
              <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>
                ({durationLabel(values.startDate, values.endDate)})
              </span>
            </span>
          ) : (
            <Muted>Set start and end</Muted>
          )
        }
      />
      <PreviewRow
        label="Skills"
        value={
          values.skills.length === 0 ? (
            <Muted>None selected</Muted>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {values.skills.map((s) => (
                <span
                  key={s}
                  style={{
                    padding: '1px 6px',
                    borderRadius: 10,
                    background: '#ede9fe',
                    color: '#5b21b6',
                    fontSize: 11,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )
        }
      />
      <PreviewRow
        label="Summary"
        value={
          values.summary.trim().length === 0 ? (
            <Muted>No summary</Muted>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
              {values.summary.length > 200 ? `${values.summary.slice(0, 200)}…` : values.summary}
            </div>
          )
        }
      />
      {values.candidateKnown ? (
        <PreviewRow
          label="Endorsed"
          value={
            values.candidatePersonId ? (
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {values.candidatePersonId.slice(0, 8)}…{' '}
                <span style={{ color: 'var(--color-text-muted)' }}>(rank #1)</span>
              </span>
            ) : (
              <Muted>Pick the endorsed candidate</Muted>
            )
          }
        />
      ) : null}
    </dl>

    {showTimeline ? (
      <div>
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
          {hasCandidate ? 'Endorsed candidate timeline' : 'Assignment slot'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
          {hasCandidate
            ? `Existing assignments + the proposed allocation overlaid for ${values.startDate} → ${values.endDate}.`
            : `Proposed allocation for ${values.startDate} → ${values.endDate}. Pick a candidate to overlay their existing workload.`}
        </div>
        <WorkloadTimeline
          personId={hasCandidate ? values.candidatePersonId : undefined}
          planned={{
            allocationPercent: values.allocationPercent ?? 100,
            startDate: values.startDate,
            endDate: values.endDate,
            projectName: project?.name ?? 'This request',
          }}
          compact
        />
      </div>
    ) : null}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <>
      <dt
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          alignSelf: 'start',
          paddingTop: 2,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0 }}>{value}</dd>
    </>
  );
}

function Muted({ children }: { children: React.ReactNode }): JSX.Element {
  return <span style={{ color: 'var(--color-text-muted)' }}>{children}</span>;
}

function StatusPill({
  text,
  tone,
}: {
  text: string;
  tone: 'neutral' | 'info' | 'warning' | 'danger';
}): JSX.Element {
  const colors: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: 'var(--color-surface-alt)', fg: 'var(--color-text)' },
    info: { bg: 'rgba(59, 130, 246, 0.12)', fg: '#1d4ed8' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#92400e' },
    danger: { bg: 'rgba(239, 68, 68, 0.12)', fg: '#991b1b' },
  };
  const c = colors[tone];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 10,
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}
