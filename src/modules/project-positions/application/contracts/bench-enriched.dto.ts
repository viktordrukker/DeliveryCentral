/**
 * FE-#261 — Bench enrichment payload for GET /api/people/bench.
 *
 * One row per person currently on bench (zero active fills). The Bench tab
 * surfaces this directly; the suggested-fills column is fed by the matching
 * engine (issue #267).
 */
export interface BenchEnrichedRowDto {
  personId: string;
  name: string;
  role: string;
  office: string | null;
  grade: string | null;
  isOnBench: boolean;
  /** Days since the person's last RELEASED fill (or since hire if never assigned). */
  daysOnBench: number;
  /** 80 minus scheduled hours over the next 14 calendar days. */
  availabilityHours14d: number;
  /** Suggested next projects (empty in v1; populated when matching engine wires in). */
  suggestedProjectIds: string[];
}
