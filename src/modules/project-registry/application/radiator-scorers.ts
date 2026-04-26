/**
 * Pure scoring functions for the 16-axis Project Radiator.
 * Each function maps a raw signal to a decimal 0.0..4.0.
 *
 * Scale (default RAG cutoffs, tenant-overridable via OrgConfig):
 *   score < 1.0 → CRITICAL · < 2.0 → RED · < 3.0 → AMBER · ≤ 4.0 → GREEN
 *
 * Scores are interpolated linearly within each threshold band so PMs see
 * fine-grained movement rather than cliffs (e.g. CPI 0.88 → score 2.6).
 */

/** Decimal score in [0.0, 4.0]. */
export type RadiatorScore = number;
export type ThresholdDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

/** Four decreasing thresholds (t4 = green cutoff, t1 = red cutoff). */
export interface ThresholdSet {
  t4: number;
  t3: number;
  t2: number;
  t1: number;
  direction: ThresholdDirection;
}

const EPS = 1e-9;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Map a value to 0..4 (decimal) using the given thresholds, with linear interpolation within each band. */
export function scoreByThresholds(value: number, t: ThresholdSet): RadiatorScore {
  if (t.direction === 'HIGHER_IS_BETTER') {
    if (value >= t.t4) return 4;
    if (value >= t.t3) return clamp(3 + (value - t.t3) / Math.max(t.t4 - t.t3, EPS), 3, 4);
    if (value >= t.t2) return clamp(2 + (value - t.t2) / Math.max(t.t3 - t.t2, EPS), 2, 3);
    if (value >= t.t1) return clamp(1 + (value - t.t1) / Math.max(t.t2 - t.t1, EPS), 1, 2);
    return clamp(value / Math.max(t.t1, EPS), 0, 1);
  }
  // LOWER_IS_BETTER: smaller value = better score
  if (value <= t.t4) return 4;
  if (value <= t.t3) return clamp(3 + (t.t3 - value) / Math.max(t.t3 - t.t4, EPS), 3, 4);
  if (value <= t.t2) return clamp(2 + (t.t2 - value) / Math.max(t.t2 - t.t3, EPS), 2, 3);
  if (value <= t.t1) return clamp(1 + (t.t1 - value) / Math.max(t.t1 - t.t2, EPS), 1, 2);
  return 0;
}

// ───── Scope ─────
export const DEFAULT_REQUIREMENTS_STABILITY: ThresholdSet = { t4: 0.95, t3: 0.85, t2: 0.7, t1: 0.5, direction: 'HIGHER_IS_BETTER' };
export function requirementsStability(pctUnchanged: number, t: ThresholdSet = DEFAULT_REQUIREMENTS_STABILITY): RadiatorScore {
  return scoreByThresholds(pctUnchanged, t);
}

export const DEFAULT_SCOPE_CREEP: ThresholdSet = { t4: 0.05, t3: 0.1, t2: 0.2, t1: 0.35, direction: 'LOWER_IS_BETTER' };
export function scopeCreep(ratio: number, t: ThresholdSet = DEFAULT_SCOPE_CREEP): RadiatorScore {
  return scoreByThresholds(ratio, t);
}

export const DEFAULT_DELIVERABLE_ACCEPTANCE: ThresholdSet = { t4: 0.95, t3: 0.85, t2: 0.7, t1: 0.5, direction: 'HIGHER_IS_BETTER' };
export function deliverableAcceptance(pctFirstPass: number, t: ThresholdSet = DEFAULT_DELIVERABLE_ACCEPTANCE): RadiatorScore {
  return scoreByThresholds(pctFirstPass, t);
}

export const DEFAULT_CHANGE_REQUEST_BURDEN: ThresholdSet = { t4: 0.02, t3: 0.05, t2: 0.1, t1: 0.2, direction: 'LOWER_IS_BETTER' };
export function changeRequestBurden(severityWeighted: number, projectSizePoints: number, t: ThresholdSet = DEFAULT_CHANGE_REQUEST_BURDEN): RadiatorScore {
  const burden = severityWeighted / Math.max(projectSizePoints, 1);
  return scoreByThresholds(burden, t);
}

// ───── Schedule ─────
export const DEFAULT_MILESTONE_ADHERENCE: ThresholdSet = { t4: 0.95, t3: 0.85, t2: 0.7, t1: 0.5, direction: 'HIGHER_IS_BETTER' };
export function milestoneAdherence(pctHitOnTime: number, t: ThresholdSet = DEFAULT_MILESTONE_ADHERENCE): RadiatorScore {
  return scoreByThresholds(pctHitOnTime, t);
}

