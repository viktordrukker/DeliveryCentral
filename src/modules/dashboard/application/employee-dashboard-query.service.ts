import { Injectable } from '@nestjs/common';
import { AssignmentDirectoryItemDto } from '@src/modules/assignments/application/contracts/assignment-directory.dto';
import { ListAssignmentsService } from '@src/modules/assignments/application/list-assignments.service';
import { PersonDirectoryQueryService } from '@src/modules/organization/application/person-directory-query.service';
import { TimesheetsService } from '@src/modules/timesheets/application/timesheets.service';
import { ListWorkEvidenceService } from '@src/modules/work-evidence/application/list-work-evidence.service';
import { WorkEvidence } from '@src/modules/work-evidence/domain/entities/work-evidence.entity';

import { EmployeeDashboardResponseDto } from './contracts/employee-dashboard.dto';

interface EmployeeDashboardQuery {
  asOf?: string;
  personId: string;
}

@Injectable()
export class EmployeeDashboardQueryService {
  public constructor(
    private readonly personDirectoryQueryService: PersonDirectoryQueryService,
    private readonly listAssignmentsService: ListAssignmentsService,
    private readonly listWorkEvidenceService: ListWorkEvidenceService,
    private readonly timesheetsService: TimesheetsService,
  ) {}

  public async execute(query: EmployeeDashboardQuery): Promise<EmployeeDashboardResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();

    if (Number.isNaN(asOf.getTime())) {
      throw new Error('Employee dashboard asOf is invalid.');
    }

    const person = await this.personDirectoryQueryService.getPersonById(query.personId, asOf);
    if (!person) {
      throw new Error('Employee dashboard person was not found.');
    }

    const assignmentResult = await this.listAssignmentsService.execute({
      personId: query.personId,
    });
    const currentAssignments = assignmentResult.items
      .filter((item) => this.isCurrentAssignment(item, asOf))
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
    const futureAssignments = assignmentResult.items
      .filter((item) => this.isFutureAssignment(item, asOf))
      .sort((left, right) => left.startDate.localeCompare(right.startDate));
    const pendingWorkflowAssignments = assignmentResult.items
      .filter((item) => item.approvalState === 'REQUESTED')
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

    const recentEvidenceWindowStart = new Date(asOf);
    recentEvidenceWindowStart.setUTCDate(recentEvidenceWindowStart.getUTCDate() - 30);

    const evidenceResult = await this.listWorkEvidenceService.execute({
      dateFrom: recentEvidenceWindowStart.toISOString(),
      dateTo: asOf.toISOString(),
      personId: query.personId,
    });
    const recentEvidenceItems = [...evidenceResult.items]
      .sort((left, right) => right.recordedAt.getTime() - left.recordedAt.getTime())
      .slice(0, 5);
    const allRecentEvidenceItems = evidenceResult.items.filter(
      (item) => item.recordedAt <= asOf,
    );
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
      dataSources: ['person_directory', 'assignments', 'work_evidence', 'notifications_placeholder'],
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
      recentWorkEvidenceSummary: {
        lastActivityDate:
          allRecentEvidenceItems
            .map((item) => item.occurredOn ?? item.recordedAt)
            .sort((left, right) => right.getTime() - left.getTime())[0]
            ?.toISOString() ?? null,
        recentEntryCount: allRecentEvidenceItems.length,
        recentItems: recentEvidenceItems.map((item) => this.mapWorkEvidence(item)),
        sourceTypes: [...new Set(allRecentEvidenceItems.map((item) => item.source.sourceType))].sort(),
        totalEffortHours: Number(
          allRecentEvidenceItems
            .reduce((sum, item) => sum + (item.durationMinutes ?? 0) / 60, 0)
            .toFixed(2),
        ),
      },
    };
  }

  private isCurrentAssignment(item: AssignmentDirectoryItemDto, asOf: Date): boolean {
    if (!['ACTIVE', 'APPROVED'].includes(item.approvalState)) {
      return false;
    }

    const startDate = new Date(item.startDate);
    const endDate = item.endDate ? new Date(item.endDate) : null;

    return startDate <= asOf && (!endDate || endDate >= asOf);
  }

  private isFutureAssignment(item: AssignmentDirectoryItemDto, asOf: Date): boolean {
    if (!['ACTIVE', 'APPROVED'].includes(item.approvalState)) {
      return false;
    }

    return new Date(item.startDate) > asOf;
  }

  private mapWorkEvidence(item: WorkEvidence) {
    return {
      activityDate: (item.occurredOn ?? item.recordedAt).toISOString(),
      details: item.details,
      effortHours: item.durationMinutes ? Number((item.durationMinutes / 60).toFixed(2)) : 0,
      id: item.workEvidenceId.value,
      personId: item.personId,
      projectId: item.projectId,
      recordedAt: item.recordedAt.toISOString(),
      sourceRecordKey: item.sourceRecordKey,
      sourceType: item.source.sourceType,
      summary: item.summary,
      trace: item.trace,
    };
  }
}
