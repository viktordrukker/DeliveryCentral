import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { PersonSelect } from '@/components/common/PersonSelect';
import { ProjectSelect } from '@/components/common/ProjectSelect';
import { Button, Combobox, type ComboboxOption, DatePicker, FormField, Select, Textarea } from '@/components/ds';
import { fetchMetadataDictionaries, fetchMetadataDictionaryById } from '@/lib/api/metadata';
import {
  createStaffingRequest,
  submitStaffingRequest,
  type StaffingRequest,
} from '@/lib/api/staffing-requests';

import { SkillMultiSelect } from './SkillMultiSelect';
import {
  validateStaffingRequestForm,
  type StaffingRequestFormErrors,
  type StaffingRequestFormValues,
} from './staffing-request-form.validation';

export interface StaffingRequestFormProps {
  /** "page" gets the rich preview-friendly chrome; "drawer" trims the footer. */
  mode: 'page' | 'drawer';
  /** Pre-fill values for duplicate / drawer-context use cases. */
  initialValues?: Partial<StaffingRequestFormValues>;
  /** Called after a successful create+submit. The page navigates; the drawer closes. */
  onSubmitted: (request: StaffingRequest) => void;
  /** Called when the user cancels (drawer mode only — page mode renders its own back link). */
  onCancel?: () => void;
  /** Lift live form values to the parent so a sibling preview can render them. */
  onValuesChange?: (values: StaffingRequestFormValues) => void;
}

