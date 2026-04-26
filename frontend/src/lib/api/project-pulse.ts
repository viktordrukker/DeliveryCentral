import { httpGet } from './http-client';

export interface PulseSignalKpi {
  key: string;
  label: string;
  value: number | null;
  unit: string | null;
  explanation: string;
}

export interface PulseActivityItem {
  id: string;
  occurredAt: string;
  eventName: string;
  aggregateType: string;
  aggregateId: string;
  actorDisplayName: string | null;
  summary: string;
}

export interface PulseSummaryDto {
  projectId: string;
  asOf: string;
  signals: PulseSignalKpi[];
  activity: PulseActivityItem[];
}

export async function fetchProjectPulseSummary(projectId: string): Promise<PulseSummaryDto> {
  return httpGet<PulseSummaryDto>(`/projects/${projectId}/pulse-summary`);
}
