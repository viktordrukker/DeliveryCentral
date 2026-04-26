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

export function OverrideModal({
  open,
  subDimension,
  onCancel,
  onConfirm,
  cutoffs = DEFAULT_RAG_CUTOFFS,
}: OverrideModalProps): JSX.Element | null {
  const [score, setScore] = useState<number | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const seed = subDimension?.effectiveScore ?? subDimension?.autoScore ?? null;
      setScore(seed);
      setScoreInput(seed !== null ? seed.toFixed(1) : '');
      setReason('');
      setError(null);
      setSubmitting(false);
    }
  }, [open, subDimension?.key, subDimension?.effectiveScore, subDimension?.autoScore]);

  if (!open || !subDimension) return null;

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= MIN_REASON;
  const scoreValid = score !== null && !Number.isNaN(score) && score >= 0 && score <= 4;
  const canSubmit = scoreValid && reasonValid && !submitting;
  const subLabel = AXIS_LABELS[subDimension.key] ?? subDimension.key;
  const band = bandForScore(score, cutoffs);
  const bandFill = bandColor(band);

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
    if (!canSubmit || score === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(score, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply override.');
      setSubmitting(false);
    }
  }

  return (
    <div
      aria-modal="true"
      className="confirm-dialog-overlay"
      data-testid="override-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
      role="dialog"
    >
      <div className="confirm-dialog" style={{ maxWidth: 560 }}>
        <h3 className="confirm-dialog__title">Override {subLabel}</h3>
        <p className="confirm-dialog__message" style={{ marginBottom: 'var(--space-3)' }}>
          Auto score:{' '}
          <strong>
            {subDimension.autoScore !== null ? subDimension.autoScore.toFixed(1) : '—'}
          </strong>
          {' — '}
          {subDimension.explanation}
        </p>

        <div style={{ marginBottom: 'var(--space-3)' }}>
          <span className="field__label">New score (0.0 – 4.0)</span>
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
              marginTop: 'var(--space-1)',
            }}
          >
            <input
              className="field__control"
              disabled={submitting}
              max={4}
              min={0}
              onChange={(e) => handleScoreInput(e.target.value)}
              step={0.1}
              style={{ width: 110 }}
              type="number"
              value={scoreInput}
            />
            {band ? (
              <span
                aria-label={`${bandLabel(band)} band`}
                style={{
                  alignItems: 'center',
                  background: bandFill,
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--color-surface)',
                  display: 'inline-flex',
                  fontSize: 11,
                  fontWeight: 600,
                  gap: 4,
                  letterSpacing: '0.04em',
                  padding: '2px 10px',
                  textTransform: 'uppercase',
                }}
              >
                {bandLabel(band)}
              </span>
            ) : null}
            <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
              Cutoffs: C &lt; {cutoffs.critical.toFixed(1)} · R &lt; {cutoffs.red.toFixed(1)} · A &lt; {cutoffs.amber.toFixed(1)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 'var(--space-2)' }}>
            {PRESETS.map((p) => (
              <button
                className={score === p ? 'button--project-detail button--primary' : 'button--project-detail'}
                disabled={submitting}
                key={p}
                onClick={() => handlePreset(p)}
                type="button"
              >
                {p.toFixed(1)}
              </button>
            ))}
          </div>
        </div>

        <label className="field" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="field__label">Reason ({MIN_REASON}–{MAX_REASON} chars)</span>
          <textarea
            className="field__control"
            disabled={submitting}
            maxLength={MAX_REASON}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            value={reason}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 2 }}>
            <span style={{ color: reasonValid ? 'var(--color-text-muted)' : 'var(--color-status-danger)' }}>
              {reasonValid ? 'Ready' : `Reason must be at least ${MIN_REASON} characters`}
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {trimmed.length}/{MAX_REASON}
            </span>
          </div>
        </label>

        {error ? (
          <div
            style={{
              marginBottom: 'var(--space-3)',
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

        <div className="confirm-dialog__actions">
          <button
            className="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {submitting ? 'Saving...' : 'Apply override'}
          </button>
          <button
            className="button button--secondary"
            disabled={submitting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
