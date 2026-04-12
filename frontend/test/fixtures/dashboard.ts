import { WorkloadDashboardSummary } from '@/lib/api/workload-dashboard';

export function buildWorkloadDashboardSummary(
  overrides: Partial<WorkloadDashboardSummary> = {},
): WorkloadDashboardSummary {
  return {
    peopleWithNoActiveAssignments: [
      { displayName: 'Zoe Turner', id: 'person-zoe-turner' },
    ],
    peopleWithNoActiveAssignmentsCount: 1,
    projectsWithEvidenceButNoApprovedAssignment: [
      {
        id: 'project-nova-analytics',
        name: 'Nova Analytics Migration',
        projectCode: 'PRJ-104',
      },
    ],
    projectsWithEvidenceButNoApprovedAssignmentCount: 1,
    projectsWithNoStaff: [
      {
        id: 'project-internal-bench-planning',
        name: 'Internal Bench Planning',
        projectCode: 'PRJ-100',
      },
    ],
    projectsWithNoStaffCount: 1,
    totalActiveAssignments: 6,
    totalActiveProjects: 6,
    unassignedActivePeopleCount: 1,
    ...overrides,
  };
}
