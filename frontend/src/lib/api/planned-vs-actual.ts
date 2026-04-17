import { httpGet } from './http-client';

/* ── Shared nested types ──────────────────────────────────────── */

export interface ComparisonPersonSummary {
  displayName: string;
  id: string;
}

export interface ComparisonProjectSummary {
  id: string;
  name: string;
  projectCode: string;
}

/* ── Detail list item types (unchanged) ───────────────────────── */

export interface AssignedButNoEvidenceItem {
  allocationPercent: number;
  assignmentId: string;
  person: ComparisonPersonSummary;
  project: ComparisonProjectSummary;
  staffingRole: string;
}

export interface EvidenceButNoApprovedAssignmentItem {
  activityDate: string;
  effortHours: number;
  person: ComparisonPersonSummary;
  project: ComparisonProjectSummary;
  sourceType: string;
  workEvidenceId: string;
}

export interface MatchedRecordItem {
  allocationPercent: number;
  assignmentId: string;
  effortHours: number;
  person: ComparisonPersonSummary;
  project: ComparisonProjectSummary;
  staffingRole: string;
  workEvidenceId: string;
}

export interface ComparisonAnomalyItem {
  message: string;
  person: ComparisonPersonSummary;
  project: ComparisonProjectSummary;
  type: string;
}

/* ── NEW: Aggregation types ───────────────────────────────────── */

export interface TimesheetStatusSummary {
  totalHours: number;
  approvedHours: number;
  submittedHours: number;
  draftHours: number;
  rejectedHours: number;
  personCount: number;
  missingPersonCount: number;
  missingPersonIds: string[];
}

export interface ProjectPvaSummary {
  projectId: string;
  projectCode: string;
  projectName: string;
  plannedHours: number;
  approvedHours: number;
  submittedHours: number;
  draftHours: number;
  totalActualHours: number;
  assignmentCount: number;
  openStaffingRequests: number;
  unfilledHeadcount: number;
  variance: number;
  variancePercent: number;
  overSubmitted: boolean;
}

export interface OrgUnitPvaSummary {
  orgUnitId: string;
  orgUnitName: string;
  personCount: number;
  plannedHours: number;
  submittedHours: number;
  approvedHours: number;
  draftHours: number;
  submissionRate: number;
  variance: number;
}

export interface ResourcePoolPvaSummary {
  poolId: string;
  poolName: string;
  personCount: number;
  plannedHours: number;
  submittedHours: number;
  approvedHours: number;
  draftHours: number;
  submissionRate: number;
  variance: number;
}

export interface UnstaffedProject {
  projectId: string;
  projectCode: string;
  projectName: string;
  openRequests: number;
  unfilledHeadcount: number;
  roles: string[];
}

export interface StaffingCoverage {
  projectsFullyStaffed: number;
  projectsPartiallyStaffed: number;
  projectsWithOpenRequests: number;
  totalOpenRequests: number;
  totalUnfilledHeadcount: number;
  unstaffedProjects: UnstaffedProject[];
}

/* ── Top-level response ───────────────────────────────────────── */

export interface PlannedVsActualResponse {
  asOf: string;
  weekStart: string;
  weekEnd: string;
  weeksIncluded: number;

  /* Detail lists */
  anomalies: ComparisonAnomalyItem[];
  assignedButNoEvidence: AssignedButNoEvidenceItem[];
  evidenceButNoApprovedAssignment: EvidenceButNoApprovedAssignmentItem[];
  matchedRecords: MatchedRecordItem[];

  /* Aggregations */
  timesheetStatusSummary: TimesheetStatusSummary;
  projectSummaries: ProjectPvaSummary[];
  orgUnitSummaries: OrgUnitPvaSummary[];
  resourcePoolSummaries: ResourcePoolPvaSummary[];
  staffingCoverage: StaffingCoverage;
}

/* ── Query ─────────────────────────────────────────────────────── */

export interface PlannedVsActualQuery {
  asOf?: string;
  personId?: string;
  projectId?: string;
  weeks?: number;
}

export async function fetchPlannedVsActual(
  query: PlannedVsActualQuery = {},
): Promise<PlannedVsActualResponse> {
  const params = new URLSearchParams();

  if (query.asOf) params.set('asOf', query.asOf);
  if (query.personId) params.set('personId', query.personId);
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.weeks) params.set('weeks', String(query.weeks));

  const suffix = params.toString();
  return httpGet<PlannedVsActualResponse>(
    `/dashboard/workload/planned-vs-actual${suffix ? `?${suffix}` : ''}`,
  );
}
