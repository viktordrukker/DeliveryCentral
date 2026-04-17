import { httpGet, httpPost } from './http-client';

/* ── Types ── */

export type StaffingDeskRowKind = 'assignment' | 'request';
export type StatusGroup = 'active' | 'cancelled' | 'done' | 'draft' | 'pending';

export interface TimelineAssignment {
  allocationPercent: number;
  endDate: string | null;
  projectName: string;
  startDate: string;
  status: string;
}

export interface StaffingDeskRow {
  id: string;
  kind: StaffingDeskRowKind;
  projectId: string;
  projectName: string;
  role: string;
  allocationPercent: number;
  startDate: string;
  endDate: string | null;
  status: string;
  statusGroup: StatusGroup;
  createdAt: string;
  personId: string | null;
  personName: string | null;
  assignmentCode: string | null;
  personAssignments: TimelineAssignment[];
  // Person metadata
  personGrade: string | null;
  personRole: string | null;
  personEmail: string | null;
  personOrgUnit: string | null;
  personManager: string | null;
  personPool: string | null;
  personSkills: string[];
  personEmploymentStatus: string | null;
  priority: string | null;
  skills: string[];
  headcountRequired: number | null;
  headcountFulfilled: number | null;
  requestedByName: string | null;
  summary: string | null;
}

export interface SupplyDemandMetrics {
  totalPeople: number;
  availableFte: number;
  benchCount: number;
  totalHeadcountRequired: number;
  headcountFulfilled: number;
  headcountOpen: number;
  gapHc: number;
  fillRatePercent: number;
  avgDaysToFulfil: number;
}

export interface StaffingDeskKpis {
  activeAssignments: number;
  openRequests: number;
  avgAllocationPercent: number;
  overallocatedPeople: number;
}

export interface StaffingDeskResponse {
  items: StaffingDeskRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  kpis: StaffingDeskKpis;
  supplyDemand: SupplyDemandMetrics;
}

export interface StaffingDeskQuery {
  kind?: string;
  person?: string;
  personId?: string;
  project?: string;
  projectId?: string;
  poolId?: string;
  orgUnitId?: string;
  status?: string;
  priority?: string;
  role?: string;
  skills?: string;
  from?: string;
  to?: string;
  allocMin?: string;
  allocMax?: string;
  sortBy?: string;
  sortDir?: string;
  page?: string;
  pageSize?: string;
}

/* ── API ── */

export async function fetchStaffingDesk(query: StaffingDeskQuery): Promise<StaffingDeskResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return httpGet<StaffingDeskResponse>(`/staffing-desk${qs ? `?${qs}` : ''}`);
}

/* ── Supply Profile ── */

export interface SupplyPerson {
  personId: string;
  displayName: string;
  grade: string | null;
  skills: string[];
  currentAllocationPercent: number;
  availablePercent: number;
  poolName: string | null;
}

export interface SupplyProfileResponse {
  totalPeople: number;
  availablePeople: number;
  benchPeople: number;
  skillDistribution: Array<{ skill: string; peopleCount: number; avgAvailability: number }>;
  gradeDistribution: Array<{ grade: string; count: number }>;
  people: SupplyPerson[];
}

export async function fetchSupplyProfile(params?: { poolId?: string; orgUnitId?: string }): Promise<SupplyProfileResponse> {
  const qs = new URLSearchParams();
  if (params?.poolId) qs.set('poolId', params.poolId);
  if (params?.orgUnitId) qs.set('orgUnitId', params.orgUnitId);
  const q = qs.toString();
  return httpGet<SupplyProfileResponse>(`/staffing-desk/supply-profile${q ? `?${q}` : ''}`);
}

/* ── Demand Profile ── */

export interface SkillGapEntry {
  skill: string;
  headcountNeeded: number;
  availableSupply: number;
  gap: number;
}

export interface DemandRequest {
  requestId: string;
  projectName: string;
  role: string;
  allocationPercent: number;
  priority: string;
  skills: string[];
  headcountRequired: number;
  headcountFulfilled: number;
  startDate: string;
  endDate: string;
  daysOpen: number;
}

export interface DemandProfileResponse {
  totalRequests: number;
  totalHeadcountNeeded: number;
  headcountOpen: number;
  skillDemand: SkillGapEntry[];
  priorityBreakdown: Array<{ priority: string; headcount: number }>;
  requests: DemandRequest[];
}

/* ── Team Builder ── */

export interface TeamBuilderRoleInput {
  role: string;
  skills: string[];
  allocationPercent: number;
  headcount: number;
}

export interface TeamBuilderCandidate {
  personId: string;
  displayName: string;
  score: number;
  currentAllocationPercent: number;
  availableCapacityPercent: number;
  matchedSkills: string[];
}

