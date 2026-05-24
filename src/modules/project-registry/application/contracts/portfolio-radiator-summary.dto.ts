/**
 * FE-#317 — compact portfolio radiator summary for Director Home embedding.
 */
export interface PortfolioRadiatorSummaryRiskProjectDto {
  projectId: string;
  projectName: string;
  projectCode: string;
  overallBand: 'GREEN' | 'AMBER' | 'RED' | 'CRITICAL';
  overallScore: number;
}

export interface PortfolioRadiatorSummaryDto {
  projectCount: number;
  byRag: { green: number; amber: number; red: number; critical: number };
  topRiskProjects: PortfolioRadiatorSummaryRiskProjectDto[];
}
