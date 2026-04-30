import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { Button } from '@/components/ds';
import type { ProjectShape } from '@/features/project-pulse/shape-defaults';
import {
  type PulseQuadrantKey,
  type PulseRagRating,
  type PulseReportDto,
  fetchPulseReport,
  upsertPulseReport,
} from '@/lib/api/pulse-report';

import type { RadiatorSnapshotDto } from '@/lib/api/project-radiator';

import { DimensionDetailModal } from './DimensionDetailModal';

interface PulseReportFormProps {
  projectId: string;
  canEdit: boolean;
  onSubmitted?: () => void;
  shape?: ProjectShape | null;
  /** Current radiator snapshot used by the unified detailed modal (override + narrative). */
  snapshot?: RadiatorSnapshotDto | null;
}

const QUADRANT_LABELS: Record<PulseQuadrantKey, string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  people: 'People',
};

const QUADRANT_ORDER: PulseQuadrantKey[] = ['scope', 'schedule', 'budget', 'people'];

const RAG_SEQUENCE: Array<PulseRagRating | null> = ['GREEN', 'AMBER', 'RED', 'CRITICAL', null];

const RAG_META: Record<PulseRagRating, { label: string; tone: string }> = {
  GREEN: { label: 'G', tone: 'var(--color-status-active)' },
  AMBER: { label: 'A', tone: 'var(--color-status-warning)' },
  RED: { label: 'R', tone: 'var(--color-status-danger)' },
  CRITICAL: { label: 'C', tone: 'var(--color-status-critical)' },
};

function nextRag(current: PulseRagRating | null): PulseRagRating | null {
  const idx = RAG_SEQUENCE.indexOf(current);
  return RAG_SEQUENCE[(idx + 1) % RAG_SEQUENCE.length];
}

