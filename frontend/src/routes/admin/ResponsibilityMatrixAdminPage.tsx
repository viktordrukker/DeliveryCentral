import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, FormField, FormModal, Input, Select, Switch, Table, Textarea, type Column } from '@/components/ds';
import { ALL_ROLES, type AppRole } from '@/app/route-manifest';
import {
  ACTION_KIND_LABELS,
  MODE_LABELS,
  RESPONSIBILITY_ACTION_KINDS,
  RESPONSIBILITY_MODES,
  RESPONSIBILITY_SCOPES,
  SCOPE_LABELS,
  archiveResponsibilityRule,
  createResponsibilityRule,
  listResponsibilityRules,
  updateResponsibilityRule,
  type CreateResponsibilityRuleRequest,
  type ResponsibilityActionKind,
  type ResponsibilityMode,
  type ResponsibilityRule,
  type ResponsibilityScope,
  type UpdateResponsibilityRuleRequest,
} from '@/lib/api/responsibility-rules';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface FormState {
  actionKind: ResponsibilityActionKind;
  scopeKind: ResponsibilityScope;
  scopeValue: string;
  mode: ResponsibilityMode;
  targetRole: AppRole | '';
  targetPersonId: string;
  priority: number;
  notes: string;
}

function emptyForm(): FormState {
  return {
    actionKind: 'PROJECT_ACTIVATION_APPROVAL',
    scopeKind: 'TENANT',
    scopeValue: '',
    mode: 'ROLE',
    targetRole: 'director',
    targetPersonId: '',
    priority: 50,
    notes: '',
  };
}

function ruleToForm(rule: ResponsibilityRule): FormState {
  return {
    actionKind: rule.actionKind,
    scopeKind: rule.scopeKind,
    scopeValue: rule.scopeValue ?? '',
    mode: rule.mode,
    targetRole: (rule.targetRole as AppRole) ?? '',
    targetPersonId: rule.targetPersonId ?? '',
    priority: rule.priority,
    notes: rule.notes ?? '',
  };
}

