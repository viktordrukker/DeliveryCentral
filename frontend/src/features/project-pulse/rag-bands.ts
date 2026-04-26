export type RadiatorBand = 'CRITICAL' | 'RED' | 'AMBER' | 'GREEN';

export interface RagCutoffs {
  critical: number;
  red: number;
  amber: number;
}

export const DEFAULT_RAG_CUTOFFS: RagCutoffs = { critical: 1.0, red: 2.0, amber: 3.0 };

export function bandForScore(
  score: number | null | undefined,
  cutoffs: RagCutoffs = DEFAULT_RAG_CUTOFFS,
): RadiatorBand | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  if (score < cutoffs.critical) return 'CRITICAL';
  if (score < cutoffs.red) return 'RED';
  if (score < cutoffs.amber) return 'AMBER';
  return 'GREEN';
}

export function overallBandForScore(
  score: number,
  cutoffs: RagCutoffs = DEFAULT_RAG_CUTOFFS,
): RadiatorBand {
  if (score < cutoffs.critical * 25) return 'CRITICAL';
  if (score < cutoffs.red * 25) return 'RED';
  if (score < cutoffs.amber * 25) return 'AMBER';
  return 'GREEN';
}

export function bandColor(band: RadiatorBand | null, colourBlind = false): string {
  if (band === null) return 'var(--color-status-neutral)';
  if (colourBlind) {
    if (band === 'GREEN') return 'var(--color-chart-5)';
    if (band === 'AMBER') return 'var(--color-chart-8)';
    if (band === 'RED') return 'var(--color-chart-1)';
    return 'var(--color-status-critical)';
  }
  if (band === 'GREEN') return 'var(--color-status-active)';
  if (band === 'AMBER') return 'var(--color-status-warning)';
  if (band === 'RED') return 'var(--color-status-danger)';
  return 'var(--color-status-critical)';
}

export function bandLabel(band: RadiatorBand | null): string {
  if (band === null) return '—';
  if (band === 'GREEN') return 'Green';
  if (band === 'AMBER') return 'Amber';
  if (band === 'RED') return 'Red';
  return 'Critical';
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return '—';
  return score.toFixed(1);
}
