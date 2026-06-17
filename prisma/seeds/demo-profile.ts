/**
 * Demo Seed Profile — small, narratable companion to `it-company`.
 *
 * ~25 people / 6 projects, deliberately shaped so EVERY key screen lights up
 * with a story across four arcs:
 *   1. Supply & demand  — bench star, over-allocated person, OPEN/PROPOSED
 *                          positions with ranked candidate slates.
 *   2. Observability    — RED project (Borealis) with missed milestone,
 *                          RED-trending RAG, open HIGH risks; AMBER staffing
 *                          gap (Cygnus); GREEN healthy projects.
 *   3. Approvals/gov.   — 2 SUBMITTED timesheet weeks, 1 PENDING leave,
 *                          1 PENDING BudgetApproval, ONBOARDING + PERFORMANCE
 *                          cases with steps.
 *   4. Money / EVM      — ProjectBudget for all 6 (capex/opex/vendor + EVM
 *                          fields, currency USD); Borealis overrun (CPI<1),
 *                          rest healthy (CPI≈1).
 *
 * ADDITIVE: this file does not touch it-company-profile.ts. It mirrors the
 * it-company export names but with a `demo` prefix and a distinct `dddd`
 * deterministic UUID namespace (same per-model second byte as it-company's
 * `bbbb`). Generators wire every FK programmatically so nothing can dangle.
 */

// ---------------------------------------------------------------------------
// UUID helper — deterministic UUIDs for reproducibility (mirrors it-company).
// ---------------------------------------------------------------------------
const ns = (prefix: string, seq: number): string => {
  const hex = seq.toString(16).padStart(12, '0');
  return `${prefix}-0000-0000-0000-${hex}`;
};

// Namespace prefixes — `dddd*` to avoid collision with it-company (`bbbb*`),
// realistic (`aaaa*`), phase2/demo-dataset (`1111…`/`3333…`), and superadmin (`0000…`).
const P   = 'dddd0001'; // Person
const OU  = 'dddd0002'; // OrgUnit
const POS = 'dddd0003'; // Position
const MEM = 'dddd0004'; // PersonOrgMembership
const RL  = 'dddd0005'; // ReportingLine
const RP  = 'dddd0006'; // ResourcePool
const RPM = 'dddd0007'; // ResourcePoolMembership
const PRJ = 'dddd0008'; // Project
const PP  = 'dddd0009'; // ProjectPosition (assignment-derived + demand)
const AHI = 'dddd000b'; // ProjectPositionFillHistory
const WES = 'dddd000c'; // WorkEvidenceSource
const WEV = 'dddd000d'; // WorkEvidence
const WEL = 'dddd000e'; // WorkEvidenceLink
const PEL = 'dddd000f'; // ProjectExternalLink
const ESS = 'dddd0010'; // ExternalSyncState
const RAG = 'dddd0014'; // ProjectRagSnapshot
const MIL = 'dddd0015'; // ProjectMilestone
const CR  = 'dddd0016'; // ProjectChangeRequest
const PB  = 'dddd0017'; // ProjectBudget
const PRP = 'dddd0018'; // ProjectRolePlan
const RSK = 'dddd0019'; // ProjectRisk
const TS  = 'dddd001a'; // TimesheetWeek
const TE  = 'dddd001b'; // TimesheetEntry
const PE  = 'dddd001c'; // PulseEntry
const LR  = 'dddd001d'; // LeaveRequest
const NOT = 'dddd001e'; // InAppNotification
const CSE = 'dddd001f'; // CaseRecord
const CSP = 'dddd0020'; // CaseStep
const RET = 'dddd0022'; // ProjectRetrospective
const CLI = 'dddd0024'; // Client
const CON = 'dddd0025'; // Contact
const EMP = 'dddd0026'; // EmploymentEvent
const BAP = 'dddd0027'; // BudgetApproval
const PPC = 'dddd0028'; // ProjectPositionCandidate

// ---------------------------------------------------------------------------
// Time anchors — fixed NOW so the dataset is fully deterministic.
// ---------------------------------------------------------------------------
const NOW = new Date('2026-06-16T00:00:00.000Z');

