import { httpGet } from './http-client';

export interface ComparisonPersonSummary {
  displayName: string;
  id: string;
}

export interface ComparisonProjectSummary {
  id: string;
  name: string;
  projectCode: string;
}

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

export interface PlannedVsActualResponse {
  anomalies: ComparisonAnomalyItem[];
  asOf: string;
  assignedButNoEvidence: AssignedButNoEvidenceItem[];
  evidenceButNoApprovedAssignment: EvidenceButNoApprovedAssignmentItem[];
  matchedRecords: MatchedRecordItem[];
}

export interface PlannedVsActualQuery {
  asOf?: string;
  personId?: string;
  projectId?: string;
}

export async function fetchPlannedVsActual(
  query: PlannedVsActualQuery = {},
): Promise<PlannedVsActualResponse> {
  const params = new URLSearchParams();

  if (query.asOf) {
    params.set('asOf', query.asOf);
  }

  if (query.personId) {
    params.set('personId', query.personId);
  }

  if (query.projectId) {
    params.set('projectId', query.projectId);
  }

  const suffix = params.toString();
  return httpGet<PlannedVsActualResponse>(
    `/dashboard/workload/planned-vs-actual${suffix ? `?${suffix}` : ''}`,
  );
}
