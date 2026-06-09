import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, Modal } from '@/components/ds';
import {
  ALL_PLATFORM_ROLES,
  fetchRolePresets,
  setRolePresetOverride,
  type PlatformRole,
  type RolePresetView,
} from '@/lib/api/role-presets';

/**
 * Short, human-readable descriptions for each platform role. Used as the
 * `aria-describedby` target for the role checkboxes in the preset editor so
 * screen readers convey not just the role identifier but also what scope it
 * grants. Sourced from `route-manifest.ts` role taxonomy.
 */
const ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
  employee: 'Standard employee — own timesheets, requests, and dashboards.',
  project_manager: 'Owns project plans, positions, and PvA.',
  resource_manager: 'Manages bench, positions, and team capacity.',
  hr_manager: 'HR governance — people, org structure, cases, payroll signals.',
  delivery_manager: 'Cross-project delivery oversight, escalations, anomalies.',
  director: 'Executive view — portfolio health, finance, approvals.',
  admin: 'Platform admin — required for every preset, cannot be removed.',
};

/**
 * F-5.4 / D-159 — RolePermissionAdminPage.
 *
 * Tenant admin surface for overriding the role list behind any named
 * preset (e.g. EXEC_ROLES, HR_GOVERNANCE_ROLES). Routes that use
 * `@RequireRolePreset(name)` consult the override at request time.
 *
 * Ships behind `flag.feature.admin.rolePermissionUI.enabled` (default OFF;
 * 30-day staging soak before promotion per Phase 11 R-03).
 */
/**
 * Inline-mountable Role Permissions admin content. Renders the preset
 * editor without PageContainer/PageHeader chrome so AdminPanelPage can
 * mount it inside the Governance tab under dsRefresh.
 */
export function RolePermissionAdminContent(): JSX.Element {
  const [presets, setPresets] = useState<RolePresetView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<RolePresetView | null>(null);
  const [draftRoles, setDraftRoles] = useState<PlatformRole[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState<RolePresetView | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchRolePresets();
      setPresets(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load role presets.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function openEditor(row: RolePresetView): void {
    setEditing(row);
    setDraftRoles([...row.effective]);
  }

  function toggleRole(role: PlatformRole): void {
    setDraftRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function saveOverride(): Promise<void> {
    if (!editing) return;
    if (!draftRoles.includes('admin')) {
      toast.error('admin must be present in every preset override.');
      return;
    }
    if (draftRoles.length === 0) {
      toast.error('Pick at least one role.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await setRolePresetOverride(editing.preset, draftRoles);
      toast.success(`Override saved for ${editing.preset}.`);
      setPresets((prev) => prev.map((p) => (p.preset === updated.preset ? updated : p)));
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save override.');
    } finally {
      setIsSaving(false);
    }
  }

  async function clearOverride(row: RolePresetView): Promise<void> {
    setIsSaving(true);
    try {
      const updated = await setRolePresetOverride(row.preset, null);
      toast.success(`Reset ${row.preset} to default.`);
      setPresets((prev) => prev.map((p) => (p.preset === updated.preset ? updated : p)));
      setConfirmReset(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset preset.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {isLoading ? <LoadingState label="Loading role presets..." variant="skeleton" /> : null}
      {error ? <ErrorState description={error} onRetry={() => void reload()} /> : null}

      {!isLoading && !error ? (
        <SectionCard title={`${presets.length} presets`}>
          {presets.length === 0 ? (
            <EmptyState
              description="No role presets configured."
              title="No presets"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {presets.map((row) => (
                <div
                  key={row.preset}
                  data-testid={`preset-row-${row.preset}`}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: 'var(--space-3)',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <strong>{row.preset}</strong>
                      {row.overridden ? (
                        <StatusBadge label="Overridden" size="small" tone="warning" />
                      ) : (
                        <StatusBadge label="Default" size="small" tone="neutral" />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openEditor(row)}
                      >
                        Edit
                      </Button>
                      {row.overridden ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmReset(row)}
                        >
                          Reset to default
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                    {row.effective.map((r) => (
                      <StatusBadge
                        key={r}
                        label={r}
                        size="small"
                        tone={r === 'admin' ? 'info' : 'neutral'}
                      />
                    ))}
                  </div>
                  {row.overridden ? (
                    <div
                      style={{
                        marginTop: 'var(--space-2)',
                        fontSize: '11px',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      Default: {row.defaults.join(', ')}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {editing ? (
        <Modal
          open
          onClose={() => setEditing(null)}
          title={`Override ${editing.preset}`}
          size="sm"
          testId="role-preset-editor"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isSaving}
                onClick={() => void saveOverride()}
                data-autofocus="true"
              >
                {isSaving ? 'Saving…' : 'Save override'}
              </Button>
            </>
          }
        >
          <p style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
            Pick the roles allowed by this preset. <code>admin</code> must remain selected.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 'var(--space-2)',
            }}
          >
            {ALL_PLATFORM_ROLES.map((role) => {
              const selected = draftRoles.includes(role);
              const isAdmin = role === 'admin';
              const descriptionId = `role-preset-role-desc-${role}`;
              return (
                <label
                  key={role}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-1)',
                    cursor: isAdmin ? 'not-allowed' : 'pointer',
                    opacity: isAdmin ? 0.7 : 1,
                  }}
                >
                  <input
                    aria-describedby={descriptionId}
                    aria-label={role}
                    checked={selected}
                    disabled={isAdmin}
                    onChange={() => toggleRole(role)}
                    type="checkbox"
                  />
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{role}</span>
                    <span
                      id={descriptionId}
                      style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
                    >
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Modal>
      ) : null}

      {confirmReset ? (
        <ConfirmDialog
          open
          title={`Reset ${confirmReset.preset}?`}
          message={`This clears the tenant override for ${confirmReset.preset} and falls back to the compile-time default (${confirmReset.defaults.join(', ')}).`}
          onCancel={() => setConfirmReset(null)}
          onConfirm={() => void clearOverride(confirmReset)}
          confirmLabel={isSaving ? 'Resetting…' : 'Reset'}
        />
      ) : null}
    </>
  );
}

export function RolePermissionAdminPage(): JSX.Element {
  return (
    <PageContainer testId="role-permission-admin" viewport>
      <PageHeader
        eyebrow="Admin"
        subtitle="Override the role set behind each named preset. Used by every route declared with @RequireRolePreset. admin is always required."
        title="Role permissions"
      />
      <RolePermissionAdminContent />
    </PageContainer>
  );
}
