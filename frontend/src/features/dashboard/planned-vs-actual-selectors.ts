import type {
  AssignedButNoEvidenceItem,
  ComparisonAnomalyItem,
  EvidenceButNoApprovedAssignmentItem,
  MatchedRecordItem,
  PlannedVsActualResponse,
  ProjectPvaSummary,
  OrgUnitPvaSummary,
  ResourcePoolPvaSummary,
  UnstaffedProject,
} from '@/lib/api/planned-vs-actual';
import type { StatusTone } from '@/components/common/StatusBadge';

/* ── KPI summary ───────────────────────────────────────────────── */

export interface PvaKpis {
  alignmentRate: number;
  matchedCount: number;
  totalRecords: number;
  totalSubmittedHours: number;
  pendingPipelineHours: number;
  staffingGaps: number;
  overSubmittedCount: number;
  riskProjectCount: number;
  anomalyCount: number;
  missingPersonCount: number;
}

export function buildPvaKpis(data: PlannedVsActualResponse): PvaKpis {
  const matchedCount = data.matchedRecords.length;
  const totalRecords = matchedCount + data.assignedButNoEvidence.length + data.evidenceButNoApprovedAssignment.length;
  const alignmentRate = totalRecords > 0 ? Math.round((matchedCount / totalRecords) * 100) : 0;

  const ts = data.timesheetStatusSummary;
  const totalSubmittedHours = ts.approvedHours + ts.submittedHours;
  const pendingPipelineHours = ts.draftHours + ts.submittedHours;

  const overSubmittedCount = data.projectSummaries.filter((p) => p.overSubmitted).length;
  const riskProjectCount = data.projectSummaries.filter((p) => Math.abs(p.variancePercent) > 10).length;

  return {
    alignmentRate,
    matchedCount,
    totalRecords,
    totalSubmittedHours: Math.round(totalSubmittedHours * 10) / 10,
    pendingPipelineHours: Math.round(pendingPipelineHours * 10) / 10,
    staffingGaps: data.staffingCoverage.totalUnfilledHeadcount,
    overSubmittedCount,
    riskProjectCount,
    anomalyCount: data.anomalies.length,
    missingPersonCount: ts.missingPersonCount,
  };
}

/* ── Project variance rows (hero chart) ───────────────────────── */

export interface ProjectVarianceRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  plannedHours: number;
  approvedHours: number;
  submittedHours: number;
  draftHours: number;
  totalActualHours: number;
  variance: number;
  variancePercent: number;
  overSubmitted: boolean;
}

export function buildProjectVarianceRows(data: PlannedVsActualResponse): ProjectVarianceRow[] {
  return data.projectSummaries
    .map((p) => ({
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      plannedHours: p.plannedHours,
      approvedHours: p.approvedHours,
      submittedHours: p.submittedHours,
      draftHours: p.draftHours,
      totalActualHours: p.totalActualHours,
      variance: p.variance,
      variancePercent: p.variancePercent,
      overSubmitted: p.overSubmitted,
    }))
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
}

/* ── Timesheet pipeline (stacked bar data) ────────────────────── */

export interface TimesheetPipelineRow {
  projectId: string;
  projectCode: string;
  projectName: string;
  approved: number;
  submitted: number;
  draft: number;
  total: number;
}

