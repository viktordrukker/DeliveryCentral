import { Injectable } from '@nestjs/common';

import { PortfolioRadiatorService } from './portfolio-radiator.service';
import {
  PortfolioRadiatorSummaryDto,
  PortfolioRadiatorSummaryRiskProjectDto,
} from './contracts/portfolio-radiator-summary.dto';

/**
 * FE-#317 — distill the full PortfolioRadiatorEntry[] into a RAG
 * distribution + top-N risk projects for Director Home embedding.
 * The full surface stays at GET /api/portfolio/radiator.
 */
@Injectable()
export class PortfolioRadiatorSummaryService {
  public constructor(private readonly portfolio: PortfolioRadiatorService) {}

  public async getSummary(args?: { topN?: number }): Promise<PortfolioRadiatorSummaryDto> {
    const topN = Math.min(10, Math.max(1, args?.topN ?? 3));
    const entries = await this.portfolio.getPortfolio();

    const byRag = { green: 0, amber: 0, red: 0, critical: 0 };
    for (const e of entries) {
      if (e.overallBand === 'GREEN') byRag.green += 1;
      else if (e.overallBand === 'AMBER') byRag.amber += 1;
      else if (e.overallBand === 'RED') byRag.red += 1;
      else if (e.overallBand === 'CRITICAL') byRag.critical += 1;
    }

    const topRiskProjects: PortfolioRadiatorSummaryRiskProjectDto[] = [...entries]
      .sort((a, b) => a.overallScore - b.overallScore)
      .slice(0, topN)
      .map((e) => ({
        projectId: e.projectId,
        projectName: e.projectName,
        projectCode: e.projectCode,
        overallBand: e.overallBand,
        overallScore: e.overallScore,
      }));

    return { projectCount: entries.length, byRag, topRiskProjects };
  }
}
