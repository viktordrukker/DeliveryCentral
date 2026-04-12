export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Approved',
  ENDED: 'Ended',
  OVERRIDE_CREATED: 'Override Created',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
  REQUESTED: 'Requested',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
  DRAFT: 'Draft',
};

export const ORG_UNIT_TYPE_LABELS: Record<string, string> = {
  CHAPTER: 'Chapter',
  DEPARTMENT: 'Department',
  DIVISION: 'Division',
  GUILD: 'Guild',
  ORG_UNIT: 'Org Unit',
  SQUAD: 'Squad',
  TEAM: 'Team',
  TRIBE: 'Tribe',
};

export const ANOMALY_TYPE_LABELS: Record<string, string> = {
  EVIDENCE_AFTER_ASSIGNMENT_END: 'Evidence After Assignment End',
  EVIDENCE_WITHOUT_APPROVED_ASSIGNMENT: 'Evidence Without Approved Assignment',
  NO_ACTIVE_STAFFING: 'No Active Staffing',
  OVER_ALLOCATED: 'Over Allocated',
  UNASSIGNED: 'Unassigned',
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  JIRA_WORKLOG: 'Jira Worklog',
  M365_CALENDAR: 'M365 Calendar',
  MANUAL: 'Manual',
  RADIUS: 'RADIUS',
};

export const NOTIFICATION_CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  IN_APP: 'In-App',
  TEAMS_WEBHOOK: 'Teams Webhook',
};

export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  TERMINATED: 'Terminated',
};

export const INTEGRATION_PROVIDER_LABELS: Record<string, string> = {
  JIRA: 'Jira',
  M365: 'Microsoft 365',
  RADIUS: 'RADIUS',
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  ASSIGNMENT_AMENDED: 'Assignment Amended',
  ASSIGNMENT_APPROVED: 'Assignment Approved',
  ASSIGNMENT_CREATED: 'Assignment Created',
  ASSIGNMENT_ENDED: 'Assignment Ended',
  ASSIGNMENT_REJECTED: 'Assignment Rejected',
  ASSIGNMENT_REVOKED: 'Assignment Revoked',
  CASE_ARCHIVED: 'Case Archived',
  CASE_CANCELLED: 'Case Cancelled',
  CASE_CLOSED: 'Case Closed',
  CASE_CREATED: 'Case Created',
  EXCEPTION_RESOLVED: 'Exception Resolved',
  EXCEPTION_SUPPRESSED: 'Exception Suppressed',
  PROJECT_ACTIVATED: 'Project Activated',
  PROJECT_CLOSED: 'Project Closed',
  PROJECT_CREATED: 'Project Created',
  REPORTING_LINE_ASSIGNED: 'Reporting Line Assigned',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  DISCIPLINARY: 'Disciplinary',
  GRIEVANCE: 'Grievance',
  HEALTH_SAFETY: 'Health & Safety',
  LEAVE_OF_ABSENCE: 'Leave of Absence',
  OFFBOARDING: 'Offboarding',
  ONBOARDING: 'Onboarding',
  PERFORMANCE_REVIEW: 'Performance Review',
  PROBATION_REVIEW: 'Probation Review',
};

const FEATURE_FLAG_LABELS: Record<string, string> = {
  enable_case_management: 'Enable Case Management',
  enable_exceptions: 'Enable Exceptions',
  enable_integrations: 'Enable Integrations',
  enable_notifications: 'Enable Notifications',
  enable_resource_pools: 'Enable Resource Pools',
  enable_work_evidence: 'Enable Work Evidence',
};

export function formatChangeType(changeType: string): string {
  return CHANGE_TYPE_LABELS[changeType] ?? changeType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCaseType(caseTypeKey: string): string {
  return CASE_TYPE_LABELS[caseTypeKey] ?? caseTypeKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatFeatureFlag(flagKey: string): string {
  return FEATURE_FLAG_LABELS[flagKey] ?? flagKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeEnum(value: string, map?: Record<string, string>): string {
  if (map && map[value]) return map[value];
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
