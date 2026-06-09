import { Injectable } from '@nestjs/common';
import { ProjectPositionFillStatus as PrismaProjectPositionFillStatus } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectBudgetStatus, ProjectDirectoryItemDto } from './contracts/project-directory.dto';
import { ProjectExternalLinkRepositoryPort } from '../domain/repositories/project-external-link-repository.port';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';

interface ProjectDirectoryQuery {
  source?: string;
  page?: string | number;
  pageSize?: string | number;
}

interface ProjectFinanceFields {
  cpi: number | null;
  budgetStatus: ProjectBudgetStatus;
  openPositionsCount: number;
  assignmentCount: number;
}

// Position fill statuses that count as a "filled assignment" for the directory
// `assignmentCount` field. DRAFT/OPEN/RELEASED are intentionally excluded.
const ASSIGNMENT_FILL_STATUSES: PrismaProjectPositionFillStatus[] = [
  'PROPOSED',
  'BOOKED',
  'ONBOARDING',
  'ASSIGNED',
  'ON_HOLD',
];

@Injectable()
export class ProjectDirectoryQueryService {
  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly projectExternalLinkRepository: ProjectExternalLinkRepositoryPort,
    // Optional so in-memory unit tests that construct the service with
    // repository fakes still compile and run. Prisma is only required to
    // populate the W2-07 finance fields (cpi / budgetStatus /
    // openPositionsCount); without it those fields fall back to their UNSET
    // defaults.
    private readonly prisma?: PrismaService,
  ) {}

  public async execute(
    query: ProjectDirectoryQuery,
  ): Promise<{ items: ProjectDirectoryItemDto[]; totalCount: number }> {
    const source = query.source?.trim().toUpperCase();
    const [projects, externalLinks] = await Promise.all([
      this.projectRepository.findAll(),
      this.projectExternalLinkRepository.findAll(),
    ]);
    const externalLinksByProjectId = externalLinks.reduce<Map<string, typeof externalLinks>>(
      (grouped, link) => {
        const existing = grouped.get(link.projectId.value) ?? [];
        existing.push(link);
        grouped.set(link.projectId.value, existing);
        return grouped;
      },
      new Map(),
    );

    const projectIds = projects.map((project) => project.id);
    const financeFieldsByProjectId = await this.loadFinanceFields(projectIds);

    const items: ProjectDirectoryItemDto[] = [];
    for (const project of projects) {
      const projectLinks = externalLinksByProjectId.get(project.projectId.value) ?? [];

      if (
        source &&
        !projectLinks.some((link) => link.systemType.value.toUpperCase() === source)
      ) {
        continue;
      }

      const externalLinksSummary = Array.from(
        projectLinks.reduce((map, link) => {
          const key = link.systemType.value.toUpperCase();
          map.set(key, (map.get(key) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
      ).map(([provider, count]) => ({ count, provider }));

      const finance = financeFieldsByProjectId.get(project.id) ?? {
        cpi: null,
        budgetStatus: 'UNSET' as ProjectBudgetStatus,
        openPositionsCount: 0,
        assignmentCount: 0,
      };

      items.push({
        assignmentCount: finance.assignmentCount,
        budgetStatus: finance.budgetStatus,
        clientName: (project as any).clientName ?? null,
        cpi: finance.cpi,
        engagementModel: project.engagementModel ?? null,
        externalLinksCount: projectLinks.length,
        externalLinksSummary,
        id: project.id,
        name: project.name,
        openPositionsCount: finance.openPositionsCount,
        priority: project.priority ?? null,
        projectCode: project.projectCode,
        status: project.status,
        version: project.version,
      });
    }

    // FE-04: pagination is opt-in. Callers that don't pass page/pageSize get the
    // full result set + a totalCount, preserving the legacy contract while letting
    // newer callers slice the response.
    const totalCount = items.length;
    const pageNum = query.page !== undefined ? Number(query.page) : NaN;
    const pageSizeNum = query.pageSize !== undefined ? Number(query.pageSize) : NaN;
    if (Number.isFinite(pageNum) && Number.isFinite(pageSizeNum) && pageNum >= 1 && pageSizeNum >= 1) {
      const start = (pageNum - 1) * pageSizeNum;
      return { items: items.slice(start, start + pageSizeNum), totalCount };
    }
    return { items, totalCount };
  }

  /**
   * W2-07 — batched lookup of the per-project finance fields.
   *
   * - `cpi` = earnedValue / actualCost from the latest-fiscal-year
   *   `ProjectBudget`; `null` when no budget, no EV recorded, or AC ≤ 0.
   * - `budgetStatus` derived from BAC (capex + opex) vs EAC: GREEN ≤ 85 %,
   *   YELLOW ≤ 100 %, RED otherwise. UNSET when no budget exists.
   * - `openPositionsCount` = `groupBy` on `ProjectPosition` filtered to
   *   `fillStatus = OPEN`.
   *
   * No N+1: one `findMany` on `ProjectBudget` + one `groupBy` on
   * `ProjectPosition`.
   */
  private async loadFinanceFields(
    projectIds: readonly string[],
  ): Promise<Map<string, ProjectFinanceFields>> {
    const result = new Map<string, ProjectFinanceFields>();
    if (!this.prisma || projectIds.length === 0) {
      return result;
    }

    const [budgets, openCounts, assignmentCounts] = await Promise.all([
      this.prisma.projectBudget.findMany({
        where: { projectId: { in: projectIds as string[] } },
        select: {
          projectId: true,
          fiscalYear: true,
          capexBudget: true,
          opexBudget: true,
          earnedValue: true,
          actualCost: true,
          eac: true,
        },
        orderBy: [{ projectId: 'asc' }, { fiscalYear: 'desc' }],
      }),
      this.prisma.projectPosition.groupBy({
        by: ['projectId'],
        where: { projectId: { in: projectIds as string[] }, fillStatus: 'OPEN' },
        _count: { _all: true },
      }),
      // SoT PR 16a/1 — assignmentCount is now sourced from non-OPEN, non-DRAFT,
      // non-RELEASED positions (i.e. positions that represent a real fill).
      this.prisma.projectPosition.groupBy({
        by: ['projectId'],
        where: {
          projectId: { in: projectIds as string[] },
          fillStatus: { in: ASSIGNMENT_FILL_STATUSES },
        },
        _count: { _all: true },
      }),
    ]);

    // Pick the latest fiscal-year budget per project (orderBy above puts the
    // newest first within each projectId).
    const latestBudgetByProjectId = new Map<string, typeof budgets[number]>();
    for (const row of budgets) {
      if (!latestBudgetByProjectId.has(row.projectId)) {
        latestBudgetByProjectId.set(row.projectId, row);
      }
    }

    const openByProjectId = new Map<string, number>();
    for (const row of openCounts) {
      openByProjectId.set(row.projectId, row._count._all);
    }

    const assignmentCountByProjectId = new Map<string, number>();
    for (const row of assignmentCounts) {
      assignmentCountByProjectId.set(row.projectId, row._count._all);
    }

    for (const projectId of projectIds) {
      const budget = latestBudgetByProjectId.get(projectId);
      let cpi: number | null = null;
      let budgetStatus: ProjectBudgetStatus = 'UNSET';

      if (budget) {
        const ev = budget.earnedValue === null ? null : Number(budget.earnedValue);
        const ac = budget.actualCost === null ? null : Number(budget.actualCost);
        if (ev !== null && ac !== null && ac > 0) {
          cpi = ev / ac;
        }

        const bac = Number(budget.capexBudget) + Number(budget.opexBudget);
        const eac = budget.eac === null ? null : Number(budget.eac);
        if (bac > 0) {
          const projected = eac ?? ac ?? 0;
          if (projected > bac) {
            budgetStatus = 'RED';
          } else if (projected > bac * 0.85) {
            budgetStatus = 'YELLOW';
          } else {
            budgetStatus = 'GREEN';
          }
        }
      }

      result.set(projectId, {
        budgetStatus,
        cpi,
        openPositionsCount: openByProjectId.get(projectId) ?? 0,
        assignmentCount: assignmentCountByProjectId.get(projectId) ?? 0,
      });
    }

    return result;
  }
}