export const DEFAULT_TIMELINE_DEVIATION: ThresholdSet = { t4: 0.02, t3: 0.05, t2: 0.1, t1: 0.2, direction: 'LOWER_IS_BETTER' };
export function timelineDeviation(driftDays: number, projectDurationDays: number, t: ThresholdSet = DEFAULT_TIMELINE_DEVIATION): RadiatorScore {
  const pct = Math.abs(driftDays) / Math.max(projectDurationDays, 1);
  return scoreByThresholds(pct, t);
}

export const DEFAULT_CRITICAL_PATH_HEALTH: ThresholdSet = { t4: 10, t3: 5, t2: 2, t1: 0, direction: 'HIGHER_IS_BETTER' };
export function criticalPathHealth(floatDays: number, t: ThresholdSet = DEFAULT_CRITICAL_PATH_HEALTH): RadiatorScore {
  return scoreByThresholds(floatDays, t);
}

export const DEFAULT_VELOCITY_TREND: ThresholdSet = { t4: 0.95, t3: 0.85, t2: 0.7, t1: 0.5, direction: 'HIGHER_IS_BETTER' };
export function velocityTrend(actualOverPlanned: number, t: ThresholdSet = DEFAULT_VELOCITY_TREND): RadiatorScore {
  return scoreByThresholds(actualOverPlanned, t);
}

// ───── Budget ─────
export const DEFAULT_CPI: ThresholdSet = { t4: 0.95, t3: 0.9, t2: 0.8, t1: 0.7, direction: 'HIGHER_IS_BETTER' };
export function costPerformanceIndex(cpi: number, t: ThresholdSet = DEFAULT_CPI): RadiatorScore {
  return scoreByThresholds(cpi, t);
}

export const DEFAULT_SPEND_RATE: ThresholdSet = { t4: 0.05, t3: 0.1, t2: 0.2, t1: 0.35, direction: 'LOWER_IS_BETTER' };
export function spendRate(actualOverPlanned: number, t: ThresholdSet = DEFAULT_SPEND_RATE): RadiatorScore {
  const delta = Math.abs(actualOverPlanned - 1);
  return scoreByThresholds(delta, t);
}

export const DEFAULT_FORECAST_ACCURACY: ThresholdSet = { t4: 0.03, t3: 0.07, t2: 0.12, t1: 0.25, direction: 'LOWER_IS_BETTER' };
export function forecastAccuracy(eac: number, bac: number, t: ThresholdSet = DEFAULT_FORECAST_ACCURACY): RadiatorScore {
  const err = Math.abs(eac - bac) / Math.max(bac, 1);
  return scoreByThresholds(err, t);
}

export const DEFAULT_CAPEX_COMPLIANCE: ThresholdSet = { t4: 0.99, t3: 0.95, t2: 0.85, t1: 0.7, direction: 'HIGHER_IS_BETTER' };
export function capexCompliance(pctCorrectlyCapitalised: number, t: ThresholdSet = DEFAULT_CAPEX_COMPLIANCE): RadiatorScore {
  return scoreByThresholds(pctCorrectlyCapitalised, t);
}

// ───── People ─────
export const DEFAULT_STAFFING_FILL_RATE: ThresholdSet = { t4: 0.98, t3: 0.9, t2: 0.75, t1: 0.5, direction: 'HIGHER_IS_BETTER' };
export function staffingFillRate(pctFilled: number, t: ThresholdSet = DEFAULT_STAFFING_FILL_RATE): RadiatorScore {
  return scoreByThresholds(pctFilled, t);
}

export const DEFAULT_TEAM_MOOD: ThresholdSet = { t4: 4.0, t3: 3.5, t2: 3.0, t1: 2.5, direction: 'HIGHER_IS_BETTER' };
export function teamMood(avgPulseOutOf5: number, t: ThresholdSet = DEFAULT_TEAM_MOOD): RadiatorScore {
  return scoreByThresholds(avgPulseOutOf5, t);
}

export const DEFAULT_OVER_ALLOCATION_RATE: ThresholdSet = { t4: 0.0, t3: 0.05, t2: 0.15, t1: 0.3, direction: 'LOWER_IS_BETTER' };
export function overAllocationRate(pctOverAllocated: number, t: ThresholdSet = DEFAULT_OVER_ALLOCATION_RATE): RadiatorScore {
  return scoreByThresholds(pctOverAllocated, t);
}

export const DEFAULT_KEY_PERSON_RISK: ThresholdSet = { t4: 0.95, t3: 0.8, t2: 0.6, t1: 0.4, direction: 'HIGHER_IS_BETTER' };
export function keyPersonRisk(pctSkillsWithBackup: number, t: ThresholdSet = DEFAULT_KEY_PERSON_RISK): RadiatorScore {
  return scoreByThresholds(pctSkillsWithBackup, t);
}

