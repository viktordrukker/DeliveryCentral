import { httpGet, httpPost } from './http-client';

/**
 * Sprint 2 / S2-8 — frontend client for the lean staffing aggregate endpoints
 * shipped in S2-4.
 *
 * The DS-7 visual language is the temporary host for these pages — Sprint 1
 * of the lean simplification initiative regenerates the DS via Claude Design.
 * These pages will get a visual refresh then; the data contracts here stay.
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

export interface ProjectPosition {
  id: string;
  projectId: string;
  role: string;
  requiredAllocationPercent: number;
  fillStatus: PositionFillStatus;
  activePersonId?: string;
  activeAllocationPercent?: number;
  onHoldReason?: string;
  onHoldCaseId?: string;
  releaseReason?: string;
  version: number;
  createdByPersonId?: string;
  updatedByPersonId?: string;
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

export async function getProjectPositionById(id: string): Promise<ProjectPosition> {
  return httpGet<ProjectPosition>(`/project-positions/${id}`);
}

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
