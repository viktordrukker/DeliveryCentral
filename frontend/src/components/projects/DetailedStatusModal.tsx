import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { activeAxesFor, type ProjectShape } from '@/features/project-pulse/shape-defaults';
import {
  type PulseReportDto,
  upsertPulseReport,
} from '@/lib/api/pulse-report';

import { AXIS_LABELS } from './ProjectRadiator';
import { Button, FormField, Modal, Textarea } from '@/components/ds';

interface DetailedStatusModalProps {
  open: boolean;
  projectId: string;
  shape?: ProjectShape | null;
  report: PulseReportDto | null;
  onClose: () => void;
  onSaved: (next: PulseReportDto) => void;
}

/** Map sub-dim keys to their quadrant for grouping. Mirrors the backend order. */
const SUB_TO_QUADRANT: Record<string, 'scope' | 'schedule' | 'budget' | 'people'> = {
  requirementsStability: 'scope',
  scopeCreep: 'scope',
  deliverableAcceptance: 'scope',
  changeRequestBurden: 'scope',
  milestoneAdherence: 'schedule',
  timelineDeviation: 'schedule',
  criticalPathHealth: 'schedule',
  velocityTrend: 'schedule',
  costPerformanceIndex: 'budget',
  spendRate: 'budget',
  forecastAccuracy: 'budget',
  capexCompliance: 'budget',
  staffingFillRate: 'people',
  teamMood: 'people',
  overAllocationRate: 'people',
  keyPersonRisk: 'people',
};

const QUADRANT_LABELS: Record<'scope' | 'schedule' | 'budget' | 'people', string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  people: 'People',
};

/**
 * Phase DS-2-7 Tier C1 — rebuilt on `<Modal>` (dual-action: Save draft +
 * Submit detailed; FormModal supports a single submit so we use Modal with
 * a custom footer). Backdrop / focus trap / scroll lock / mobile auto-
 * fullscreen handled by the DS shell. Public API unchanged.
 *
 * Also migrates the legacy `button--project-detail` action buttons to
 * `<Button>` atoms (Group D pattern B).
 */
export function DetailedStatusModal({
  open,
  projectId,
  shape,
  report,
  onClose,
  onSaved,
}: DetailedStatusModalProps): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeAxes = useMemo(() => activeAxesFor(shape ?? null), [shape]);

  useEffect(() => {
    if (open && report) {
      const seed: Record<string, string> = {};
      const detailed = report.dimensions.detailed ?? {};
      for (const key of activeAxes) {
        const entry = detailed[key];
        if (entry?.narrative) seed[key] = entry.narrative;
      }
      setValues(seed);
    }
  }, [open, report, activeAxes]);

  const groupedByQuadrant = activeAxes.reduce<Record<string, string[]>>((acc, key) => {
    const q = SUB_TO_QUADRANT[key] ?? 'scope';
    (acc[q] ??= []).push(key);
    return acc;
  }, {});

  async function handleSave(submit: boolean): Promise<void> {
    setSaving(true);
    try {
      const detailed: Record<string, { narrative: string | null }> = {};
      for (const key of activeAxes) {
        const trimmed = (values[key] ?? '').trim();
        detailed[key] = { narrative: trimmed.length > 0 ? trimmed : null };
      }
      const next = await upsertPulseReport(projectId, {
        dimensions: { detailed },
        submit,
      });
      toast.success(submit ? 'Detailed status submitted' : 'Detailed draft saved');
      onSaved(next);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Detailed status — per dimension"
      description="Fill in only the dimensions you need to explain. Blank fields stay blank — no ceremony."
      closeOnBackdropClick={!saving}
      closeOnEscape={!saving}
      testId="detailed-status-modal"
      footer={
        <>
          <Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button variant="secondary" disabled={saving} onClick={() => void handleSave(false)}>
            {saving ? 'Saving...' : 'Save draft'}
          </Button>
          <Button variant="primary" disabled={saving} onClick={() => void handleSave(true)} data-autofocus="true">
            Submit detailed
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {(Object.keys(QUADRANT_LABELS) as Array<'scope' | 'schedule' | 'budget' | 'people'>).map((q) => {
          const subs = groupedByQuadrant[q] ?? [];
          if (subs.length === 0) return null;
          return (
            <fieldset
              key={q}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-control)',
                margin: 0,
                padding: 'var(--space-3)',
              }}
            >
              <legend style={{ fontSize: 12, fontWeight: 600, padding: '0 6px' }}>
                {QUADRANT_LABELS[q]}
              </legend>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {subs.map((key) => (
                  <FormField key={key} label={AXIS_LABELS[key] ?? key}>
                    {(props) => (
                      <Textarea
                        disabled={saving}
                        maxLength={600}
                        onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Optional narrative — leave blank if nothing to report."
                        rows={2}
                        style={{ fontSize: 12, resize: 'vertical' }}
                        value={values[key] ?? ''}
                        {...props}
                      />
                    )}
                  </FormField>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>
    </Modal>
  );
}
