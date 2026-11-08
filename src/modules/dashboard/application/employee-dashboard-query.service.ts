import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { TimesheetsService } from '@src/modules/timesheets/application/timesheets.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { EmployeeDashboardResponseDto } from './contracts/employee-dashboard.dto';
import { PositionDirectoryItemDto } from './contracts/position-directory-item.dto';

interface EmployeeDashboardQuery {
  asOf?: string;
  personId: string;
}

// SoT PR 14b — employee dashboard sources the person's assignments-as-DTO
// list from the canonical `ProjectPosition` aggregate (no longer through
// the legacy `ListAssignmentsService` → `prisma.projectAssignment` path).
// The shape produced (`PositionDirectoryItemDto`) is byte-for-byte
// compatible with the FE consumer's expectations.
@Injectable()
export class EmployeeDashboardQueryService {
  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly timesheetsService: TimesheetsService,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: EmployeeDashboardQuery): Promise<EmployeeDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Employee dashboard asOf is invalid.');
    }

    const person = await this.personDirectoryQueryService.getPersonById(query.personId, asOf);
    if (!person) {
      throw new NotFoundException('Employee dashboard person was not found.');
    }

    const positionRows = await this.prisma.projectPosition.findMany({
      where: { activePersonId: query.personId },
      select: {
        id: true,
        projectId: true,
        role: true,
        fillStatus: true,
        activeAllocationPercent: true,
        requiredAllocationPercent: true,
        activeValidFrom: true,
        activeValidTo: true,
        startDate: true,
        endDate: true,
        version: true,
        slaStage: true,
        slaDueAt: true,
        slaBreachedAt: true,
        requiresDirectorApproval: true,
        project: { select: { name: true } },
      },
    });

    const items: PositionDirectoryItemDto[] = positionRows.map((row) => {
      const allocation = row.activeAllocationPercent ?? row.requiredAllocationPercent;
      const allocationNumber = Number(typeof allocation === 'number' ? allocation : (allocation as { toNumber(): number }).toNumber());
      const start = row.activeValidFrom ?? row.startDate;
      const end = row.activeValidTo ?? null;
      return {
        id: row.id,
        person: {
          id: query.personId,
          displayName: person.displayName,
        },
        project: {
          id: row.projectId,
          displayName: row.project.name,
        },
        staffingRole: row.role,
        allocationPercent: allocationNumber,
        startDate: start.toISOString(),
        endDate: end ? end.toISOString() : null,
        approvalState: row.fillStatus,
        version: row.version,
        slaStage: row.slaStage ?? null,
        slaDueAt: row.slaDueAt ? row.slaDueAt.toISOString() : null,
        slaBreachedAt: row.slaBreachedAt ? row.slaBreachedAt.toISOString() : null,
        requiresDirectorApproval: row.requiresDirectorApproval,
      };
    });

    const currentAssignments = items
      .filter((item) => this.isCurrentAssignment(item, asOf))
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
    const futureAssignments = items
      .filter((item) => this.isFutureAssignment(item, asOf))
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
    // Lean fillStatus has no direct `REQUESTED` equivalent — PROPOSED/DRAFT
    // are the lean states for "demand outstanding before booking".
    const pendingWorkflowAssignments = items
      .filter((item) => item.approvalState === 'PROPOSED' || item.approvalState === 'DRAFT')
      .sort((left, right) => left.startDate.localeCompare(right.startDate));

    // Fetch rejected timesheets from the last 90 days — employee needs to resubmit these
    const timesheetWindowStart = new Date(asOf);
    timesheetWindowStart.setUTCDate(timesheetWindowStart.getUTCDate() - 90);
    let rejectedTimesheets: Array<{ weekStart: string; id: string }> = [];
    try {
      const tsHistory = await this.timesheetsService.getMyHistory(
        query.personId,
        timesheetWindowStart.toISOString().slice(0, 10),
        asOf.toISOString().slice(0, 10),
      );
      rejectedTimesheets = tsHistory
        .filter((w) => w.status === 'REJECTED')
        .map((w) => ({ weekStart: w.weekStart, id: w.id }));
    } catch {
      // Non-critical — silently skip
    }

    const totalAllocationPercent = currentAssignments.reduce(
      (sum, item) => sum + item.allocationPercent,
      0,
    );

    return {
      asOf: asOf.toISOString(),
      currentAssignments,
      currentWorkloadSummary: {
        activeAssignmentCount: currentAssignments.length,
        futureAssignmentCount: futureAssignments.length,
        isOverallocated: totalAllocationPercent > 100,
        pendingSelfWorkflowItemCount: pendingWorkflowAssignments.length + rejectedTimesheets.length,
        totalAllocationPercent,
      },
      dataSources: ['person_directory', 'project_positions', 'timesheets', 'notifications_placeholder'],
      futureAssignments,
      notificationsSummary: {
        note: 'Employee notification inbox summary is not enabled yet.',
        pendingCount: 0,
        status: 'PLACEHOLDER',
      },
      pendingWorkflowItems: {
        itemCount: pendingWorkflowAssignments.length + rejectedTimesheets.length,
        items: [
          ...pendingWorkflowAssignments.map((item) => ({
            detail: `${item.project.displayName} awaiting approval`,
            id: item.id,
            title: item.staffingRole,
          })),
          ...rejectedTimesheets.map((ts) => ({
            detail: `Week of ${ts.weekStart} — rejected, resubmission required`,
            id: ts.id,
            title: 'Timesheet rejected',
          })),
        ],
      },
      person: {
        currentLineManager: person.currentLineManager,
        currentOrgUnit: person.currentOrgUnit,
        displayName: person.displayName,
        id: person.id,
        primaryEmail: person.primaryEmail,
      },
    };
  }

  private isCurrentAssignment(item: PositionDirectoryItemDto, asOf: Date): boolean {
    // Lean equivalent of the legacy ACTIVE / APPROVED set:
    // BOOKED / ONBOARDING / ASSIGNED / ON_HOLD == currently-committed fill.
    if (!['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(item.approvalState)) {
      return false;
    }

    const startDate = new Date(item.startDate);
    const endDate = item.endDate ? new Date(item.endDate) : null;

    return startDate <= asOf && (!endDate || endDate >= asOf);
  }

  private isFutureAssignment(item: PositionDirectoryItemDto, asOf: Date): boolean {
    if (!['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(item.approvalState)) {
      return false;
    }

    return new Date(item.startDate) > asOf;
  }
}
