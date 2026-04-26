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

export function RadiatorThresholdsPage(): JSX.Element {
  const [rows, setRows] = useState<ThresholdConfigDto[]>([]);
  const [edits, setEdits] = useState<Record<string, EditRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

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

  async function handleSave(key: string): Promise<void> {
    const edit = edits[key];
    if (!edit) return;
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
          <table className="dash-compact-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Sub-dimension</th>
                <th style={{ textAlign: 'left', width: 90 }}>Quadrant</th>
                <th style={{ textAlign: 'left', width: 160 }}>Direction</th>
                <th style={{ textAlign: 'right', width: 80 }}>t4 (Green)</th>
                <th style={{ textAlign: 'right', width: 80 }}>t3</th>
                <th style={{ textAlign: 'right', width: 80 }}>t2</th>
                <th style={{ textAlign: 'right', width: 80 }}>t1</th>
                <th style={{ textAlign: 'right', width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const e = edits[r.subDimensionKey];
                if (!e) return null;
                const dirty =
                  e.direction !== r.direction ||
                  e.thresholdScore1 !== r.thresholdScore1 ||
                  e.thresholdScore2 !== r.thresholdScore2 ||
                  e.thresholdScore3 !== r.thresholdScore3 ||
                  e.thresholdScore4 !== r.thresholdScore4;
                const isSaving = saving[r.subDimensionKey] === true;
                return (
                  <tr key={r.subDimensionKey}>
                    <td style={{ fontWeight: 500 }}>
                      {AXIS_LABELS[r.subDimensionKey] ?? r.subDimensionKey}
                      {r.isDefault ? (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 4 }}>
                          (default)
                        </span>
                      ) : null}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>
                      {QUADRANT_FOR_KEY[r.subDimensionKey] ?? '—'}
                    </td>
                    <td>
                      <select
                        className="field__control"
                        onChange={(ev) => updateField(r.subDimensionKey, 'direction', ev.target.value as ThresholdDirection)}
                        value={e.direction}
                      >
                        <option value="HIGHER_IS_BETTER">Higher is better</option>
                        <option value="LOWER_IS_BETTER">Lower is better</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="field__control"
                        onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore4', Number(ev.target.value))}
                        step="any"
                        style={{ textAlign: 'right' }}
                        type="number"
                        value={e.thresholdScore4}
                      />
                    </td>
                    <td>
                      <input
                        className="field__control"
                        onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore3', Number(ev.target.value))}
                        step="any"
                        style={{ textAlign: 'right' }}
                        type="number"
                        value={e.thresholdScore3}
                      />
                    </td>
                    <td>
                      <input
                        className="field__control"
                        onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore2', Number(ev.target.value))}
                        step="any"
                        style={{ textAlign: 'right' }}
                        type="number"
                        value={e.thresholdScore2}
                      />
                    </td>
                    <td>
                      <input
                        className="field__control"
                        onChange={(ev) => updateField(r.subDimensionKey, 'thresholdScore1', Number(ev.target.value))}
                        step="any"
                        style={{ textAlign: 'right' }}
                        type="number"
                        value={e.thresholdScore1}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                        <button
                          className="button button--secondary button--sm"
                          disabled={!dirty || isSaving}
                          onClick={() => resetRow(r.subDimensionKey)}
                          type="button"
                        >
                          Reset
                        </button>
                        <button
                          className="button button--primary button--sm"
                          disabled={!dirty || isSaving}
                          onClick={() => void handleSave(r.subDimensionKey)}
                          type="button"
                        >
                          {isSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      )}
    </PageContainer>
  );
}
