import { BadRequestException, Injectable } from '@nestjs/common';

import { PlannedVsActualQueryService } from './planned-vs-actual-query.service';
import { WorkloadDashboardQueryService } from './workload-dashboard-query.service';
import { RoleDashboardResponseDto } from './contracts/role-dashboard.dto';

type SupportedDashboardRole =
  | 'employee'
  | 'project_manager'
  | 'resource_manager'
  | 'hr_manager';

interface RoleDashboardQuery {
  asOf?: string;
  role: string;
}

@Injectable()
export class RoleDashboardQueryService {
  public constructor(
    private readonly workloadDashboardQueryService: WorkloadDashboardQueryService,
    private readonly plannedVsActualQueryService: PlannedVsActualQueryService,
  ) {}

  public async execute(query: RoleDashboardQuery): Promise<RoleDashboardResponseDto> {
    if (!this.isSupportedRole(query.role)) {
      throw new BadRequestException('Unsupported dashboard role.');
    }

    const workloadSummary = await this.workloadDashboardQueryService.execute({
      asOf: query.asOf,
    });
    const plannedVsActual = await this.plannedVsActualQueryService.execute({
      asOf: query.asOf,
    });
    const asOf = plannedVsActual.asOf;

    if (query.role === 'employee') {
      return {
        asOf,
        dataSources: ['workload_summary', 'planned_vs_actual'],
        role: query.role,
        sections: [
          {
            itemCount: plannedVsActual.matchedRecords.length,
            items: plannedVsActual.matchedRecords.map((item) => ({
              detail: `${item.effortHours}h matched to ${item.staffingRole}`,
              id: `${item.assignmentId}:${item.workEvidenceId}`,
              subtitle: item.project.name,
              title: item.person.displayName,
            })),
            key: 'matchedRecords',
            title: 'Aligned Time And Assignments',
          },
          {
            itemCount: plannedVsActual.anomalies.length,
            items: plannedVsActual.anomalies.map((item, index) => ({
              detail: item.message,
              id: `${item.type}:${item.person.id}:${index}`,
              subtitle: item.project.name,
              title: item.person.displayName,
            })),
            key: 'anomalies',
            title: 'Time Variance Alerts',
          },
        ],
        summaryCards: [
          {
            key: 'activeAssignments',
            label: 'Active Assignments',
            value: workloadSummary.totalActiveAssignments,
          },
          {
            key: 'matchedRecords',
            label: 'Matched Records',
            value: plannedVsActual.matchedRecords.length,
          },
          {
            key: 'anomalies',
            label: 'Anomalies',
            value: plannedVsActual.anomalies.length,
          },
        ],
      };
    }

    if (query.role === 'project_manager') {
      return {
        asOf,
        dataSources: ['workload_summary', 'planned_vs_actual'],
        role: query.role,
        sections: [
          {
            itemCount: plannedVsActual.assignedButNoEvidence.length,
            items: plannedVsActual.assignedButNoEvidence.map((item) => ({
              detail: `${item.allocationPercent}% allocated as ${item.staffingRole}`,
              id: item.assignmentId,
              subtitle: item.person.displayName,
              title: item.project.name,
            })),
            key: 'assignedButNoEvidence',
            title: 'Planned Without Approved Time',
          },
          {
            itemCount: workloadSummary.projectsWithEvidenceButNoApprovedAssignment.length,
            items: workloadSummary.projectsWithEvidenceButNoApprovedAssignment.map((item) => ({
              detail: item.projectCode,
              id: item.id,
              title: item.name,
            })),
            key: 'projectsWithEvidenceButNoApprovedAssignment',
            title: 'Projects With Unplanned Approved Time',
          },
          {
            itemCount: plannedVsActual.matchedRecords.length,
            items: plannedVsActual.matchedRecords.map((item) => ({
              detail: `${item.effortHours}h`,
              id: `${item.assignmentId}:${item.workEvidenceId}`,
              subtitle: item.person.displayName,
              title: item.project.name,
            })),
            key: 'matchedRecords',
            title: 'Aligned Delivery Time',
          },
        ],
        summaryCards: [
          {
            key: 'activeProjects',
            label: 'Active Projects',
            value: workloadSummary.totalActiveProjects,
          },
          {
            key: 'activeAssignments',
            label: 'Active Assignments',
            value: workloadSummary.totalActiveAssignments,
          },
          {
            key: 'evidenceWithoutApprovedAssignmentProjects',
            label: 'Projects With Time Gaps',
            value: workloadSummary.projectsWithEvidenceButNoApprovedAssignmentCount,
          },
        ],
      };
    }

    if (query.role === 'resource_manager') {
      return {
        asOf,
        dataSources: ['workload_summary', 'planned_vs_actual'],
        role: query.role,
        sections: [
          {
            itemCount: workloadSummary.peopleWithNoActiveAssignments.length,
            items: workloadSummary.peopleWithNoActiveAssignments.map((item) => ({
              id: item.id,
              title: item.displayName,
            })),
            key: 'peopleWithNoActiveAssignments',
            title: 'People With No Active Assignments',
          },
          {
            itemCount: workloadSummary.projectsWithNoStaff.length,
            items: workloadSummary.projectsWithNoStaff.map((item) => ({
              detail: item.projectCode,
              id: item.id,
              title: item.name,
            })),
            key: 'projectsWithNoStaff',
            title: 'Projects With No Staff',
          },
          {
            itemCount: plannedVsActual.assignedButNoEvidence.length,
            items: plannedVsActual.assignedButNoEvidence.map((item) => ({
              detail: `${item.allocationPercent}% ${item.staffingRole}`,
              id: item.assignmentId,
              subtitle: item.project.name,
              title: item.person.displayName,
            })),
            key: 'assignedButNoEvidence',
            title: 'Assignments Needing Time Follow-up',
          },
        ],
        summaryCards: [
          {
            key: 'unassignedActivePeople',
            label: 'Unassigned Active People',
            value: workloadSummary.unassignedActivePeopleCount,
          },
          {
            key: 'peopleWithNoActiveAssignments',
            label: 'People Without Active Assignments',
            value: workloadSummary.peopleWithNoActiveAssignmentsCount,
          },
          {
            key: 'activeAssignments',
            label: 'Active Assignments',
            value: workloadSummary.totalActiveAssignments,
          },
        ],
      };
    }

    return {
      asOf,
      dataSources: ['workload_summary', 'planned_vs_actual'],
      role: query.role,
      sections: [
        {
          itemCount: workloadSummary.peopleWithNoActiveAssignments.length,
          items: workloadSummary.peopleWithNoActiveAssignments.map((item) => ({
            id: item.id,
            title: item.displayName,
          })),
          key: 'peopleWithNoActiveAssignments',
          title: 'Employees Without Active Assignments',
        },
        {
          itemCount: plannedVsActual.anomalies.length,
          items: plannedVsActual.anomalies.map((item, index) => ({
            detail: item.message,
            id: `${item.type}:${item.person.id}:${index}`,
            subtitle: item.project.name,
            title: item.person.displayName,
          })),
          key: 'anomalies',
          title: 'Workforce Anomalies',
        },
        {
          itemCount: workloadSummary.projectsWithNoStaff.length,
          items: workloadSummary.projectsWithNoStaff.map((item) => ({
            detail: item.projectCode,
            id: item.id,
            title: item.name,
          })),
          key: 'projectsWithNoStaff',
          title: 'Projects Without Staff',
        },
      ],
      summaryCards: [
        {
          key: 'unassignedActivePeople',
          label: 'Unassigned Active People',
          value: workloadSummary.unassignedActivePeopleCount,
        },
        {
          key: 'peopleWithNoActiveAssignments',
          label: 'Employees Without Active Assignments',
          value: workloadSummary.peopleWithNoActiveAssignmentsCount,
        },
        {
          key: 'anomalies',
          label: 'Time Variance Alerts',
          value: plannedVsActual.anomalies.length,
        },
      ],
    };
  }

  private isSupportedRole(role: string): role is SupportedDashboardRole {
    return ['employee', 'project_manager', 'resource_manager', 'hr_manager'].includes(role);
  }
}
