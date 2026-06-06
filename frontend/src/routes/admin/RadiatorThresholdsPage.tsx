import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { AXIS_LABELS } from '@/components/projects/ProjectRadiator';
import {
  type ThresholdConfigDto,
  type ThresholdDirection,
  fetchThresholdConfigs,
  upsertThresholdConfig,
} from '@/lib/api/radiator-thresholds';
import { Button, Input, Select, Table, type Column } from '@/components/ds';

const QUADRANT_FOR_KEY: Record<string, string> = {
  changeRequestBurden: 'Scope',
  deliverableAcceptance: 'Scope',
  requirementsStability: 'Scope',
  scopeCreep: 'Scope',
  criticalPathHealth: 'Schedule',
  milestoneAdherence: 'Schedule',
  timelineDeviation: 'Schedule',
  velocityTrend: 'Schedule',
  capexCompliance: 'Budget',
  costPerformanceIndex: 'Budget',
  forecastAccuracy: 'Budget',
  spendRate: 'Budget',
  keyPersonRisk: 'People',
  overAllocationRate: 'People',
  staffingFillRate: 'People',
  teamMood: 'People',
};

interface EditRow {
  direction: ThresholdDirection;
  thresholdScore1: number;
  thresholdScore2: number;
  thresholdScore3: number;
  thresholdScore4: number;
}

/**
 * Validate a row's thresholds against its direction.
 *
 * HIGHER_IS_BETTER: t1 < t2 < t3 < t4 (e.g., milestoneAdherence 0.5 < 0.7 < 0.85 < 0.95)
 * LOWER_IS_BETTER:  t1 > t2 > t3 > t4 (e.g., scopeCreep        0.35 > 0.2 > 0.1 > 0.05)
 *
 * Returns null when valid, otherwise a short human-readable error message.
 */
export function validateThresholdRow(row: EditRow): string | null {
  const { thresholdScore1: t1, thresholdScore2: t2, thresholdScore3: t3, thresholdScore4: t4, direction } = row;
  if ([t1, t2, t3, t4].some((v) => !Number.isFinite(v))) return 'All thresholds must be numbers.';
  if (direction === 'HIGHER_IS_BETTER') {
    if (!(t1 < t2 && t2 < t3 && t3 < t4)) return 't1 < t2 < t3 < t4 required';
  } else {
    if (!(t1 > t2 && t2 > t3 && t3 > t4)) return 't1 > t2 > t3 > t4 required';
  }
  return null;
}

