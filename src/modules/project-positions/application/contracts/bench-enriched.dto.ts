/**
 * FE-#261 — Bench enrichment payload for GET /api/people/bench.
 *
 * One row per person currently on bench (zero active fills). The Bench tab
 * surfaces this directly; the suggested-fills column is fed by the matching
 * engine (issue #267).
 */
export interface BenchEnrichedRowDto {
  personId: string;
  /**
   * W1-09 (issue 564) — opaque tenant-scoped identifier (`usr_…`). Prefer this
   * for URL routing so the raw UUID does not leak into the browser. Null for
   * legacy rows that have not yet been backfilled.
   */
  personPublicId: string | null;
  name: string;
  role: string;
  office: string | null;
  grade: string | null;
  isOnBench: boolean;
  /** Days since the person's last RELEASED fill (or since hire if never assigned). */
  daysOnBench: number;
  /** 80 minus scheduled hours over the next 14 calendar days. */
  availabilityHours14d: number;
  /**
   * Top-N suggested project IDs for this bench person, computed by
   * SuggestFillsService.suggestForPerson at request time (W2-06). Empty
   * when no OPEN positions match (or when no project-positions exist).
   */
  suggestedProjectIds: string[];
}
