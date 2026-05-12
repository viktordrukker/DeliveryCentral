import { httpGet } from './http-client';

export interface DirectorSlaSummary {
  slaBreaches24h: number;
  timeToFillSeries: number[];
  timeToFillMedianDays: number | null;
  timeToFillSampleSize: number;
}

export async function fetchDirectorSlaSummary(): Promise<DirectorSlaSummary> {
  return httpGet<DirectorSlaSummary>(`/dashboard/exec/sla-summary`);
}
