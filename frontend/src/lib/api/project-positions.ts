import { httpGet, httpPost } from './http-client';

/**
 * LEAN-P2-1 — canonical frontend client for the lean staffing aggregate.
 *
 * Replaces `lib/api/assignments.ts` + `lib/api/staffing-requests.ts` as the
 * source of truth for positions data. Legacy clients stay backward-compat
 * through Phase 2; transitional type aliases are re-exported below so
 * call sites can migrate incrementally.
 *
 * Field surface mirrors the Phase 1 backend DTO
 * (`ProjectPositionResponseDto`). Some fields are declared optional to
 * accommodate forward-compatible BE additions (e.g. `projectName`,
 * `startDate`, `endDate`, legacy provenance pointers) without breaking
 * the type contract today.
 */

export type PositionFillStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'PROPOSED'
  | 'BOOKED'
  | 'ONBOARDING'
  | 'ASSIGNED'
  | 'ON_HOLD'
  | 'RELEASED';

// Canonical alias — matches Prisma enum name and the issue 205 spec.
export type ProjectPositionFillStatus = PositionFillStatus;

export type StaffingRequestPriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ProjectPosition {
  id: string;
  projectId: string;
  // Optional projection fields — populated when the BE response enriches
  // the row with the parent project's display data.
  projectName?: string;
  projectCode?: string;
  role: string;
  requiredAllocationPercent: number;
  fillStatus: PositionFillStatus;
  activePersonId?: string;
  activeAllocationPercent?: number;
  activeValidFrom?: string;
  activeValidTo?: string;
  // Demand window (schema fields). Optional on the wire — present once the
  // BE DTO exposes them.
  startDate?: string;
  endDate?: string;
  priority?: StaffingRequestPriorityValue;
  onHoldReason?: string;
  onHoldCaseId?: string;
  releaseReason?: string;
  version: number;
  createdByPersonId?: string;
  updatedByPersonId?: string;
  // Migration provenance — populated by the Sprint 2 backfill. Used by
  // forensic queries during the legacy contract migration; never edited
  // from the FE.
  legacyAssignmentId?: string;
  legacyStaffingRequestId?: string;
}

export interface ListProjectPositionsQuery {
  projectId?: string;
  activePersonId?: string;
  fillStatuses?: PositionFillStatus[];
  asOf?: string;
  skip?: number;
  take?: number;
}

export interface ListProjectPositionsResponse {
  positions: ProjectPosition[];
  total: number;
}

export interface CreateProjectPositionRequest {
  projectId: string;
  role: string;
  requiredAllocationPercent: number;
  startDate: string;
  endDate: string;
  skills?: string[];
  summary?: string;
  requestedByPersonId?: string;
  openImmediately?: boolean;
}

export interface TransitionProjectPositionFillRequest {
  toStatus: PositionFillStatus;
  reason?: string;
  caseId?: string;
  personId?: string;
  allocationPercent?: number;
  validFrom?: string;
  validTo?: string;
}

export interface BenchPerson {
  personId: string;
  isOnBench: boolean;
  totalActiveAllocationPercent: number;
  activeFillCount: number;
}

export interface BenchCheckResponse {
  people: BenchPerson[];
}

// ProjectPositionCandidate — slate row returned by GET /:id/candidates and
// inverse lookup endpoints. Field names match the Phase 1 BE DTOs.
export interface ProjectPositionCandidate {
  personId: string;
  name: string;
  role: string;
  grade?: string | null;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  availabilityHours14d: number;
}

// ProjectPositionFillHistory — one row in the position's audit ledger.
// Surfaced when the GET /:id endpoint returns embedded history.
export type ProjectPositionFillChangeType =
  | 'DRAFTED'
  | 'OPENED'
  | 'PROPOSED'
  | 'BOOKED'
  | 'ONBOARDED'
  | 'ASSIGNED'
  | 'HELD'
  | 'RELEASED';

export interface ProjectPositionFillHistory {
  id: string;
  positionId: string;
  changeType: ProjectPositionFillChangeType;
  changedByPersonId?: string;
  changeReason?: string;
  previousPersonId?: string;
  newPersonId?: string;
  previousStatus?: ProjectPositionFillStatus;
  newStatus?: ProjectPositionFillStatus;
  occurredAt: string;
}

