import { httpGet, httpPatch, httpPost } from './http-client';

export type StaffingRequestStatus = 'CANCELLED' | 'DRAFT' | 'FULFILLED' | 'IN_REVIEW' | 'OPEN';
export type StaffingRequestPriority = 'HIGH' | 'LOW' | 'MEDIUM' | 'URGENT';
export type DerivedStaffingRequestStatus =
  | 'Open'
  | 'In progress'
  | 'Filled'
  | 'Closed'
  | 'Cancelled';

export interface StaffingAssignmentSummary {
  assigned: number;
  booked: number;
  cancelled: number;
  completed: number;
  created: number;
  onHold: number;
  onboarding: number;
  proposed: number;
  rejected: number;
  totalAssignments: number;
}

export interface StaffingRequestFulfilment {
  assignedPersonId: string;
  fulfilledAt: string;
  id: string;
  proposedByPersonId: string;
}

export interface StaffingRequest {
  allocationPercent: number;
  assignmentSummary: StaffingAssignmentSummary;
  cancelledAt?: string;
  candidatePersonId?: string;
  createdAt: string;
  derivedStatus: DerivedStaffingRequestStatus;
  endDate: string;
  fulfilments: StaffingRequestFulfilment[];
  headcountFulfilled: number;
  headcountRequired: number;
  id: string;
  priority: StaffingRequestPriority;
  projectId: string;
  projectName?: string;
  requestedByPersonId: string;
  role: string;
  skills: string[];
  startDate: string;
  status: StaffingRequestStatus;
  summary?: string;
  updatedAt: string;
}

export interface CreateStaffingRequestInput {
  allocationPercent: number;
  candidatePersonId?: string;
  endDate: string;
  headcountRequired?: number;
  priority: StaffingRequestPriority;
  projectId: string;
  requestedByPersonId: string;
  role: string;
  skills?: string[];
  startDate: string;
  summary?: string;
}

export interface ConflictCheckResult {
  conflictingAssignments: { allocationPercent: number; id: string; projectName: string }[];
  hasConflict: boolean;
  totalAllocationPercent: number;
}

export async function fetchStaffingRequests(params?: {
  priority?: StaffingRequestPriority;
  projectId?: string;
  requestedByPersonId?: string;
  status?: StaffingRequestStatus;
}): Promise<StaffingRequest[]> {
  const p = new URLSearchParams();
  if (params?.status) p.set('status', params.status);
  if (params?.projectId) p.set('projectId', params.projectId);
  if (params?.priority) p.set('priority', params.priority);
  if (params?.requestedByPersonId) p.set('requestedByPersonId', params.requestedByPersonId);
  const qs = p.toString();
  return httpGet<StaffingRequest[]>(`/staffing-requests${qs ? `?${qs}` : ''}`);
}

export async function fetchStaffingRequestById(id: string): Promise<StaffingRequest> {
  return httpGet<StaffingRequest>(`/staffing-requests/${id}`);
}

export async function createStaffingRequest(input: CreateStaffingRequestInput): Promise<StaffingRequest> {
  return httpPost<StaffingRequest, CreateStaffingRequestInput>('/staffing-requests', input);
}

export async function updateStaffingRequest(
  id: string,
  updates: Partial<Omit<CreateStaffingRequestInput, 'projectId' | 'requestedByPersonId'>>,
): Promise<StaffingRequest> {
  return httpPatch<StaffingRequest, typeof updates>(`/staffing-requests/${id}`, updates);
}

export async function submitStaffingRequest(id: string): Promise<StaffingRequest> {
  return httpPost<StaffingRequest, Record<string, never>>(`/staffing-requests/${id}/submit`, {});
}

export async function reviewStaffingRequest(id: string): Promise<StaffingRequest> {
  return httpPost<StaffingRequest, Record<string, never>>(`/staffing-requests/${id}/review`, {});
}

export async function fulfilStaffingRequest(
  id: string,
  proposedByPersonId: string,
  assignedPersonId: string,
): Promise<StaffingRequest> {
  return httpPost<StaffingRequest, { assignedPersonId: string; proposedByPersonId: string }>(
    `/staffing-requests/${id}/fulfil`,
    { assignedPersonId, proposedByPersonId },
  );
}

export async function cancelStaffingRequest(id: string): Promise<StaffingRequest> {
  return httpPost<StaffingRequest, Record<string, never>>(`/staffing-requests/${id}/cancel`, {});
}

export async function releaseStaffingRequest(id: string): Promise<StaffingRequest> {
  return httpPost<StaffingRequest, Record<string, never>>(`/staffing-requests/${id}/release`, {});
}

export async function duplicateStaffingRequest(id: string): Promise<StaffingRequest> {
  return httpPost<StaffingRequest, Record<string, never>>(`/staffing-requests/${id}/duplicate`, {});
}

