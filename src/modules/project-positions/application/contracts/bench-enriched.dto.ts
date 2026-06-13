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
  /** Days since the person's last RELEASED fill, or since hire when none exists. */
  daysOnBench: number;
  /**
   * PR-16 (Decision E) — provenance of {@link daysOnBench}. `fill-history` when
   * a RELEASED fill anchors the count; `no-fill-history` when the person has
   * never held a fill and the count is time-since-hire. The UI must label the
   * fallback explicitly rather than presenting it as a genuine bench duration.
   */
  daysOnBenchBasis: 'fill-history' | 'no-fill-history';
  /** Free hours over the next 14 days: 80 h capacity minus Σ active allocation. */
  availabilityHours14d: number;
  /**
   * Top-N suggested project IDs for this bench person, computed by
   * SuggestFillsService.suggestForPerson at request time (W2-06). Empty
   * when no OPEN positions match (or when no project-positions exist).
   */
  suggestedProjectIds: string[];
}
