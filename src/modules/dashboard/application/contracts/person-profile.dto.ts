/**
 * FE-#262 — Person profile aggregator payload.
 *
 * `costRate` is REDACTED (field absent, not null) unless caller is the
 * subject person OR a member of HR_GOVERNANCE_ROLES OR EXEC_ROLES.
 */

export interface PersonProfilePersonDto {
  id: string;
  displayName: string;
  givenName: string;
  familyName: string;
  primaryEmail: string | null;
  role: string | null;
  grade: string | null;
  location: string | null;
  timezone: string | null;
  employmentStatus: string;
  hiredAt: string | null;
}

export interface PersonProfileAssignmentItemDto {
  id: string;
  projectId: string;
  projectName: string;
  staffingRole: string;
  status: string;
  allocationPercent: number;
  validFrom: string;
  validTo: string | null;
}

export interface PersonProfileTimesheetSummaryDto {
  last4WeeksHours: number;
  leaveHours: number;
  overtimeHours: number;
}

export interface PersonProfileLeaveBalanceItemDto {
  type: string;
  entitlement: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface PersonProfileChainItemDto {
  personId: string;
  displayName: string;
  relationshipType: string;
}

export interface PersonProfileSkillDto {
  skillId: string;
  skillName: string;
  proficiency: number;
  certified: boolean;
}

export interface PersonProfilePoolDto {
  resourcePoolId: string;
  resourcePoolName: string;
  isPrimary: boolean;
}

export interface PersonProfileDto {
  person: PersonProfilePersonDto;
  /** Absent (not null) when caller does not have cost-rate visibility. */
  costRate?: number;
  assignments: PersonProfileAssignmentItemDto[];
  timesheetSummary: PersonProfileTimesheetSummaryDto;
  leaveBalance: PersonProfileLeaveBalanceItemDto[];
  managerChain: PersonProfileChainItemDto[];
  skills: PersonProfileSkillDto[];
  pools: PersonProfilePoolDto[];
}
