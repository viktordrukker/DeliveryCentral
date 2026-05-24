/**
 * FE-#317 — compact portfolio radiator summary for Director Home embedding.
 *
 * Distilled from the full PortfolioRadiatorEntry[] to just what the
 * Director Home "Portfolio health" card needs: a RAG distribution + top
 * risk projects. The full radiator surface stays available at
 * `GET /api/dashboards/portfolio-radiator` for the dedicated page.
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
  byRag: {
    green: number;
    amber: number;
    red: number;
    critical: number;
  };
  topRiskProjects: PortfolioRadiatorSummaryRiskProjectDto[];
}
