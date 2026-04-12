import { httpGet } from './http-client';

export interface HrManagerDashboardPersonSummary {
  displayName: string;
  id: string;
  primaryEmail: string | null;
}

export interface HrHeadcountSummary {
  activeHeadcount: number;
  inactiveHeadcount: number;
  totalHeadcount: number;
}

export interface HrDistributionItem {
  count: number;
  key: string;
  label: string;
}

export interface HrPersonAttentionItem {
  displayName: string;
  personId: string;
  primaryEmail: string | null;
  reason: string;
}

export interface HrLifecycleActivityItem {
  activityType: string;
  displayName: string;
  occurredAt: string;
  personId: string;
}

export interface HrAtRiskEmployee {
  displayName: string;
  personId: string;
  primaryEmail: string | null;
  riskFactors: string[];
}

export interface HrManagerDashboardResponse {
  asOf: string;
  atRiskEmployees: HrAtRiskEmployee[];
  dataSources: string[];
  employeesWithoutManager: HrPersonAttentionItem[];
  employeesWithoutOrgUnit: HrPersonAttentionItem[];
  gradeDistribution: HrDistributionItem[];
  headcountSummary: HrHeadcountSummary;
  orgDistribution: HrDistributionItem[];
  person: HrManagerDashboardPersonSummary;
  recentDeactivationActivity: HrLifecycleActivityItem[];
  recentJoinerActivity: HrLifecycleActivityItem[];
  roleDistribution: HrDistributionItem[];
}

export async function fetchHrManagerDashboard(
  personId: string,
  asOf?: string,
): Promise<HrManagerDashboardResponse> {
  const params = new URLSearchParams();

  if (asOf) {
    params.set('asOf', asOf);
  }

  const suffix = params.toString();

  return httpGet<HrManagerDashboardResponse>(
    `/dashboard/hr-manager/${personId}${suffix ? `?${suffix}` : ''}`,
  );
}
