import { httpDelete, httpGet, httpPatch, httpPost } from './http-client';

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

/* ── Workforce Planner ── */

export interface PlannerAssignmentBlock {
  assignmentId: string;
  personId: string;
  personName: string;
  staffingRole: string;
  allocationPercent: number;
  status: string;
  costPerMonth: number | null;
}

export interface PlannerDemandBlock {
  requestId: string | null;
  rolePlanId: string | null;
  role: string;
  skills: string[];
  allocationPercent: number;
  headcountOpen: number;
  priority: string | null;
}

export interface PlannerProjectWeek {
  weekStart: string;
  assignments: PlannerAssignmentBlock[];
  demands: PlannerDemandBlock[];
  totalSupplyPercent: number;
  totalDemandPercent: number;
}

export interface PlannerProjectRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: string;
  startsOn: string | null;
  endsOn: string | null;
  filledHc: number;
  requiredHc: number;
  weekData: PlannerProjectWeek[];
}

export interface PlannerBenchPerson {
  personId: string;
  displayName: string;
  grade: string | null;
  skills: string[];
  daysOnBench: number;
  availablePercent: number;
  costPerMonth: number | null;
}

export interface PlannerRollOff {
  personId: string;
  displayName: string;
  projectName: string;
  projectId: string;
  assignmentEndDate: string;
  allocationPercent: number;
  daysUntilRollOff: number;
  hasFollowOn: boolean;
}

export interface PlannerSkillGap {
  skill: string;
  needed: number;
  available: number;
  gap: number;
}

export interface WorkforcePlannerResponse {
  weeks: string[];
  projects: PlannerProjectRow[];
  supply: { totalFte: number; benchPeople: PlannerBenchPerson[]; rollOffs: PlannerRollOff[] };
  demand: { totalHcRequired: number; bySkill: PlannerSkillGap[]; draftProjectDemand: number };
  budget: { enabled: boolean; baselineMonthlyCost: number; avgCostPerFte: number };
}

export async function fetchWorkforcePlanner(params: {
  from: string;
  weeks?: number;
  includeDrafts?: boolean;
  poolId?: string;
  orgUnitId?: string;
  projectStatuses?: Array<'ACTIVE' | 'DRAFT' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED'>;
  priorities?: Array<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>;
}): Promise<WorkforcePlannerResponse> {
  const qs = new URLSearchParams({ from: params.from });
  if (params.weeks) qs.set('weeks', String(params.weeks));
  if (params.includeDrafts) qs.set('includeDrafts', 'true');
  if (params.poolId) qs.set('poolId', params.poolId);
  if (params.orgUnitId) qs.set('orgUnitId', params.orgUnitId);
  if (params.projectStatuses && params.projectStatuses.length > 0) qs.set('projectStatuses', params.projectStatuses.join(','));
  if (params.priorities && params.priorities.length > 0) qs.set('priorities', params.priorities.join(','));
  return httpGet<WorkforcePlannerResponse>(`/staffing-desk/planner?${qs}`);
}

/* ── Planner Auto-Match & Apply ── */

export type AutoMatchStrategy = 'BALANCED' | 'BEST_FIT' | 'UTILIZE_BENCH' | 'CHEAPEST' | 'GROWTH';
export type CellClass = 'SUGGESTED' | 'ACCEPTABLE' | 'MISMATCH' | 'BLOCKED';
export type ProjectStatusFilter = 'ACTIVE' | 'DRAFT' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED';
export type PriorityFilter = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AutoMatchSuggestion {
  benchPersonId: string;
  benchPersonName: string;
  targetProjectId: string;
  targetProjectName: string;
  demandId: string;
  demandRole: string;
  demandSkills: string[];
  matchedSkills: string[];
  mismatchedSkills: string[];
  matchScore: number;
  cellClass: CellClass;
  rationale: string;
  constraintWarnings: string[];
  weekStart: string;
  /** All Monday-aligned weeks this person covers for the demand. */
  coverageWeeks: string[];
  allocationPercent: number;
  /** True when the candidate was picked via longest-bench fallback (no skill match). */
  fallbackUsed: boolean;
}

