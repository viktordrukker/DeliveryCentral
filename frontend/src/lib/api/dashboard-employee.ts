import { AssignmentDirectoryItem } from './assignments';
import { httpGet } from './http-client';

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
  currentAssignments: AssignmentDirectoryItem[];
  currentWorkloadSummary: EmployeeCurrentWorkloadSummary;
  dataSources: string[];
  futureAssignments: AssignmentDirectoryItem[];
  notificationsSummary: EmployeeNotificationsSummary;
  pendingWorkflowItems: EmployeePendingWorkflowItems;
  person: EmployeeDashboardPersonSummary;
}

export async function fetchEmployeeDashboard(
  personId: string,
  asOf?: string,
): Promise<EmployeeDashboardResponse> {
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const suffix = params.toString();

  return httpGet<EmployeeDashboardResponse>(
    `/dashboard/employee/${personId}${suffix ? `?${suffix}` : ''}`,
  );
}
