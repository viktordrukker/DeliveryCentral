import { httpGet } from './http-client';

/** Issue 261 — enriched bench listing. */
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
   * PR-16 (Decision E) — provenance of {@link daysOnBench}. `no-fill-history`
   * means the person has never held a fill and the count is time-since-hire;
   * the UI labels this explicitly rather than presenting it as a real tenure.
   */
  daysOnBenchBasis: 'fill-history' | 'no-fill-history';
  /** Free hours over the next 14 days: 80 h capacity minus Σ active allocation. */
  availabilityHours14d: number;
  /**
   * Top-N suggested project IDs for this bench person, computed server-side
   * by SuggestFillsService.suggestForPerson (W2-06). Drives the "N matches"
   * badge and the bench KPI strip total.
   */
  suggestedProjectIds: string[];
}

export async function fetchEnrichedBench(): Promise<BenchEnrichedRowDto[]> {
  return httpGet<BenchEnrichedRowDto[]>('/people/bench');
}
