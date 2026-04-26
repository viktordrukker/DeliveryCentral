import { httpGet, httpPost } from './http-client';

export type RadiatorBand = 'CRITICAL' | 'RED' | 'AMBER' | 'GREEN';
export type RadiatorQuadrantKey = 'scope' | 'schedule' | 'budget' | 'people';

export interface SubDimensionScore {
  key: string;
  autoScore: number | null;
  overrideScore: number | null;
  effectiveScore: number | null;
  reason: string | null;
  overriddenBy: string | null;
  overriddenAt: string | null;
  explanation: string;
}

export interface QuadrantScore {
  key: RadiatorQuadrantKey;
  score: number | null;
  band: RadiatorBand | null;
  subs: SubDimensionScore[];
}

export interface RadiatorSnapshotDto {
  snapshotId: string | null;
  projectId: string;
  weekStarting: string;
  overallScore: number;
  overallBand: RadiatorBand;
  quadrants: QuadrantScore[];
  narrative: string | null;
  accomplishments: string | null;
  nextSteps: string | null;
  riskSummary: string | null;
  recordedByPersonId: string | null;
  createdAt: string | null;
}

export interface RadiatorHistoryEntry {
  weekStarting: string;
  overallScore: number;
  overallBand: RadiatorBand;
}

export interface RadiatorOverrideRequest {
  subDimensionKey: string;
  overrideScore: number;
  reason: string;
}

export async function fetchRadiator(projectId: string): Promise<RadiatorSnapshotDto> {
  return httpGet<RadiatorSnapshotDto>(`/projects/${projectId}/radiator`);
}

export async function fetchRadiatorHistory(projectId: string, weeks = 12): Promise<RadiatorHistoryEntry[]> {
  return httpGet<RadiatorHistoryEntry[]>(`/projects/${projectId}/radiator/history?weeks=${weeks}`);
}

export async function fetchRadiatorSnapshotByWeek(projectId: string, weekStarting: string): Promise<RadiatorSnapshotDto | null> {
  return httpGet<RadiatorSnapshotDto | null>(`/projects/${projectId}/radiator/snapshot/${weekStarting}`);
}

export async function applyRadiatorOverride(projectId: string, data: RadiatorOverrideRequest): Promise<RadiatorSnapshotDto> {
  return httpPost<RadiatorSnapshotDto, RadiatorOverrideRequest>(`/projects/${projectId}/radiator/override`, data);
}

export async function refreshRadiator(projectId: string): Promise<RadiatorSnapshotDto> {
  return httpPost<RadiatorSnapshotDto, Record<string, never>>(`/projects/${projectId}/radiator/refresh`, {});
}
