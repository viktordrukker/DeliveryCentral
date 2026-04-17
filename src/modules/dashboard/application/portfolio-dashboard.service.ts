import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { ProjectRolePlanService } from '@src/modules/project-registry/application/project-role-plan.service';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface PortfolioHeatmapRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  engagementModel: string | null;
  priority: string | null;
  clientName: string | null;
  startsOn: string | null;
  endsOn: string | null;
  staffCount: number;
  plannedCount: number;
  currentFillRate: number;
  currentRag: 'GREEN' | 'AMBER' | 'RED';
  weekColumns: Array<{
    weekStart: string;
    projectedFillRate: number;
    staffedCount: number;
    rag: 'GREEN' | 'AMBER' | 'RED';
  }>;
}

export interface PortfolioHeatmapResponse {
  rows: PortfolioHeatmapRow[];
  weekHeaders: string[];
  summary: {
    totalProjects: number;
    greenCount: number;
    amberCount: number;
    redCount: number;
    totalPlannedHC: number;
    totalFilledHC: number;
    overallFillRate: number;
  };
}

export interface PortfolioSummaryResponse {
  totalProjects: number;
  byRag: { green: number; amber: number; red: number };
  totalInternalHC: number;
  totalVendorHC: number;
  totalOpenGaps: number;
  overallFillRate: number;
  benchSize: number;
}