export interface UnmatchedDemand {
  demandId: string;
  role: string;
  skills: string[];
  headcountOpen: number;
  projectName: string;
  reason?: string;
}

export interface AutoMatchSummary {
  strategy: AutoMatchStrategy;
  totalDemand: number;
  assignedCount: number;
  unmatchedCount: number;
  strongCount: number;
  mediumCount: number;
  mismatchCount: number;
  avgMatchScore: number;
  estimatedMonthlyCostImpact: number;
  coverageLiftPercent: number;
}

export interface AutoMatchDiagnostics {
  projectsWithOpenDemand: number;
  projectsInScope: number;
  totalHeadcountScanned: number;
  headcountInScope: number;
  headcountSkippedProjectStatus: number;
  headcountSkippedHorizon: number;
  headcountSkippedPriority: number;
  totalActivePeople: number;
  benchInScope: number;
  suggestionsCreated: number;
  chainedCount: number;
  fallbackCount: number;
  unmatchedHeadcount: number;
}

export interface AutoMatchResult {
  strategy: AutoMatchStrategy;
  summary: AutoMatchSummary;
  suggestions: AutoMatchSuggestion[];
  unmatchedDemand: UnmatchedDemand[];
  diagnostics: AutoMatchDiagnostics;
}

export interface AutoMatchRequest {
  strategy?: AutoMatchStrategy;
  demandIds?: string[];
  lockedPersonIds?: string[];
  /** Monday-aligned ISO date of first visible week. Filters demand to the grid horizon. */
  from?: string;
  /** Grid horizon in weeks. */
  weeks?: number;
  /** Minimum skill-match score (0.0–1.0) — candidates below this are rejected. Default 0.15. Ignored for GROWTH strategy. */
  minSkillMatch?: number;
  /** Include DRAFT projects so their demand is matched too (mirrors grid toggle). */
  includeDrafts?: boolean;
  /** Project statuses in scope; must match the grid's filter. */
  projectStatuses?: ProjectStatusFilter[];
  /** StaffingRequest priorities to include. */
  priorities?: PriorityFilter[];
  /** Resource pool scope for bench people. */
  poolId?: string;
  /** Org unit scope for bench people. */
  orgUnitId?: string;
}

export async function fetchAutoMatch(request: AutoMatchRequest = {}): Promise<AutoMatchResult> {
  return httpPost<AutoMatchResult, AutoMatchRequest>('/staffing-desk/planner/auto-match', request);
}

export interface PlannerDispatchInput {
  personId: string;
  projectId: string;
  staffingRole: string;
  allocationPercent: number;
  startDate: string;
  note?: string;
}

export interface PlannerExtensionInput {
  assignmentId: string;
  newValidTo: string;
  note?: string;
}

export interface PlannerApplyRequest {
  actorId: string;
  dispatches: PlannerDispatchInput[];
  hireRequests: Array<{ projectId: string; role: string; skills: string[]; allocationPercent: number; headcount: number; priority: string; startDate: string; endDate: string }>;
  releases: Array<{ personId: string }>;
  extensions?: PlannerExtensionInput[];
}

export interface PlannerApplyResponse {
  assignmentsCreated: number;
  staffingRequestsCreated: number;
  releasesNoted: number;
  extensionsUpdated: number;
  errors: string[];
}

export async function applyPlan(request: PlannerApplyRequest): Promise<PlannerApplyResponse> {
  return httpPost<PlannerApplyResponse, PlannerApplyRequest>('/staffing-desk/planner/apply', request);
}

export type ExtensionConflictKind =
  | 'employment-inactive'
  | 'termination-conflict'
  | 'project-end-overrun'
  | 'leave-overlap'
  | 'over-allocation';