// ───── Aggregation ─────

export type RadiatorBand = 'CRITICAL' | 'RED' | 'AMBER' | 'GREEN';

/**
 * RAG cutoffs on the 0.0-4.0 scale. Tenant-editable via `OrganizationConfig`.
 * A score strictly less than `critical` is CRITICAL, `< red` is RED, `< amber` is AMBER, else GREEN.
 */
export interface RagCutoffs {
  critical: number;
  red: number;
  amber: number;
}

export const DEFAULT_RAG_CUTOFFS: RagCutoffs = { critical: 1.0, red: 2.0, amber: 3.0 };

/** Convert a 0..4 decimal score to its band name using the supplied cutoffs. */
export function scoreToBand(
  score: RadiatorScore | null,
  cutoffs: RagCutoffs = DEFAULT_RAG_CUTOFFS,
): RadiatorBand | null {
  if (score === null || Number.isNaN(score)) return null;
  if (score < cutoffs.critical) return 'CRITICAL';
  if (score < cutoffs.red) return 'RED';
  if (score < cutoffs.amber) return 'AMBER';
  return 'GREEN';
}

/** Convert a 0..100 overall score to its band using the supplied cutoffs. */
export function overallScoreToBand(
  score: number,
  cutoffs: RagCutoffs = DEFAULT_RAG_CUTOFFS,
): RadiatorBand {
  // The 0..100 scale is the 0..4 scale × 25, so multiply the cutoffs accordingly.
  if (score < cutoffs.critical * 25) return 'CRITICAL';
  if (score < cutoffs.red * 25) return 'RED';
  if (score < cutoffs.amber * 25) return 'AMBER';
  return 'GREEN';
}

/** Quadrant score = avg(sub scores) * 6.25 (decimal 0..25). Nulls skipped; all-null returns null. */
export function quadrantScore(subScores: Array<RadiatorScore | null>): number | null {
  const valid = subScores.filter((s): s is RadiatorScore => s !== null);
  if (valid.length === 0) return null;
  const avg = valid.reduce<number>((a, b) => a + b, 0) / valid.length;
  return avg * 6.25;
}

/** Overall = sum of quadrant scores (decimal 0..100). Null quadrants treated as 0. */
export function overallScore(quadrantScores: Array<number | null>): number {
  return quadrantScores.reduce<number>((sum, q) => sum + (q ?? 0), 0);
}

/** All 16 sub-dimension keys in canonical order (scope → schedule → budget → people). */
export const SUB_DIMENSION_KEYS = [
  'requirementsStability',
  'scopeCreep',
  'deliverableAcceptance',
  'changeRequestBurden',
  'milestoneAdherence',
  'timelineDeviation',
  'criticalPathHealth',
  'velocityTrend',
  'costPerformanceIndex',
  'spendRate',
  'forecastAccuracy',
  'capexCompliance',
  'staffingFillRate',
  'teamMood',
  'overAllocationRate',
  'keyPersonRisk',
] as const;
export type SubDimensionKey = (typeof SUB_DIMENSION_KEYS)[number];

/** Which quadrant each sub-dimension belongs to. */
export const SUB_DIMENSION_QUADRANT: Record<SubDimensionKey, 'scope' | 'schedule' | 'budget' | 'people'> = {
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

/** Default thresholds for every sub-dimension, used when no custom config exists. */
export const DEFAULT_THRESHOLDS: Record<SubDimensionKey, ThresholdSet> = {
  requirementsStability: DEFAULT_REQUIREMENTS_STABILITY,
  scopeCreep: DEFAULT_SCOPE_CREEP,
  deliverableAcceptance: DEFAULT_DELIVERABLE_ACCEPTANCE,
  changeRequestBurden: DEFAULT_CHANGE_REQUEST_BURDEN,
  milestoneAdherence: DEFAULT_MILESTONE_ADHERENCE,
  timelineDeviation: DEFAULT_TIMELINE_DEVIATION,
  criticalPathHealth: DEFAULT_CRITICAL_PATH_HEALTH,
  velocityTrend: DEFAULT_VELOCITY_TREND,
  costPerformanceIndex: DEFAULT_CPI,
  spendRate: DEFAULT_SPEND_RATE,
  forecastAccuracy: DEFAULT_FORECAST_ACCURACY,
  capexCompliance: DEFAULT_CAPEX_COMPLIANCE,
  staffingFillRate: DEFAULT_STAFFING_FILL_RATE,
  teamMood: DEFAULT_TEAM_MOOD,
  overAllocationRate: DEFAULT_OVER_ALLOCATION_RATE,
  keyPersonRisk: DEFAULT_KEY_PERSON_RISK,
};