export interface AvailablePoolPerson {
  id: string;
  displayName: string;
  currentAllocation: number;
  availableFrom: string | null;
  skills: string[];
  location: string | null;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PortfolioDashboardService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly rolePlanService: ProjectRolePlanService,
  ) {}

  public async getPortfolioHeatmap(weeksAhead = 8): Promise<PortfolioHeatmapResponse> {
    const activeProjects = await this.prisma.project.findMany({
      where: { status: { in: ['ACTIVE', 'ON_HOLD'] }, deletedAt: null },
      include: { client: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const weekHeaders: string[] = [];
    for (let i = 0; i < weeksAhead; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() + i * 7 - weekStart.getDay() + 1); // Monday
      weekHeaders.push(weekStart.toISOString().slice(0, 10));
    }

    const rows: PortfolioHeatmapRow[] = [];
    let greenCount = 0, amberCount = 0, redCount = 0;
    let totalPlannedHC = 0, totalFilledHC = 0;

    for (const project of activeProjects) {
      // Ensure role plan is auto-initialized from assignments before comparing
      await this.rolePlanService.getRolePlan(project.id);
      const comparison = await this.rolePlanService.getRolePlanVsActual(project.id);
      const isFixedPrice = project.engagementModel === 'FIXED_PRICE';
      const currentFillRate = comparison.overallFillRate;
      const currentRag = this.fillRateToRag(currentFillRate, isFixedPrice);

      totalPlannedHC += comparison.totalPlanned;
      totalFilledHC += comparison.totalFilled;

      // Project future weeks — check for assignments ending
      const assignments = await this.prisma.projectAssignment.findMany({
        where: { projectId: project.id, status: { in: ['ACTIVE', 'APPROVED'] } },
        select: { validTo: true },
      });

      const weekColumns = weekHeaders.map((weekStart) => {
        const weekDate = new Date(weekStart);
        // Count how many assignments will have ended by this week
        const endingBefore = assignments.filter(
          (a) => a.validTo && a.validTo < weekDate,
        ).length;
        const projected = Math.max(0, comparison.totalFilled - endingBefore);
        const projectedRate = comparison.totalPlanned > 0
          ? Math.round((projected / comparison.totalPlanned) * 100)
          : 100;

        return {
          weekStart,
          projectedFillRate: projectedRate,
          staffedCount: projected,
          rag: this.fillRateToRag(projectedRate, isFixedPrice),
        };
      });

      if (currentRag === 'GREEN') greenCount++;
      else if (currentRag === 'AMBER') amberCount++;
      else redCount++;

      rows.push({
        projectId: project.id,
        projectName: project.name,
        projectCode: project.projectCode,
        engagementModel: project.engagementModel,
        priority: project.priority,
        clientName: project.client?.name ?? null,
        startsOn: project.startsOn?.toISOString().slice(0, 10) ?? null,
        endsOn: project.endsOn?.toISOString().slice(0, 10) ?? null,
        staffCount: comparison.totalFilled,
        plannedCount: comparison.totalPlanned,
        currentFillRate,
        currentRag,
        weekColumns,
      });
    }

    // Sort: RED first, then AMBER, then GREEN
    const ragOrder = { RED: 0, AMBER: 1, GREEN: 2 };
    rows.sort((a, b) => ragOrder[a.currentRag] - ragOrder[b.currentRag]);

    return {
      rows,
      weekHeaders,
      summary: {
        totalProjects: activeProjects.length,
        greenCount,
        amberCount,
        redCount,
        totalPlannedHC,
        totalFilledHC,
        overallFillRate: totalPlannedHC > 0 ? Math.round((totalFilledHC / totalPlannedHC) * 100) : 100,
      },
    };
  }

  public async getPortfolioSummary(): Promise<PortfolioSummaryResponse> {
    const heatmap = await this.getPortfolioHeatmap(1);

    const totalVendorHC = await this.prisma.projectVendorEngagement.aggregate({
      _sum: { headcount: true },
      where: { status: 'ACTIVE' },
    });

    const benchSize = await this.getAvailablePoolCount();

    return {
      totalProjects: heatmap.summary.totalProjects,
      byRag: { green: heatmap.summary.greenCount, amber: heatmap.summary.amberCount, red: heatmap.summary.redCount },
      totalInternalHC: heatmap.summary.totalFilledHC - (totalVendorHC._sum?.headcount ?? 0),
      totalVendorHC: totalVendorHC._sum?.headcount ?? 0,
      totalOpenGaps: heatmap.summary.totalPlannedHC - heatmap.summary.totalFilledHC,
      overallFillRate: heatmap.summary.overallFillRate,
      benchSize,
    };
  }

  public async getAvailablePool(): Promise<AvailablePoolPerson[]> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find people who are either unassigned or have assignments ending within 30 days
    const allPeople = await this.prisma.person.findMany({
      where: { employmentStatus: 'ACTIVE', deletedAt: null },
      select: { id: true, displayName: true, skillsets: true, location: true },
    });

    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: { status: { in: ['ACTIVE', 'APPROVED'] } },
      select: { personId: true, allocationPercent: true, validTo: true },
    });

    // Calculate current allocation per person
    const allocationByPerson = new Map<string, { total: number; earliestEnd: Date | null }>();
    for (const a of activeAssignments) {
      const existing = allocationByPerson.get(a.personId) ?? { total: 0, earliestEnd: null };
      existing.total += Number(a.allocationPercent ?? 0);
      if (a.validTo && (!existing.earliestEnd || a.validTo < existing.earliestEnd)) {
        existing.earliestEnd = a.validTo;
      }
      allocationByPerson.set(a.personId, existing);
    }

    return allPeople
      .filter((person) => {
        const alloc = allocationByPerson.get(person.id);
        if (!alloc) return true; // No assignments = available
        if (alloc.total < 100) return true; // Partial allocation = has headroom
        if (alloc.earliestEnd && alloc.earliestEnd <= thirtyDaysFromNow) return true; // Ending soon
        return false;
      })
      .map((person) => {
        const alloc = allocationByPerson.get(person.id);
        return {
          id: person.id,
          displayName: person.displayName,
          currentAllocation: alloc?.total ?? 0,
          availableFrom: alloc?.earliestEnd?.toISOString().slice(0, 10) ?? null,
          skills: person.skillsets,
          location: person.location,
        };
      })
      .sort((a, b) => a.currentAllocation - b.currentAllocation);
  }

  private async getAvailablePoolCount(): Promise<number> {
    const pool = await this.getAvailablePool();
    return pool.length;
  }

  private fillRateToRag(fillRate: number, isFixedPrice: boolean): 'GREEN' | 'AMBER' | 'RED' {
    const greenThreshold = isFixedPrice ? 90 : 80;
    const amberThreshold = isFixedPrice ? 70 : 50;
    if (fillRate >= greenThreshold) return 'GREEN';
    if (fillRate >= amberThreshold) return 'AMBER';
    return 'RED';
  }
}
