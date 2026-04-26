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