export function RadiatorThresholdsPage(): JSX.Element {
  const [rows, setRows] = useState<ThresholdConfigDto[]>([]);
  const [edits, setEdits] = useState<Record<string, EditRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);

  function syncEdits(configs: ThresholdConfigDto[]): void {
    const next: Record<string, EditRow> = {};
    configs.forEach((c) => {
      next[c.subDimensionKey] = {
        direction: c.direction,
        thresholdScore1: c.thresholdScore1,
        thresholdScore2: c.thresholdScore2,
        thresholdScore3: c.thresholdScore3,
        thresholdScore4: c.thresholdScore4,
      };
    });
    setEdits(next);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchThresholdConfigs()
      .then((configs) => {
        if (!active) return;
        setRows(configs);
        syncEdits(configs);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load thresholds.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof EditRow>(key: string, field: K, value: EditRow[K]): void {
    setEdits((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          direction: 'HIGHER_IS_BETTER',
          thresholdScore1: 0,
          thresholdScore2: 0,
          thresholdScore3: 0,
          thresholdScore4: 0,
        }),
        [field]: value,
      },
    }));
  }

  function resetRow(key: string): void {
    const original = rows.find((r) => r.subDimensionKey === key);
    if (!original) return;
    setEdits((prev) => ({
      ...prev,
      [key]: {
        direction: original.direction,
        thresholdScore1: original.thresholdScore1,
        thresholdScore2: original.thresholdScore2,
        thresholdScore3: original.thresholdScore3,
        thresholdScore4: original.thresholdScore4,
      },
    }));
  }

  function isDirty(row: ThresholdConfigDto, edit: EditRow | undefined): boolean {
    if (!edit) return false;
    return (
      edit.direction !== row.direction ||
      edit.thresholdScore1 !== row.thresholdScore1 ||
      edit.thresholdScore2 !== row.thresholdScore2 ||
      edit.thresholdScore3 !== row.thresholdScore3 ||
      edit.thresholdScore4 !== row.thresholdScore4
    );
  }

  async function handleSave(key: string): Promise<void> {
    const edit = edits[key];
    if (!edit) return;
    if (validateThresholdRow(edit) !== null) return;
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      await upsertThresholdConfig(key, {
        direction: edit.direction,
        thresholdScore1: edit.thresholdScore1,
        thresholdScore2: edit.thresholdScore2,
        thresholdScore3: edit.thresholdScore3,
        thresholdScore4: edit.thresholdScore4,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.subDimensionKey === key
            ? { ...r, ...edit, isDefault: false }
            : r,
        ),
      );
      toast.success(`${AXIS_LABELS[key] ?? key} saved`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  const dirtyKeys = rows
    .filter((r) => isDirty(r, edits[r.subDimensionKey]))
    .map((r) => r.subDimensionKey);
  const invalidKeys = rows
    .filter((r) => {
      const e = edits[r.subDimensionKey];
      return e !== undefined && validateThresholdRow(e) !== null;
    })
    .map((r) => r.subDimensionKey);
  const dirtyValidKeys = dirtyKeys.filter((k) => !invalidKeys.includes(k));

  async function handleSaveAll(): Promise<void> {
    if (dirtyValidKeys.length === 0) return;
    setSavingAll(true);
    let okCount = 0;
    let failCount = 0;
    const updatedRows: ThresholdConfigDto[] = [];
    for (const key of dirtyValidKeys) {
      const edit = edits[key];
      if (!edit) continue;
      try {
        await upsertThresholdConfig(key, {
          direction: edit.direction,
          thresholdScore1: edit.thresholdScore1,
          thresholdScore2: edit.thresholdScore2,
          thresholdScore3: edit.thresholdScore3,
          thresholdScore4: edit.thresholdScore4,
        });
        const original = rows.find((r) => r.subDimensionKey === key);
        if (original) {
          updatedRows.push({ ...original, ...edit, isDefault: false });
        }
        okCount += 1;
      } catch {
        failCount += 1;
      }
    }
    if (updatedRows.length > 0) {
      setRows((prev) =>
        prev.map((r) => {
          const next = updatedRows.find((u) => u.subDimensionKey === r.subDimensionKey);
          return next ?? r;
        }),
      );
    }
    if (failCount === 0) {
      toast.success(`Saved ${okCount} threshold${okCount === 1 ? '' : 's'}`);
    } else if (okCount === 0) {
      toast.error(`Failed to save ${failCount} threshold${failCount === 1 ? '' : 's'}`);
    } else {
      toast.error(`Saved ${okCount}, failed ${failCount}`);
    }
    setSavingAll(false);
  }

  if (loading) return (
    <PageContainer testId="radiator-thresholds-page">
      <PageHeader eyebrow="Admin" title="Radiator Threshold Configuration" />
      <LoadingState label="Loading thresholds…" skeletonType="table" variant="skeleton" />
    </PageContainer>
  );

  if (error) return (
    <PageContainer testId="radiator-thresholds-page">
      <PageHeader eyebrow="Admin" title="Radiator Threshold Configuration" />
      <ErrorState description={error} />
    </PageContainer>
  );

  return (
    <PageContainer testId="radiator-thresholds-page">
      <PageHeader
        eyebrow="Admin"
        subtitle="Per sub-dimension thresholds for the 16-axis project radiator."
        title="Radiator Threshold Configuration"
      />

      <div
        aria-live="polite"
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          color: 'var(--color-text-muted)',
          fontSize: 12,
          marginBottom: 'var(--space-4)',
          padding: 'var(--space-3)',
        }}
      >
        Changes invalidate the scoring cache and apply to all projects on next compute.
      </div>

      {rows.length === 0 ? (
        <SectionCard>
          <EmptyState description="No threshold configurations returned from the server." title="No thresholds" />
        </SectionCard>
      ) : (
        <SectionCard title={`Thresholds (${rows.length})`}>
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              gap: 'var(--space-3)',
              justifyContent: 'flex-end',
              marginBottom: 'var(--space-3)',
            }}
          >
            <span data-testid="dirty-summary" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
              {dirtyKeys.length === 0
                ? 'No unsaved changes'
                : `${dirtyKeys.length} unsaved change${dirtyKeys.length === 1 ? '' : 's'}${invalidKeys.length > 0 ? ` (${invalidKeys.length} invalid)` : ''}`}
            </span>
            <Button
              data-testid="save-all-button"
              disabled={dirtyValidKeys.length === 0 || savingAll}
              onClick={() => void handleSaveAll()}
              size="sm"
              type="button"
              variant="primary"
            >
              {savingAll ? 'Saving…' : `Save all (${dirtyValidKeys.length})`}
            </Button>
          </div>
          <Table
            variant="compact"
            columns={[
              { key: 'sub', title: 'Sub-dimension', getValue: (r) => AXIS_LABELS[r.subDimensionKey] ?? r.subDimensionKey, render: (r) => (
                <span style={{ fontWeight: 500 }}>
                  {AXIS_LABELS[r.subDimensionKey] ?? r.subDimensionKey}
                  {r.isDefault ? (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 4 }}>(default)</span>
                  ) : null}
                </span>
              ) },
              { key: 'quadrant', title: 'Quadrant', width: 90, getValue: (r) => QUADRANT_FOR_KEY[r.subDimensionKey] ?? '', render: (r) => <span style={{ color: 'var(--color-text-muted)' }}>{QUADRANT_FOR_KEY[r.subDimensionKey] ?? '—'}</span> },
              { key: 'dir', title: 'Direction', width: 160, render: (r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                return (
                  <Select value={e.direction} onChange={(ev) => updateField(r.subDimensionKey, 'direction', ev.target.value as ThresholdDirection)}>
                    <option value="HIGHER_IS_BETTER">Higher is better</option>
                    <option value="LOWER_IS_BETTER">Lower is better</option>
                  </Select>
                );
              } },
              { key: 't4', title: 't4 (Green)', align: 'right', width: 80, render: (r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                return <Input type="number" step="any" style={{ textAlign: 'right' }} value={e.thresholdScore4} onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore4', Number(ev.target.value))} />;
              } },
              { key: 't3', title: 't3', align: 'right', width: 80, render: (r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                return <Input type="number" step="any" style={{ textAlign: 'right' }} value={e.thresholdScore3} onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore3', Number(ev.target.value))} />;
              } },
              { key: 't2', title: 't2', align: 'right', width: 80, render: (r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                return <Input type="number" step="any" style={{ textAlign: 'right' }} value={e.thresholdScore2} onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore2', Number(ev.target.value))} />;
              } },
              { key: 't1', title: 't1', align: 'right', width: 80, render: (r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                return <Input type="number" step="any" style={{ textAlign: 'right' }} value={e.thresholdScore1} onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore1', Number(ev.target.value))} />;
              } },
              { key: 'validation', title: 'Validation', width: 180, render: (r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                const err = validateThresholdRow(e);
                if (err === null) return <span style={{ color: 'var(--color-status-active)', fontSize: 11 }}>OK</span>;
                return <span data-testid={`validation-error-${r.subDimensionKey}`} style={{ color: 'var(--color-status-danger)', fontSize: 11 }}>{err}</span>;
              } },
              { key: 'actions', title: 'Actions', align: 'right', width: 200, render: (r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                const dirty = isDirty(r, e);
                const invalid = validateThresholdRow(e) !== null;
                const isSaving = saving[r.subDimensionKey] === true;
                return (
                  <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                    <Button variant="secondary" size="sm" disabled={!dirty || isSaving} onClick={() => resetRow(r.subDimensionKey)} type="button">Reset</Button>
                    <Button variant="primary" size="sm" disabled={!dirty || invalid || isSaving} onClick={() => void handleSave(r.subDimensionKey)} type="button">
                      {isSaving ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                );
              } },
            ] as Column<ThresholdConfigDto>[]}
            rows={rows.filter((r) => edits[r.subDimensionKey])}
            getRowKey={(r) => r.subDimensionKey}
          />
        </SectionCard>
      )}
    </PageContainer>
  );
}