export function buildTimesheetPipelineRows(data: PlannedVsActualResponse, limit = 10): TimesheetPipelineRow[] {
  return data.projectSummaries
    .map((p) => ({
      projectId: p.projectId,
      projectCode: p.projectCode,
      projectName: p.projectName,
      approved: p.approvedHours,
      submitted: p.submittedHours,
      draft: p.draftHours,
      total: p.approvedHours + p.submittedHours + p.draftHours,
    }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/* ── Staffing gap rows ────────────────────────────────────────── */

export function buildStaffingGapRows(data: PlannedVsActualResponse): UnstaffedProject[] {
  return data.staffingCoverage.unstaffedProjects
    .sort((a, b) => b.unfilledHeadcount - a.unfilledHeadcount);
}

/* ── Org unit submission rows ─────────────────────────────────── */

export function buildOrgSubmissionRows(data: PlannedVsActualResponse): OrgUnitPvaSummary[] {
  return [...data.orgUnitSummaries]
    .filter((o) => o.plannedHours > 0)
    .sort((a, b) => a.submissionRate - b.submissionRate);
}

/* ── Resource pool submission rows ────────────────────────────── */

export function buildPoolSubmissionRows(data: PlannedVsActualResponse): ResourcePoolPvaSummary[] {
  return [...data.resourcePoolSummaries]
    .filter((p) => p.plannedHours > 0)
    .sort((a, b) => a.submissionRate - b.submissionRate);
}

/* ── Over-submitted projects ──────────────────────────────────── */

export function buildOverSubmittedRows(data: PlannedVsActualResponse): ProjectPvaSummary[] {
  return data.projectSummaries
    .filter((p) => p.overSubmitted)
    .sort((a, b) => b.variance - a.variance);
}

/* ── Variance explorer (3+1 dimensions) ───────────────────────── */

export interface VarianceExplorerRow {
  actual: number;
  gap: number;
  id: string;
  label: string;
  planned: number;
  silent: number;
}

export function buildVarianceExplorerDimensions(
  data: PlannedVsActualResponse,
  standardHoursPerWeek: number,
  personLookup: Map<string, { department?: string; departmentId?: string; pool?: string; poolId?: string }>,
): Record<'person' | 'project' | 'department' | 'pool', VarianceExplorerRow[]> {
  type Acc = { actual: number; planned: number; silent: number };
  const byPerson = new Map<string, Acc & { label: string }>();
  const byProject = new Map<string, Acc & { label: string }>();
  const byDept = new Map<string, Acc & { label: string }>();
  const byPool = new Map<string, Acc & { label: string }>();

  function getOrCreate(map: Map<string, Acc & { label: string }>, id: string, label: string): Acc & { label: string } {
    let row = map.get(id);
    if (!row) { row = { actual: 0, label, planned: 0, silent: 0 }; map.set(id, row); }
    return row;
  }

  function deptOf(personId: string): { id: string; name: string } {
    const p = personLookup.get(personId);
    return { id: p?.departmentId ?? 'unassigned', name: p?.department ?? 'Unassigned' };
  }

  function poolOf(personId: string): { id: string; name: string } {
    const p = personLookup.get(personId);
    return { id: p?.poolId ?? 'unassigned', name: p?.pool ?? 'Unassigned' };
  }

  for (const r of data.matchedRecords) {
    const hrs = r.allocationPercent * (standardHoursPerWeek / 100);
    getOrCreate(byPerson, r.person.id, r.person.displayName).planned += hrs;
    getOrCreate(byPerson, r.person.id, r.person.displayName).actual += r.effortHours;
    getOrCreate(byProject, r.project.id, r.project.name).planned += hrs;
    getOrCreate(byProject, r.project.id, r.project.name).actual += r.effortHours;
    const dept = deptOf(r.person.id);
    getOrCreate(byDept, dept.id, dept.name).planned += hrs;
    getOrCreate(byDept, dept.id, dept.name).actual += r.effortHours;
    const pool = poolOf(r.person.id);
    getOrCreate(byPool, pool.id, pool.name).planned += hrs;
    getOrCreate(byPool, pool.id, pool.name).actual += r.effortHours;
  }

  for (const r of data.assignedButNoEvidence) {
    const hrs = r.allocationPercent * (standardHoursPerWeek / 100);
    getOrCreate(byPerson, r.person.id, r.person.displayName).planned += hrs;
    getOrCreate(byPerson, r.person.id, r.person.displayName).silent += hrs;
    getOrCreate(byProject, r.project.id, r.project.name).planned += hrs;
    getOrCreate(byProject, r.project.id, r.project.name).silent += hrs;
    const dept = deptOf(r.person.id);
    getOrCreate(byDept, dept.id, dept.name).planned += hrs;
    getOrCreate(byDept, dept.id, dept.name).silent += hrs;
    const pool = poolOf(r.person.id);
    getOrCreate(byPool, pool.id, pool.name).planned += hrs;
    getOrCreate(byPool, pool.id, pool.name).silent += hrs;
  }

  for (const r of data.evidenceButNoApprovedAssignment) {
    getOrCreate(byPerson, r.person.id, r.person.displayName).actual += r.effortHours;
    getOrCreate(byProject, r.project.id, r.project.name).actual += r.effortHours;
    const dept = deptOf(r.person.id);
    getOrCreate(byDept, dept.id, dept.name).actual += r.effortHours;
    const pool = poolOf(r.person.id);
    getOrCreate(byPool, pool.id, pool.name).actual += r.effortHours;
  }

  function finalize(map: Map<string, Acc & { label: string }>): VarianceExplorerRow[] {
    return Array.from(map.entries()).map(([id, r]) => ({
      actual: Math.round(r.actual * 10) / 10,
      gap: Math.round((r.actual - r.planned) * 10) / 10,
      id,
      label: r.label,
      planned: Math.round(r.planned * 10) / 10,
      silent: Math.round(r.silent * 10) / 10,
    })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
  }

  return { department: finalize(byDept), person: finalize(byPerson), pool: finalize(byPool), project: finalize(byProject) };
}

/* ── Action items (severity-ranked triage table) ───────────────── */

export type PvaSourceCategory = 'anomaly' | 'unapproved' | 'silent' | 'missing';

export interface PvaActionItem {
  activityDate: string | null;
  allocationPercent: number | null;
  assignmentId: string | null;
  category: string;
  hours: number | null;
  href: string;
  id: string;
  impact: string;
  person: string;
  personId: string;
  project: string;
  projectCode: string;
  projectId: string;
  severity: 'Critical' | 'High' | 'Med';
  severityTone: StatusTone;
  sourceCategory: PvaSourceCategory;
  suggestedAction: string;
}

export function buildPvaActionItems(data: PlannedVsActualResponse): PvaActionItem[] {
  const items: PvaActionItem[] = [];

  // Anomalies (Critical)
  for (let i = 0; i < data.anomalies.length; i++) {
    const a = data.anomalies[i];
    items.push({
      activityDate: null,
      allocationPercent: null,
      assignmentId: null,
      category: a.type === 'EVIDENCE_AFTER_ASSIGNMENT_END' ? 'Post-End Time' : 'Actual w/o Assignment',
      hours: null,
      href: `/projects/${a.project.id}`,
      id: `anomaly-${i}-${a.person.id}-${a.project.id}`,
      impact: a.message,
      person: a.person.displayName,
      personId: a.person.id,
      project: a.project.name,
      projectCode: a.project.projectCode,
      projectId: a.project.id,
      severity: 'Critical',
      severityTone: 'danger',
      sourceCategory: 'anomaly',
      suggestedAction: a.type === 'EVIDENCE_AFTER_ASSIGNMENT_END' ? 'Extend or close assignment' : 'Review and assign',
    });
  }

  // Evidence without assignment (High)
  for (const e of data.evidenceButNoApprovedAssignment) {
    items.push({
      activityDate: e.activityDate,
      allocationPercent: null,
      assignmentId: null,
      category: 'Actual w/o Assignment',
      hours: e.effortHours,
      href: `/assignments/new`,
      id: `unapproved-${e.workEvidenceId}`,
      impact: `${e.effortHours}h logged without assignment coverage`,
      person: e.person.displayName,
      personId: e.person.id,
      project: e.project.name,
      projectCode: e.project.projectCode,
      projectId: e.project.id,
      severity: 'High',
      severityTone: 'warning',
      sourceCategory: 'unapproved',
      suggestedAction: 'Create assignment',
    });
  }

  // Assigned but no time (Med)
  for (const a of data.assignedButNoEvidence) {
    items.push({
      activityDate: null,
      allocationPercent: a.allocationPercent,
      assignmentId: a.assignmentId,
      category: 'No Actual Time',
      hours: null,
      href: `/time-management`,
      id: `silent-${a.assignmentId}`,
      impact: `${a.allocationPercent}% allocated, no approved time`,
      person: a.person.displayName,
      personId: a.person.id,
      project: a.project.name,
      projectCode: a.project.projectCode,
      projectId: a.project.id,
      severity: 'Med',
      severityTone: 'info',
      sourceCategory: 'silent',
      suggestedAction: 'Review time submission',
    });
  }

  return items;
}

/** Build action items for people with NO timesheet at all (not even draft). */
export function buildMissingTimesheetItems(
  data: PlannedVsActualResponse,
  personLookup: Map<string, { displayName: string }>,
): PvaActionItem[] {
  return data.timesheetStatusSummary.missingPersonIds.map((pid) => {
    const person = personLookup.get(pid);
    const name = person?.displayName ?? pid;
    return {
      activityDate: null,
      allocationPercent: null,
      assignmentId: null,
      category: 'Missing Timesheet',
      hours: null,
      href: `/people/${pid}`,
      id: `missing-ts-${pid}`,
      impact: `${name} has no timesheet for the period`,
      person: name,
      personId: pid,
      project: '',
      projectCode: '',
      projectId: '',
      severity: 'Med' as const,
      severityTone: 'info' as StatusTone,
      sourceCategory: 'missing' as PvaSourceCategory,
      suggestedAction: 'Contact employee',
    };
  });
}

/* ── Top mismatched projects / people ──────────────────────────── */

export interface MismatchedProjectRow {
  anomalyCount: number;
  noAssignmentCount: number;
  noEvidenceCount: number;
  projectCode: string;
  projectId: string;
  projectName: string;
  totalIssues: number;
}

export function buildTopMismatchedProjects(data: PlannedVsActualResponse, limit = 5): MismatchedProjectRow[] {
  const map = new Map<string, MismatchedProjectRow>();

  const getOrCreate = (id: string, name: string, code: string): MismatchedProjectRow => {
    let row = map.get(id);
    if (!row) {
      row = { anomalyCount: 0, noAssignmentCount: 0, noEvidenceCount: 0, projectCode: code, projectId: id, projectName: name, totalIssues: 0 };
      map.set(id, row);
    }
    return row;
  };

  for (const e of data.evidenceButNoApprovedAssignment) {
    const row = getOrCreate(e.project.id, e.project.name, e.project.projectCode);
    row.noAssignmentCount++;
    row.totalIssues++;
  }
  for (const a of data.assignedButNoEvidence) {
    const row = getOrCreate(a.project.id, a.project.name, a.project.projectCode);
    row.noEvidenceCount++;
    row.totalIssues++;
  }
  for (const a of data.anomalies) {
    const row = getOrCreate(a.project.id, a.project.name, a.project.projectCode);
    row.anomalyCount++;
    row.totalIssues++;
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalIssues - a.totalIssues)
    .slice(0, limit);
}

export interface MismatchedPersonRow {
  anomalyCount: number;
  noAssignmentCount: number;
  noEvidenceCount: number;
  personId: string;
  personName: string;
  totalIssues: number;
}

export function buildTopMismatchedPeople(data: PlannedVsActualResponse, limit = 5): MismatchedPersonRow[] {
  const map = new Map<string, MismatchedPersonRow>();

  const getOrCreate = (id: string, name: string): MismatchedPersonRow => {
    let row = map.get(id);
    if (!row) {
      row = { anomalyCount: 0, noAssignmentCount: 0, noEvidenceCount: 0, personId: id, personName: name, totalIssues: 0 };
      map.set(id, row);
    }
    return row;
  };

  for (const e of data.evidenceButNoApprovedAssignment) {
    const row = getOrCreate(e.person.id, e.person.displayName);
    row.noAssignmentCount++;
    row.totalIssues++;
  }
  for (const a of data.assignedButNoEvidence) {
    const row = getOrCreate(a.person.id, a.person.displayName);
    row.noEvidenceCount++;
    row.totalIssues++;
  }
  for (const a of data.anomalies) {
    const row = getOrCreate(a.person.id, a.person.displayName);
    row.anomalyCount++;
    row.totalIssues++;
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalIssues - a.totalIssues)
    .slice(0, limit);
}