export type ExtensionConflictSeverity = 'info' | 'warning' | 'danger';

export interface ExtensionConflict {
  kind: ExtensionConflictKind;
  severity: ExtensionConflictSeverity;
  message: string;
  blocking: boolean;
}

export interface ExtensionValidateRequest {
  assignmentId: string;
  newValidTo: string;
}

export interface ExtensionValidateResponse {
  assignmentId: string;
  personId: string;
  personName: string;
  projectId: string;
  projectName: string;
  currentValidTo: string | null;
  newValidTo: string;
  valid: boolean;
  conflicts: ExtensionConflict[];
}

export async function validateExtension(request: ExtensionValidateRequest): Promise<ExtensionValidateResponse> {
  return httpPost<ExtensionValidateResponse, ExtensionValidateRequest>('/staffing-desk/planner/extension-validate', request);
}

export type WhyNotDisqualifier =
  | 'fully-allocated'
  | 'on-leave'
  | 'missing-skills'
  | 'wrong-grade'
  | 'inactive'
  | 'not-available';

export interface WhyNotCandidate {
  personId: string;
  personName: string;
  grade: string | null;
  availablePercent: number;
  skillScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  disqualifiers: WhyNotDisqualifier[];
  message: string;
}

export interface WhyNotRequest {
  demandId: string;
  topN?: number;
}

export interface WhyNotResponse {
  demandId: string;
  demandRole: string;
  demandSkills: string[];
  demandAllocationPercent: number;
  projectName: string;
  candidates: WhyNotCandidate[];
}

export async function fetchWhyNot(request: WhyNotRequest): Promise<WhyNotResponse> {
  return httpPost<WhyNotResponse, WhyNotRequest>('/staffing-desk/planner/why-not', request);
}

/* ── Planner Scenarios ── */

export interface PlannerScenarioSummary {
  id: string;
  name: string;
  description: string | null;
  createdByPersonId: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  summaryAssignments: number;
  summaryHires: number;
  summaryReleases: number;
  summaryExtensions: number;
  summaryAnomalies: number;
  horizonFrom: string | null;
  horizonWeeks: number | null;
}

export interface PlannerScenarioDetail extends PlannerScenarioSummary {
  state: unknown;
}

export interface CreatePlannerScenarioRequest {
  actorId: string;
  name: string;
  description?: string;
  state: unknown;
  summaryAssignments: number;
  summaryHires: number;
  summaryReleases: number;
  summaryExtensions: number;
  summaryAnomalies: number;
  horizonFrom?: string;
  horizonWeeks?: number;
}

export interface UpdatePlannerScenarioRequest {
  name?: string;
  description?: string;
  state?: unknown;
  summaryAssignments?: number;
  summaryHires?: number;
  summaryReleases?: number;
  summaryExtensions?: number;
  summaryAnomalies?: number;
}

export async function listPlannerScenarios(): Promise<PlannerScenarioSummary[]> {
  return httpGet<PlannerScenarioSummary[]>('/staffing-desk/planner/scenarios');
}

export async function getPlannerScenario(id: string): Promise<PlannerScenarioDetail> {
  return httpGet<PlannerScenarioDetail>(`/staffing-desk/planner/scenarios/${id}`);
}

export async function createPlannerScenario(request: CreatePlannerScenarioRequest): Promise<PlannerScenarioDetail> {
  return httpPost<PlannerScenarioDetail, CreatePlannerScenarioRequest>('/staffing-desk/planner/scenarios', request);
}

export async function updatePlannerScenario(id: string, request: UpdatePlannerScenarioRequest): Promise<PlannerScenarioDetail> {
  return httpPatch<PlannerScenarioDetail, UpdatePlannerScenarioRequest>(`/staffing-desk/planner/scenarios/${id}`, request);
}

export async function archivePlannerScenario(id: string): Promise<{ archived: boolean }> {
  return httpDelete<{ archived: boolean }>(`/staffing-desk/planner/scenarios/${id}`);
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
