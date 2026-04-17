import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectRolePlanService } from './project-role-plan.service';

export interface GenerateRequestsResult {
  createdRequestIds: string[];
  skippedCount: number;
  totalGaps: number;
}

@Injectable()
export class GenerateStaffingRequestsFromPlanService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly rolePlanService: ProjectRolePlanService,
  ) {}

  public async execute(projectId: string, requestedByPersonId: string): Promise<GenerateRequestsResult> {
    const comparison = await this.rolePlanService.getRolePlanVsActual(projectId);
    const rolePlan = await this.rolePlanService.getRolePlan(projectId);

    const createdRequestIds: string[] = [];
    let skippedCount = 0;
    let totalGaps = 0;

    for (const row of comparison.rows) {
      if (row.gap <= 0) continue;
      totalGaps += row.gap;

      const planEntry = rolePlan.find(
        (e) => e.roleName === row.roleName && e.seniorityLevel === row.seniorityLevel,
      );
      if (!planEntry) { skippedCount++; continue; }

      // Check if an open staffing request already exists for this role on this project
      const existingRequest = await this.prisma.staffingRequest.findFirst({
        where: {
          projectId,
          role: row.roleName,
          status: { in: ['DRAFT', 'OPEN', 'IN_REVIEW'] },
        },
      });

      if (existingRequest) {
        skippedCount++;
        continue;
      }

      // Create staffing request for each gap unit
      for (let i = 0; i < row.gap; i++) {
        const request = await this.prisma.staffingRequest.create({
          data: {
            projectId,
            requestedByPersonId,
            role: row.roleName,
            skills: planEntry.requiredSkillIds,
            allocationPercent: planEntry.allocationPercent ?? 100,
            startDate: planEntry.plannedStartDate ? new Date(planEntry.plannedStartDate) : new Date(),
            endDate: planEntry.plannedEndDate ? new Date(planEntry.plannedEndDate) : new Date('2099-12-31'),
            headcountRequired: 1,
            headcountFulfilled: 0,
            priority: 'MEDIUM',
            status: 'OPEN',
            summary: `Auto-generated from role plan: ${row.roleName}${row.seniorityLevel ? ` (${row.seniorityLevel})` : ''}`,
          },
        });
        createdRequestIds.push(request.id);
      }
    }

    return { createdRequestIds, skippedCount, totalGaps };
  }
}
