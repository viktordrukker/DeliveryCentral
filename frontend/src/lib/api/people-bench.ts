import { httpGet } from './http-client';

/** Issue 261 — enriched bench listing. */
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

export async function fetchEnrichedBench(): Promise<BenchEnrichedRowDto[]> {
  return httpGet<BenchEnrichedRowDto[]>('/people/bench');
}