function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}
function monthsAgo(n: number): Date {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
function weekMonday(weeksAgo: number): Date {
  const d = new Date(NOW);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff - weeksAgo * 7);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function mondayOf(d: Date): Date {
  const out = new Date(d);
  const day = out.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setUTCDate(out.getUTCDate() + diff);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addBusinessDays(start: Date, days: number): Date {
  const out = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    out.setUTCDate(out.getUTCDate() + 1);
    const dow = out.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// PEOPLE — ~25 people. 8 leadership/role-test + 17 ICs.
// ---------------------------------------------------------------------------
interface PersonDef {
  id: string;
  personNumber: string;
  givenName: string;
  familyName: string;
  displayName: string;
  primaryEmail: string;
  grade: string;
  role: string;
  skillsets: string[];
  employmentStatus: 'ACTIVE' | 'LEAVE' | 'INACTIVE' | 'TERMINATED';
  hiredAt: Date;
  terminatedAt: Date | null;
  managerId: string | null;
  orgUnitId: string; // filled later
}

let pSeq = 0;
const pid = (): string => ns(P, ++pSeq);
const people: PersonDef[] = [];

function pushPerson(def: Omit<PersonDef, 'id' | 'personNumber' | 'displayName' | 'orgUnitId'>): PersonDef {
  const id = pid();
  const personNumber = `DEMO-${pSeq.toString().padStart(3, '0')}`;
  const displayName = `${def.givenName} ${def.familyName}`;
  const p: PersonDef = { ...def, id, personNumber, displayName, orgUnitId: '' };
  people.push(p);
  return p;
}

// --- Leadership + named role-test accounts ---

// CEO
const ceo = pushPerson({
  givenName: 'Olivia', familyName: 'Hart',
  primaryEmail: 'olivia.hart@demo.local', grade: 'G14', role: 'CEO',
  skillsets: ['LEADERSHIP', 'STRATEGY'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(60), terminatedAt: null, managerId: null,
});

// Delivery Director (maps to LocalAccount role `director`)
const director = pushPerson({
  givenName: 'Daniel', familyName: 'Cross',
  primaryEmail: 'daniel.cross@demo.local', grade: 'G13', role: 'Delivery Director',
  skillsets: ['DELIVERY', 'LEADERSHIP'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(48), terminatedAt: null, managerId: ceo.id,
});

// HR Manager (maps to `hr_manager`)
const hr = pushPerson({
  givenName: 'Hannah', familyName: 'Reyes',
  primaryEmail: 'hannah.reyes@demo.local', grade: 'G11', role: 'HR Manager',
  skillsets: ['HR', 'COMPLIANCE'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(40), terminatedAt: null, managerId: ceo.id,
});

// Resource Manager (maps to `resource_manager`)
const rm = pushPerson({
  givenName: 'Ravi', familyName: 'Menon',
  primaryEmail: 'ravi.menon@demo.local', grade: 'G11', role: 'Resource Manager',
  skillsets: ['STAFFING', 'PLANNING'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(36), terminatedAt: null, managerId: director.id,
});

// Project Manager 1 (maps to `project_manager`)
const pm1 = pushPerson({
  givenName: 'Priya', familyName: 'Shah',
  primaryEmail: 'priya.shah@demo.local', grade: 'G10', role: 'Project Manager',
  skillsets: ['DELIVERY', 'AGILE'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(30), terminatedAt: null, managerId: director.id,
});

// Project Manager 2 (no account, but a second PM for portfolio spread)
const pm2 = pushPerson({
  givenName: 'Pedro', familyName: 'Alvarez',
  primaryEmail: 'pedro.alvarez@demo.local', grade: 'G10', role: 'Project Manager',
  skillsets: ['DELIVERY', 'AGILE'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(28), terminatedAt: null, managerId: director.id,
});

// Delivery Manager (maps to `delivery_manager`)
const dm = pushPerson({
  givenName: 'Dana', familyName: 'Whitfield',
  primaryEmail: 'dana.whitfield@demo.local', grade: 'G11', role: 'Delivery Manager',
  skillsets: ['DELIVERY', 'PORTFOLIO'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(32), terminatedAt: null, managerId: director.id,
});

// --- ICs (17). One bench star, one over-allocated, the rest a healthy mix. ---
// Generated explicitly so each one is narratable. managerId set to dm.

interface IcSpec {
  given: string; family: string; grade: string; role: string; skillsets: string[];
}
const icSpecs: IcSpec[] = [
  // Bench star (index 0): high grade, rich skills, NO active position.
  { given: 'Bella', family: 'Nguyen', grade: 'G12', role: 'Architect',        skillsets: ['ARCHITECTURE', 'CLOUD'] },
  // Over-allocated (index 1): assigned to two positions summing >100%.
  { given: 'Owen',  family: 'Park',   grade: 'G11', role: 'Senior Engineer',  skillsets: ['BACKEND', 'CLOUD'] },
  // The healthy mix.
  { given: 'Ethan',  family: 'Brooks',  grade: 'G9',  role: 'Mid Engineer',     skillsets: ['BACKEND'] },     // employee account
  { given: 'Sofia',  family: 'Diaz',    grade: 'G10', role: 'Senior Engineer',  skillsets: ['FRONTEND'] },
  { given: 'Marco',  family: 'Bianchi', grade: 'G9',  role: 'Mid Engineer',     skillsets: ['FRONTEND'] },
  { given: 'Leah',   family: 'Stone',   grade: 'G8',  role: 'Junior Engineer',  skillsets: ['BACKEND'] },
  { given: 'Kai',    family: 'Tanaka',  grade: 'G10', role: 'Senior Engineer',  skillsets: ['DATA'] },
  { given: 'Aisha',  family: 'Khan',    grade: 'G9',  role: 'Mid Engineer',     skillsets: ['DATA'] },
  { given: 'Tom',    family: 'Fisher',  grade: 'G9',  role: 'DevOps Engineer',  skillsets: ['DEVOPS', 'CLOUD'] },
  { given: 'Nina',   family: 'Larsen',  grade: 'G8',  role: 'QA Engineer',      skillsets: ['QA'] },
  { given: 'Jonah',  family: 'Reed',    grade: 'G9',  role: 'QA Engineer',      skillsets: ['QA'] },
  { given: 'Maya',   family: 'Patel',   grade: 'G10', role: 'Designer',         skillsets: ['DESIGN'] },
  { given: 'Felix',  family: 'Berg',    grade: 'G9',  role: 'Mid Engineer',     skillsets: ['BACKEND'] },
  { given: 'Grace',  family: 'Wu',      grade: 'G10', role: 'Senior Engineer',  skillsets: ['BACKEND', 'DATA'] },
  { given: 'Oscar',  family: 'Lindgren',grade: 'G8',  role: 'Junior Engineer',  skillsets: ['FRONTEND'] },
  { given: 'Ivy',    family: 'Romano',  grade: 'G9',  role: 'Mid Engineer',     skillsets: ['FRONTEND'] },
  { given: 'Sam',    family: 'Okafor',  grade: 'G10', role: 'Senior Engineer',  skillsets: ['DEVOPS', 'BACKEND'] },
];

const ics: PersonDef[] = icSpecs.map((s, i) =>
  pushPerson({
    givenName: s.given, familyName: s.family,
    primaryEmail: `${s.given.toLowerCase()}.${s.family.toLowerCase()}@demo.local`,
    grade: s.grade, role: s.role, skillsets: s.skillsets,
    employmentStatus: 'ACTIVE',
    hiredAt: monthsAgo(6 + (i % 12)),
    terminatedAt: null, managerId: dm.id,
  }),
);

const benchStar = ics[0];
const overAllocated = ics[1];
const employee = ics[2]; // Ethan Brooks — `employee` account

// ---------------------------------------------------------------------------
// ORG UNITS — root → Delivery directorate → 4 departments.
// ---------------------------------------------------------------------------
let ouSeq = 0;
const ouid = (): string => ns(OU, ++ouSeq);

const ouRoot = ouid();      // Demo Co (root)
const ouDelDir = ouid();    // Delivery Directorate
const ouBackend = ouid();   // Backend
const ouFrontend = ouid();  // Frontend
const ouDesignQa = ouid();  // Design & QA
const ouPmo = ouid();       // PMO

interface OrgUnitDef {
  id: string;
  code: string;
  name: string;
  description: string;
  parentOrgUnitId: string | null;
  managerPersonId: string;
  kind: string;
}

const orgUnits: OrgUnitDef[] = [
  { id: ouRoot, code: 'DEMO', name: 'Demo Co', description: 'Demo company root', parentOrgUnitId: null, managerPersonId: ceo.id, kind: 'root' },
  { id: ouDelDir, code: 'DEL-DIR', name: 'Delivery Directorate', description: 'All delivery departments', parentOrgUnitId: ouRoot, managerPersonId: director.id, kind: 'directorate' },
  { id: ouBackend, code: 'DEP-BE', name: 'Backend', description: 'Server-side engineering', parentOrgUnitId: ouDelDir, managerPersonId: ics[1].id, kind: 'department' },
  { id: ouFrontend, code: 'DEP-FE', name: 'Frontend', description: 'Client-side engineering', parentOrgUnitId: ouDelDir, managerPersonId: ics[3].id, kind: 'department' },
  { id: ouDesignQa, code: 'DEP-DQ', name: 'Design & QA', description: 'Design + QA', parentOrgUnitId: ouDelDir, managerPersonId: ics[11].id, kind: 'department' },
  { id: ouPmo, code: 'DEP-PMO', name: 'PMO', description: 'PMs + RM + Delivery Manager', parentOrgUnitId: ouDelDir, managerPersonId: pm1.id, kind: 'department' },
];

function orgFor(p: PersonDef): string {
  if (p.id === ceo.id) return ouRoot;
  if (p.id === director.id) return ouDelDir;
  if (p.role === 'HR Manager') return ouPmo;
  if (p.role === 'Resource Manager' || p.role === 'Project Manager' || p.role === 'Delivery Manager') return ouPmo;
  if (p.role === 'Designer' || p.role === 'QA Engineer') return ouDesignQa;
  if (p.skillsets.includes('FRONTEND')) return ouFrontend;
  return ouBackend;
}
people.forEach((p) => { p.orgUnitId = orgFor(p); });

// ---------------------------------------------------------------------------
// POSITIONS (HR positions) — one per person.
// ---------------------------------------------------------------------------
let posSeq = 0;
const posid = (): string => ns(POS, ++posSeq);

const MANAGERIAL_ROLES = ['CEO', 'Delivery Director', 'Project Manager', 'Delivery Manager', 'Resource Manager', 'HR Manager'];

const positions = people.map((p) => ({
  id: posid(),
  orgUnitId: p.orgUnitId,
  occupantPersonId: p.id,
  code: p.personNumber,
  title: p.role,
  description: `${p.role} in ${orgUnits.find((o) => o.id === p.orgUnitId)?.name ?? 'org'}`,
  isManagerial: MANAGERIAL_ROLES.includes(p.role),
  validFrom: p.hiredAt,
  validTo: p.terminatedAt,
  createdAt: p.hiredAt,
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// PERSON ORG MEMBERSHIPS — one per person.
// ---------------------------------------------------------------------------
let memSeq = 0;
const memid = (): string => ns(MEM, ++memSeq);

const personOrgMemberships = people.map((p, i) => ({
  id: memid(),
  personId: p.id,
  orgUnitId: p.orgUnitId,
  positionId: positions[i].id,
  isPrimary: true,
  validFrom: p.hiredAt,
  validTo: p.terminatedAt,
  createdAt: p.hiredAt,
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// REPORTING LINES — solid line for every non-top person + a couple dotted.
// ---------------------------------------------------------------------------
let rlSeq = 0;
const rlid = (): string => ns(RL, ++rlSeq);

const reportingLines = people
  .filter((p) => p.managerId)
  .map((p) => ({
    id: rlid(),
    subjectPersonId: p.id,
    managerPersonId: p.managerId!,
    relationshipType: 'SOLID_LINE',
    authority: 'APPROVER',
    isPrimary: true,
    validFrom: p.hiredAt,
    validTo: p.terminatedAt,
    createdAt: p.hiredAt,
    updatedAt: NOW,
  }));

// 2 dotted-line examples for cross-org visibility.
([
  [rm.id, director.id],
  [pm1.id, director.id],
] as Array<[string, string]>).forEach(([subject, mgr]) => {
  reportingLines.push({
    id: rlid(),
    subjectPersonId: subject,
    managerPersonId: mgr,
    relationshipType: 'DOTTED_LINE',
    authority: 'VIEWER',
    isPrimary: false,
    validFrom: monthsAgo(12),
    validTo: null,
    createdAt: monthsAgo(12),
    updatedAt: NOW,
  });
});

// ---------------------------------------------------------------------------
// RESOURCE POOLS — 3 pools (Backend, Frontend, Design&QA).
// ---------------------------------------------------------------------------
let rpSeq = 0;
const rpid = (): string => ns(RP, ++rpSeq);

const rpBackend = rpid();
const rpFrontend = rpid();
const rpDesignQa = rpid();

const resourcePools = [
  { id: rpBackend, orgUnitId: ouBackend, code: 'POOL-BE', name: 'Backend Pool', description: 'Backend engineers' },
  { id: rpFrontend, orgUnitId: ouFrontend, code: 'POOL-FE', name: 'Frontend Pool', description: 'Frontend engineers' },
  { id: rpDesignQa, orgUnitId: ouDesignQa, code: 'POOL-DQ', name: 'Design & QA Pool', description: 'Designers + QA' },
];

let rpmSeq = 0;
const rpmid = (): string => ns(RPM, ++rpmSeq);

const orgToPool: Record<string, string> = {
  [ouBackend]: rpBackend,
  [ouFrontend]: rpFrontend,
  [ouDesignQa]: rpDesignQa,
};

const resourcePoolMemberships = people
  .filter((p) => orgToPool[p.orgUnitId])
  .map((p) => ({
    id: rpmid(),
    personId: p.id,
    resourcePoolId: orgToPool[p.orgUnitId],
    validFrom: p.hiredAt,
    validTo: p.terminatedAt,
    createdAt: p.hiredAt,
    updatedAt: NOW,
  }));

// ---------------------------------------------------------------------------
// CLIENTS — 5 (one per client-facing project; Internal DevPortal has none).
// ---------------------------------------------------------------------------
let cliSeq = 0;
const cliid = (): string => ns(CLI, ++cliSeq);

const cApollo = cliid();
const cBorealis = cliid();
const cCygnus = cliid();
const cHelios = cliid();
const cDraco = cliid();

const clients = [
  { id: cApollo, name: 'Apollo Financial', industry: 'Financial Services', notes: 'Payments platform program; T&M.' },
  { id: cBorealis, name: 'Borealis Bank', industry: 'Banking', notes: 'Mobile banking app; fixed-price.' },
  { id: cCygnus, name: 'Cygnus Data Co.', industry: 'Data & Analytics', notes: 'Data lake build; T&M.' },
  { id: cHelios, name: 'Helios Retail', industry: 'Retail', notes: 'CRM migration; managed service.' },
  { id: cDraco, name: 'Draco Systems', industry: 'Technology', notes: 'Legacy decommission; completed.' },
];

// ---------------------------------------------------------------------------
// PROJECTS — 6 deliberately-shaped projects.
// ---------------------------------------------------------------------------
let prjSeq = 0;
const prjid = (): string => ns(PRJ, ++prjSeq);

interface ProjectDef {
  id: string;
  projectCode: string;
  name: string;
  description: string;
  projectManagerId: string;
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED';
  engagementModel: 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MANAGED_SERVICE' | 'INTERNAL';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  startsOn: Date;
  endsOn: Date | null;
  outcomeRating: string | null;
  lessonsLearned: string | null;
  wouldStaffSameWay: boolean | null;
  clientId: string | null;
}

const pApollo: ProjectDef = {
  id: prjid(), projectCode: 'DEMO-001', name: 'Apollo Payments Platform',
  description: 'Greenfield payments platform for Apollo Financial — React + NestJS + Postgres. Healthy and on track.',
  projectManagerId: pm1.id, status: 'ACTIVE', engagementModel: 'TIME_AND_MATERIAL', priority: 'HIGH',
  startsOn: monthsAgo(7), endsOn: monthsAgo(-5),
  outcomeRating: null, lessonsLearned: null, wouldStaffSameWay: null, clientId: cApollo,
};
const pBorealis: ProjectDef = {
  id: prjid(), projectCode: 'DEMO-002', name: 'Borealis Mobile Banking',
  description: 'Native mobile banking app for Borealis Bank. Behind schedule and over budget — the headline troubled project.',
  projectManagerId: pm2.id, status: 'ACTIVE', engagementModel: 'FIXED_PRICE', priority: 'CRITICAL',
  startsOn: monthsAgo(9), endsOn: monthsAgo(-2),
  outcomeRating: null, lessonsLearned: null, wouldStaffSameWay: null, clientId: cBorealis,
};
const pCygnus: ProjectDef = {
  id: prjid(), projectCode: 'DEMO-003', name: 'Cygnus Data Lake',
  description: 'Data lakehouse build for Cygnus Data Co. Staffing gap — open + proposed positions in the queue.',
  projectManagerId: pm1.id, status: 'ACTIVE', engagementModel: 'TIME_AND_MATERIAL', priority: 'HIGH',
  startsOn: monthsAgo(4), endsOn: monthsAgo(-8),
  outcomeRating: null, lessonsLearned: null, wouldStaffSameWay: null, clientId: cCygnus,
};
const pHelios: ProjectDef = {
  id: prjid(), projectCode: 'DEMO-004', name: 'Helios CRM Migration',
  description: 'Salesforce CRM migration for Helios Retail. Healthy, mostly staffed, one approved-but-pre-onboarding hire.',
  projectManagerId: pm2.id, status: 'ACTIVE', engagementModel: 'MANAGED_SERVICE', priority: 'MEDIUM',
  startsOn: monthsAgo(5), endsOn: monthsAgo(-4),
  outcomeRating: null, lessonsLearned: null, wouldStaffSameWay: null, clientId: cHelios,
};
const pDevPortal: ProjectDef = {
  id: prjid(), projectCode: 'DEMO-005', name: 'Internal DevPortal',
  description: 'Internal developer portal — internal initiative, no external client.',
  projectManagerId: pm1.id, status: 'ACTIVE', engagementModel: 'INTERNAL', priority: 'MEDIUM',
  startsOn: monthsAgo(6), endsOn: null,
  outcomeRating: null, lessonsLearned: null, wouldStaffSameWay: null, clientId: null,
};
const pDraco: ProjectDef = {
  id: prjid(), projectCode: 'DEMO-006', name: 'Draco Legacy Decommission',
  description: 'Decommission of Draco Systems legacy estate. Completed and closed — has a retrospective.',
  projectManagerId: pm2.id, status: 'COMPLETED', engagementModel: 'FIXED_PRICE', priority: 'LOW',
  startsOn: monthsAgo(18), endsOn: monthsAgo(3),
  outcomeRating: 'GREEN',
  lessonsLearned: 'Smooth decommission; phased cutover avoided downtime. Reusable runbook harvested.',
  wouldStaffSameWay: true, clientId: cDraco,
};

const projects: ProjectDef[] = [pApollo, pBorealis, pCygnus, pHelios, pDevPortal, pDraco];
const activeProjects = projects.filter((p) => p.status === 'ACTIVE');
const closedProjects = projects.filter((p) => p.status !== 'ACTIVE');

// ---------------------------------------------------------------------------
// PROJECT POSITIONS — the supply/demand spine.
//
// Built directly in the lean shape (ProjectPosition aggregate). Each entry is
// either FILLED (4-tuple set: activePersonId + activeAllocationPercent +
// activeValidFrom + activeValidTo) or UNFILLED (all four null).
//
// fillStatus distribution across ~19 positions:
//   ASSIGNED  — active fills on Apollo/Borealis/Helios/DevPortal
//   OPEN      — Cygnus demand spike (3) + Borealis demand spike (1)
//   PROPOSED  — Cygnus proposal in REVIEW (with candidate slate) + Borealis
//   BOOKED    — Helios approved pre-onboarding hire
//   RELEASED  — Draco closed-project fill
// ---------------------------------------------------------------------------
let ppSeq = 0;
const ppid = (): string => ns(PP, ++ppSeq);
let fhSeq = 0;
const fhid = (): string => ns(AHI, ++fhSeq);
let ppcSeq = 0;
const ppcid = (): string => ns(PPC, ++ppcSeq);

interface PositionSpec {
  project: ProjectDef;
  role: string;
  skills: string[];
  requiredAllocationPercent: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  fillStatus: 'OPEN' | 'PROPOSED' | 'BOOKED' | 'ASSIGNED' | 'RELEASED';
  // fill (only when filled)
  person?: PersonDef;
  activeAllocationPercent?: number;
  activeValidFrom?: Date;
  activeValidTo?: Date | null;
  // demand window
  startOffsetDays?: number; // from project start
  // proposed-slate candidate pool
  candidates?: PersonDef[];
  summary?: string;
}

const SLA_DAYS_REVIEW = 1;

const positionSpecs: PositionSpec[] = [
  // --- Apollo (healthy, fully staffed: 4 ASSIGNED) ---
  { project: pApollo, role: 'Tech Lead',        skills: ['BACKEND', 'CLOUD'], requiredAllocationPercent: 100, priority: 'HIGH',   fillStatus: 'ASSIGNED', person: overAllocated, activeAllocationPercent: 60, startOffsetDays: 0, summary: 'Tech lead for Apollo Payments' },
  { project: pApollo, role: 'Backend Engineer', skills: ['BACKEND'],          requiredAllocationPercent: 100, priority: 'MEDIUM', fillStatus: 'ASSIGNED', person: employee,     activeAllocationPercent: 100, startOffsetDays: 5, summary: 'Backend engineer for Apollo Payments' },
  { project: pApollo, role: 'Frontend Engineer',skills: ['FRONTEND'],         requiredAllocationPercent: 100, priority: 'MEDIUM', fillStatus: 'ASSIGNED', person: ics[3],       activeAllocationPercent: 100, startOffsetDays: 5, summary: 'Frontend engineer for Apollo Payments' },
  { project: pApollo, role: 'QA Engineer',      skills: ['QA'],               requiredAllocationPercent: 80,  priority: 'MEDIUM', fillStatus: 'ASSIGNED', person: ics[9],       activeAllocationPercent: 80,  startOffsetDays: 10, summary: 'QA engineer for Apollo Payments' },

  // --- Borealis (RED: staffed but with an OPEN demand spike) ---
  { project: pBorealis, role: 'Mobile Lead',      skills: ['FRONTEND'],         requiredAllocationPercent: 100, priority: 'URGENT',   fillStatus: 'ASSIGNED', person: ics[4],   activeAllocationPercent: 100, startOffsetDays: 0,  summary: 'Mobile lead for Borealis' },
  { project: pBorealis, role: 'Backend Engineer', skills: ['BACKEND'],          requiredAllocationPercent: 100, priority: 'HIGH',     fillStatus: 'ASSIGNED', person: ics[12],  activeAllocationPercent: 100, startOffsetDays: 10, summary: 'Backend engineer for Borealis' },
  { project: pBorealis, role: 'Senior Engineer',  skills: ['BACKEND', 'CLOUD'], requiredAllocationPercent: 100, priority: 'URGENT',   fillStatus: 'OPEN',     startOffsetDays: 0, summary: 'Recovery hire — Borealis is behind schedule' },
  { project: pBorealis, role: 'Mobile Engineer',  skills: ['FRONTEND'],         requiredAllocationPercent: 80,  priority: 'HIGH',     fillStatus: 'PROPOSED', startOffsetDays: 0, candidates: [ics[15], ics[14]], summary: 'Mobile engineer — proposal pending' },

  // --- Cygnus (AMBER staffing gap: 1 ASSIGNED + 3 OPEN + 1 PROPOSED w/ slate) ---
  { project: pCygnus, role: 'Data Lead',       skills: ['DATA'],     requiredAllocationPercent: 100, priority: 'HIGH',   fillStatus: 'ASSIGNED', person: ics[6], activeAllocationPercent: 100, startOffsetDays: 0,  summary: 'Data lead for Cygnus' },
  { project: pCygnus, role: 'Data Engineer',   skills: ['DATA'],     requiredAllocationPercent: 100, priority: 'HIGH',   fillStatus: 'OPEN',     startOffsetDays: 0, summary: 'Data engineer — open demand' },
  { project: pCygnus, role: 'Data Engineer',   skills: ['DATA'],     requiredAllocationPercent: 100, priority: 'MEDIUM', fillStatus: 'OPEN',     startOffsetDays: 7, summary: 'Second data engineer — open demand' },
  { project: pCygnus, role: 'DevOps Engineer', skills: ['DEVOPS'],   requiredAllocationPercent: 60,  priority: 'MEDIUM', fillStatus: 'OPEN',     startOffsetDays: 14, summary: 'DevOps support — open demand' },
  { project: pCygnus, role: 'Senior Data Eng', skills: ['DATA', 'CLOUD'], requiredAllocationPercent: 100, priority: 'HIGH', fillStatus: 'PROPOSED', startOffsetDays: 0, candidates: [ics[13], ics[7], benchStar], summary: 'Senior data engineer — slate under review' },

  // --- Helios (healthy: 2 ASSIGNED + 1 BOOKED pre-onboarding) ---
  { project: pHelios, role: 'Integration Lead', skills: ['BACKEND'],  requiredAllocationPercent: 100, priority: 'MEDIUM', fillStatus: 'ASSIGNED', person: ics[16], activeAllocationPercent: 100, startOffsetDays: 0, summary: 'Integration lead for Helios' },
  { project: pHelios, role: 'Backend Engineer', skills: ['BACKEND'],  requiredAllocationPercent: 80,  priority: 'MEDIUM', fillStatus: 'ASSIGNED', person: overAllocated, activeAllocationPercent: 60, startOffsetDays: 5, summary: 'Backend engineer for Helios (cross-project loan)' },
  { project: pHelios, role: 'Senior Engineer',  skills: ['BACKEND'],  requiredAllocationPercent: 100, priority: 'HIGH',   fillStatus: 'BOOKED',   person: ics[13], activeAllocationPercent: 100, startOffsetDays: 0, summary: 'Approved hire — onboarding next week' },

  // --- Internal DevPortal (GREEN: 2 ASSIGNED) ---
  { project: pDevPortal, role: 'Full-stack Engineer', skills: ['BACKEND', 'FRONTEND'], requiredAllocationPercent: 50, priority: 'MEDIUM', fillStatus: 'ASSIGNED', person: ics[10], activeAllocationPercent: 50, startOffsetDays: 0, summary: 'Full-stack engineer for DevPortal' },
  { project: pDevPortal, role: 'Designer',            skills: ['DESIGN'],              requiredAllocationPercent: 50, priority: 'LOW',    fillStatus: 'ASSIGNED', person: ics[11], activeAllocationPercent: 50, startOffsetDays: 0, summary: 'Designer for DevPortal' },

  // --- Draco (closed: 1 RELEASED) ---
  { project: pDraco, role: 'Migration Engineer', skills: ['BACKEND'], requiredAllocationPercent: 100, priority: 'MEDIUM', fillStatus: 'RELEASED', person: ics[8], activeAllocationPercent: 100, startOffsetDays: 0, activeValidTo: pDraco.endsOn, summary: 'Migration engineer for Draco (released at close)' },
];

const projectPositions: Array<Record<string, unknown>> = [];
const projectPositionCandidates: Array<Record<string, unknown>> = [];
const positionFillHistory: Array<Record<string, unknown>> = [];

positionSpecs.forEach((spec) => {
  const id = ppid();
  const proj = spec.project;
  const startDate = addDays(proj.startsOn, spec.startOffsetDays ?? 0);
  const endDate = proj.endsOn ?? addMonths(NOW, 12);
  const filled = spec.fillStatus === 'ASSIGNED' || spec.fillStatus === 'BOOKED' || spec.fillStatus === 'RELEASED';
  const isProposed = spec.fillStatus === 'PROPOSED';
  // A real PROPOSE transition stamps the leading candidate onto the active-fill
  // fields so the unified approvals queue can surface the candidate and the
  // PROPOSED → BOOKED decision (which requires a person) succeeds. The seed
  // builds positions directly, so mirror that here: the first slate candidate
  // becomes the proposed person, with an open-ended active window (validTo
  // null) — satisfying the 4-tuple "3-set, validTo-null" integrity rule.
  const proposedPerson =
    isProposed && spec.candidates && spec.candidates.length > 0 ? spec.candidates[0] : null;
  const hasActive = filled || proposedPerson !== null;
  const activeValidFrom = hasActive ? (spec.activeValidFrom ?? startDate) : null;
  const activeValidTo = filled
    ? (spec.fillStatus === 'RELEASED' ? (spec.activeValidTo ?? proj.endsOn ?? NOW) : null)
    : null;
  const requestedAt = daysAgo(spec.fillStatus === 'OPEN' || isProposed ? 6 : 30);

  projectPositions.push({
    id,
    projectId: proj.id,
    role: spec.role,
    skills: spec.skills,
    summary: spec.summary ?? null,
    requiredAllocationPercent: spec.requiredAllocationPercent,
    startDate,
    endDate,
    priority: spec.priority,
    requestedByPersonId: proj.projectManagerId,
    fillStatus: spec.fillStatus,
    activePersonId: filled ? spec.person!.id : (proposedPerson ? proposedPerson.id : null),
    activeAllocationPercent: filled
      ? (spec.activeAllocationPercent ?? spec.requiredAllocationPercent)
      : (proposedPerson ? spec.requiredAllocationPercent : null),
    activeValidFrom,
    activeValidTo,
    releaseReason: spec.fillStatus === 'RELEASED' ? 'Project closed' : null,
    cancellationReason: null,
    notes: spec.summary ?? null,
    version: 1,
    createdAt: requestedAt,
    updatedAt: NOW,
    createdByPersonId: proj.projectManagerId,
    slaStage: isProposed ? 'REVIEW' : null,
    slaDueAt: isProposed ? addBusinessDays(requestedAt, SLA_DAYS_REVIEW) : null,
  });

  // Fill history — narratable lifecycle steps per position.
  const push = (changeType: string, by: string, reason: string, prev: string | null, next: string | null, newPersonId: string | null, previousPersonId: string | null, when: Date) => {
    positionFillHistory.push({
      id: fhid(),
      positionId: id,
      changeType,
      changedByPersonId: by,
      changeReason: reason,
      previousPersonId,
      newPersonId,
      previousStatus: prev,
      newStatus: next,
      occurredAt: when,
    });
  };

  if (spec.fillStatus === 'OPEN') {
    push('OPENED', proj.projectManagerId, 'Demand opened', 'DRAFT', 'OPEN', null, null, requestedAt);
  } else if (isProposed) {
    push('OPENED', proj.projectManagerId, 'Demand opened', 'DRAFT', 'OPEN', null, null, addDays(requestedAt, -2));
    push('PROPOSED', rm.id, 'Slate proposed for review', 'OPEN', 'PROPOSED', null, null, requestedAt);
    if (spec.candidates && spec.candidates.length > 0) {
      push('CANDIDATES_ADDED', rm.id, 'Candidate slate added', 'PROPOSED', 'PROPOSED', null, null, requestedAt);
    }
  } else if (filled) {
    const person = spec.person!;
    push('PROPOSED', proj.projectManagerId, 'Fill proposed', 'OPEN', 'PROPOSED', person.id, null, daysAgo(34));
    push('BOOKED', rm.id, 'Approved by RM', 'PROPOSED', 'BOOKED', person.id, null, daysAgo(32));
    if (spec.fillStatus === 'ASSIGNED' || spec.fillStatus === 'RELEASED') {
      push('ASSIGNED', rm.id, 'Fill confirmed', 'BOOKED', 'ASSIGNED', person.id, null, activeValidFrom ?? startDate);
    }
    if (spec.fillStatus === 'RELEASED') {
      push('RELEASED', rm.id, 'Project closed', 'ASSIGNED', 'RELEASED', null, person.id, (activeValidTo as Date) ?? NOW);
    }
  }

  // Candidate slate for PROPOSED positions.
  if (isProposed && spec.candidates && spec.candidates.length > 0) {
    spec.candidates.forEach((cand, rank0) => {
      const rank = rank0 + 1;
      projectPositionCandidates.push({
        id: ppcid(),
        positionId: id,
        candidatePersonId: cand.id,
        rank,
        matchScore: Math.round((0.93 - 0.08 * rank0) * 1000) / 1000,
        availabilityPercent: rank === 1 ? 100 : rank === 2 ? 60 : 40,
        mismatchedSkills: rank === 1 ? [] : ['AWS'],
        rationale: `Auto-suggested from the ${cand.role} pool`,
        decision: 'PENDING',
        createdAt: daysAgo(5),
        updatedAt: NOW,
        createdByPersonId: rm.id,
      });
    });
  }
});

// Re-date the bench star's most-recent fill history so bench-aging shows a
// realistic spread. The bench star (Bella) is never assigned, so she has no
// RELEASED history of her own; the bench KPI reads RELEASED rows by person.
// We add a standalone RELEASED row pointing at her so "days on bench" renders.
positionFillHistory.push({
  id: fhid(),
  positionId: projectPositions.find((p) => p.fillStatus === 'RELEASED')!.id as string,
  changeType: 'RELEASED',
  changedByPersonId: rm.id,
  changeReason: 'Rolled off prior engagement',
  previousPersonId: benchStar.id,
  newPersonId: null,
  previousStatus: 'ASSIGNED',
  newStatus: 'RELEASED',
  occurredAt: daysAgo(45),
});

// ---------------------------------------------------------------------------
// PROJECT BUDGETS — one per project. Borealis overruns (CPI<1); rest healthy.
// ---------------------------------------------------------------------------
let pbSeq = 0;
const pbid = (): string => ns(PB, ++pbSeq);

interface BudgetShape {
  project: ProjectDef;
  capex: number; opex: number; vendor: number;
  earnedValue: number; actualCost: number; plannedToDate: number; eac: number;
}
const budgetShapes: BudgetShape[] = [
  // Healthy: EV ≈ AC ≈ planned, CPI ≈ 1.
  { project: pApollo,    capex: 400000, opex: 600000, vendor: 80000,  earnedValue: 540000, actualCost: 545000, plannedToDate: 550000, eac: 1010000 },
  // Borealis OVERRUN: actualCost > plannedToDate, EV < AC → CPI < 1.
  { project: pBorealis,  capex: 500000, opex: 700000, vendor: 120000, earnedValue: 520000, actualCost: 720000, plannedToDate: 600000, eac: 1400000 },
  // Cygnus: on track but understaffed.
  { project: pCygnus,    capex: 300000, opex: 450000, vendor: 60000,  earnedValue: 280000, actualCost: 290000, plannedToDate: 300000, eac: 760000 },
  { project: pHelios,    capex: 200000, opex: 350000, vendor: 40000,  earnedValue: 300000, actualCost: 305000, plannedToDate: 310000, eac: 560000 },
  { project: pDevPortal, capex: 100000, opex: 150000, vendor: 0,      earnedValue: 120000, actualCost: 118000, plannedToDate: 120000, eac: 250000 },
  // Draco closed — final actuals landed close to budget.
  { project: pDraco,     capex: 250000, opex: 300000, vendor: 50000,  earnedValue: 600000, actualCost: 590000, plannedToDate: 600000, eac: 600000 },
];

const projectBudgets = budgetShapes.map((b) => ({
  id: pbid(),
  projectId: b.project.id,
  fiscalYear: b.project.startsOn.getUTCFullYear(),
  capexBudget: b.capex,
  opexBudget: b.opex,
  vendorBudget: b.vendor,
  earnedValue: b.earnedValue,
  actualCost: b.actualCost,
  plannedToDate: b.plannedToDate,
  eac: b.eac,
  currencyCode: 'USD',
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// BUDGET APPROVALS — historical APPROVED per budget + 1 PENDING (Borealis
// budget-increase request — the governance headline).
// ---------------------------------------------------------------------------
let bapSeq = 0;
const bapid = (): string => ns(BAP, ++bapSeq);

const budgetApprovals: Array<Record<string, unknown>> = projectBudgets.map((b) => {
  const proj = projects.find((p) => p.id === b.projectId)!;
  const requestedAt = proj.startsOn;
  const decidedAt = addDays(requestedAt, 7);
  return {
    id: bapid(),
    projectBudgetId: b.id,
    status: 'APPROVED' as const,
    requestedByPersonId: proj.projectManagerId,
    decidedByPersonId: director.id,
    decisionAt: decidedAt,
    decisionReason: 'Initial fiscal-year budget approval.',
    requestedAt,
    requestedChange: null,
    createdAt: requestedAt,
    updatedAt: decidedAt,
  };
});

// PENDING budget increase for Borealis (the troubled project).
const borealisBudget = projectBudgets.find((b) => b.projectId === pBorealis.id)!;
budgetApprovals.push({
  id: bapid(),
  projectBudgetId: borealisBudget.id,
  status: 'PENDING' as const,
  requestedByPersonId: pBorealis.projectManagerId,
  decidedByPersonId: null,
  decisionAt: null,
  decisionReason: null,
  requestedAt: daysAgo(3),
  // DecideBudgetChangeService applies `capexBudget`/`opexBudget` as the new
  // absolute values, so the PENDING request must carry both as numbers (capex
  // unchanged at 500k; opex 700k → 850k for the +150k schedule-slip increase).
  requestedChange: { capexBudget: 500000, opexBudget: 850000, reason: 'Schedule slip + scope creep' },
  createdAt: daysAgo(3),
  updatedAt: daysAgo(3),
});

// ---------------------------------------------------------------------------
// PROJECT MILESTONES — 3 per project. Borealis has a MISSED milestone.
// ---------------------------------------------------------------------------
let milSeq = 0;
const milid = (): string => ns(MIL, ++milSeq);

const projectMilestones: Array<Record<string, unknown>> = [];
projects.forEach((p) => {
  const isActive = p.status === 'ACTIVE';
  const span = (p.endsOn ?? addMonths(p.startsOn, 12)).getTime() - p.startsOn.getTime();
  const names = ['Discovery', 'Build', 'Launch'];
  for (let i = 0; i < 3; i++) {
    const dueAt = new Date(p.startsOn.getTime() + (span * (i + 1)) / 4);
    let status: string;
    if (p.id === pBorealis.id) {
      // Borealis: discovery hit, build MISSED, launch planned.
      status = i === 0 ? 'HIT' : i === 1 ? 'MISSED' : 'PLANNED';
    } else if (isActive) {
      status = i === 0 ? 'HIT' : i === 1 ? 'IN_PROGRESS' : 'PLANNED';
    } else {
      status = 'HIT';
    }
    projectMilestones.push({
      id: milid(),
      projectId: p.id,
      name: `${names[i]} milestone for ${p.name}`,
      plannedDate: toDateOnly(dueAt),
      actualDate: status === 'HIT' ? toDateOnly(dueAt) : null,
      status,
      progressPct: status === 'HIT' ? 100 : status === 'IN_PROGRESS' ? 50 : 0,
      createdAt: p.startsOn,
      updatedAt: NOW,
    });
  }
});

// ---------------------------------------------------------------------------
// PROJECT CHANGE REQUESTS — 1 per active project + 1 historical on Draco.
// ---------------------------------------------------------------------------
let crSeq = 0;
const crid = (): string => ns(CR, ++crSeq);

const projectChangeRequests: Array<Record<string, unknown>> = [];
activeProjects.forEach((p, idx) => {
  const decided = idx === 0;
  projectChangeRequests.push({
    id: crid(),
    projectId: p.id,
    title: `Scope change ${idx + 1} — ${p.name}`,
    description: idx % 2 === 0 ? 'Client requested additional reporting features.' : 'Integration with a new third-party system.',
    severity: p.id === pBorealis.id ? 'HIGH' : 'MEDIUM',
    status: decided ? 'APPROVED' : 'PROPOSED',
    requesterPersonId: p.projectManagerId,
    decidedByPersonId: decided ? director.id : null,
    decidedAt: decided ? daysAgo(7) : null,
    createdAt: daysAgo(14 + idx),
    updatedAt: NOW,
  });
});
projectChangeRequests.push({
  id: crid(),
  projectId: pDraco.id,
  title: 'Mid-project scope reduction — Draco',
  description: 'Dropped a non-critical legacy subsystem from scope.',
  severity: 'LOW',
  status: 'APPROVED',
  requesterPersonId: pDraco.projectManagerId,
  decidedByPersonId: director.id,
  decidedAt: addDays(pDraco.startsOn, 60),
  createdAt: addDays(pDraco.startsOn, 45),
  updatedAt: pDraco.endsOn,
});

// ---------------------------------------------------------------------------
// PROJECT ROLE PLANS — 3 per project.
// ---------------------------------------------------------------------------
let prpSeq = 0;
const prpid = (): string => ns(PRP, ++prpSeq);

const projectRolePlans: Array<Record<string, unknown>> = [];
projects.forEach((p) => {
  const roles = ['Lead Engineer', 'Senior Engineer', 'QA Engineer'];
  roles.forEach((roleName, ri) => {
    projectRolePlans.push({
      id: prpid(),
      projectId: p.id,
      roleName,
      seniorityLevel: ri === 0 ? 'SENIOR' : ri === 1 ? 'MID' : 'JUNIOR',
      headcount: ri === 0 ? 1 : ri === 1 ? 2 : 1,
      allocationPercent: ri === 0 ? 100 : 80,
      requiredSkillIds: [],
      source: 'INTERNAL',
      plannedStartDate: p.startsOn,
      plannedEndDate: p.endsOn,
      createdAt: p.startsOn,
      updatedAt: NOW,
    });
  });
});

// ---------------------------------------------------------------------------
// PROJECT RISKS — 2 per project. Borealis has open HIGH risks.
// ---------------------------------------------------------------------------
let rskSeq = 0;
const rskid = (): string => ns(RSK, ++rskSeq);

const projectRisks: Array<Record<string, unknown>> = [];
const riskCategories = ['SCHEDULE', 'BUDGET', 'TECHNICAL', 'SCOPE'];
projects.forEach((p, idx) => {
  for (let r = 0; r < 2; r++) {
    const isBorealis = p.id === pBorealis.id;
    const isActive = p.status === 'ACTIVE';
    projectRisks.push({
      id: rskid(),
      projectId: p.id,
      title: isBorealis
        ? (r === 0 ? 'Schedule slip risk' : 'Budget overrun risk')
        : `Delivery risk ${idx + 1}.${r + 1}`,
      description: isBorealis
        ? (r === 0 ? 'Build phase is behind plan; launch date at risk.' : 'Actual cost is tracking above plan.')
        : 'Standard delivery risk identified during planning.',
      category: isBorealis ? (r === 0 ? 'SCHEDULE' : 'BUDGET') : riskCategories[(idx + r) % riskCategories.length],
      riskType: 'RISK',
      probability: isBorealis ? 4 : 3,
      impact: isBorealis ? 5 : 3,
      strategy: isBorealis ? 'MITIGATE' : 'ACCEPT',
      strategyDescription: 'Mitigation plan in place; reviewed weekly.',
      status: isActive ? 'IDENTIFIED' : 'CLOSED',
      ownerPersonId: p.projectManagerId,
      raisedAt: addDays(p.startsOn, 7 + r * 14),
      createdAt: addDays(p.startsOn, 7 + r * 14),
      updatedAt: NOW,
    });
  }
});

// ---------------------------------------------------------------------------
// PROJECT RAG SNAPSHOTS — last 6 weekly snapshots per project.
//   Apollo/Helios/DevPortal → GREEN. Cygnus → AMBER. Borealis → RED-trending.
//   Draco → GREEN (closed, historical).
// ---------------------------------------------------------------------------
let ragSeq = 0;
const ragid = (): string => ns(RAG, ++ragSeq);

const projectRagSnapshots: Array<Record<string, unknown>> = [];
function ragFor(p: ProjectDef, weeksAgo: number): { overall: 'GREEN' | 'AMBER' | 'RED'; schedule: 'GREEN' | 'AMBER' | 'RED'; budget: 'GREEN' | 'AMBER' | 'RED'; staffing: 'GREEN' | 'AMBER' | 'RED'; narrative: string } {
  if (p.id === pBorealis.id) {
    // Trending worse: AMBER 6-4 weeks ago, RED last 3 weeks.
    const red = weeksAgo <= 2;
    return {
      overall: red ? 'RED' : 'AMBER',
      schedule: 'RED',
      budget: red ? 'RED' : 'AMBER',
      staffing: 'AMBER',
      narrative: red ? 'Build milestone missed; launch date and budget both at risk.' : 'Schedule slipping; recovery plan being drafted.',
    };
  }
  if (p.id === pCygnus.id) {
    return { overall: 'AMBER', schedule: 'GREEN', budget: 'GREEN', staffing: 'AMBER', narrative: 'On track but understaffed — open positions in the queue.' };
  }
  return { overall: 'GREEN', schedule: 'GREEN', budget: 'GREEN', staffing: 'GREEN', narrative: 'On track.' };
}

projects.forEach((p) => {
  for (let w = 5; w >= 0; w--) {
    const monday = mondayOf(weekMonday(w));
    if (monday < p.startsOn) continue;
    if (p.endsOn && monday > p.endsOn) continue;
    const rag = ragFor(p, w);
    projectRagSnapshots.push({
      id: ragid(),
      projectId: p.id,
      weekStarting: toDateOnly(monday),
      staffingRag: rag.staffing,
      scheduleRag: rag.schedule,
      budgetRag: rag.budget,
      clientRag: rag.overall,
      overallRag: rag.overall,
      autoComputedOverall: rag.overall,
      isOverridden: false,
      narrative: rag.narrative,
      recordedByPersonId: p.projectManagerId,
      createdAt: monday,
      updatedAt: NOW,
    });
  }
});

// ---------------------------------------------------------------------------
// PROJECT RETROSPECTIVES — one per closed project (Draco).
// ---------------------------------------------------------------------------
let retSeq = 0;
const retid = (): string => ns(RET, ++retSeq);

const projectRetrospectives = closedProjects.map((p) => ({
  id: retid(),
  projectId: p.id,
  outcomeRating: p.outcomeRating,
  lessonsLearned: p.lessonsLearned,
  wouldStaffSameWay: p.wouldStaffSameWay,
  retrospectiveDate: toDateOnly(addDays(p.endsOn ?? NOW, 14)),
  facilitatedByPersonId: dm.id,
  createdAt: addDays(p.endsOn ?? NOW, 14),
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// EXTERNAL LINKS + SYNC STATE — one Jira link per active project.
// ---------------------------------------------------------------------------
let pelSeq = 0;
const pelid = (): string => ns(PEL, ++pelSeq);
let essSeq = 0;
const essid = (): string => ns(ESS, ++essSeq);

const projectExternalLinks: Array<Record<string, unknown>> = [];
const externalSyncStates: Array<Record<string, unknown>> = [];
activeProjects.forEach((p) => {
  const linkId = pelid();
  projectExternalLinks.push({
    id: linkId,
    projectId: p.id,
    provider: 'jira',
    connectionKey: 'jira-cloud-primary',
    externalProjectKey: p.projectCode,
    externalProjectName: p.name,
    externalUrl: `https://demo.atlassian.net/projects/${p.projectCode}`,
    createdAt: p.startsOn,
    updatedAt: NOW,
  });
  externalSyncStates.push({
    id: essid(),
    projectExternalLinkId: linkId,
    syncStatus: p.id === pBorealis.id ? 'FAILED' : 'SUCCEEDED',
    lastSyncedAt: daysAgo(p.id === pBorealis.id ? 4 : 1),
    lastSuccessfulSyncedAt: daysAgo(p.id === pBorealis.id ? 4 : 1),
    createdAt: p.startsOn,
    updatedAt: NOW,
  });
});

// ---------------------------------------------------------------------------
// WORK EVIDENCE — light coverage for ASSIGNED people on active projects.
// ---------------------------------------------------------------------------
let wesSeq = 0;
const wesid = (): string => ns(WES, ++wesSeq);
let wevSeq = 0;
const wevid = (): string => ns(WEV, ++wevSeq);
let welSeq = 0;
const welid = (): string => ns(WEL, ++welSeq);

const wesJira = wesid();
const wesManual = wesid();
const workEvidenceSources = [
  { id: wesJira, provider: 'jira', sourceType: 'worklogs', connectionKey: 'jira-cloud-primary', displayName: 'Jira Cloud Worklogs', createdAt: monthsAgo(12), updatedAt: NOW },
  { id: wesManual, provider: 'manual', sourceType: 'timesheet', connectionKey: 'internal-timesheet', displayName: 'Manual Timesheet Entry', createdAt: monthsAgo(12), updatedAt: NOW },
];

const workEvidence: Array<Record<string, unknown>> = [];
const workEvidenceLinks: Array<Record<string, unknown>> = [];

const assignedActivePositions = projectPositions.filter(
  (pp) => pp.fillStatus === 'ASSIGNED' && pp.activePersonId,
);
assignedActivePositions.forEach((pp, idx) => {
  const entries = 3 + (idx % 2);
  for (let e = 0; e < entries; e++) {
    const recordedAt = daysAgo(7 + e * 7);
    const sourceId = e % 2 === 0 ? wesJira : wesManual;
    const wevId = wevid();
    workEvidence.push({
      id: wevId,
      workEvidenceSourceId: sourceId,
      personId: pp.activePersonId as string,
      projectId: pp.projectId as string,
      sourceRecordKey: `DEMO-WL-${idx + 1}-${e + 1}`,
      evidenceType: sourceId === wesJira ? 'JIRA_WORKLOG' : 'TIMESHEET_ENTRY',
      recordedAt,
      occurredOn: recordedAt,
      durationMinutes: 240 + e * 30,
      status: 'CAPTURED',
      capex: e % 4 === 0,
      summary: 'Worked on project deliverables',
      createdAt: recordedAt,
      updatedAt: NOW,
    });
    if (sourceId === wesJira && e % 2 === 0) {
      workEvidenceLinks.push({
        id: welid(),
        workEvidenceId: wevId,
        provider: 'jira',
        externalKey: `DEMO-${idx + 1}-${e + 1}`,
        externalUrl: `https://demo.atlassian.net/browse/DEMO-${idx + 1}-${e + 1}`,
        linkType: 'ISSUE',
        createdAt: recordedAt,
      });
    }
  }
});

// ---------------------------------------------------------------------------
// CONTACTS — one EMAIL contact per person.
// ---------------------------------------------------------------------------
let conSeq = 0;
const conid = (): string => ns(CON, ++conSeq);
const contacts = people.map((p) => ({
  id: conid(),
  personId: p.id,
  kind: 'EMAIL' as const,
  label: 'Work email',
  value: p.primaryEmail,
  isPrimary: true,
  verified: true,
  createdAt: p.hiredAt,
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// EMPLOYMENT EVENTS — one HIRE per person.
// ---------------------------------------------------------------------------
let empSeq = 0;
const empid = (): string => ns(EMP, ++empSeq);
const employmentEvents = people.map((p) => ({
  id: empid(),
  personId: p.id,
  kind: 'HIRE' as const,
  occurredOn: toDateOnly(p.hiredAt),
  reason: null,
  recordedByPersonId: null,
  createdAt: p.hiredAt,
}));

// ---------------------------------------------------------------------------
// CASES — 1 ONBOARDING (new hire) + 1 PERFORMANCE, with steps.
// ---------------------------------------------------------------------------
let cseSeq = 0;
const cseid = (): string => ns(CSE, ++cseSeq);

interface CaseDef {
  id: string;
  caseNumber: string;
  caseTypeKey: 'ONBOARDING' | 'OFFBOARDING' | 'PERFORMANCE' | 'TRANSFER';
  subjectPersonId: string;
  ownerPersonId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  summary: string;
  stepCount: number;
  completedStepCount: number;
}

const cases: CaseDef[] = [
  { id: cseid(), caseNumber: 'DEMO-2026-001', caseTypeKey: 'ONBOARDING', subjectPersonId: ics[13].id, ownerPersonId: hr.id, status: 'IN_PROGRESS', summary: 'Onboarding: approved Helios hire (in-flight)', stepCount: 5, completedStepCount: 2 },
  { id: cseid(), caseNumber: 'DEMO-2026-002', caseTypeKey: 'PERFORMANCE', subjectPersonId: ics[5].id, ownerPersonId: hr.id, status: 'OPEN', summary: 'Performance review for junior engineer', stepCount: 4, completedStepCount: 0 },
];

const STEP_TEMPLATES: Record<string, Array<{ stepKey: string; displayName: string }>> = {
  ONBOARDING: [
    { stepKey: 'provision-access', displayName: 'Provision System Access' },
    { stepKey: 'complete-paperwork', displayName: 'Complete Paperwork' },
    { stepKey: 'meet-manager', displayName: 'Meet Your Manager' },
    { stepKey: 'first-day-checkin', displayName: 'First Day Check-in' },
    { stepKey: 'week-1-review', displayName: 'Week-1 Review' },
  ],
  PERFORMANCE: [
    { stepKey: 'schedule-meeting', displayName: 'Schedule Review Meeting' },
    { stepKey: 'self-assessment', displayName: 'Complete Self-Assessment' },
    { stepKey: 'manager-assessment', displayName: 'Manager Assessment' },
    { stepKey: 'define-goals', displayName: 'Define Improvement Goals' },
  ],
};

export function generateDemoCaseSteps(): Array<Record<string, unknown>> {
  const steps: Array<Record<string, unknown>> = [];
  let seq = 0;
  for (const c of cases) {
    const tmpl = STEP_TEMPLATES[c.caseTypeKey];
    for (let i = 0; i < tmpl.length && i < c.stepCount; i++) {
      seq += 1;
      const isCompleted = i < c.completedStepCount;
      steps.push({
        id: ns(CSP, seq),
        caseRecordId: c.id,
        stepKey: tmpl[i].stepKey,
        displayName: tmpl[i].displayName,
        status: isCompleted ? 'COMPLETED' : 'OPEN',
        completedAt: isCompleted ? daysAgo(3 + i) : null,
      });
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// TIMESHEETS — last 8 weeks for ASSIGNED ICs. 2 SUBMITTED weeks (approval queue).
// ---------------------------------------------------------------------------
export function generateDemoTimesheets(): {
  weeks: Array<Record<string, unknown>>;
  entries: Array<Record<string, unknown>>;
} {
  const weeks: Array<Record<string, unknown>> = [];
  const entries: Array<Record<string, unknown>> = [];
  let tsSeq = 0;
  let teSeq = 0;

  // People with an ASSIGNED active position right now.
  const assignedNow = new Map<string, Array<{ projectId: string; alloc: number; from: Date }>>();
  for (const pp of projectPositions) {
    if (pp.fillStatus !== 'ASSIGNED' || !pp.activePersonId) continue;
    const personId = pp.activePersonId as string;
    const arr = assignedNow.get(personId) ?? [];
    arr.push({ projectId: pp.projectId as string, alloc: Number(pp.activeAllocationPercent), from: pp.activeValidFrom as Date });
    assignedNow.set(personId, arr);
  }

  // Submitter selection: Ethan (employee) + Sofia (ics[3]) submit their latest
  // completed week so the approval queue has exactly 2 pending submissions.
  const submitterIds = new Set<string>([employee.id, ics[3].id]);

  for (const person of people) {
    if (!assignedNow.has(person.id)) continue;
    const asgns = assignedNow.get(person.id)!;

    for (let w = 7; w >= 0; w--) {
      const monday = weekMonday(w);
      if (monday < person.hiredAt) continue;
      tsSeq += 1;
      const weekId = ns(TS, tsSeq);

      let status: string;
      if (w === 0) status = 'DRAFT';
      else if (w === 1 && submitterIds.has(person.id)) status = 'SUBMITTED';
      else status = 'APPROVED';

      weeks.push({
        id: weekId,
        personId: person.id,
        weekStart: monday,
        status,
        submittedAt: status !== 'DRAFT' ? monday : null,
        approvedBy: status === 'APPROVED' ? rm.id : null,
        approvedAt: status === 'APPROVED' ? monday : null,
        rejectedReason: null,
        version: 1,
      });

      for (let day = 0; day < 5; day++) {
        const entryDate = addDays(monday, day);
        if (entryDate > NOW) break;
        for (const a of asgns) {
          if (a.from > monday) continue;
          const hours = Math.round(((a.alloc / 100) * 8) * 10) / 10;
          if (hours <= 0) continue;
          teSeq += 1;
          entries.push({
            id: ns(TE, teSeq),
            timesheetWeekId: weekId,
            projectId: a.projectId,
            date: entryDate,
            hours,
            capex: false,
            description: 'Work on project',
          });
        }
      }
    }
  }

  return { weeks, entries };
}

// ---------------------------------------------------------------------------
// PULSE — 8 weeks for ASSIGNED ICs.
// ---------------------------------------------------------------------------
export function generateDemoPulseEntries(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let seq = 0;
  const icPool = ics.filter((p) => p.employmentStatus === 'ACTIVE');
  for (const ic of icPool) {
    const baseMood = 3 + ((seq % 3) === 0 ? 1 : 0);
    for (let w = 7; w >= 1; w--) {
      seq += 1;
      const monday = weekMonday(w);
      if (monday < ic.hiredAt) continue;
      let mood = baseMood;
      // Mobile lead on the troubled Borealis project trends down.
      if (ic.id === ics[4].id && w < 4) mood = Math.max(1, baseMood - 2);
      out.push({
        id: ns(PE, seq),
        personId: ic.id,
        weekStart: monday,
        mood,
        note: w === 1 ? 'Shipping a release this week' : null,
        submittedAt: monday,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// LEAVE REQUESTS — 1 PENDING (HR queue) + a few historical APPROVED.
// ---------------------------------------------------------------------------
export function generateDemoLeaveRequests(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let seq = 0;
  // 1 PENDING (the governance headline for HR).
  out.push({ id: ns(LR, ++seq), personId: employee.id, type: 'ANNUAL', status: 'PENDING', startDate: addDays(NOW, 21), endDate: addDays(NOW, 28), notes: 'Family vacation', createdAt: daysAgo(2), updatedAt: daysAgo(2) });
  // Historical APPROVED across a few ICs.
  const approvedFor = [ics[3], ics[4], ics[6], ics[10], ics[12]];
  approvedFor.forEach((ic, i) => {
    const startDate = addDays(NOW, -(i + 1) * 45);
    out.push({
      id: ns(LR, ++seq),
      personId: ic.id,
      type: ['ANNUAL', 'SICK', 'PERSONAL', 'ANNUAL', 'SICK'][i % 5],
      status: 'APPROVED',
      startDate,
      endDate: addDays(startDate, 3 + i),
      notes: 'Leave approved',
      createdAt: addDays(startDate, -7),
      updatedAt: addDays(startDate, -5),
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// IN-APP NOTIFICATIONS — for each role-test account.
// ---------------------------------------------------------------------------
export function generateDemoNotifications(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let seq = 0;
  const nid = (): string => ns(NOT, ++seq);
  const defs: Array<{ recipient: string; eventType: string; title: string; body: string; link: string; daysAgo: number; unread?: boolean }> = [
    // Employee (Ethan)
    { recipient: employee.id, eventType: 'assignment.created', title: 'Assigned to Apollo Payments', body: 'You are now assigned as Backend Engineer.', link: `/projects/${pApollo.id}`, daysAgo: 30 },
    { recipient: employee.id, eventType: 'pulse.reminder', title: 'Weekly pulse', body: 'Submit your pulse for this week.', link: '/pulse', daysAgo: 1, unread: true },
    // PM (Priya)
    { recipient: pm1.id, eventType: 'project.activated', title: 'Cygnus Data Lake activated', body: 'Your project is now ACTIVE.', link: `/projects/${pCygnus.id}`, daysAgo: 120 },
    { recipient: pm1.id, eventType: 'staffingRequest.submitted', title: 'Cygnus: 3 open positions', body: 'Cygnus Data Lake has 3 open positions in the queue.', link: '/staffing-desk', daysAgo: 3, unread: true },
    // RM (Ravi)
    { recipient: rm.id, eventType: 'staffingRequest.urgent', title: 'URGENT: Borealis recovery hire', body: 'Borealis needs a senior engineer urgently.', link: '/staffing-desk', daysAgo: 2, unread: true },
    { recipient: rm.id, eventType: 'assignment.proposal_submitted', title: 'Proposal slate to review', body: 'Cygnus senior data engineer slate is awaiting review.', link: '/staffing-desk', daysAgo: 1, unread: true },
    // HR (Hannah)
    { recipient: hr.id, eventType: 'case.created', title: 'New onboarding case', body: 'Onboarding case for the approved Helios hire.', link: '/cases', daysAgo: 3 },
    { recipient: hr.id, eventType: 'leave.pending', title: '1 leave request pending', body: 'You have a leave request awaiting approval.', link: '/leave-requests', daysAgo: 1, unread: true },
    // Delivery Manager (Dana)
    { recipient: dm.id, eventType: 'rag.dashboard', title: 'Portfolio RAG snapshot', body: 'Borealis flagged RED this week.', link: '/dashboard/delivery-manager', daysAgo: 1, unread: true },
    // Director (Daniel)
    { recipient: director.id, eventType: 'budget.variance', title: 'Borealis: budget approval pending', body: 'A budget increase request for Borealis needs your sign-off.', link: `/projects/${pBorealis.id}`, daysAgo: 3, unread: true },
    { recipient: director.id, eventType: 'approval.escalation', title: 'Director-level approval needed', body: 'Borealis budget increase awaiting your decision.', link: '/approvals', daysAgo: 2, unread: true },
  ];
  defs.forEach((d) => {
    out.push({
      id: nid(),
      recipientPersonId: d.recipient,
      eventType: d.eventType,
      title: d.title,
      body: d.body,
      link: d.link,
      readAt: d.unread ? null : daysAgo(Math.max(0, d.daysAgo - 1)),
      createdAt: daysAgo(d.daysAgo),
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// PERSON SKILLS — role-driven, every person gets 3-5 skills. The bench star
// gets the richest set (high grade + many skills). Skill names must exist in
// the seedSkills() catalog in prisma/seed.ts.
// ---------------------------------------------------------------------------
const ROLE_SKILL_POOLS: Record<string, string[]> = {
  'CEO':                 ['Project Management', 'Agile/Scrum', 'Stakeholder Management'],
  'Delivery Director':   ['Project Management', 'Agile/Scrum', 'Stakeholder Management'],
  'HR Manager':          ['People Operations', 'Recruiting', 'Stakeholder Management', 'Project Management'],
  'Resource Manager':    ['Project Management', 'Agile/Scrum', 'Stakeholder Management', 'People Operations'],
  'Project Manager':     ['Project Management', 'Agile/Scrum', 'Stakeholder Management', 'CI/CD'],
  'Delivery Manager':    ['Project Management', 'Agile/Scrum', 'Stakeholder Management'],
  'Architect':           ['TypeScript', 'AWS', 'Kubernetes', 'PostgreSQL', 'Docker', 'Terraform'],
  'Senior Engineer':     ['TypeScript', 'NestJS', 'AWS', 'PostgreSQL', 'Docker', 'React', 'Redis', 'CI/CD'],
  'Mid Engineer':        ['TypeScript', 'React', 'JavaScript', 'NestJS', 'PostgreSQL', 'MongoDB', 'Docker'],
  'Junior Engineer':     ['TypeScript', 'JavaScript', 'React', 'PostgreSQL', 'Docker'],
  'QA Engineer':         ['Playwright', 'Test Automation', 'TypeScript', 'JavaScript', 'CI/CD', 'Agile/Scrum'],
  'DevOps Engineer':     ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Python'],
  'Designer':            ['Figma', 'UI/UX Design', 'React', 'JavaScript', 'Agile/Scrum'],
};
const DEFAULT_SKILL_POOL = ['Project Management', 'Agile/Scrum', 'Stakeholder Management'];

const personSkillAssignments: Array<{ personId: string; skillName: string; proficiency: number; certified: boolean }> = [];
people.forEach((p, idx) => {
  const pool = ROLE_SKILL_POOLS[p.role] ?? DEFAULT_SKILL_POOL;
  // Bench star gets the full pool; everyone else 3-5.
  const count = p.id === benchStar.id ? pool.length : Math.min(pool.length, 3 + (idx % 3));
  const gradeNum = Number(p.grade.replace('G', '')) || 8;
  const proficiencyBase = gradeNum >= 12 ? 4 : gradeNum >= 10 ? 3 : 2;
  for (let k = 0; k < count; k++) {
    personSkillAssignments.push({
      personId: p.id,
      skillName: pool[k % pool.length],
      proficiency: Math.min(5, proficiencyBase + ((idx + k) % 2)),
      certified: (idx + k) % 4 === 0,
    });
  }
});

// ---------------------------------------------------------------------------
// EXPORTS — mirror it-company names, `demo` prefix.
// ---------------------------------------------------------------------------
export const demoSeedNow = NOW;
export const demoBenchStarPersonId = benchStar.id;
export const demoOverAllocatedPersonId = overAllocated.id;

export const demoPeople = people.map((p) => ({
  id: p.id,
  personNumber: p.personNumber,
  givenName: p.givenName,
  familyName: p.familyName,
  displayName: p.displayName,
  primaryEmail: p.primaryEmail,
  grade: p.grade,
  role: p.role,
  skillsets: p.skillsets,
  employmentStatus: p.employmentStatus,
  hiredAt: p.hiredAt,
  terminatedAt: p.terminatedAt,
  createdAt: p.hiredAt,
  updatedAt: NOW,
}));

export const demoOrgUnits = orgUnits.map((ou) => ({
  id: ou.id,
  code: ou.code,
  name: ou.name,
  description: ou.description,
  status: 'ACTIVE',
  parentOrgUnitId: ou.parentOrgUnitId,
  managerPersonId: ou.managerPersonId,
  validFrom: monthsAgo(60),
  createdAt: monthsAgo(60),
  updatedAt: NOW,
  kind: ou.kind,
}));

export const demoPositions = positions;
export const demoPersonOrgMemberships = personOrgMemberships;
export const demoReportingLines = reportingLines;
export const demoResourcePools = resourcePools.map((rp) => ({
  id: rp.id, orgUnitId: rp.orgUnitId, code: rp.code, name: rp.name, description: rp.description,
  createdAt: monthsAgo(60), updatedAt: NOW,
}));
export const demoResourcePoolMemberships = resourcePoolMemberships;

export const demoClients = clients.map((c) => ({
  id: c.id,
  name: c.name,
  industry: c.industry,
  notes: c.notes,
  isActive: true,
  accountManagerPersonId: null,
  createdAt: monthsAgo(60),
  updatedAt: NOW,
}));

export const demoProjects = projects.map((p) => ({
  id: p.id, projectCode: p.projectCode, name: p.name, description: p.description,
  projectManagerId: p.projectManagerId, status: p.status,
  engagementModel: p.engagementModel,
  priority: p.priority,
  startsOn: p.startsOn, endsOn: p.endsOn,
  outcomeRating: p.outcomeRating,
  lessonsLearned: p.lessonsLearned,
  wouldStaffSameWay: p.wouldStaffSameWay,
  clientId: p.clientId,
  version: 1, createdAt: p.startsOn, updatedAt: NOW,
}));

export const demoProjectPositions = projectPositions;
export const demoProjectPositionCandidates = projectPositionCandidates;
export const demoProjectPositionFillHistory = positionFillHistory;
export const demoProjectExternalLinks = projectExternalLinks;
export const demoExternalSyncStates = externalSyncStates;
export const demoWorkEvidenceSources = workEvidenceSources;
export const demoWorkEvidence = workEvidence;
export const demoWorkEvidenceLinks = workEvidenceLinks;
export const demoProjectMilestones = projectMilestones;
export const demoProjectChangeRequests = projectChangeRequests;
export const demoProjectBudgets = projectBudgets;
export const demoBudgetApprovals = budgetApprovals;
export const demoProjectRolePlans = projectRolePlans;
export const demoProjectRisks = projectRisks;
export const demoProjectRagSnapshots = projectRagSnapshots;
export const demoProjectRetrospectives = projectRetrospectives;
export const demoContacts = contacts;
export const demoEmploymentEvents = employmentEvents;
export const demoCases = cases;
export const demoPersonSkillAssignments = personSkillAssignments;

export const demoAccounts = [
  { email: 'daniel.cross@demo.local',     password: 'DirectorPass1!',    displayName: 'Daniel Cross',     roles: ['director'],          personId: director.id },
  { email: 'hannah.reyes@demo.local',     password: 'HrManagerPass1!',   displayName: 'Hannah Reyes',     roles: ['hr_manager'],        personId: hr.id },
  { email: 'ravi.menon@demo.local',       password: 'ResourceMgrPass1!', displayName: 'Ravi Menon',       roles: ['resource_manager'],  personId: rm.id },
  { email: 'priya.shah@demo.local',       password: 'ProjectMgrPass1!',  displayName: 'Priya Shah',       roles: ['project_manager'],   personId: pm1.id },
  { email: 'dana.whitfield@demo.local',   password: 'DeliveryMgrPass1!', displayName: 'Dana Whitfield',   roles: ['delivery_manager'],  personId: dm.id },
  { email: 'ethan.brooks@demo.local',     password: 'EmployeePass1!',    displayName: 'Ethan Brooks',     roles: ['employee'],          personId: employee.id },
];

export const demoDatasetSummary = {
  profile: 'demo',
  company: 'Demo Co (Software Delivery)',
  peopleCount: people.length,
  orgUnitCount: orgUnits.length,
  resourcePoolCount: resourcePools.length,
  clientCount: clients.length,
  projectCount: projects.length,
  activeProjectCount: activeProjects.length,
  closedProjectCount: closedProjects.length,
  projectPositionCount: projectPositions.length,
  positionFillHistoryCount: positionFillHistory.length,
  positionCandidateCount: projectPositionCandidates.length,
  personSkillCount: personSkillAssignments.length,
  workEvidenceCount: workEvidence.length,
  caseCount: cases.length,
  ragSnapshotCount: projectRagSnapshots.length,
  milestoneCount: projectMilestones.length,
  changeRequestCount: projectChangeRequests.length,
  budgetCount: projectBudgets.length,
  budgetApprovalCount: budgetApprovals.length,
  rolePlanCount: projectRolePlans.length,
  riskCount: projectRisks.length,
  retrospectiveCount: projectRetrospectives.length,
  benchStarPersonId: benchStar.id,
  overAllocatedPersonId: overAllocated.id,
};
