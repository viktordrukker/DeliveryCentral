import { useEffect, useState } from 'react';

import {
  DEFAULT_RAG_CUTOFFS,
  bandColor,
  bandForScore,
  bandLabel,
  type RagCutoffs,
} from '@/features/project-pulse/rag-bands';
import type { SubDimensionScore } from '@/lib/api/project-radiator';

import { AXIS_LABELS } from './ProjectRadiator';
import { Button, FormField, FormModal, Input, Textarea } from '@/components/ds';

interface OverrideModalProps {
  open: boolean;
  subDimension: SubDimensionScore | null;
  onCancel: () => void;
  onConfirm: (score: number, reason: string) => Promise<void>;
  cutoffs?: RagCutoffs;
}

const MIN_REASON = 10;
const MAX_REASON = 1000;
const PRESETS: number[] = [0, 1, 2, 3, 4];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Phase DS-2-7 Tier C2 — rebuilt on `<FormModal>`. Single-submit shape so
 * FormModal fits cleanly. Legacy `button--project-detail` preset buttons
 * migrated to DS `<Button>` atoms (Group D pattern). The error display
 * inside the form body is kept as a contextual block; FormModal's own
 * submitting state handles the spinner.
 */
export function OverrideModal({
  open,
  subDimension,
  onCancel,
  onConfirm,
  cutoffs = DEFAULT_RAG_CUTOFFS,
}: OverrideModalProps): JSX.Element {
  const [score, setScore] = useState<number | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const seed = subDimension?.effectiveScore ?? subDimension?.autoScore ?? null;
      setScore(seed);
      setScoreInput(seed !== null ? seed.toFixed(1) : '');
      setReason('');
      setError(null);
    }
  }, [open, subDimension?.key, subDimension?.effectiveScore, subDimension?.autoScore]);

  if (!subDimension) return <></>;

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= MIN_REASON;
  const scoreValid = score !== null && !Number.isNaN(score) && score >= 0 && score <= 4;
  const submitDisabled = !scoreValid || !reasonValid;
  const subLabel = AXIS_LABELS[subDimension.key] ?? subDimension.key;
  const band = bandForScore(score, cutoffs);
  const bandFill = bandColor(band);
  const isDirty = scoreInput !== '' || reason !== '';

  function handleScoreInput(raw: string): void {
    setScoreInput(raw);
    if (raw === '') {
      setScore(null);
      return;
    }
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) {
      setScore(clamp(Math.round(parsed * 10) / 10, 0, 4));
    }
  }

  function handlePreset(n: number): void {
    setScore(n);
    setScoreInput(n.toFixed(1));
  }

  async function handleSubmit(): Promise<void> {
    if (score === null || !reasonValid) {
      throw new Error('validation');
    }
    setError(null);
    try {
      await onConfirm(score, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply override.');
      throw err;
    }
  }

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onSubmit={handleSubmit}
      title={`Override ${subLabel}`}
      description={`Auto score: ${subDimension.autoScore !== null ? subDimension.autoScore.toFixed(1) : '—'} — ${subDimension.explanation}`}
      submitLabel="Apply override"
      submitDisabled={submitDisabled}
      dirty={isDirty}
      size="md"
      testId="override-modal"
    >
      <FormField label="New score (0.0 – 4.0)">
        {(props) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <Input
                max={4}
                min={0}
                onChange={(e) => handleScoreInput(e.target.value)}
                step={0.1}
                style={{ width: 110 }}
                type="number"
                value={scoreInput}
                {...props}
              />
              {band ? (
                <span
                  aria-label={`${bandLabel(band)} band`}
                  style={{
                    alignItems: 'center', background: bandFill, borderRadius: 'var(--radius-control)',
                    color: 'var(--color-surface)', display: 'inline-flex', fontSize: 11,
                    fontWeight: 600, gap: 4, letterSpacing: '0.04em', padding: '2px 10px', textTransform: 'uppercase',
                  }}
                >
                  {bandLabel(band)}
                </span>
              ) : null}
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                Cutoffs: C &lt; {cutoffs.critical.toFixed(1)} · R &lt; {cutoffs.red.toFixed(1)} · A &lt; {cutoffs.amber.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={score === p ? 'primary' : 'secondary'}
                  onClick={() => handlePreset(p)}
                >
                  {p.toFixed(1)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </FormField>

      <FormField
        label={`Reason (${MIN_REASON}–${MAX_REASON} chars)`}
        error={!reasonValid && reason !== '' ? `Reason must be at least ${MIN_REASON} characters` : undefined}
      >
        {(props) => (
          <>
            <Textarea
              maxLength={MAX_REASON}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              value={reason}
              {...props}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, marginTop: 2, color: 'var(--color-text-muted)' }}>
              {trimmed.length}/{MAX_REASON}
            </div>
          </>
        )}
      </FormField>

      {error ? (
        <div
          style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2)',
            fontSize: 12,
            color: 'var(--color-status-danger)',
            border: '1px solid var(--color-status-danger)',
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      ) : null}
    </FormModal>
  );
}