export function PulseReportForm({
  projectId,
  canEdit,
  onSubmitted,
  shape,
  snapshot,
}: PulseReportFormProps): JSX.Element {
  const [report, setReport] = useState<PulseReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailedOpen, setDetailedOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPulseReport(projectId)
      .then((r) => {
        if (active) setReport(r);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const detailedCount = useMemo(() => {
    if (!report?.dimensions.detailed) return 0;
    return Object.values(report.dimensions.detailed).filter((d) => d.narrative && d.narrative.length > 0).length;
  }, [report?.dimensions.detailed]);

  const submittedLabel = useMemo(() => {
    if (!report?.submittedAt) return null;
    return `Submitted ${new Date(report.submittedAt).toLocaleString()}`;
  }, [report?.submittedAt]);

  if (loading) return <LoadingState label="Loading report..." variant="skeleton" skeletonType="detail" />;
  if (error) return <ErrorState description={error} />;
  if (!report) return <ErrorState description="Report not available." />;

  function patchDim(key: PulseQuadrantKey, patch: { rag?: PulseRagRating | null; narrative?: string }): void {
    setReport((prev) => {
      if (!prev) return prev;
      const current = prev.dimensions[key];
      return {
        ...prev,
        dimensions: {
          ...prev.dimensions,
          [key]: {
            tier: current.tier,
            rag: patch.rag !== undefined ? patch.rag : current.rag,
            narrative: patch.narrative !== undefined ? patch.narrative : current.narrative,
          },
        },
      };
    });
    setDirty(true);
  }

  function patchOverall(text: string): void {
    setReport((prev) => (prev ? { ...prev, overallNarrative: text } : prev));
    setDirty(true);
  }

  async function save(submit: boolean): Promise<void> {
    if (!report) return;
    setSaving(true);
    try {
      const patchDimensions: Record<string, unknown> = {};
      for (const q of QUADRANT_ORDER) {
        patchDimensions[q] = {
          rag: report.dimensions[q].rag,
          narrative: report.dimensions[q].narrative,
        };
      }
      const next = await upsertPulseReport(projectId, {
        dimensions: patchDimensions as Parameters<typeof upsertPulseReport>[1]['dimensions'],
        overallNarrative: report.overallNarrative,
        submit,
      });
      setReport(next);
      setDirty(false);
      toast.success(submit ? 'Status submitted' : 'Draft saved');
      if (submit) onSubmitted?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const dimensions = report.dimensions;

  return (
    <div data-testid="pulse-report-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ alignItems: 'center', color: 'var(--color-text-muted)', display: 'flex', fontSize: 11, justifyContent: 'space-between' }}>
        <span>Week of {report.weekStarting}</span>
        <span>{submittedLabel ?? 'Draft'}</span>
      </div>

      {/* Executive summary */}
      <label className="field">
        <span className="field__label">
          Executive summary <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>— one paragraph for the Steering Committee</span>
        </span>
        <textarea
          className="field__control"
          disabled={!canEdit || saving}
          maxLength={600}
          onChange={(e) => patchOverall(e.target.value)}
          placeholder="Keep it tight. Leave blank if nothing to summarise."
          rows={3}
          style={{ fontSize: 12, resize: 'vertical' }}
          value={report.overallNarrative ?? ''}
        />
      </label>

      {/* Per-quadrant RAG + optional note */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Per quadrant — all fields optional, click RAG to cycle
        </div>
        {QUADRANT_ORDER.map((key) => {
          const entry = dimensions[key];
          const rag = entry.rag;
          const ragMeta = rag ? RAG_META[rag] : null;
          return (
            <div
              key={key}
              style={{
                alignItems: 'start',
                display: 'grid',
                gap: 'var(--space-2)',
                gridTemplateColumns: '92px 36px 1fr',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, paddingTop: 6 }}>{QUADRANT_LABELS[key]}</span>
              <Button
                aria-label={`${QUADRANT_LABELS[key]} RAG — ${rag ?? 'unset'}`}
                variant="secondary"
                size="sm"
                disabled={!canEdit || saving}
                onClick={() => patchDim(key, { rag: nextRag(entry.rag) })}
                style={{
                  alignItems: 'center',
                  background: ragMeta ? ragMeta.tone : 'var(--color-surface)',
                  border: ragMeta ? `1px solid ${ragMeta.tone}` : '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-control)',
                  color: ragMeta ? 'var(--color-surface)' : 'var(--color-text-muted)',
                  display: 'flex',
                  fontSize: 12,
                  fontWeight: 700,
                  height: 28,
                  justifyContent: 'center',
                  width: 32,
                }}
                type="button"
              >
                {ragMeta ? ragMeta.label : '—'}
              </Button>
              <textarea
                aria-label={`${QUADRANT_LABELS[key]} optional note`}
                className="field__control"
                disabled={!canEdit || saving}
                maxLength={400}
                onChange={(e) => patchDim(key, { narrative: e.target.value })}
                placeholder={`Optional ${QUADRANT_LABELS[key].toLowerCase()} note`}
                rows={2}
                style={{ fontSize: 12, resize: 'vertical' }}
                value={entry.narrative ?? ''}
              />
            </div>
          );
        })}
      </div>

      {canEdit ? (
        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <Button variant="secondary" disabled={saving || !dirty} onClick={() => void save(false)}>
            {saving ? 'Saving…' : 'Save draft'}
          </Button>
          <Button variant="primary" disabled={saving} onClick={() => void save(true)}>
            Submit
          </Button>
          <Button variant="secondary" disabled={saving} onClick={() => setDetailedOpen(true)}>
            + Report detailed status{detailedCount > 0 ? ` (${detailedCount})` : ''}
          </Button>
        </div>
      ) : null}

      <DimensionDetailModal
        onClose={() => setDetailedOpen(false)}
        onSaved={({ report: nextReport }) => setReport(nextReport)}
        open={detailedOpen}
        projectId={projectId}
        report={report}
        shape={shape}
        snapshot={snapshot ?? null}
      />
    </div>
  );
}
