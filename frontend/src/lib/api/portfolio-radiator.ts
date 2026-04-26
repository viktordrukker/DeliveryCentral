import { httpGet } from './http-client';
import type { RadiatorBand } from './project-radiator';

export interface PortfolioRadiatorEntry {
  projectId: string;
  projectName: string;
  projectCode: string;
  overallScore: number;
  overallBand: RadiatorBand;
  quadrantScores: {
    scope: number | null;
    schedule: number | null;
    budget: number | null;
    people: number | null;
  };
}

export async function fetchPortfolioRadiator(): Promise<PortfolioRadiatorEntry[]> {
  return httpGet<PortfolioRadiatorEntry[]>('/portfolio/radiator');
}
