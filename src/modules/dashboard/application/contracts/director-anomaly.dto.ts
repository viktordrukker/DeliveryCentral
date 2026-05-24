/**
 * FE-#265 — Director "What needs you now" anomaly cards.
 */
export type DirectorAnomalyKind =
  | 'project_rag_dropped'
  | 'utilization_spike'
  | 'pending_approval_age'
  | 'budget_overrun'
  | 'milestone_slip';

export type DirectorAnomalySeverity = 'info' | 'warning' | 'danger' | 'critical';

export interface DirectorAnomalyDto {
  kind: DirectorAnomalyKind;
  severity: DirectorAnomalySeverity;
  title: string;
  detail: string;
  /** Deep-link to the affected page. */
  href: string;
  /** 0..1 — used to sort by recency × severity. */
  decayRate: number;
  /** When the anomaly was first detected. ISO-8601. */
  detectedAt: string;
}
