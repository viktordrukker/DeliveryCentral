import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { SectionCard } from '@/components/common/SectionCard';
import {
  type OrgConfigDto,
  type UpdateOrgConfigDto,
  fetchOrgConfig,
  resetOrgConfig,
  updateOrgConfig,
} from '@/lib/api/org-config';
import { Button } from '@/components/ds';

const CADENCES: Array<{ value: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY'; label: string }> = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const REASSIGNMENT_POLICIES: Array<{
  value: 'pm-or-director-or-admin' | 'director-approval';
  label: string;
}> = [
  { value: 'pm-or-director-or-admin', label: 'PM, Director, or Admin (direct)' },
  { value: 'director-approval', label: 'Director approval required' },
];

const DEFAULT_SHAPES: Array<{ value: 'SMALL' | 'STANDARD'; label: string }> = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'SMALL', label: 'Small' },
];

export function OrganizationConfigPage(): JSX.Element {
  const [config, setConfig] = useState<OrgConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState<UpdateOrgConfigDto>({});
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let active = true;
    fetchOrgConfig()
      .then((cfg) => {
        if (active) setConfig(cfg);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load configuration.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(): Promise<void> {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      const updated = await updateOrgConfig(dirty);
      setConfig(updated);
      setDirty({});
      toast.success('Configuration saved');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function handleReset(): void {
    setConfirmReset(true);
  }

  async function performReset(): Promise<void> {
    setConfirmReset(false);
    setSaving(true);
    try {
      const updated = await resetOrgConfig();
      setConfig(updated);
      setDirty({});
      toast.success('Configuration reset to defaults');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Loading configuration..." variant="skeleton" skeletonType="page" />;
  if (error) return <ErrorState description={error} />;
  if (!config) return <ErrorState description="Configuration not available." />;

  const effective = { ...config, ...dirty, tierLabels: { ...config.tierLabels, ...(dirty.tierLabels ?? {}) } };

  const patch = <K extends keyof UpdateOrgConfigDto>(key: K, value: UpdateOrgConfigDto[K]): void => {
    setDirty((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <FormPageLayout
      testId="organization-config-page"
      eyebrow="Admin"
      title="Organization configuration"
      subtitle="Tune reporting cadence, thresholds, and governance without code deploys. Every change is audit-logged."
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" disabled={saving} onClick={handleReset}>
            Reset to defaults
          </Button>
          <Button
            variant="primary"
            disabled={saving || Object.keys(dirty).length === 0}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      }
    >

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Reporting category */}
        <SectionCard compact collapsible title="Reporting">
          <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="field">
              <span className="field__label">Reporting cadence</span>
              <select
                className="field__control"
                onChange={(e) => patch('reportingCadence', e.target.value as 'WEEKLY')}
                value={effective.reportingCadence}
              >
                {CADENCES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Default shape for new projects</span>
              <select
                className="field__control"
                onChange={(e) => patch('defaultShapeForNewProject', e.target.value as 'STANDARD')}
                value={effective.defaultShapeForNewProject}
              >
                {DEFAULT_SHAPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Tier A label</span>
              <input
                className="field__control"
                onChange={(e) =>
                  patch('tierLabels', { ...(dirty.tierLabels ?? {}), A: e.target.value })
                }
                type="text"
                value={effective.tierLabels.A}
              />
            </label>
            <label className="field">
              <span className="field__label">Tier B label</span>
              <input
                className="field__control"
                onChange={(e) =>
                  patch('tierLabels', { ...(dirty.tierLabels ?? {}), B: e.target.value })
                }
                type="text"
                value={effective.tierLabels.B}
              />
            </label>
            <label className="field">
              <span className="field__label">Default SPC hourly rate ($, fallback)</span>
              <input
                className="field__control"
                min={0}
                onChange={(e) =>
                  patch('defaultHourlyRate', e.target.value === '' ? null : Number(e.target.value))
                }
                step={1}
                type="number"
                value={effective.defaultHourlyRate ?? ''}
              />
            </label>
          </div>
        </SectionCard>

        {/* Exception thresholds */}
        <SectionCard compact collapsible title="Exception thresholds">
          <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label className="field">
              <span className="field__label">Axis ≤ threshold becomes exception</span>
              <input
                className="field__control"
                max={4}
                min={0}
                onChange={(e) => patch('exceptionAxisThreshold', Number(e.target.value))}
                type="number"
                value={effective.exceptionAxisThreshold}
              />
            </label>
            <label className="field">
              <span className="field__label">CR stale threshold (days)</span>
              <input
                className="field__control"
                min={1}
                onChange={(e) => patch('crStaleThresholdDays', Number(e.target.value))}
                type="number"
                value={effective.crStaleThresholdDays}
              />
            </label>
            <label className="field">
              <span className="field__label">Milestone slip grace (days)</span>
              <input
                className="field__control"
                min={0}
                onChange={(e) => patch('milestoneSlippedGraceDays', Number(e.target.value))}
                type="number"
                value={effective.milestoneSlippedGraceDays}
              />
            </label>
            <label className="field">
              <span className="field__label">Timesheet gap (days)</span>
              <input
                className="field__control"
                min={1}
                onChange={(e) => patch('timesheetGapDays', Number(e.target.value))}
                type="number"
                value={effective.timesheetGapDays}
              />
            </label>
          </div>
        </SectionCard>

        {/* Governance */}
        <SectionCard compact collapsible title="Governance">
          <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <label className="field">
              <span className="field__label">PM reassignment policy</span>
              <select
                className="field__control"
                onChange={(e) =>
                  patch(
                    'pmReassignmentPolicy',
                    e.target.value as 'pm-or-director-or-admin' | 'director-approval',
                  )
                }
                value={effective.pmReassignmentPolicy}
              >
                {REASSIGNMENT_POLICIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SectionCard>

        {/* RAG cutoffs — decimal bands on the 0.0–4.0 scale */}
        <SectionCard compact collapsible title="RAG cutoffs (0.0 – 4.0 scale)">
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginBottom: 'var(--space-2)' }}>
            Scores strictly less than each cutoff fall into the lower band.
            Example: a project scoring 1.9 with the defaults below is RED.
          </div>
          <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <label className="field">
              <span className="field__label">Critical &lt; (default 1.0)</span>
              <input
                className="field__control"
                max={4}
                min={0}
                onChange={(e) => patch('ragThresholdCritical', Number(e.target.value))}
                step={0.1}
                type="number"
                value={effective.ragThresholdCritical}
              />
            </label>
            <label className="field">
              <span className="field__label">Red &lt; (default 2.0)</span>
              <input
                className="field__control"
                max={4}
                min={0}
                onChange={(e) => patch('ragThresholdRed', Number(e.target.value))}
                step={0.1}
                type="number"
                value={effective.ragThresholdRed}
              />
            </label>
            <label className="field">
              <span className="field__label">Amber &lt; (default 3.0)</span>
              <input
                className="field__control"
                max={4}
                min={0}
                onChange={(e) => patch('ragThresholdAmber', Number(e.target.value))}
                step={0.1}
                type="number"
                value={effective.ragThresholdAmber}
              />
            </label>
            <label className="field" style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', gap: 'var(--space-2)' }}>
              <input
                checked={effective.colourBlindMode}
                onChange={(e) => patch('colourBlindMode', e.target.checked)}
                type="checkbox"
              />
              <span className="field__label" style={{ margin: 0 }}>Colour-blind safe palette</span>
            </label>
          </div>
        </SectionCard>

        {/* Risk cadence map */}
        <SectionCard compact collapsible title="Risk review cadence (days per band)">
          <div style={{ display: 'grid', gap: 'var(--space-3)', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY'] as const).map((band) => (
              <label className="field" key={band}>
                <span className="field__label">{band.toLowerCase()}</span>
                <input
                  className="field__control"
                  min={1}
                  onChange={(e) =>
                    patch('riskCadenceMap', {
                      ...(dirty.riskCadenceMap ?? effective.riskCadenceMap),
                      [band]: Number(e.target.value),
                    })
                  }
                  type="number"
                  value={effective.riskCadenceMap[band] ?? ''}
                />
              </label>
            ))}
          </div>
        </SectionCard>

        <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
          Last updated {new Date(effective.updatedAt).toLocaleString()}.
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset configuration?"
        message="Reset all settings to product defaults? Your unsaved changes will also be discarded."
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void performReset()}
      />
    </FormPageLayout>
  );
}