const PRIORITY_OPTIONS: { value: StaffingRequestFormValues['priority']; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const STAFFING_ROLES_DICTIONARY_KEY = 'staffing-roles';
const PROJECT_STATUSES_OPEN_FOR_REQUESTS = ['DRAFT', 'ACTIVE', 'ON_HOLD'];

// Module-scoped cache for the staffing-roles dictionary lookup. Each load is
// two sequential round-trips (list → detail) which dominates the form's
// perceived load time; cache the resolved options so re-mounts are instant.
let roleOptionsPromise: Promise<ComboboxOption[]> | null = null;
async function loadRoleOptions(): Promise<ComboboxOption[]> {
  if (!roleOptionsPromise) {
    roleOptionsPromise = (async () => {
      const list = await fetchMetadataDictionaries({ entityType: 'StaffingRequest' });
      const summary = list.items.find((d) => d.dictionaryKey === STAFFING_ROLES_DICTIONARY_KEY);
      if (!summary) {
        throw new Error('Staffing-roles taxonomy is not configured.');
      }
      const detail = await fetchMetadataDictionaryById(summary.id);
      return detail.entries
        .filter((e) => e.isEnabled)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map<ComboboxOption>((e) => ({ value: e.entryValue, label: e.displayName }));
    })().catch((err: unknown) => {
      // Reset on failure so the next mount can retry.
      roleOptionsPromise = null;
      throw err;
    });
  }
  return roleOptionsPromise;
}

const DEFAULT_VALUES: StaffingRequestFormValues = {
  projectId: '',
  role: '',
  priority: 'MEDIUM',
  allocationPercent: 100,
  startDate: '',
  endDate: '',
  skills: [],
  summary: '',
  candidateKnown: false,
  candidatePersonId: '',
};

/**
 * Shared StaffingRequest creation form, used by both the full /staffing-requests/new
 * page and the inline `<StaffingRequestDrawer>`. Normalized inputs only:
 *
 * - **Project**: dropdown limited to OPEN-for-requests statuses (DRAFT / ACTIVE / ON_HOLD).
 * - **Role**: `<Combobox>` populated by the `staffing-roles` MetadataDictionary
 *   (admin-editable; falls back to an empty list if the dictionary is missing).
 * - **Priority**: native `<Select>` with the four canonical values.
 * - **Allocation %**: numeric input bounded 1–100.
 * - **Start/End date**: DS `<DatePicker>` pair with cross-validation.
 * - **Skills**: `<SkillMultiSelect>` against the seeded `Skill` catalog only.
 * - **Summary**: `<Textarea>`. Only free-text field.
 *
 * No `headcountRequired` field — semantics are 1 request = 1 person. The wire
 * still sends `headcountRequired: 1` for backwards compat with the existing
 * Prisma column.
 */
export function StaffingRequestForm({
  mode,
  initialValues,
  onSubmitted,
  onCancel,
  onValuesChange,
}: StaffingRequestFormProps): JSX.Element {
  const { principal } = useAuth();
  const requestedByPersonId = principal?.personId ?? '';

  const [values, setValues] = useState<StaffingRequestFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [errors, setErrors] = useState<StaffingRequestFormErrors>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);
  const [roleOptions, setRoleOptions] = useState<ComboboxOption[]>([]);
  const [roleLoading, setRoleLoading] = useState<boolean>(true);
  const [roleLoadError, setRoleLoadError] = useState<string | undefined>(undefined);

  // Load role taxonomy once (cached across re-mounts).
  useEffect(() => {
    let active = true;
    setRoleLoading(true);
    void loadRoleOptions()
      .then((opts) => {
        if (active) setRoleOptions(opts);
      })
      .catch((err: unknown) => {
        if (active) {
          setRoleLoadError(err instanceof Error ? err.message : 'Failed to load roles.');
        }
      })
      .finally(() => {
        if (active) setRoleLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Lift values to parent (so a sibling preview can render them).
  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  function update<K extends keyof StaffingRequestFormValues>(
    key: K,
    next: StaffingRequestFormValues[K],
  ): void {
    setValues((prev) => ({ ...prev, [key]: next }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitError(undefined);
    if (!requestedByPersonId) {
      setSubmitError('You must be signed in to create a staffing request.');
      return;
    }

    const result = validateStaffingRequestForm(values);
    setErrors(result.errors);
    if (!result.ok) {
      // Surface a top-level message so the user knows the click did fire and
      // why nothing else happened — field-level errors alone are easy to miss.
      const missing = Object.keys(result.errors);
      setSubmitError(
        `Please fix ${missing.length} field${missing.length === 1 ? '' : 's'} before submitting: ${missing.join(', ')}.`,
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const created = await createStaffingRequest({
        projectId: values.projectId,
        requestedByPersonId,
        role: values.role,
        priority: values.priority,
        allocationPercent: values.allocationPercent ?? 100,
        startDate: values.startDate,
        endDate: values.endDate,
        skills: values.skills,
        headcountRequired: 1,
        summary: values.summary.trim() || undefined,
        candidatePersonId:
          values.candidateKnown && values.candidatePersonId
            ? values.candidatePersonId
            : undefined,
      });
      // Auto-submit so the new request is visible to the RM (matches the legacy flow).
      const submitted = await submitStaffingRequest(created.id);
      onSubmitted(submitted);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not create staffing request.');
    } finally {
      setSubmitting(false);
    }
  }

  const isCancelDisabled = submitting && mode === 'page';
  const submitLabel = submitting ? 'Submitting…' : 'Create staffing request';

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormField label="Project" required error={errors.projectId}>
        <ProjectSelect
          label=""
          value={values.projectId}
          onChange={(next) => update('projectId', next)}
          required
          statusFilter={PROJECT_STATUSES_OPEN_FOR_REQUESTS}
          placeholder="Select a project…"
          rich
        />
      </FormField>

      <FormField
        label="Candidate is known"
        hint="Check this if you already have someone in mind. The Resource Manager pre-seeds them at rank #1 when proposing the slate."
      >
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            fontSize: 12,
            color: 'var(--color-text)',
          }}
        >
          <input
            type="checkbox"
            checked={values.candidateKnown}
            onChange={(e) => {
              update('candidateKnown', e.target.checked);
              if (!e.target.checked) update('candidatePersonId', '');
            }}
          />
          Yes, I know who I want
        </label>
      </FormField>

      {values.candidateKnown ? (
        <FormField
          label="Endorsed candidate"
          required
          error={errors.candidatePersonId}
          hint="The Resource Manager can still propose alternatives — your pick simply lands at rank #1."
        >
          <PersonSelect
            label=""
            value={values.candidatePersonId}
            onChange={(next) => update('candidatePersonId', next)}
          />
        </FormField>
      ) : null}

      <FormField
        label="Role"
        required
        error={errors.role}
        hint={
          roleLoadError
            ? undefined
            : 'Configurable via Admin → Dictionaries → Staffing Roles.'
        }
      >
        <Combobox
          value={values.role || null}
          onValueChange={(next) => update('role', next ?? '')}
          options={roleOptions}
          placeholder={roleLoadError ?? (roleLoading ? 'Loading roles…' : 'Pick a role…')}
          disabled={roleLoading || Boolean(roleLoadError)}
          invalid={Boolean(errors.role)}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
        <FormField label="Priority" required error={errors.priority}>
          {(props) => (
            <Select
              value={values.priority}
              onChange={(e) => update('priority', e.target.value as StaffingRequestFormValues['priority'])}
              required
              {...props}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField label="Allocation (%)" required error={errors.allocationPercent}>
          {(props) => (
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={values.allocationPercent ?? ''}
              onChange={(e) => {
                const n = e.target.value === '' ? null : Number(e.target.value);
                update('allocationPercent', n);
              }}
              required
              className="ds-input"
              {...props}
            />
          )}
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
        <FormField label="Start date" required error={errors.startDate}>
          <DatePicker
            value={values.startDate}
            onValueChange={(next) => update('startDate', next)}
          />
        </FormField>

        <FormField label="End date" required error={errors.endDate}>
          <DatePicker
            value={values.endDate}
            onValueChange={(next) => update('endDate', next)}
            min={values.startDate || undefined}
          />
        </FormField>
      </div>

      <FormField
        label="Skills"
        hint="Pick from the catalog. Custom names are not allowed (prevents data drift)."
        error={errors.skills}
      >
        <SkillMultiSelect
          value={values.skills}
          onChange={(next) => update('skills', next)}
        />
      </FormField>

      <FormField
        label="Summary"
        hint="Why this person is needed, and any context the RM should know."
        error={errors.summary}
      >
        <Textarea
          value={values.summary}
          onChange={(e) => update('summary', e.target.value)}
          rows={mode === 'drawer' ? 3 : 4}
          maxLength={2000}
        />
      </FormField>

      {submitError ? (
        <div
          role="alert"
          style={{
            fontSize: 12,
            color: 'var(--color-status-danger)',
            background: 'var(--color-status-danger-soft, var(--color-surface-alt))',
            padding: 'var(--space-2)',
            borderRadius: 4,
          }}
        >
          {submitError}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-1)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border)',
          marginTop: 'var(--space-1)',
        }}
      >
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isCancelDisabled} type="button">
            Cancel
          </Button>
        ) : null}
        <Button variant="primary" type="submit" disabled={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function useStaffingRequestFormValues(initial?: Partial<StaffingRequestFormValues>): {
  values: StaffingRequestFormValues;
  setValues: React.Dispatch<React.SetStateAction<StaffingRequestFormValues>>;
} {
  const merged = useMemo(() => ({ ...DEFAULT_VALUES, ...initial }), [initial]);
  const [values, setValues] = useState<StaffingRequestFormValues>(merged);
  return { values, setValues };
}