export function ResponsibilityMatrixAdminPage(): JSX.Element {
  const [rules, setRules] = useState<ResponsibilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<ResponsibilityActionKind | ''>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<ResponsibilityRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [archivingRule, setArchivingRule] = useState<ResponsibilityRule | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const next = await listResponsibilityRules({
        actionKind: filterAction || undefined,
        includeArchived,
      });
      setRules(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load responsibility rules.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload is stable
  }, [filterAction, includeArchived]);

  const filteredRules = useMemo(() => rules, [rules]);

  function openCreate(): void {
    setForm(emptyForm());
    setCreating(true);
  }

  function openEdit(rule: ResponsibilityRule): void {
    setForm(ruleToForm(rule));
    setEditing(rule);
  }

  function closeForm(): void {
    setEditing(null);
    setCreating(false);
  }

  function validateForm(state: FormState): string | null {
    if (state.scopeKind !== 'TENANT' && !state.scopeValue.trim()) {
      return `Scope ${SCOPE_LABELS[state.scopeKind]} requires a value.`;
    }
    if (state.scopeKind === 'THRESHOLD_AMOUNT') {
      const n = Number(state.scopeValue);
      if (!Number.isFinite(n) || n < 0) return 'Threshold amount must be a non-negative number.';
    }
    if (state.mode === 'ROLE' && !state.targetRole) return "mode='ROLE' needs a target role.";
    if (state.mode === 'PERSON' && !state.targetPersonId.trim())
      return "mode='PERSON' needs a target person id.";
    if ((state.mode === 'PM_SOLO' || state.mode === 'SKIP') && (state.targetRole || state.targetPersonId.trim()))
      return `mode='${state.mode}' must NOT carry target role or person.`;
    if (!Number.isFinite(state.priority) || state.priority < 1 || state.priority > 999)
      return 'Priority must be between 1 and 999.';
    return null;
  }

  async function handleCreate(): Promise<void> {
    const err = validateForm(form);
    if (err) {
      toast.error(err);
      throw new Error(err);
    }
    const payload: CreateResponsibilityRuleRequest = {
      actionKind: form.actionKind,
      scopeKind: form.scopeKind,
      scopeValue: form.scopeKind === 'TENANT' ? null : form.scopeValue.trim(),
      mode: form.mode,
      targetRole: form.mode === 'ROLE' ? form.targetRole || null : null,
      targetPersonId: form.mode === 'PERSON' ? form.targetPersonId.trim() : null,
      priority: form.priority,
      notes: form.notes.trim() || undefined,
    };
    try {
      await createResponsibilityRule(payload);
      toast.success('Responsibility rule created.');
      closeForm();
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Create failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleUpdate(): Promise<void> {
    if (!editing) return;
    const err = validateForm(form);
    if (err) {
      toast.error(err);
      throw new Error(err);
    }
    const payload: UpdateResponsibilityRuleRequest = {
      mode: form.mode,
      targetRole: form.mode === 'ROLE' ? form.targetRole || null : null,
      targetPersonId: form.mode === 'PERSON' ? form.targetPersonId.trim() : null,
      priority: form.priority,
      notes: form.notes.trim() || null,
    };
    try {
      await updateResponsibilityRule(editing.id, payload);
      toast.success('Responsibility rule updated.');
      closeForm();
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleToggleActive(rule: ResponsibilityRule): Promise<void> {
    try {
      await updateResponsibilityRule(rule.id, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Rule disabled.' : 'Rule enabled.');
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Toggle failed.');
    }
  }

  async function handleArchive(): Promise<void> {
    if (!archivingRule) return;
    try {
      await archiveResponsibilityRule(archivingRule.id);
      toast.success('Rule archived.');
      setArchivingRule(null);
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Archive failed.');
    }
  }

  if (loading && rules.length === 0)
    return (
      <PageContainer testId="responsibility-matrix-admin-page">
        <PageHeader eyebrow="Admin" title="Responsibility Matrix" />
        <LoadingState label="Loading rules…" skeletonType="table" variant="skeleton" />
      </PageContainer>
    );

  if (error)
    return (
      <PageContainer testId="responsibility-matrix-admin-page">
        <PageHeader eyebrow="Admin" title="Responsibility Matrix" />
        <ErrorState description={error} />
      </PageContainer>
    );

  const columns: Column<ResponsibilityRule>[] = [
    {
      key: 'action',
      title: 'Action',
      render: (r) => (
        <span style={{ fontWeight: 500 }}>
          {ACTION_KIND_LABELS[r.actionKind]}
          {r.isSeededDefault ? (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 6 }}>(default)</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'scope',
      title: 'Scope',
      width: 180,
      render: (r) => (
        <span style={{ color: 'var(--color-text-muted)' }}>
          {SCOPE_LABELS[r.scopeKind]}
          {r.scopeValue ? ` · ${r.scopeValue}` : ''}
        </span>
      ),
    },
    {
      key: 'mode',
      title: 'Mode',
      width: 140,
      render: (r) => <span>{MODE_LABELS[r.mode]}</span>,
    },
    {
      key: 'target',
      title: 'Target',
      width: 220,
      render: (r) => (
        <span style={{ color: 'var(--color-text-muted)' }}>
          {r.mode === 'ROLE' ? r.targetRole ?? '—' : null}
          {r.mode === 'PERSON' ? r.targetPersonId ?? '—' : null}
          {r.mode === 'PM_SOLO' || r.mode === 'SKIP' ? '—' : null}
        </span>
      ),
    },
    {
      key: 'priority',
      title: 'Priority',
      align: 'right',
      width: 80,
      render: (r) => <span style={NUM}>{r.priority}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      width: 110,
      render: (r) => {
        if (r.archivedAt) return <StatusBadge tone="neutral" variant="chip" label="Archived" />;
        if (r.isActive) return <StatusBadge tone="active" variant="chip" label="Active" />;
        return <StatusBadge tone="warning" variant="chip" label="Disabled" />;
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      width: 280,
      render: (r) => {
        if (r.archivedAt) return <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>—</span>;
        return (
          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="secondary" type="button" onClick={() => void handleToggleActive(r)}>
              {r.isActive ? 'Disable' : 'Enable'}
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => openEdit(r)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => setArchivingRule(r)}
              disabled={r.isSeededDefault}
              title={r.isSeededDefault ? 'Seeded defaults cannot be archived from UI' : undefined}
            >
              Archive
            </Button>
          </div>
        );
      },
    },
  ];

  const formOpen = creating || editing !== null;

  return (
    <PageContainer testId="responsibility-matrix-admin-page">
      <PageHeader
        eyebrow="Admin"
        subtitle="Configurable matrix that decides who approves each governed action. Rules at lower priority numbers win; non-tenant scopes win over the tenant default."
        title="Responsibility Matrix"
      />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <FormField label="Filter by action">
          <Select value={filterAction} onChange={(e) => setFilterAction(e.target.value as ResponsibilityActionKind | '')}>
            <option value="">All actions</option>
            {RESPONSIBILITY_ACTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {ACTION_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Include archived">
          <Switch checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
        </FormField>
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="primary" type="button" onClick={openCreate}>
            + New rule
          </Button>
        </div>
      </div>

      {filteredRules.length === 0 ? (
        <SectionCard>
          <EmptyState
            description="No responsibility rules match the current filter."
            title="No rules"
            actions={[{ label: 'Create rule', onClick: openCreate, variant: 'primary' }]}
          />
        </SectionCard>
      ) : (
        <SectionCard title={`Rules (${filteredRules.length})`}>
          <Table
            variant="compact"
            columns={columns}
            rows={filteredRules}
            getRowKey={(r) => r.id}
          />
        </SectionCard>
      )}

      <FormModal
        open={formOpen}
        onCancel={closeForm}
        onSubmit={creating ? handleCreate : handleUpdate}
        title={creating ? 'New responsibility rule' : 'Edit responsibility rule'}
        submitLabel={creating ? 'Create' : 'Save changes'}
        size="md"
      >
        <FormField label="Action kind" hint="Which governed action this rule routes.">
          <Select
            disabled={!creating}
            value={form.actionKind}
            onChange={(e) => setForm({ ...form, actionKind: e.target.value as ResponsibilityActionKind })}
          >
            {RESPONSIBILITY_ACTION_KINDS.map((k) => (
              <option key={k} value={k}>
                {ACTION_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Scope" hint="Dimension to match. TENANT is the catch-all.">
          <Select
            disabled={!creating}
            value={form.scopeKind}
            onChange={(e) => setForm({ ...form, scopeKind: e.target.value as ResponsibilityScope })}
          >
            {RESPONSIBILITY_SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormField>
        {form.scopeKind !== 'TENANT' ? (
          <FormField
            label="Scope value"
            hint={
              form.scopeKind === 'THRESHOLD_AMOUNT'
                ? 'Numeric threshold; rule fires when the action amount ≥ this value.'
                : 'UUID for ORG_UNIT/CLIENT/PROJECT; string for PROJECT_TYPE/ROLE_GRADE.'
            }
          >
            <Input
              disabled={!creating}
              value={form.scopeValue}
              onChange={(e) => setForm({ ...form, scopeValue: e.target.value })}
            />
          </FormField>
        ) : null}
        <FormField label="Mode" hint="ROLE = anyone with role; PERSON = exact actor; PM_SOLO/SKIP = auto-approve at submit.">
          <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as ResponsibilityMode })}>
            {RESPONSIBILITY_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABELS[m]}
              </option>
            ))}
          </Select>
        </FormField>
        {form.mode === 'ROLE' ? (
          <FormField label="Target role">
            <Select value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value as AppRole })}>
              <option value="">— pick one —</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
        {form.mode === 'PERSON' ? (
          <FormField label="Target person id (UUID)">
            <Input value={form.targetPersonId} onChange={(e) => setForm({ ...form, targetPersonId: e.target.value })} />
          </FormField>
        ) : null}
        <FormField label="Priority" hint="Lower number = higher precedence. Tenant defaults sit at 100.">
          <Input
            type="number"
            min={1}
            max={999}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
          />
        </FormField>
        <FormField label="Notes" hint="Optional rationale shown in audit + rule list.">
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={archivingRule !== null}
        title="Archive responsibility rule"
        message={
          archivingRule
            ? `Archive the rule for ${ACTION_KIND_LABELS[archivingRule.actionKind]} (${SCOPE_LABELS[archivingRule.scopeKind]})? The resolver will fall back to lower-priority rules or the tenant default.`
            : ''
        }
        confirmLabel="Archive"
        tone="danger"
        onCancel={() => setArchivingRule(null)}
        onConfirm={() => void handleArchive()}
      />
    </PageContainer>
  );
}