export interface TeamBuilderResponse {
  suggestions: Array<{
    role: string;
    candidates: TeamBuilderCandidate[];
  }>;
}

export async function buildTeam(request: { projectId: string; roles: TeamBuilderRoleInput[] }): Promise<TeamBuilderResponse> {
  return httpPost<TeamBuilderResponse, typeof request>('/staffing-desk/team-builder', request);
}

/* ── Bench Dashboard ── */

export interface BenchKpis {
  benchCount: number;
  benchRate: number;
  avgDaysOnBench: number;
  atRiskCount: number;
  totalPeople: number;
  longestBenchDays: number;
}

export interface BenchAgingBucket {
  label: string;
  count: number;
  people: Array<{ personId: string; displayName: string; daysOnBench: number }>;
}

export interface BenchRollOff {
  personId: string;
  displayName: string;
  grade: string | null;
  skills: string[];
  assignmentEndDate: string;
  projectName: string;
  allocationPercent: number;
  daysUntilRollOff: number;
  hasFollowOn: boolean;
}

export interface BenchPersonItem {
  personId: string;
  displayName: string;
  grade: string | null;
  role: string | null;
  skills: Array<{ name: string; proficiency: number }>;
  poolName: string | null;
  orgUnitName: string | null;
  managerName: string | null;
  availablePercent: number;
  benchStartDate: string;
  daysOnBench: number;
  lastProjectName: string | null;
  lastProjectEndDate: string | null;
  bestMatchRequestId: string | null;
  bestMatchScore: number | null;
  bestMatchRole: string | null;
}

export interface BenchDistribution {
  byGrade: Array<{ label: string; count: number }>;
  bySkill: Array<{ label: string; count: number }>;
  byPool: Array<{ label: string; count: number }>;
  byOrgUnit: Array<{ label: string; count: number }>;
}

export interface BenchTrendWeek {
  week: string;
  benchCount: number;
  benchRate: number;
}

export interface BenchDashboardResponse {
  kpis: BenchKpis;
  agingBuckets: BenchAgingBucket[];
  rollOffs: BenchRollOff[];
  benchPeople: BenchPersonItem[];
  distribution: BenchDistribution;
  trend: BenchTrendWeek[];
}

export async function fetchBenchDashboard(params?: { poolId?: string; orgUnitId?: string; weeks?: number }): Promise<BenchDashboardResponse> {
  const qs = new URLSearchParams();
  if (params?.poolId) qs.set('poolId', params.poolId);
  if (params?.orgUnitId) qs.set('orgUnitId', params.orgUnitId);
  if (params?.weeks) qs.set('weeks', String(params.weeks));
  const q = qs.toString();
  return httpGet<BenchDashboardResponse>(`/staffing-desk/bench${q ? `?${q}` : ''}`);
}

/* ── Project Timeline ── */

export interface TimelineAssignmentBlock {
  assignmentId: string;
  personId: string;
  personName: string;
  allocationPercent: number;
  status: string;
}

export interface TimelineRequestBlock {
  requestId: string;
  role: string;
  allocationPercent: number;
  priority: string;
  headcountOpen: number;
}

export interface ProjectWeekData {
  weekStart: string;
  assignments: TimelineAssignmentBlock[];
  totalSupplyPercent: number;
  requests: TimelineRequestBlock[];
  totalDemandPercent: number;
}

export interface ProjectTimelineRow {
  projectId: string;
  projectName: string;
  weekData: ProjectWeekData[];
  totalAssignments: number;
  totalOpenRequests: number;
}

export interface BenchPerson {
  personId: string;
  personName: string;
  availablePercent: number;
  skills: string[];
}

export interface ProjectTimelineResponse {
  weeks: string[];
  projects: ProjectTimelineRow[];
  bench: BenchPerson[];
}

export async function fetchProjectTimeline(params: {
  from: string;
  weeks?: number;
  poolId?: string;
  projectId?: string;
}): Promise<ProjectTimelineResponse> {
  const qs = new URLSearchParams({ from: params.from });
  if (params.weeks) qs.set('weeks', String(params.weeks));
  if (params.poolId) qs.set('poolId', params.poolId);
  if (params.projectId) qs.set('projectId', params.projectId);
  return httpGet<ProjectTimelineResponse>(`/staffing-desk/project-timeline?${qs}`);
}

export async function fetchDemandProfile(params?: { projectId?: string }): Promise<DemandProfileResponse> {
  const qs = new URLSearchParams();
  if (params?.projectId) qs.set('projectId', params.projectId);
  const q = qs.toString();
  return httpGet<DemandProfileResponse>(`/staffing-desk/demand-profile${q ? `?${q}` : ''}`);
}
