import { httpGet, httpPost } from './http-client';

export interface PulseEntryDto {
  id: string;
  personId: string;
  weekStart: string;
  mood: number;
  note?: string;
  submittedAt: string;
}

export interface PulseHistoryDto {
  entries: PulseEntryDto[];
  frequency: string;
}

export interface SubmitPulseRequest {
  mood: number;
  note?: string;
}

export async function submitPulse(body: SubmitPulseRequest): Promise<PulseEntryDto> {
  return httpPost<PulseEntryDto, SubmitPulseRequest>('/pulse', body);
}

export async function fetchPulseHistory(weeks = 4): Promise<PulseHistoryDto> {
  return httpGet<PulseHistoryDto>(`/pulse/my?weeks=${weeks}`);
}

export interface PersonThreeSixtyDto {
  personId: string;
  displayName: string;
  moodTrend: Array<{ weekStart: string; mood: number | null }>;
  workloadTrend: Array<{ weekStart: string; allocationPercent: number }>;
  hoursTrend: Array<{ weekStart: string; hours: number }>;
  currentMood: number | null;
  currentAllocation: number;
  alertActive: boolean;
}

export async function fetchPerson360(id: string, weeks = 12): Promise<PersonThreeSixtyDto> {
  return httpGet<PersonThreeSixtyDto>(`/people/${id}/360?weeks=${weeks}`);
}

export interface MoodHeatmapResponse {
  people: Array<{
    id: string;
    displayName: string;
    weeklyMoods: Array<{ weekStart: string; mood: number | null }>;
  }>;
  weeks: string[];
  teamAverages: Array<{ weekStart: string; average: number | null }>;
}

export async function fetchMoodHeatmap(params: {
  from?: string;
  to?: string;
  orgUnitId?: string;
  managerId?: string;
  poolId?: string;
}): Promise<MoodHeatmapResponse> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.orgUnitId) qs.set('orgUnitId', params.orgUnitId);
  if (params.managerId) qs.set('managerId', params.managerId);
  if (params.poolId) qs.set('poolId', params.poolId);

  return httpGet<MoodHeatmapResponse>(`/reports/mood-heatmap?${qs.toString()}`);
}