export interface SkillBreakdown {
  availabilityModifier: number;
  importanceWeight: number;
  proficiencyMatch: number;
  recencyModifier: number;
  score: number;
  skillName: string;
}

export interface SuggestionCandidate {
  availableCapacityPercent: number;
  currentAllocationPercent: number;
  displayName: string;
  personId: string;
  score: number;
  skillBreakdown: SkillBreakdown[];
}

export async function fetchStaffingSuggestions(requestId: string): Promise<SuggestionCandidate[]> {
  return httpGet<SuggestionCandidate[]>(`/staffing-requests/suggestions?requestId=${encodeURIComponent(requestId)}`);
}

// ─── Proposal slate API ────────────────────────────────────────────────────
// The slate aggregate hangs off the StaffingRequest: PM creates the request,
// RM proposes a slate, PM picks. Pick creates the Assignment at BOOKED.

export type ProposalCandidateDecision =
  | 'PENDING'
  | 'PICKED'
  | 'DECLINED'
  | 'AUTO_DECLINED';

export interface ProposalSlateCandidateDto {
  id: string;
  candidatePersonId: string;
  rank: number;
  matchScore: number;
  availabilityPercent?: number;
  mismatchedSkills: string[];
  rationale?: string;
  decision: ProposalCandidateDecision;
  decidedAt?: string;
}

export interface ProposalSlateDto {
  id: string;
  staffingRequestId: string;
  proposedByPersonId: string;
  status: 'OPEN' | 'DECIDED' | 'EXPIRED' | 'WITHDRAWN';
  proposedAt: string;
  expiresAt?: string;
  decidedAt?: string;
  candidates: ProposalSlateCandidateDto[];
}

export interface SubmitProposalSlateCandidate {
  candidatePersonId: string;
  rank: number;
  matchScore: number;
  availabilityPercent?: number;
  mismatchedSkills?: string[];
  rationale?: string;
}

export interface SubmitProposalSlateRequest {
  candidates: SubmitProposalSlateCandidate[];
  expiresAt?: string;
}

export interface RejectProposalSlateRequest {
  reasonCode: string;
  reason?: string;
  /** true → request returns to OPEN; false → request → CANCELLED. */
  sendBack: boolean;
}

export interface PickProposalCandidateResponse {
  assignmentId: string;
  slate: ProposalSlateDto;
}

export interface RejectProposalSlateResponse {
  slate: ProposalSlateDto;
  nextRequestStatus: 'OPEN' | 'CANCELLED';
}

export async function fetchProposalSlate(
  staffingRequestId: string,
): Promise<ProposalSlateDto | null> {
  return httpGet<ProposalSlateDto | null>(
    `/staffing-requests/${staffingRequestId}/proposals`,
  );
}

export async function submitProposalSlate(
  staffingRequestId: string,
  request: SubmitProposalSlateRequest,
): Promise<ProposalSlateDto> {
  return httpPost<ProposalSlateDto, SubmitProposalSlateRequest>(
    `/staffing-requests/${staffingRequestId}/proposals`,
    request,
  );
}

export async function acknowledgeProposalSlate(
  staffingRequestId: string,
  slateId: string,
): Promise<ProposalSlateDto> {
  return httpPost<ProposalSlateDto, Record<string, never>>(
    `/staffing-requests/${staffingRequestId}/proposals/${slateId}/acknowledge`,
    {},
  );
}

export async function pickProposalCandidate(
  staffingRequestId: string,
  slateId: string,
  candidateId: string,
): Promise<PickProposalCandidateResponse> {
  return httpPost<PickProposalCandidateResponse, { candidateId: string }>(
    `/staffing-requests/${staffingRequestId}/proposals/${slateId}/pick`,
    { candidateId },
  );
}

export async function rejectProposalSlate(
  staffingRequestId: string,
  slateId: string,
  request: RejectProposalSlateRequest,
): Promise<RejectProposalSlateResponse> {
  return httpPost<RejectProposalSlateResponse, RejectProposalSlateRequest>(
    `/staffing-requests/${staffingRequestId}/proposals/${slateId}/reject-all`,
    request,
  );
}

export async function checkAllocationConflict(params: {
  allocation: number;
  excludeAssignmentId?: string;
  from: string;
  personId: string;
  to: string;
}): Promise<ConflictCheckResult> {
  const p = new URLSearchParams({
    allocation: String(params.allocation),
    from: params.from,
    personId: params.personId,
    to: params.to,
  });
  if (params.excludeAssignmentId) p.set('excludeAssignmentId', params.excludeAssignmentId);
  return httpGet<ConflictCheckResult>(`/workload/check-conflict?${p.toString()}`);
}
