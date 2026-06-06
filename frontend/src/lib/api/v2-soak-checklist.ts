import { httpGet, httpPut } from './http-client';

export type SoakCellObservation = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN';

export interface SoakChecklistCell {
  journeyId: string;
  role: string;
  observation: SoakCellObservation;
  note?: string;
  observedAt: string;
}

export interface SoakChecklistState {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  cells: SoakChecklistCell[];
}

export interface SoakChecklistSummary {
  totalGated: number;
  pass: number;
  fail: number;
  blocked: number;
  notRun: number;
  regressions: number;
  cutoverReady: boolean;
}

export interface SoakChecklistResponse {
  state: SoakChecklistState;
  summary?: SoakChecklistSummary;
}

export async function fetchSoakChecklist(sessionId: string): Promise<SoakChecklistResponse> {
  return httpGet<SoakChecklistResponse>(`/admin/v2-soak/checklist/${encodeURIComponent(sessionId)}`);
}

export async function saveSoakChecklist(
  sessionId: string,
  cells: SoakChecklistCell[],
  expected?: Record<string, Record<string, string>>,
): Promise<SoakChecklistResponse> {
  return httpPut<SoakChecklistResponse, { cells: SoakChecklistCell[]; expected?: Record<string, Record<string, string>> }>(
    `/admin/v2-soak/checklist/${encodeURIComponent(sessionId)}`,
    { cells, expected },
  );
}
