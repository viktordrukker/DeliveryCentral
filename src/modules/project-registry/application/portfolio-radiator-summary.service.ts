import { Injectable } from '@nestjs/common';

import { PortfolioRadiatorService } from './portfolio-radiator.service';
import {
  PortfolioRadiatorSummaryDto,
  PortfolioRadiatorSummaryRiskProjectDto,
} from './contracts/portfolio-radiator-summary.dto';

/**
 * FE-#317 — compact portfolio radiator summary for Director Home.
 *
 * Distills the full PortfolioRadiatorEntry[] (from PortfolioRadiatorService)
 * into a RAG distribution + top-N risk projects. The full surface stays
 * at `GET /api/dashboards/portfolio-radiator`; this is what the Director
 * Home "Portfolio health" card embeds when the dedicated page is hidden
 * from the v2 sidebar.
 */
@Injectable()
export class PortfolioRadiatorSummaryService {
  public constructor(private readonly portfolio: PortfolioRadiatorService) {}

  public async getSummary(args?: { topN?: number }): Promise<PortfolioRadiatorSummaryDto> {
    const topN = Math.min(10, Math.max(1, args?.topN ?? 3));
    const entries = await this.portfolio.getPortfolio();

    const byRag = { green: 0, amber: 0, red: 0, critical: 0 };
    for (const e of entries) {
      switch (e.overallBand) {
        case 'GREEN':
          byRag.green += 1;
          break;
        case 'AMBER':
          byRag.amber += 1;
          break;
        case 'RED':
          byRag.red += 1;
          break;
        case 'CRITICAL':
          byRag.critical += 1;
          break;
      }
    }

    // Top risk = lowest overallScore first (worst).
    const ranked = [...entries].sort((a, b) => a.overallScore - b.overallScore);
    const topRiskProjects: PortfolioRadiatorSummaryRiskProjectDto[] = ranked
      .slice(0, topN)
      .map((e) => ({
        projectId: e.projectId,
        projectName: e.projectName,
        projectCode: e.projectCode,
        overallBand: e.overallBand,
        overallScore: e.overallScore,
      }));

    return {
      projectCount: entries.length,
      byRag,
      topRiskProjects,
    };
  }
}
