import { httpGet, httpPut } from './http-client';

export type PulseReportTier = 'A' | 'B';
export type PulseRagRating = 'GREEN' | 'AMBER' | 'RED' | 'CRITICAL';
export type PulseQuadrantKey = 'scope' | 'schedule' | 'budget' | 'people';

export interface PulseDimensionEntry {
  tier: PulseReportTier;
  rag: PulseRagRating | null;
  narrative: string | null;
}

export interface PulseDetailedEntry {
  narrative: string | null;
}

export interface PulseReportDimensions {
  scope: PulseDimensionEntry;
  schedule: PulseDimensionEntry;
  budget: PulseDimensionEntry;
  people: PulseDimensionEntry;
  detailed?: Record<string, PulseDetailedEntry>;
}

export interface PulseReportDto {
  id: string | null;
  projectId: string;
  weekStarting: string;
  dimensions: PulseReportDimensions;
  overallNarrative: string | null;
  submittedByPersonId: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
}

export interface UpsertPulseReportDto {
  weekStarting?: string;
  dimensions: Partial<Omit<PulseReportDimensions, 'detailed'>> & {
    detailed?: Record<string, PulseDetailedEntry>;
  };
  overallNarrative?: string | null;
  submit?: boolean;
}

export async function fetchPulseReport(projectId: string): Promise<PulseReportDto> {
  return httpGet<PulseReportDto>(`/projects/${projectId}/pulse-report`);
}

export async function upsertPulseReport(
  projectId: string,
  payload: UpsertPulseReportDto,
): Promise<PulseReportDto> {
  return httpPut<PulseReportDto, UpsertPulseReportDto>(`/projects/${projectId}/pulse-report`, payload);
}