function toQueryString(query: ListProjectPositionsQuery): string {
  const parts: string[] = [];
  if (query.projectId) parts.push(`projectId=${encodeURIComponent(query.projectId)}`);
  if (query.activePersonId) parts.push(`activePersonId=${encodeURIComponent(query.activePersonId)}`);
  if (query.fillStatuses && query.fillStatuses.length > 0) {
    for (const s of query.fillStatuses) parts.push(`fillStatuses=${encodeURIComponent(s)}`);
  }
  if (query.asOf) parts.push(`asOf=${encodeURIComponent(query.asOf)}`);
  if (query.skip !== undefined) parts.push(`skip=${query.skip}`);
  if (query.take !== undefined) parts.push(`take=${query.take}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export async function listProjectPositions(
  query: ListProjectPositionsQuery = {},
): Promise<ListProjectPositionsResponse> {
  return httpGet<ListProjectPositionsResponse>(`/project-positions${toQueryString(query)}`);
}

// fetchProjectPositions — canonical alias matching the issue 205 spec.
// Use this for new code; `listProjectPositions` stays as the pre-existing
// name used by Sprint 2 callers (PositionsListPage etc.).
export const fetchProjectPositions = listProjectPositions;

export async function getProjectPositionById(id: string): Promise<ProjectPosition> {
  return httpGet<ProjectPosition>(`/project-positions/${id}`);
}

// fetchProjectPosition — canonical alias matching the issue 205 spec.
export const fetchProjectPosition = getProjectPositionById;

export async function createProjectPosition(
  request: CreateProjectPositionRequest,
): Promise<ProjectPosition> {
  return httpPost<ProjectPosition, CreateProjectPositionRequest>('/project-positions', request);
}

export async function transitionProjectPositionFill(
  id: string,
  request: TransitionProjectPositionFillRequest,
): Promise<ProjectPosition> {
  return httpPost<ProjectPosition, typeof request>(`/project-positions/${id}/transition`, request);
}

// transitionProjectPosition — canonical alias matching the issue 205 spec.
export const transitionProjectPosition = transitionProjectPositionFill;

export async function checkBench(
  personIds: string[],
  asOf?: string,
): Promise<BenchCheckResponse> {
  return httpPost<BenchCheckResponse, { personIds: string[]; asOf?: string }>(
    '/people/bench/check',
    { personIds, asOf },
  );
}

// NEW-LGL-7 — ranked suggested fills for a single open position (skill+role match).
export interface PositionCandidate {
  personId: string;
  name: string;
  role: string;
  grade?: string | null;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  availabilityHours14d: number;
}

export interface PositionCandidatesResponse {
  positionId: string;
  requiredSkills: string[];
  candidates: PositionCandidate[];
}

export async function getPositionCandidates(
  id: string,
  limit?: number,
): Promise<PositionCandidatesResponse> {
  const qs = limit ? `?limit=${limit}` : '';
  return httpGet<PositionCandidatesResponse>(`/project-positions/${id}/candidates${qs}`);
}

// BE-track / Bench suggested-fills — inverse of getPositionCandidates.
// Given a person, returns ranked OPEN positions they match (same scoring).
export interface PersonSuggestedPosition {
  positionId: string;
  projectId: string;
  projectName: string;
  role: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface PersonSuggestedPositionsResponse {
  personId: string;
  candidates: PersonSuggestedPosition[];
}

export async function fetchPersonSuggestedPositions(
  personId: string,
  limit?: number,
): Promise<PersonSuggestedPositionsResponse> {
  const qs = limit ? `?limit=${limit}` : '';
  return httpGet<PersonSuggestedPositionsResponse>(
    `/people/${personId}/suggested-positions${qs}`,
  );
}

// LEAN-P4b-2 — position lifecycle forensics. Each row in the timeline
// carries the change type, previous/new status, actor, optional reason, and
// the dwell-time in `newStatus` (`dwellMs`). `longDwell` is true when the
// dwell exceeded the OPEN > 7d / PROPOSED > 3d thresholds.
export interface PositionForensicsEvent {
  id: string;
  changeType: ProjectPositionFillChangeType | string;
  previousStatus: ProjectPositionFillStatus | null;
  newStatus: ProjectPositionFillStatus | null;
  previousPersonId: string | null;
  newPersonId: string | null;
  changedByPersonId: string | null;
  changeReason: string | null;
  occurredAt: string;
  dwellMs: number | null;
  longDwell: boolean;
}

export interface PositionForensics {
  positionId: string;
  projectId: string;
  role: string;
  currentStatus: ProjectPositionFillStatus;
  events: PositionForensicsEvent[];
  asOf: string;
}

export async function fetchPositionForensics(positionId: string): Promise<PositionForensics> {
  return httpGet<PositionForensics>(`/project-positions/${positionId}/forensics`);
}

// LEAN-P4-missing-1 — PM bulk reassignment.
export interface BulkReassignPositionsRequest {
  positionIds: string[];
  toPersonId?: string | null;
  toProjectId?: string;
  reason?: string;
}

export interface BulkReassignPositionsResponse {
  reassigned: number;
  positionIds: string[];
  errors: string[];
}

export async function bulkReassignPositions(
  request: BulkReassignPositionsRequest,
): Promise<BulkReassignPositionsResponse> {
  return httpPost<BulkReassignPositionsResponse, BulkReassignPositionsRequest>(
    '/project-positions/bulk-reassign',
    request,
  );
}

// ─── Legacy aliases ────────────────────────────────────────────────────────
// Phase 2 transitional surface. Consumers still importing the legacy assignment
// types can switch their import path to '@/lib/api/project-positions' and pick
// up the canonical shape without rewriting fixtures. Once all callers move to
// `ProjectPosition` directly (LEAN-P2-2), these aliases are removed.

export type LegacyAssignmentDirectoryItem = ProjectPosition;
