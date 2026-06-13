import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import {
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  FormField,
  Input,
  Select,
  Textarea,
} from '@/components/ds';
import { SkillMultiSelect } from '@/components/staffing-requests/SkillMultiSelect';
import { fetchPersonDirectoryById } from '@/lib/api/person-directory';
import {
  createProjectPosition,
  transitionProjectPositionFill,
  type CreateProjectPositionRequest,
  type StaffingRequestPriorityValue,
} from '@/lib/api/project-positions';
import {
  fetchProjectDirectory,
  type ProjectDirectoryItem,
} from '@/lib/api/project-registry';

// Common engineering roles surfaced for quick-selection; users can still
// type a custom value via the free-text option.
const COMMON_ROLES = [
  'Senior Frontend Engineer',
  'Frontend Engineer',
  'Senior Backend Engineer',
  'Backend Engineer',
  'Full-Stack Engineer',
  'Mobile Engineer',
  'QA Engineer',
  'Data Engineer',
  'ML Engineer',
  'DevOps Engineer',
  'Platform Engineer',
  'Security Engineer',
  'Solution Architect',
  'Engineering Manager',
  'Product Manager',
  'Project Manager',
  'Tech Lead',
  'Staff Engineer',
  'Designer',
  'Business Analyst',
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

interface FormState {
  projectId: string;
  role: string;
  customRole: string;
  priority: StaffingRequestPriorityValue;
  skills: string[];
  requiredAllocationPercent: string;
  startDate: string;
  endDate: string;
  summary: string;
  openImmediately: boolean;
}

const INITIAL: FormState = {
  projectId: '',
  role: '',
  customRole: '',
  priority: 'MEDIUM',
  skills: [],
  requiredAllocationPercent: '100',
  startDate: '',
  endDate: '',
  summary: '',
  openImmediately: true,
};

function resolveRole(values: FormState): string {
  return values.role === '__custom' ? values.customRole.trim() : values.role.trim();
}

function validate(values: FormState): { ok: boolean; errors: Partial<Record<keyof FormState, string>> } {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!values.projectId) errors.projectId = 'Project is required';
  const role = resolveRole(values);
  if (!role) errors.role = 'Role is required';
  if (!values.startDate) errors.startDate = 'Start date is required';
  if (!values.endDate) errors.endDate = 'End date is required';
  if (values.startDate && values.endDate && values.startDate > values.endDate) {
    errors.endDate = 'End date must be on or after start date';
  }
  const alloc = Number(values.requiredAllocationPercent);
  if (Number.isNaN(alloc) || alloc <= 0 || alloc > 100) {
    errors.requiredAllocationPercent = 'Allocation must be 1–100';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

interface CreatePositionDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select project (e.g. when opened from a project page). */
  initialProjectId?: string;
  /** Called after a position is successfully created. */
  onCreated?: (positionId: string) => void;
  /**
   * PR-11 — bench candidate threading. When set, the candidate is pinned in
   * the drawer header and auto-proposed (OPEN → PROPOSED) after create.
   */
  candidatePersonId?: string;
  /**
   * Display name for the pinned candidate. Resolved via the person directory
   * when omitted (the `?candidatePersonId=` query-param arming carries only
   * the id).
   */
  candidateDisplayName?: string;
}

/**
 * SoT PR 8 — Embedded drawer for opening a new ProjectPosition demand.
 *
 * Replaces the standalone `CreatePositionPage` full-page route. Same form
 * fields and validation, hosted in a DS Drawer so users keep their context
 * (UX Law 3). Opens from:
 *   - Project Detail page (`?openCreatePosition=true`)
 *   - Staffing Desk inline action
 *   - BenchInspector "Propose to position"
 */
function CreatePositionDrawerInner({
  onClose,
  initialProjectId,
  onCreated,
  candidatePersonId,
  candidateDisplayName,
}: {
  onClose: () => void;
  initialProjectId?: string;
  onCreated?: (positionId: string) => void;
  candidatePersonId?: string;
  candidateDisplayName?: string;
}): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<FormState>({ ...INITIAL, projectId: initialProjectId ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  // PR-11 — candidate pin. The display name is resolved from the directory
  // when the caller armed the drawer with only a personId (query-param path).
  const [candidateName, setCandidateName] = useState(candidateDisplayName ?? '');

  useEffect(() => {
    if (!candidatePersonId || candidateDisplayName) return;
    let active = true;
    fetchPersonDirectoryById(candidatePersonId)
      .then((person) => {
        if (active) setCandidateName(person.displayName);
      })
      .catch(() => {
        // Pin falls back to the generic label; auto-propose still works.
      });
    return () => {
      active = false;
    };
  }, [candidatePersonId, candidateDisplayName]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  useEffect(() => {
    let active = true;
    setProjectsLoading(true);
    setProjectsError(null);
    fetchProjectDirectory({ pageSize: 200 })
      .then((response) => {
        if (!active) return;
        const eligible = response.items.filter(
          (p) => !['CLOSED', 'ARCHIVED', 'CANCELLED', 'COMPLETED'].includes(p.status.toUpperCase()),
        );
        setProjects(eligible);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setProjectsError(e instanceof Error ? e.message : 'Could not load projects.');
      })
      .finally(() => {
        if (active) setProjectsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitError(null);
    if (!principal?.personId) {
      setSubmitError('You must be signed in.');
      return;
    }
    const v = validate(values);
    setErrors(v.errors);
    if (!v.ok) {
      setSubmitError(`Fix ${Object.keys(v.errors).length} field(s) before submitting.`);
      return;
    }
    setSubmitting(true);
    try {
      const request: CreateProjectPositionRequest = {
        projectId: values.projectId,
        role: resolveRole(values),
        requiredAllocationPercent: Number(values.requiredAllocationPercent),
        startDate: values.startDate,
        endDate: values.endDate,
        skills: values.skills.length > 0 ? values.skills : undefined,
        summary: values.summary.trim() || undefined,
        priority: values.priority,
        requestedByPersonId: principal.personId,
        openImmediately: values.openImmediately,
      };
      const created = await createProjectPosition(request);
      if (created.fillStatus === 'DRAFT' && values.openImmediately) {
        await transitionProjectPositionFill(created.id, { toStatus: 'OPEN' });
      }
      if (candidatePersonId) {
        // PR-11 — auto-propose the pinned bench candidate in the same flow.
        // A propose failure must not orphan the freshly created position
        // silently: keep it, close the drawer, and surface a warning toast
        // that links straight to the position detail.
        const label = candidateName || 'the candidate';
        try {
          await transitionProjectPositionFill(created.id, {
            toStatus: 'PROPOSED',
            personId: candidatePersonId,
          });
          toast.success(`Position opened: ${created.role} — ${label} proposed`);
        } catch (proposeErr) {
          const detail = proposeErr instanceof Error ? proposeErr.message : '';
          toast.warning(
            `Position created, but proposing ${label} failed${detail ? ` — ${detail}` : ''}.`,
            {
              duration: 10000,
              action: {
                label: 'View position',
                // PR-20 — arm the detail page's propose dialog with the
                // candidate so the retry is one click instead of re-finding
                // them in the slate.
                onClick: () =>
                  navigate(
                    `/projects/${created.projectId}/positions/${created.publicId ?? created.id}?proposePersonId=${candidatePersonId}`,
                  ),
              },
            },
          );
        }
      } else {
        toast.success(`Position opened: ${created.role}`);
      }
      onCreated?.(created.id);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create position.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      side="right"
      width="md"
      ariaLabel="Open a new position"
      testId="create-position-drawer"
      title="Open a new position"
      description={
        candidatePersonId ? (
          <span data-testid="create-position-candidate-pin">
            Creating position for <strong>{candidateName || 'selected candidate'}</strong> — they
            will be proposed to the new position automatically.
          </span>
        ) : (
          'Lean flow — creates a ProjectPosition directly.'
        )
      }
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            form="create-position-drawer-form"
          >
            {submitting ? 'Creating…' : 'Create position'}
          </Button>
        </div>
      }
    >
      <form
        id="create-position-drawer-form"
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
      >
        {submitError && <ErrorState description={submitError} />}

        <FormField label="Project" required error={errors.projectId}>
          {(props) =>
            projectsLoading ? (
              <LoadingState label="Loading projects…" />
            ) : projectsError ? (
              <ErrorState description={projectsError} />
            ) : (
              <Select
                {...props}
                value={values.projectId}
                onChange={(e) => setField('projectId', e.target.value)}
                disabled={submitting}
                invalid={Boolean(errors.projectId)}
              >
                <option value="">Select an active project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectCode} — {p.name}
                    {p.clientName ? ` (${p.clientName})` : ''}
                  </option>
                ))}
              </Select>
            )
          }
        </FormField>

        <FormField label="Role" required error={errors.role}>
          {(props) => (
            <>
              <Select
                {...props}
                value={values.role}
                onChange={(e) => setField('role', e.target.value)}
                disabled={submitting}
                invalid={Boolean(errors.role)}
              >
                <option value="">Select a role…</option>
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="__custom">Other (specify below)…</option>
              </Select>
              {values.role === '__custom' && (
                <Input
                  type="text"
                  value={values.customRole}
                  onChange={(e) => setField('customRole', e.target.value)}
                  placeholder="Custom role title"
                  disabled={submitting}
                  style={{ marginTop: 'var(--space-2)' }}
                />
              )}
            </>
          )}
        </FormField>

        <FormField label="Priority">
          {(props) => (
            <Select
              {...props}
              value={values.priority}
              onChange={(e) => setField('priority', e.target.value as StaffingRequestPriorityValue)}
              disabled={submitting}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Required skills (optional)">
          {() => (
            <SkillMultiSelect
              value={values.skills}
              onChange={(next) => setField('skills', next)}
              disabled={submitting}
            />
          )}
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
          <FormField label="Start date" required error={errors.startDate}>
            {(props) => (
              <DatePicker
                {...props}
                value={values.startDate}
                onValueChange={(next) => setField('startDate', next)}
                disabled={submitting}
                invalid={Boolean(errors.startDate)}
              />
            )}
          </FormField>
          <FormField label="End date" required error={errors.endDate}>
            {(props) => (
              <DatePicker
                {...props}
                value={values.endDate}
                onValueChange={(next) => setField('endDate', next)}
                disabled={submitting}
                invalid={Boolean(errors.endDate)}
              />
            )}
          </FormField>
          <FormField label="Allocation %" required error={errors.requiredAllocationPercent}>
            {(props) => (
              <Input
                {...props}
                type="number"
                min={1}
                max={100}
                value={values.requiredAllocationPercent}
                onChange={(e) => setField('requiredAllocationPercent', e.target.value)}
                disabled={submitting}
                invalid={Boolean(errors.requiredAllocationPercent)}
              />
            )}
          </FormField>
        </div>

        <FormField label="Summary (optional)">
          {(props) => (
            <Textarea
              {...props}
              value={values.summary}
              onChange={(e) => setField('summary', e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder="Brief context for the staffing decision"
            />
          )}
        </FormField>

        <Checkbox
          checked={values.openImmediately}
          onChange={(e) => setField('openImmediately', e.target.checked)}
          disabled={submitting}
          label="Open immediately (skip DRAFT — surface on staffing desk right away)"
        />
      </form>
    </Drawer>
  );
}

export function CreatePositionDrawer({
  open,
  onClose,
  initialProjectId,
  onCreated,
  candidatePersonId,
  candidateDisplayName,
}: CreatePositionDrawerProps): JSX.Element | null {
  // Pitfall 15: hook-bearing inner only mounts when open, matches the
  // ManagePositionsDrawer pattern.
  if (!open) return null;
  return (
    <CreatePositionDrawerInner
      onClose={onClose}
      initialProjectId={initialProjectId}
      onCreated={onCreated}
      candidatePersonId={candidatePersonId}
      candidateDisplayName={candidateDisplayName}
    />
  );
}
