import { Injectable } from '@nestjs/common';

import { getCached, setCache } from '@src/shared/cache/simple-cache';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PortfolioRadiatorEntry } from './contracts/radiator.dto';
import { RadiatorScoringService } from './radiator-scoring.service';

const PORTFOLIO_CACHE_KEY = 'radiator:portfolio';
const PORTFOLIO_TTL_MS = 60_000;

@Injectable()
export class PortfolioRadiatorService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: RadiatorScoringService,
  ) {}

  public async getPortfolio(): Promise<PortfolioRadiatorEntry[]> {
    const cached = getCached<PortfolioRadiatorEntry[]>(PORTFOLIO_CACHE_KEY);
    if (cached) return cached;

    const projects = await this.prisma.project.findMany({
      where: { status: { in: ['ACTIVE', 'ON_HOLD'] }, deletedAt: null },
      select: { id: true, name: true, projectCode: true },
    });

    const results = await Promise.all(
      projects.map(async (p) => {
        const snap = await this.scoringService.computeRadiator(p.id);
        return {
          projectId: p.id,
          projectName: p.name,
          projectCode: p.projectCode,
          overallScore: snap.overallScore,
          overallBand: snap.overallBand,
          quadrantScores: {
            scope: snap.quadrants[0].score,
            schedule: snap.quadrants[1].score,
            budget: snap.quadrants[2].score,
            people: snap.quadrants[3].score,
          },
        };
      }),
    );

    setCache(PORTFOLIO_CACHE_KEY, results, PORTFOLIO_TTL_MS);
    return results;
  }
}
