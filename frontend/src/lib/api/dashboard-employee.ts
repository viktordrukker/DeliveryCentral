import { fetchDashboardEndpoint } from './dashboard-fetch';

/**
 * SoT PR 17b — local "assignment directory item" shape mirroring the BE
 * `PositionDirectoryItemDto`. Defined here (instead of importing the
 * deleted `@/lib/api/assignments` `AssignmentDirectoryItem`) so the V1
 * Employee dashboard / Resource Manager dashboard / /me workspace pages
 * keep rendering until they are removed at V2 cutover (PR 20).
 */
export interface EmployeeDashboardAssignmentItem {
  id: string;
  person: { id: string; displayName: string };
  project: { id: string; displayName: string };
  staffingRole: string;
  allocationPercent: number;
  startDate: string;
  endDate: string | null;
  approvalState: string;
  version?: number;
  slaStage?: string | null;
  slaDueAt?: string | null;
  slaBreachedAt?: string | null;
  requiresDirectorApproval?: boolean;
}

export interface EmployeeDashboardPersonSummary {
  currentLineManager: {
    displayName: string;
    id: string;
  } | null;
  currentOrgUnit: {
    code: string;
    id: string;
    name: string;
  } | null;
  displayName: string;
  id: string;
  primaryEmail: string | null;
}

export interface EmployeeCurrentWorkloadSummary {
  activeAssignmentCount: number;
  futureAssignmentCount: number;
  isOverallocated: boolean;
  pendingSelfWorkflowItemCount: number;
  totalAllocationPercent: number;
}

export interface EmployeePendingWorkflowItems {
  itemCount: number;
  items: Array<{
    detail?: string;
    id: string;
    title: string;
  }>;
}

export interface EmployeeNotificationsSummary {
  note: string;
  pendingCount: number;
  status: string;
}

export interface EmployeeDashboardResponse {
  asOf: string;
  currentAssignments: EmployeeDashboardAssignmentItem[];
  currentWorkloadSummary: EmployeeCurrentWorkloadSummary;
  dataSources: string[];
  futureAssignments: EmployeeDashboardAssignmentItem[];
  notificationsSummary: EmployeeNotificationsSummary;
  pendingWorkflowItems: EmployeePendingWorkflowItems;
  person: EmployeeDashboardPersonSummary;
}

export async function fetchEmployeeDashboard(
  personId: string,
  asOf?: string,
): Promise<EmployeeDashboardResponse> {
  return fetchDashboardEndpoint<EmployeeDashboardResponse>(
    `/dashboard/employee/${personId}`,
    { asOf },
  );
}
