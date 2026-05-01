/**
 * IT-Company Seed Profile — replaces bank-scale.
 *
 * Models a custom-software-development firm "ITCo" with:
 *   - 200 people (4 inactive: 1 LEAVE, 1 TERMINATED, 2 retained-but-inactive)
 *   - 12 OrgUnits (1 root + 3 directorates + 8 departments)
 *   - 8 ResourcePools (one per leaf department)
 *   - 5-6 named Resource Managers
 *   - 40 projects (10 ACTIVE + 30 CLOSED) spanning 5 years (2021-04-28 → 2026-04-28)
 *   - ~480 assignments with full history, ~1,400 history rows
 *   - Per-project context: RAG snapshots, milestones, change requests, budgets, role plans, risks
 *   - Common-scenario coverage matrix (in-flight onboarding, over-allocated person,
 *     bench staff, partial staffing fulfilment, terminated person, rejected timesheet, etc.)
 *
 * Org shape:
 *   ITCo (root)
 *   ├── Engineering Directorate
 *   │   ├── Backend
 *   │   ├── Frontend
 *   │   ├── Mobile & QA
 *   │   └── DevOps & Platform
 *   ├── Delivery Directorate
 *   │   ├── Project Management Office (PMO)
 *   │   └── Resource Management Office (RMO)  ← holds the 5-6 RMs
 *   └── Operations Directorate
 *       ├── HR & People
 *       └── Finance & Admin
 */

// ---------------------------------------------------------------------------
// UUID helper — deterministic UUIDs for reproducibility
// ---------------------------------------------------------------------------
const ns = (prefix: string, seq: number): string => {
  const hex = seq.toString(16).padStart(12, '0');
  return `${prefix}-0000-0000-0000-${hex}`;
};

// Namespace prefixes — `bbbb*` to avoid collision with realistic (`aaaa*`),
// phase2/demo (`1111…`/`3333…`), and superadmin (`0000…`).
const P    = 'bbbb0001'; // Person
const OU   = 'bbbb0002'; // OrgUnit
const POS  = 'bbbb0003'; // Position
const MEM  = 'bbbb0004'; // PersonOrgMembership
const RL   = 'bbbb0005'; // ReportingLine
const RP   = 'bbbb0006'; // ResourcePool
const RPM  = 'bbbb0007'; // ResourcePoolMembership
const PRJ  = 'bbbb0008'; // Project
const ASG  = 'bbbb0009'; // Assignment
const APR  = 'bbbb000a'; // AssignmentApproval
const AHI  = 'bbbb000b'; // AssignmentHistory
const WES  = 'bbbb000c'; // WorkEvidenceSource
const WEV  = 'bbbb000d'; // WorkEvidence
const WEL  = 'bbbb000e'; // WorkEvidenceLink
const PEL  = 'bbbb000f'; // ProjectExternalLink
const ESS  = 'bbbb0010'; // ExternalSyncState
const SRQ  = 'bbbb0011'; // StaffingRequest
const SRF  = 'bbbb0012'; // StaffingRequestFulfilment
const ACT  = 'bbbb0013'; // EmployeeActivityEvent (skipped)
const RAG  = 'bbbb0014'; // ProjectRagSnapshot
const MIL  = 'bbbb0015'; // ProjectMilestone
const CR   = 'bbbb0016'; // ProjectChangeRequest
const PB   = 'bbbb0017'; // ProjectBudget
const PRP  = 'bbbb0018'; // ProjectRolePlan
const RSK  = 'bbbb0019'; // ProjectRisk
const TS   = 'bbbb001a'; // TimesheetWeek
const TE   = 'bbbb001b'; // TimesheetEntry
const PE   = 'bbbb001c'; // PulseEntry
const LR   = 'bbbb001d'; // LeaveRequest
const NOT  = 'bbbb001e'; // InAppNotification
const CSE  = 'bbbb001f'; // CaseRecord
const CSP  = 'bbbb0020'; // CaseStep
const CSU  = 'bbbb0021'; // CaseParticipant
const RET  = 'bbbb0022'; // ProjectRetrospective
const PVE  = 'bbbb0023'; // ProjectVendorEngagement

// ---------------------------------------------------------------------------
// Time anchors
// ---------------------------------------------------------------------------
const NOW = new Date('2026-04-28T00:00:00.000Z');
const WINDOW_START = new Date('2021-04-28T00:00:00.000Z');
const WINDOW_DAYS = 1827; // 5 × 365 + 2 leap days

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

// Deterministic pseudo-random in [min, max] from a seed.
function rng(min: number, max: number, seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  const r = x - Math.floor(x);
  return Math.floor(r * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Name pools — used by the factory loop for the ~190 generated people.
// ---------------------------------------------------------------------------
const GIVEN_NAMES = [
  'Aiden', 'Alex', 'Amir', 'Ana', 'Aria', 'Ben', 'Bilal', 'Caleb', 'Cara', 'Chen',
  'Daria', 'David', 'Eli', 'Elena', 'Emma', 'Fatima', 'Felix', 'Grace', 'Hugo', 'Iris',
  'Jamal', 'Jane', 'Jonah', 'Julia', 'Kai', 'Kira', 'Leah', 'Liam', 'Mark', 'Maya',
  'Mira', 'Nadia', 'Nolan', 'Olga', 'Omar', 'Pat', 'Petra', 'Quinn', 'Rhea', 'Riya',
  'Sam', 'Sara', 'Sofia', 'Soren', 'Talia', 'Tom', 'Vera', 'Vikram', 'Yara', 'Zane',
];
const FAMILY_NAMES = [
  'Anders', 'Bishop', 'Carter', 'Davis', 'Ellis', 'Fischer', 'Gibson', 'Hart',
  'Iqbal', 'Jensen', 'Kaur', 'Larsen', 'Martin', 'Nair', 'O\'Connor', 'Patel',
  'Quinn', 'Roberts', 'Stone', 'Turner', 'Ueda', 'Vasquez', 'Walker', 'Xu',
  'Young', 'Zheng',
];

function genName(seed: number): { given: string; family: string } {
  return {
    given: GIVEN_NAMES[seed % GIVEN_NAMES.length],
    family: FAMILY_NAMES[Math.floor(seed / GIVEN_NAMES.length) % FAMILY_NAMES.length],
  };
}

// ---------------------------------------------------------------------------
// PEOPLE — 8 hardcoded for role-test accounts + 192 generated.
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
  const personNumber = `ITCO-${pSeq.toString().padStart(3, '0')}`;
  const displayName = `${def.givenName} ${def.familyName}`;
  const p: PersonDef = { ...def, id, personNumber, displayName, orgUnitId: '' };
  people.push(p);
  return p;
}

// --- Hardcoded leadership + named role-test accounts (positions filled below) ---

// CEO
const ceo = pushPerson({
  givenName: 'Catherine', familyName: 'Monroe',
  primaryEmail: 'catherine.monroe@itco.local', grade: 'G14', role: 'CEO',
  skillsets: ['LEADERSHIP', 'STRATEGY'], employmentStatus: 'ACTIVE',
  hiredAt: addMonths(WINDOW_START, -24), terminatedAt: null, managerId: null,
});

// Engineering Director (maps to LocalAccount role `director`)
const noah = pushPerson({
  givenName: 'Noah', familyName: 'Bennett',
  primaryEmail: 'noah.bennett@itco.local', grade: 'G13', role: 'Engineering Director',
  skillsets: ['LEADERSHIP', 'ENGINEERING'], employmentStatus: 'ACTIVE',
  hiredAt: addMonths(WINDOW_START, -12), terminatedAt: null, managerId: ceo.id,
});

// Delivery Director
const delDir = pushPerson({
  givenName: 'Marcus', familyName: 'Rivera',
  primaryEmail: 'marcus.rivera@itco.local', grade: 'G13', role: 'Delivery Director',
  skillsets: ['DELIVERY', 'LEADERSHIP'], employmentStatus: 'ACTIVE',
  hiredAt: addMonths(WINDOW_START, -6), terminatedAt: null, managerId: ceo.id,
});

// Operations Director
const opsDir = pushPerson({
  givenName: 'Sarah', familyName: 'Chen',
  primaryEmail: 'sarah.chen@itco.local', grade: 'G13', role: 'Operations Director',
  skillsets: ['OPERATIONS', 'HR'], employmentStatus: 'ACTIVE',
  hiredAt: addMonths(WINDOW_START, -3), terminatedAt: null, managerId: ceo.id,
});

// HR Manager (maps to `hr_manager`)
const diana = pushPerson({
  givenName: 'Diana', familyName: 'Walsh',
  primaryEmail: 'diana.walsh@itco.local', grade: 'G10', role: 'HR Manager',
  skillsets: ['HR', 'COMPLIANCE'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(36), terminatedAt: null, managerId: opsDir.id,
});

// Resource Manager (maps to `resource_manager`)
const sophia = pushPerson({
  givenName: 'Sophia', familyName: 'Kim',
  primaryEmail: 'sophia.kim@itco.local', grade: 'G11', role: 'Resource Manager',
  skillsets: ['RESOURCE_MGMT', 'PLANNING'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(28), terminatedAt: null, managerId: delDir.id,
});

// Project Manager (maps to `project_manager`)
const lucas = pushPerson({
  givenName: 'Lucas', familyName: 'Reed',
  primaryEmail: 'lucas.reed@itco.local', grade: 'G11', role: 'Project Manager',
  skillsets: ['PMO', 'AGILE'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(30), terminatedAt: null, managerId: delDir.id,
});

// Delivery Manager (maps to `delivery_manager`)
const carlos = pushPerson({
  givenName: 'Carlos', familyName: 'Vega',
  primaryEmail: 'carlos.vega@itco.local', grade: 'G11', role: 'Delivery Manager',
  skillsets: ['DELIVERY', 'GOVERNANCE'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(32), terminatedAt: null, managerId: delDir.id,
});

// Mid Engineer (maps to `employee`)
const ethan = pushPerson({
  givenName: 'Ethan', familyName: 'Brooks',
  primaryEmail: 'ethan.brooks@itco.local', grade: 'G8', role: 'Mid Engineer',
  skillsets: ['TYPESCRIPT', 'REACT', 'NESTJS'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(18), terminatedAt: null, managerId: noah.id, // temporary; reset to eng manager later
});

// Dual-role RM/HR (maps to [`resource_manager`, `hr_manager`])
const emma = pushPerson({
  givenName: 'Emma', familyName: 'Garcia',
  primaryEmail: 'emma.garcia@itco.local', grade: 'G11', role: 'Resource Manager',
  skillsets: ['RESOURCE_MGMT', 'HR', 'PLANNING'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(26), terminatedAt: null, managerId: delDir.id,
});

// 4 more RMs (taking total to 6 RMs)
const rm3 = pushPerson({
  givenName: 'Amir', familyName: 'Khoury',
  primaryEmail: 'amir.khoury@itco.local', grade: 'G10', role: 'Resource Manager',
  skillsets: ['RESOURCE_MGMT'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(22), terminatedAt: null, managerId: delDir.id,
});
const rm4 = pushPerson({
  givenName: 'Priya', familyName: 'Sharma',
  primaryEmail: 'priya.sharma@itco.local', grade: 'G10', role: 'Resource Manager',
  skillsets: ['RESOURCE_MGMT'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(20), terminatedAt: null, managerId: delDir.id,
});
const rm5 = pushPerson({
  givenName: 'Tomasz', familyName: 'Novak',
  primaryEmail: 'tomasz.novak@itco.local', grade: 'G10', role: 'Resource Manager',
  skillsets: ['RESOURCE_MGMT'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(18), terminatedAt: null, managerId: delDir.id,
});
const rm6 = pushPerson({
  givenName: 'Hannah', familyName: 'Brooks',
  primaryEmail: 'hannah.brooks@itco.local', grade: 'G10', role: 'Resource Manager',
  skillsets: ['RESOURCE_MGMT'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(16), terminatedAt: null, managerId: delDir.id,
});

const allRMs = [sophia, emma, rm3, rm4, rm5, rm6]; // 6 RMs total (spec: 5-6)

// Engineering Managers (6 — anchor the Backend / Frontend / Mobile&QA / DevOps depts)
const engMgrs: PersonDef[] = [];
const engMgrNames = [
  ['Raj', 'Patel'], ['Olivia', 'Sinclair'], ['Jamal', 'Khan'],
  ['Mei', 'Lin'], ['Pavel', 'Rusu'], ['Aisha', 'Diallo'],
];
for (let i = 0; i < 6; i++) {
  const [given, family] = engMgrNames[i];
  engMgrs.push(pushPerson({
    givenName: given, familyName: family,
    primaryEmail: `${given.toLowerCase()}.${family.toLowerCase()}@itco.local`,
    grade: 'G11', role: 'Engineering Manager',
    skillsets: ['MANAGEMENT', 'ENGINEERING'], employmentStatus: 'ACTIVE',
    hiredAt: monthsAgo(20 + i), terminatedAt: null, managerId: noah.id,
  }));
}
// Re-parent Ethan under engMgrs[0] (his real chain)
ethan.managerId = engMgrs[0].id;

// 9 more PMs (10 total including Lucas)
const pms: PersonDef[] = [lucas];
const pmNames = [
  ['Henrik', 'Johansson'], ['Yuki', 'Tanaka'], ['Adriana', 'Reyes'],
  ['Mateo', 'Silva'], ['Chiara', 'Rossi'], ['Wei', 'Liu'],
  ['Anya', 'Volkov'], ['Sven', 'Eriksson'], ['Layla', 'Hassan'],
];
for (let i = 0; i < 9; i++) {
  const [given, family] = pmNames[i];
  pms.push(pushPerson({
    givenName: given, familyName: family,
    primaryEmail: `${given.toLowerCase()}.${family.toLowerCase()}@itco.local`,
    grade: i < 3 ? 'G11' : 'G10', role: 'Project Manager',
    skillsets: ['PMO', 'AGILE'], employmentStatus: 'ACTIVE',
    hiredAt: monthsAgo(8 + i * 2), terminatedAt: null, managerId: delDir.id,
  }));
}

// 1 more Delivery Manager (2 total including Carlos)
const dm2 = pushPerson({
  givenName: 'Felipe', familyName: 'Costa',
  primaryEmail: 'felipe.costa@itco.local', grade: 'G11', role: 'Delivery Manager',
  skillsets: ['DELIVERY'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(15), terminatedAt: null, managerId: delDir.id,
});

// 1 more HR Manager (2 total including Diana)
const hrMgr2 = pushPerson({
  givenName: 'Beatrice', familyName: 'Olsen',
  primaryEmail: 'beatrice.olsen@itco.local', grade: 'G10', role: 'HR Manager',
  skillsets: ['HR'], employmentStatus: 'ACTIVE',
  hiredAt: monthsAgo(14), terminatedAt: null, managerId: opsDir.id,
});

// 2 HR Specialists
const hrSpecs: PersonDef[] = [];
for (let i = 0; i < 2; i++) {
  hrSpecs.push(pushPerson({
    givenName: ['Naomi', 'Daniel'][i], familyName: ['Webb', 'Park'][i],
    primaryEmail: `${['naomi.webb', 'daniel.park'][i]}@itco.local`,
    grade: 'G8', role: 'HR Specialist',
    skillsets: ['HR'], employmentStatus: 'ACTIVE',
    hiredAt: monthsAgo(8 + i * 4), terminatedAt: null, managerId: diana.id,
  }));
}

// 5 Finance/Admin
const finance: PersonDef[] = [];
const finNames = [
  ['Rachel', 'Foster', 'G11', 'Finance Manager'],
  ['Theo', 'Page', 'G9', 'Finance Analyst'],
  ['Ines', 'Marin', 'G9', 'Finance Analyst'],
  ['Brett', 'Lowe', 'G8', 'Office Admin'],
  ['Iris', 'Kane', 'G8', 'Office Admin'],
];
for (let i = 0; i < 5; i++) {
  const [g, f, grade, role] = finNames[i];
  finance.push(pushPerson({
    givenName: g, familyName: f,
    primaryEmail: `${g.toLowerCase()}.${f.toLowerCase()}@itco.local`,
    grade, role,
    skillsets: ['FINANCE'], employmentStatus: 'ACTIVE',
    hiredAt: monthsAgo(6 + i * 3), terminatedAt: null, managerId: opsDir.id,
  }));
}

// 4 Architects
const architects: PersonDef[] = [];
const archNames = [
  ['Stefan', 'Mueller'], ['Indira', 'Naidu'],
  ['Yusuf', 'Ozturk'], ['Beatriz', 'Mendes'],
];
for (let i = 0; i < 4; i++) {
  const [given, family] = archNames[i];
  architects.push(pushPerson({
    givenName: given, familyName: family,
    primaryEmail: `${given.toLowerCase()}.${family.toLowerCase()}@itco.local`,
    grade: 'G11', role: 'Architect',
    skillsets: ['ARCHITECTURE', 'TYPESCRIPT', 'AWS'], employmentStatus: 'ACTIVE',
    hiredAt: monthsAgo(15 + i * 3), terminatedAt: null, managerId: engMgrs[i % engMgrs.length].id,
  }));
}

// Generated ICs to fill the rest. Distribution to total 200:
//  Senior Engineer: 35, Mid Engineer: ~70 (incl Ethan), Junior Engineer: 35,
//  QA: 10, DevOps: 5, Designer: 6
// We've already pushed 1 Mid Engineer (Ethan), so generate 69 more mid engineers.
function genIc(role: string, grade: string, count: number, mgrPool: PersonDef[], skills: string[], hiredOffsetMin: number, hiredOffsetMax: number): PersonDef[] {
  const arr: PersonDef[] = [];
  for (let i = 0; i < count; i++) {
    const seed = pSeq + 100;
    const { given, family } = genName(seed);
    const disambig = pSeq.toString(36); // ensures email uniqueness
    const mgr = mgrPool[i % mgrPool.length];
    arr.push(pushPerson({
      givenName: given, familyName: family,
      primaryEmail: `${given.toLowerCase()}.${family.toLowerCase()}.${disambig}@itco.local`,
      grade, role,
      skillsets: skills,
      employmentStatus: 'ACTIVE',
      hiredAt: monthsAgo(rng(hiredOffsetMin, hiredOffsetMax, seed)),
      terminatedAt: null,
      managerId: mgr.id,
    }));
  }
  return arr;
}

// Backend / Frontend / Mobile&QA / DevOps split — engMgrs[0..3] cover those
const seniorEngs = genIc('Senior Engineer', 'G10', 35, engMgrs.slice(0, 4), ['TYPESCRIPT', 'NESTJS', 'AWS'], 6, 36);
// 65 Mid Engineers (= 200 total people including the 2 inactive edge-case people).
const midEngs = genIc('Mid Engineer', 'G8', 65, engMgrs.slice(0, 4), ['TYPESCRIPT', 'REACT'], 3, 24);
const juniorEngs = genIc('Junior Engineer', 'G7', 35, engMgrs.slice(0, 4), ['TYPESCRIPT'], 1, 12);
const qaEngs = genIc('QA Engineer', 'G8', 10, [engMgrs[2]], ['QA', 'PLAYWRIGHT'], 4, 24);
const devOps = genIc('DevOps Engineer', 'G10', 5, [engMgrs[3]], ['AWS', 'TERRAFORM', 'KUBERNETES'], 6, 30);
const designers = genIc('Designer', 'G9', 6, [engMgrs[1]], ['DESIGN', 'FIGMA'], 4, 24);

const allIcs = [
  ethan,
  ...seniorEngs, ...midEngs, ...juniorEngs,
  ...qaEngs, ...devOps, ...designers,
];

// 2 inactive edge-case people: 1 LEAVE, 1 TERMINATED
const onLeave = pushPerson({
  givenName: 'Mira', familyName: 'Volkov',
  primaryEmail: 'mira.volkov@itco.local', grade: 'G8', role: 'Mid Engineer',
  skillsets: ['TYPESCRIPT'], employmentStatus: 'LEAVE',
  hiredAt: monthsAgo(28), terminatedAt: null, managerId: engMgrs[0].id,
});
const terminated = pushPerson({
  givenName: 'Viktor', familyName: 'Drago',
  primaryEmail: 'viktor.drago@itco.local', grade: 'G9', role: 'Senior Engineer',
  skillsets: ['TYPESCRIPT', 'AWS'], employmentStatus: 'TERMINATED',
  hiredAt: monthsAgo(36), terminatedAt: monthsAgo(2), managerId: engMgrs[0].id,
});

// Sanity check: should be ≤ 200 by construction (counted 200 above).
if (people.length > 200) {
  throw new Error(`IT-Company seed: ${people.length} people exceeds the 200 cap. Adjust IC counts.`);
}

// ---------------------------------------------------------------------------
// ORG UNITS — 12 total
// ---------------------------------------------------------------------------
let ouSeq = 0;
const ouid = (): string => ns(OU, ++ouSeq);

const ouRoot = ouid();           // ITCo
const ouEngDir = ouid();         // Engineering Directorate
const ouDelDir = ouid();         // Delivery Directorate
const ouOpsDir = ouid();         // Operations Directorate
const ouBackend = ouid();        // Backend Department
const ouFrontend = ouid();       // Frontend Department
const ouMobileQa = ouid();       // Mobile & QA Department
const ouDevOps = ouid();         // DevOps & Platform Department
const ouPmo = ouid();            // Project Management Office
const ouRmo = ouid();            // Resource Management Office
const ouHr = ouid();             // HR & People Department
const ouFinance = ouid();        // Finance & Admin Department

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
  { id: ouRoot, code: 'ITCO', name: 'ITCo', description: 'IT-Company root', parentOrgUnitId: null, managerPersonId: ceo.id, kind: 'directorate' },
  { id: ouEngDir, code: 'ENG-DIR', name: 'Engineering Directorate', description: 'All engineering departments', parentOrgUnitId: ouRoot, managerPersonId: noah.id, kind: 'directorate' },
  { id: ouDelDir, code: 'DEL-DIR', name: 'Delivery Directorate', description: 'PMO + Resource Management', parentOrgUnitId: ouRoot, managerPersonId: delDir.id, kind: 'directorate' },
  { id: ouOpsDir, code: 'OPS-DIR', name: 'Operations Directorate', description: 'HR + Finance + Admin', parentOrgUnitId: ouRoot, managerPersonId: opsDir.id, kind: 'directorate' },
  { id: ouBackend, code: 'DEP-BE', name: 'Backend Department', description: 'Server-side engineering', parentOrgUnitId: ouEngDir, managerPersonId: engMgrs[0].id, kind: 'department' },
  { id: ouFrontend, code: 'DEP-FE', name: 'Frontend Department', description: 'Client-side engineering', parentOrgUnitId: ouEngDir, managerPersonId: engMgrs[1].id, kind: 'department' },
  { id: ouMobileQa, code: 'DEP-MQ', name: 'Mobile & QA Department', description: 'Mobile + QA engineering', parentOrgUnitId: ouEngDir, managerPersonId: engMgrs[2].id, kind: 'department' },
  { id: ouDevOps, code: 'DEP-DO', name: 'DevOps & Platform Department', description: 'Infrastructure + DevOps', parentOrgUnitId: ouEngDir, managerPersonId: engMgrs[3].id, kind: 'department' },
  { id: ouPmo, code: 'DEP-PMO', name: 'Project Management Office', description: 'PMs + Delivery Managers', parentOrgUnitId: ouDelDir, managerPersonId: lucas.id, kind: 'department' },
  { id: ouRmo, code: 'DEP-RMO', name: 'Resource Management Office', description: 'Resource Managers', parentOrgUnitId: ouDelDir, managerPersonId: sophia.id, kind: 'department' },
  { id: ouHr, code: 'DEP-HR', name: 'HR & People', description: 'HR Managers + Specialists', parentOrgUnitId: ouOpsDir, managerPersonId: diana.id, kind: 'department' },
  { id: ouFinance, code: 'DEP-FIN', name: 'Finance & Admin', description: 'Finance + Office Admin', parentOrgUnitId: ouOpsDir, managerPersonId: finance[0].id, kind: 'department' },
];

// Map each person to their org unit
function orgFor(p: PersonDef): string {
  if (p.id === ceo.id) return ouRoot;
  if (p.id === noah.id) return ouEngDir;
  if (p.id === delDir.id) return ouDelDir;
  if (p.id === opsDir.id) return ouOpsDir;
  if (p.role.startsWith('Engineering Manager')) {
    if (p.id === engMgrs[0].id) return ouBackend;
    if (p.id === engMgrs[1].id) return ouFrontend;
    if (p.id === engMgrs[2].id) return ouMobileQa;
    if (p.id === engMgrs[3].id) return ouDevOps;
    if (p.id === engMgrs[4].id) return ouBackend;
    if (p.id === engMgrs[5].id) return ouFrontend;
  }
  if (p.role === 'Architect') return ouBackend;
  if (p.role === 'Project Manager' || p.role === 'Delivery Manager') return ouPmo;
  if (p.role === 'Resource Manager') return ouRmo;
  if (p.role === 'HR Manager' || p.role === 'HR Specialist') return ouHr;
  if (p.role === 'Finance Manager' || p.role === 'Finance Analyst' || p.role === 'Office Admin') return ouFinance;
  if (p.role === 'Senior Engineer' || p.role === 'Mid Engineer' || p.role === 'Junior Engineer') {
    // distribute across backend/frontend by hash
    const h = p.id.charCodeAt(p.id.length - 1) % 4;
    return [ouBackend, ouFrontend, ouMobileQa, ouDevOps][h];
  }
  if (p.role === 'QA Engineer') return ouMobileQa;
  if (p.role === 'DevOps Engineer') return ouDevOps;
  if (p.role === 'Designer') return ouFrontend;
  return ouRoot;
}
people.forEach(p => { p.orgUnitId = orgFor(p); });

// ---------------------------------------------------------------------------
// POSITIONS — one per person
// ---------------------------------------------------------------------------
let posSeq = 0;
const posid = (): string => ns(POS, ++posSeq);

const positions = people.map(p => ({
  id: posid(),
  orgUnitId: p.orgUnitId,
  occupantPersonId: p.id,
  code: p.personNumber,
  title: p.role,
  description: `${p.role} in ${orgUnits.find(o => o.id === p.orgUnitId)?.name ?? 'org'}`,
  isManagerial: ['CEO', 'Engineering Director', 'Delivery Director', 'Operations Director', 'Engineering Manager', 'Project Manager', 'Delivery Manager', 'Resource Manager', 'HR Manager', 'Finance Manager'].includes(p.role),
  validFrom: p.hiredAt,
  validTo: p.terminatedAt,
  createdAt: p.hiredAt,
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// PERSON ORG MEMBERSHIPS — one per person
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
// REPORTING LINES — solid lines + a few dotted
// ---------------------------------------------------------------------------
let rlSeq = 0;
const rlid = (): string => ns(RL, ++rlSeq);

const reportingLines = people
  .filter(p => p.managerId)
  .map(p => ({
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

// 4 dotted-line examples for cross-org visibility
([
  [carlos.id, noah.id],
  [sophia.id, delDir.id],
  [lucas.id, delDir.id],
  [emma.id, diana.id], // dual-role RM/HR sees HR Manager
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
// RESOURCE POOLS — one per leaf department (8 pools)
// ---------------------------------------------------------------------------
let rpSeq = 0;
const rpid = (): string => ns(RP, ++rpSeq);

const rpBackend = rpid();
const rpFrontend = rpid();
const rpMobileQa = rpid();
const rpDevOps = rpid();
const rpPmo = rpid();
const rpRmo = rpid();
const rpHr = rpid();
const rpFinance = rpid();

const resourcePools = [
  { id: rpBackend, orgUnitId: ouBackend, code: 'POOL-BE', name: 'Backend Pool', description: 'Backend engineers' },
  { id: rpFrontend, orgUnitId: ouFrontend, code: 'POOL-FE', name: 'Frontend Pool', description: 'Frontend engineers + designers' },
  { id: rpMobileQa, orgUnitId: ouMobileQa, code: 'POOL-MQ', name: 'Mobile & QA Pool', description: 'Mobile + QA engineers' },
  { id: rpDevOps, orgUnitId: ouDevOps, code: 'POOL-DO', name: 'DevOps Pool', description: 'Infrastructure + DevOps' },
  { id: rpPmo, orgUnitId: ouPmo, code: 'POOL-PMO', name: 'PMO Pool', description: 'Project + Delivery managers' },
  { id: rpRmo, orgUnitId: ouRmo, code: 'POOL-RMO', name: 'RMO Pool', description: 'Resource managers' },
  { id: rpHr, orgUnitId: ouHr, code: 'POOL-HR', name: 'HR Pool', description: 'HR staff' },
  { id: rpFinance, orgUnitId: ouFinance, code: 'POOL-FIN', name: 'Finance Pool', description: 'Finance + admin' },
];

// Resource Pool memberships — one per IC + managers, mapped from their org unit
let rpmSeq = 0;
const rpmid = (): string => ns(RPM, ++rpmSeq);

const orgToPool: Record<string, string> = {
  [ouBackend]: rpBackend,
  [ouFrontend]: rpFrontend,
  [ouMobileQa]: rpMobileQa,
  [ouDevOps]: rpDevOps,
  [ouPmo]: rpPmo,
  [ouRmo]: rpRmo,
  [ouHr]: rpHr,
  [ouFinance]: rpFinance,
};

const resourcePoolMemberships = people
  .filter(p => orgToPool[p.orgUnitId]) // skip CEO + directors at root level
  .map(p => ({
    id: rpmid(),
    personId: p.id,
    resourcePoolId: orgToPool[p.orgUnitId],
    validFrom: p.hiredAt,
    validTo: p.terminatedAt,
    createdAt: p.hiredAt,
    updatedAt: NOW,
  }));

// ---------------------------------------------------------------------------
// PROJECTS — 10 ACTIVE + 30 CLOSED across 5 years
// ---------------------------------------------------------------------------
let prjSeq = 0;
const prjid = (): string => ns(PRJ, ++prjSeq);

interface ProjectDef {
  id: string;
  projectCode: string;
  name: string;
  description: string;
  projectManagerId: string;
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED' | 'DRAFT' | 'ON_HOLD';
  engagementModel: 'TIME_AND_MATERIAL' | 'FIXED_PRICE' | 'MANAGED_SERVICE' | 'INTERNAL';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  startsOn: Date;
  endsOn: Date | null;
  closedAt: Date | null;
  outcomeRating: string | null;
  lessonsLearned: string | null;
  wouldStaffSameWay: boolean | null;
}

const projects: ProjectDef[] = [];

// 10 ACTIVE projects (started 1-12 months ago)
const activeProjectDefs: Array<Omit<ProjectDef, 'id' | 'projectCode' | 'closedAt' | 'outcomeRating' | 'lessonsLearned' | 'wouldStaffSameWay'>> = [
  { name: 'Acme Portal',                description: 'Customer self-service portal for Acme Industries — React + NestJS + Postgres.',         projectManagerId: lucas.id, status: 'ACTIVE', engagementModel: 'TIME_AND_MATERIAL', priority: 'HIGH',     startsOn: monthsAgo(6),  endsOn: monthsAgo(-6) },
  { name: 'Bluebird Mobile',            description: 'Native iOS + Android customer app for Bluebird Logistics.',                                  projectManagerId: pms[1].id, status: 'ACTIVE', engagementModel: 'FIXED_PRICE',         priority: 'HIGH',     startsOn: monthsAgo(3),  endsOn: monthsAgo(-9) },
  { name: 'Cascade API Migration',      description: 'Lift-and-shift legacy SOAP services to REST + gRPC for Cascade Insurance.',                  projectManagerId: pms[2].id, status: 'ACTIVE', engagementModel: 'TIME_AND_MATERIAL', priority: 'CRITICAL', startsOn: monthsAgo(9),  endsOn: monthsAgo(-3) },
  { name: 'Delta Data Platform',        description: 'Data lakehouse on AWS + Snowflake for Delta Analytics.',                                      projectManagerId: pms[3].id, status: 'ACTIVE', engagementModel: 'FIXED_PRICE',         priority: 'HIGH',     startsOn: monthsAgo(12), endsOn: monthsAgo(-3) },
  { name: 'Echo eCommerce v2',          description: 'Headless commerce rewrite for Echo Retail.',                                                  projectManagerId: pms[4].id, status: 'ACTIVE', engagementModel: 'TIME_AND_MATERIAL', priority: 'MEDIUM',   startsOn: monthsAgo(4),  endsOn: monthsAgo(-8) },
  { name: 'Forestry IoT Platform',      description: 'Sensor telemetry + reporting for Forestry Co. Managed-service contract.',                    projectManagerId: pms[5].id, status: 'ACTIVE', engagementModel: 'MANAGED_SERVICE',     priority: 'MEDIUM',   startsOn: monthsAgo(8),  endsOn: monthsAgo(-16) },
  { name: 'Gamma AI Copilot',           description: 'LLM-powered support copilot for Gamma SaaS.',                                                 projectManagerId: pms[6].id, status: 'ACTIVE', engagementModel: 'TIME_AND_MATERIAL', priority: 'HIGH',     startsOn: monthsAgo(2),  endsOn: monthsAgo(-10) },
  { name: 'Helios Payments',            description: 'PCI-compliant payments rebuild for Helios Bank.',                                             projectManagerId: pms[7].id, status: 'ACTIVE', engagementModel: 'FIXED_PRICE',         priority: 'CRITICAL', startsOn: monthsAgo(11), endsOn: monthsAgo(-1) },
  { name: 'Internal DeliveryCentral',   description: 'Workforce ops platform — internal product, the one you are looking at right now.',           projectManagerId: lucas.id,  status: 'ACTIVE', engagementModel: 'INTERNAL',            priority: 'HIGH',     startsOn: monthsAgo(5),  endsOn: null },
  { name: 'Jade Partner Portal',        description: 'B2B partner portal for Jade Manufacturing — recently kicked off.',                            projectManagerId: pms[8].id, status: 'ACTIVE', engagementModel: 'TIME_AND_MATERIAL', priority: 'MEDIUM',   startsOn: monthsAgo(1),  endsOn: monthsAgo(-11) },
];
for (let i = 0; i < activeProjectDefs.length; i++) {
  projects.push({
    ...activeProjectDefs[i],
    id: prjid(),
    projectCode: `IT-PROJ-${(i + 1).toString().padStart(3, '0')}`,
    closedAt: null,
    outcomeRating: null, lessonsLearned: null, wouldStaffSameWay: null,
  });
}

// 30 CLOSED projects spread across 5 years
const closedProjectThemes = [
  'Retail Checkout Rewrite', 'Bank Loan Calc API', 'Healthcare Patient Portal',
  'Nonprofit CMS', 'Logistics Dashboard', 'Insurance Claims Workflow',
  'Education LMS Migration', 'Travel Booking Engine', 'Real-Estate Listings v2',
  'Energy Meter Reporting', 'Agriculture Yield Tracker', 'Food-Delivery POS',
  'Telecom Provisioning Engine', 'Manufacturing MES', 'Pharmaceutical Audit Tool',
  'Retail Loyalty Program', 'Government Forms Portal', 'Hospitality Booking Suite',
  'Media Asset Library', 'Construction Bid Manager', 'Public-Sector Permits Portal',
  'Fintech Reconciliation', 'Crypto Wallet KYC', 'Marketplace Seller Tools',
  'Advertising Platform Rewrite', 'Subscription Billing Refactor', 'CRM Migration to Salesforce',
  'Legal Discovery Platform', 'Charity Donation Portal', 'Sports Stats App',
];
const closedEngagementMix: Array<ProjectDef['engagementModel']> = [
  'TIME_AND_MATERIAL', 'FIXED_PRICE', 'TIME_AND_MATERIAL', 'INTERNAL',
  'TIME_AND_MATERIAL', 'FIXED_PRICE', 'MANAGED_SERVICE', 'TIME_AND_MATERIAL',
  'FIXED_PRICE', 'TIME_AND_MATERIAL', 'TIME_AND_MATERIAL', 'FIXED_PRICE',
  'MANAGED_SERVICE', 'TIME_AND_MATERIAL', 'FIXED_PRICE', 'TIME_AND_MATERIAL',
  'INTERNAL', 'TIME_AND_MATERIAL', 'TIME_AND_MATERIAL', 'FIXED_PRICE',
  'INTERNAL', 'TIME_AND_MATERIAL', 'FIXED_PRICE', 'TIME_AND_MATERIAL',
  'TIME_AND_MATERIAL', 'TIME_AND_MATERIAL', 'TIME_AND_MATERIAL', 'FIXED_PRICE',
  'INTERNAL', 'TIME_AND_MATERIAL',
];
for (let i = 0; i < 30; i++) {
  // Distribute closed projects across the 5-year window
  const lifespanDays = 180 + ((i * 37) % 360); // 6-18 months
  const endsOnOffset = Math.floor((i / 30) * (WINDOW_DAYS - lifespanDays));
  const endsOn = addDays(WINDOW_START, endsOnOffset + lifespanDays);
  const startsOn = addDays(endsOn, -lifespanDays);
  const closedAt = addDays(endsOn, rng(0, 14, i));
  const year = endsOn.getUTCFullYear();
  // Outcome rating mix: most GREEN, some AMBER, occasional RED
  const ratingSeed = i % 7;
  const rating = ratingSeed === 0 ? 'RED' : ratingSeed < 3 ? 'AMBER' : 'GREEN';
  const wouldRestaff = rating !== 'RED';
  projects.push({
    id: prjid(),
    projectCode: `IT-PROJ-${(i + 11).toString().padStart(3, '0')}`,
    name: `${closedProjectThemes[i]} ${year}`,
    description: `${closedProjectThemes[i]} — completed engagement for our ${year} portfolio.`,
    projectManagerId: pms[i % pms.length].id,
    status: i < 20 ? 'CLOSED' : 'COMPLETED',
    engagementModel: closedEngagementMix[i],
    priority: ['MEDIUM', 'HIGH', 'LOW', 'MEDIUM'][i % 4] as ProjectDef['priority'],
    startsOn,
    endsOn,
    closedAt,
    outcomeRating: rating,
    lessonsLearned: rating === 'RED'
      ? 'Underestimated complexity, late discovery of integration debt; insufficient client involvement in early phases.'
      : rating === 'AMBER'
      ? 'Generally on track but late on a few milestones; team had to absorb scope creep.'
      : 'Smooth delivery, good client engagement, reusable assets harvested.',
    wouldStaffSameWay: wouldRestaff,
  });
}

const activeProjects = projects.slice(0, 10);
const closedProjects = projects.slice(10);

// ---------------------------------------------------------------------------
// ASSIGNMENTS — factory generates 5-15 per project
// ---------------------------------------------------------------------------
let asgSeq = 0;
const asgid = (): string => ns(ASG, ++asgSeq);

interface AssignmentDef {
  id: string;
  personId: string;
  projectId: string;
  requestedByPersonId: string;
  assignmentCode: string;
  staffingRole: string;
  status: string;
  allocationPercent: number;
  validFrom: Date;
  validTo: Date | null;
  notes: string;
  approvedAt: Date | null;
  requestedAt: Date;
}
const assignments: AssignmentDef[] = [];

// IC pools
const beIcs = midEngs.filter((_, i) => i % 4 === 0).concat(seniorEngs.filter((_, i) => i % 3 === 0)).slice(0, 25);
const feIcs = midEngs.filter((_, i) => i % 4 === 1).concat(seniorEngs.filter((_, i) => i % 3 === 1)).concat(designers).slice(0, 25);
const mobileIcs = midEngs.filter((_, i) => i % 4 === 2).concat(juniorEngs.slice(0, 5)).concat(qaEngs).slice(0, 18);
const devopsIcs = devOps.concat(seniorEngs.filter((_, i) => i % 5 === 0)).slice(0, 8);

const allEngIcs = [...seniorEngs, ...midEngs, ...juniorEngs, ...architects];

const ROLES = ['Lead Engineer', 'Senior Engineer', 'Engineer', 'Junior Engineer', 'QA Engineer', 'DevOps Engineer', 'Architect', 'UX Designer'];

function pickAlloc(idx: number): number {
  const opts = [100, 100, 80, 60, 50, 40, 25];
  return opts[idx % opts.length];
}

// ACTIVE projects: 8-15 assignments each
activeProjects.forEach((proj, projIdx) => {
  const teamSize = 8 + (projIdx % 4) * 2; // 8, 10, 12, 14
  for (let i = 0; i < teamSize; i++) {
    const seed = projIdx * 100 + i;
    const personPool = projIdx === 8 ? allEngIcs : projIdx % 2 === 0 ? beIcs.concat(feIcs) : allEngIcs;
    const person = personPool[seed % personPool.length];
    const startOffset = rng(0, 30, seed);
    const validFrom = addDays(proj.startsOn, startOffset);
    if (validFrom > NOW) continue;
    // Most active: ASSIGNED, some BOOKED (just approved), one PROPOSED (in approval queue)
    const statusRoll = i;
    let status: string;
    if (statusRoll === 0 && projIdx === 9) status = 'PROPOSED'; // brand-new project: still in approval
    else if (statusRoll === 1 && projIdx === 9) status = 'BOOKED';
    else if (statusRoll === 2 && projIdx < 3) status = 'BOOKED';
    else status = 'ASSIGNED';
    assignments.push({
      id: asgid(),
      personId: person.id,
      projectId: proj.id,
      requestedByPersonId: proj.projectManagerId,
      assignmentCode: `ASG-${asgSeq.toString().padStart(4, '0')}`,
      staffingRole: ROLES[i % ROLES.length],
      status,
      allocationPercent: pickAlloc(i),
      validFrom,
      validTo: null,
      notes: `${ROLES[i % ROLES.length]} on ${proj.name}`,
      approvedAt: status === 'PROPOSED' ? null : addDays(validFrom, rng(0, 5, seed)),
      requestedAt: addDays(validFrom, -rng(2, 14, seed + 1)),
    });
  }
});

// Over-allocation edge case: pick one mid engineer ("Pat O'Connor") and put them on 2 active projects at >100% combined.
// We'll force the 2nd assignment to be on a different project
const overAllocPerson = midEngs[7]; // arbitrary pick
assignments.push({
  id: asgid(),
  personId: overAllocPerson.id,
  projectId: activeProjects[3].id, // Delta Data Platform
  requestedByPersonId: pms[3].id,
  assignmentCode: `ASG-${asgSeq.toString().padStart(4, '0')}`,
  staffingRole: 'Engineer (Spillover)',
  status: 'ASSIGNED',
  allocationPercent: 50,
  validFrom: monthsAgo(2),
  validTo: null,
  notes: 'Cross-project loan; combined allocation exceeds 100%.',
  approvedAt: monthsAgo(2),
  requestedAt: monthsAgo(2),
});

// CLOSED projects: 6-12 assignments each, all status COMPLETED with validTo set
closedProjects.forEach((proj, idx) => {
  const teamSize = 6 + (idx % 4); // 6-9
  for (let i = 0; i < teamSize; i++) {
    const seed = (idx + 100) * 100 + i;
    const person = allEngIcs[seed % allEngIcs.length];
    const startOffset = rng(0, 30, seed);
    const validFrom = addDays(proj.startsOn, startOffset);
    const validTo = addDays(proj.endsOn ?? NOW, -rng(0, 14, seed + 7));
    assignments.push({
      id: asgid(),
      personId: person.id,
      projectId: proj.id,
      requestedByPersonId: proj.projectManagerId,
      assignmentCode: `ASG-${asgSeq.toString().padStart(4, '0')}`,
      staffingRole: ROLES[i % ROLES.length],
      status: 'COMPLETED',
      allocationPercent: pickAlloc(i),
      validFrom,
      validTo,
      notes: `${ROLES[i % ROLES.length]} on ${proj.name} (closed)`,
      approvedAt: addDays(validFrom, rng(0, 5, seed)),
      requestedAt: addDays(validFrom, -rng(2, 14, seed + 1)),
    });
  }
});

// Terminated person: had a couple of completed assignments before termination
assignments.push({
  id: asgid(),
  personId: terminated.id,
  projectId: closedProjects[5].id,
  requestedByPersonId: pms[2].id,
  assignmentCode: `ASG-${asgSeq.toString().padStart(4, '0')}`,
  staffingRole: 'Senior Engineer',
  status: 'COMPLETED',
  allocationPercent: 100,
  validFrom: closedProjects[5].startsOn,
  validTo: closedProjects[5].endsOn,
  notes: 'Final assignment before departure.',
  approvedAt: closedProjects[5].startsOn,
  requestedAt: addDays(closedProjects[5].startsOn, -7),
});

// ---------------------------------------------------------------------------
// ASSIGNMENT APPROVALS — sequence #1 always; some sequence #2 for director-level
// ---------------------------------------------------------------------------
let aprSeq = 0;
const aprid = (): string => ns(APR, ++aprSeq);

const assignmentApprovals = assignments.flatMap((a, idx) => {
  const out: Array<Record<string, unknown>> = [{
    id: aprid(),
    assignmentId: a.id,
    decidedByPersonId: a.status === 'PROPOSED' ? null : sophia.id,
    sequenceNumber: 1,
    decision: a.status === 'PROPOSED' ? 'PENDING' : 'APPROVED',
    decisionReason: a.status === 'PROPOSED' ? null : 'Resource available, skills match',
    decisionAt: a.approvedAt,
    createdAt: a.requestedAt,
    updatedAt: NOW,
  }];
  // 2 director-level escalations on active critical-priority projects
  if (idx < 2 && a.allocationPercent === 100 && a.status === 'ASSIGNED') {
    out.push({
      id: aprid(),
      assignmentId: a.id,
      decidedByPersonId: noah.id,
      sequenceNumber: 2,
      decision: 'APPROVED',
      decisionReason: 'Director sign-off on full-time allocation to critical project',
      decisionAt: a.approvedAt,
      createdAt: a.requestedAt,
      updatedAt: NOW,
    });
  }
  return out;
});

// ---------------------------------------------------------------------------
// ASSIGNMENT HISTORY — 3 max per assignment (CREATE / BOOK / END)
// ---------------------------------------------------------------------------
let ahiSeq = 0;
const ahiid = (): string => ns(AHI, ++ahiSeq);

const assignmentHistory: Array<Record<string, unknown>> = [];
assignments.forEach(a => {
  // CREATE
  assignmentHistory.push({
    id: ahiid(), assignmentId: a.id, changedByPersonId: a.requestedByPersonId,
    changeType: 'STATUS_PROPOSED', changeReason: 'Assignment requested', occurredAt: a.requestedAt,
  });
  // BOOK (skipped if PROPOSED still)
  if (a.approvedAt && a.status !== 'PROPOSED') {
    assignmentHistory.push({
      id: ahiid(), assignmentId: a.id, changedByPersonId: sophia.id,
      changeType: 'STATUS_BOOKED', changeReason: 'Approved by RM', occurredAt: a.approvedAt,
    });
  }
  // END (only for COMPLETED)
  if (a.status === 'COMPLETED' && a.validTo) {
    assignmentHistory.push({
      id: ahiid(), assignmentId: a.id, changedByPersonId: sophia.id,
      changeType: 'STATUS_COMPLETED', changeReason: 'Project ended', occurredAt: a.validTo,
    });
  }
});

// ---------------------------------------------------------------------------
// WORK EVIDENCE SOURCES + WORK EVIDENCE
// ---------------------------------------------------------------------------
let wesSeq = 0;
const wesid = (): string => ns(WES, ++wesSeq);

const workEvidenceSources = [
  { id: wesid(), provider: 'jira',     sourceType: 'worklogs',  connectionKey: 'jira-cloud-primary',  displayName: 'Jira Cloud Worklogs',     createdAt: monthsAgo(36), updatedAt: NOW },
  { id: wesid(), provider: 'azure_devops', sourceType: 'workitems', connectionKey: 'ado-primary',     displayName: 'Azure DevOps Workitems',  createdAt: monthsAgo(36), updatedAt: NOW },
  { id: wesid(), provider: 'manual',   sourceType: 'timesheet', connectionKey: 'internal-timesheet',  displayName: 'Manual Timesheet Entry',  createdAt: monthsAgo(36), updatedAt: NOW },
];

let wevSeq = 0;
const wevid = (): string => ns(WEV, ++wevSeq);
let welSeq = 0;
const welid = (): string => ns(WEL, ++welSeq);

const workEvidence: Array<Record<string, unknown>> = [];
const workEvidenceLinks: Array<Record<string, unknown>> = [];

// Active project assignments only — last 90 days, 3-5 entries per assignment
assignments
  .filter(a => a.status === 'ASSIGNED' || a.status === 'BOOKED')
  .forEach((a, idx) => {
    const entries = 3 + (idx % 3);
    for (let w = 0; w < entries; w++) {
      const sourceIdx = w % 3;
      const recordedAt = daysAgo(7 + w * 7);
      if (recordedAt < a.validFrom) continue;
      const evidenceId = wevid();
      workEvidence.push({
        id: evidenceId,
        workEvidenceSourceId: workEvidenceSources[sourceIdx].id,
        personId: a.personId,
        projectId: a.projectId,
        sourceRecordKey: `${a.assignmentCode}-W${w + 1}`,
        evidenceType: sourceIdx === 0 ? 'JIRA_WORKLOG' : sourceIdx === 1 ? 'MANUAL_ENTRY' : 'TIMESHEET_ENTRY',
        recordedAt,
        occurredOn: recordedAt,
        durationMinutes: rng(120, 480, idx * 100 + w),
        status: 'CAPTURED',
        capex: w % 4 === 0,
        summary: `Week-${w + 1} work — ${a.staffingRole}`,
        createdAt: recordedAt,
        updatedAt: recordedAt,
      });
      // Half of Jira evidence has an external link
      if (sourceIdx === 0 && w % 2 === 0) {
        workEvidenceLinks.push({
          id: welid(),
          workEvidenceId: evidenceId,
          provider: 'jira',
          externalKey: `IT-${rng(100, 999, idx * 10 + w)}`,
          externalUrl: `https://itco.atlassian.net/browse/IT-${rng(100, 999, idx * 10 + w)}`,
          linkType: 'ISSUE',
          createdAt: recordedAt,
        });
      }
    }
  });

// ---------------------------------------------------------------------------
// PROJECT EXTERNAL LINKS + SYNC STATE — most active projects have a Jira link
// ---------------------------------------------------------------------------
let pelSeq = 0;
const pelid = (): string => ns(PEL, ++pelSeq);
let essSeq = 0;
const essid = (): string => ns(ESS, ++essSeq);

const projectExternalLinks: Array<Record<string, unknown>> = [];
const externalSyncStates: Array<Record<string, unknown>> = [];

// All active + first 25 closed projects get a Jira link
projects.slice(0, 35).forEach((p, idx) => {
  const provider = idx % 5 === 4 ? 'azure_devops' : 'jira';
  const linkId = pelid();
  projectExternalLinks.push({
    id: linkId,
    projectId: p.id,
    provider,
    connectionKey: provider === 'jira' ? 'jira-cloud-primary' : 'ado-primary',
    externalProjectKey: p.projectCode,
    externalProjectName: p.name,
    externalUrl: provider === 'jira'
      ? `https://itco.atlassian.net/projects/${p.projectCode}`
      : `https://dev.azure.com/itco/${p.projectCode}`,
    createdAt: p.startsOn,
    updatedAt: NOW,
  });
  externalSyncStates.push({
    id: essid(),
    projectExternalLinkId: linkId,
    syncStatus: idx === 7 ? 'FAILED' : 'SUCCEEDED',
    lastSyncedAt: daysAgo(idx === 7 ? 5 : 1),
    lastSuccessfulSyncedAt: daysAgo(idx === 7 ? 5 : 1),
    createdAt: p.startsOn,
    updatedAt: NOW,
  });
});

// ---------------------------------------------------------------------------
// STAFFING REQUESTS + FULFILMENTS
// ---------------------------------------------------------------------------
let srqSeq = 0;
const srqid = (): string => ns(SRQ, ++srqSeq);
let srfSeq = 0;
const srfid = (): string => ns(SRF, ++srfSeq);

const staffingRequests = [
  // 4 OPEN (Jade Partner Portal needs the most help)
  { id: srqid(), projectId: activeProjects[9].id, requestedByPersonId: pms[8].id, role: 'Senior Engineer',     skills: ['TYPESCRIPT', 'NESTJS'],     summary: 'Lead engineer for Jade Partner Portal',          allocationPercent: 100, headcountRequired: 1, headcountFulfilled: 0, priority: 'HIGH',     status: 'OPEN',     startDate: monthsAgo(0), endDate: monthsAgo(-6), createdAt: daysAgo(7),  updatedAt: daysAgo(7) },
  { id: srqid(), projectId: activeProjects[9].id, requestedByPersonId: pms[8].id, role: 'Frontend Engineer',   skills: ['REACT', 'TYPESCRIPT'],      summary: 'Frontend dev for Jade Partner Portal',           allocationPercent: 100, headcountRequired: 2, headcountFulfilled: 0, priority: 'MEDIUM',   status: 'OPEN',     startDate: monthsAgo(0), endDate: monthsAgo(-6), createdAt: daysAgo(5),  updatedAt: daysAgo(5) },
  { id: srqid(), projectId: activeProjects[6].id, requestedByPersonId: pms[6].id, role: 'ML Engineer',         skills: ['PYTHON', 'PYTORCH'],        summary: 'LLM specialist for Gamma AI Copilot',            allocationPercent: 80,  headcountRequired: 1, headcountFulfilled: 0, priority: 'URGENT',   status: 'OPEN',     startDate: daysAgo(7),   endDate: monthsAgo(-3), createdAt: daysAgo(7),  updatedAt: daysAgo(7) },
  { id: srqid(), projectId: activeProjects[5].id, requestedByPersonId: pms[5].id, role: 'IoT Specialist',      skills: ['MQTT', 'EMBEDDED'],         summary: 'IoT sensor specialist for Forestry',             allocationPercent: 60,  headcountRequired: 1, headcountFulfilled: 0, priority: 'LOW',      status: 'OPEN',     startDate: monthsAgo(-1), endDate: monthsAgo(-9), createdAt: daysAgo(14), updatedAt: daysAgo(14) },
  // 2 IN_REVIEW
  { id: srqid(), projectId: activeProjects[3].id, requestedByPersonId: pms[3].id, role: 'Data Engineer',       skills: ['SNOWFLAKE', 'AIRFLOW'],     summary: 'Data engineer for Delta Data Platform',          allocationPercent: 100, headcountRequired: 1, headcountFulfilled: 0, priority: 'HIGH',     status: 'IN_REVIEW', startDate: monthsAgo(0), endDate: monthsAgo(-3), createdAt: daysAgo(3),  updatedAt: daysAgo(2) },
  { id: srqid(), projectId: activeProjects[7].id, requestedByPersonId: pms[7].id, role: 'Security Reviewer',   skills: ['PCI', 'SECURITY'],          summary: 'PCI compliance reviewer for Helios Payments',    allocationPercent: 40,  headcountRequired: 1, headcountFulfilled: 0, priority: 'URGENT',   status: 'IN_REVIEW', startDate: daysAgo(7),   endDate: monthsAgo(-1), createdAt: daysAgo(2),  updatedAt: daysAgo(1) },
  // 1 PARTIAL (FULFILLED with headcount<required)
  { id: srqid(), projectId: activeProjects[4].id, requestedByPersonId: pms[4].id, role: 'Frontend Engineer',   skills: ['REACT', 'NEXTJS'],          summary: 'Frontend devs for Echo eCommerce v2',            allocationPercent: 100, headcountRequired: 3, headcountFulfilled: 2, priority: 'MEDIUM',   status: 'IN_REVIEW', startDate: monthsAgo(2), endDate: monthsAgo(-8), createdAt: daysAgo(45), updatedAt: daysAgo(7) },
  // 1 CANCELLED (showing historical request)
  { id: srqid(), projectId: closedProjects[2].id, requestedByPersonId: pms[2].id, role: 'Mobile Engineer',     skills: ['SWIFT', 'KOTLIN'],          summary: 'Mobile dev that was no longer needed',           allocationPercent: 80,  headcountRequired: 1, headcountFulfilled: 0, priority: 'LOW',      status: 'CANCELLED', startDate: monthsAgo(40), endDate: monthsAgo(34), createdAt: monthsAgo(42), updatedAt: monthsAgo(40) },
];

const staffingRequestFulfilments = [
  // 2 fulfilments for the partial request
  { id: srfid(), requestId: staffingRequests[6].id, assignedPersonId: feIcs[0].id, proposedByPersonId: sophia.id, fulfilledAt: daysAgo(20) },
  { id: srfid(), requestId: staffingRequests[6].id, assignedPersonId: feIcs[1].id, proposedByPersonId: sophia.id, fulfilledAt: daysAgo(15) },
];

// ---------------------------------------------------------------------------
// PROJECT MILESTONES — 3 per project
// ---------------------------------------------------------------------------
let milSeq = 0;
const milid = (): string => ns(MIL, ++milSeq);

const projectMilestones: Array<Record<string, unknown>> = [];
projects.forEach((p, idx) => {
  const isActive = p.status === 'ACTIVE';
  const span = (p.endsOn ?? addMonths(p.startsOn, 12)).getTime() - p.startsOn.getTime();
  for (let i = 0; i < 3; i++) {
    const dueAt = new Date(p.startsOn.getTime() + (span * (i + 1)) / 4);
    let status: string;
    if (isActive) {
      // first milestone hit, second on track, third planned
      status = i === 0 ? 'HIT' : i === 1 && idx % 3 === 0 ? 'IN_PROGRESS' : 'PLANNED';
    } else {
      // closed: HIT mostly, MISSED if RED outcome
      status = p.outcomeRating === 'RED' && i === 2 ? 'MISSED' : 'HIT';
    }
    projectMilestones.push({
      id: milid(),
      projectId: p.id,
      name: `${['Discovery', 'Build', 'Launch'][i]} milestone for ${p.name}`,
      plannedDate: dueAt,
      status,
      actualDate: status === 'HIT' ? dueAt : null,
      progressPct: status === 'HIT' ? 100 : status === 'IN_PROGRESS' ? 50 : 0,
      createdAt: p.startsOn,
      updatedAt: NOW,
    });
  }
});

// ---------------------------------------------------------------------------
// PROJECT CHANGE REQUESTS — ~30 across projects
// ---------------------------------------------------------------------------
let crSeq = 0;
const crid = (): string => ns(CR, ++crSeq);

const projectChangeRequests: Array<Record<string, unknown>> = [];
// 1 per active project + 20 across closed
activeProjects.forEach((p, idx) => {
  projectChangeRequests.push({
    id: crid(),
    projectId: p.id,
    title: `Scope expansion ${idx + 1}`,
    description: `Client requested ${idx % 2 === 0 ? 'additional reporting features' : 'integration with new third-party system'}`,
    severity: idx % 4 === 0 ? 'HIGH' : 'MEDIUM',
    status: idx === 0 ? 'PROPOSED' : idx === 1 ? 'APPROVED' : 'PROPOSED',
    requesterPersonId: p.projectManagerId,
    decidedByPersonId: idx === 1 ? p.projectManagerId : null,
    decidedAt: idx === 1 ? daysAgo(7) : null,
    createdAt: daysAgo(rng(3, 30, idx)),
    updatedAt: NOW,
  });
});
for (let i = 0; i < 20; i++) {
  const proj = closedProjects[i];
  projectChangeRequests.push({
    id: crid(),
    projectId: proj.id,
    title: `Mid-project change #${i + 1}`,
    description: `Scope or schedule change during project lifespan`,
    severity: i % 5 === 0 ? 'HIGH' : i % 3 === 0 ? 'MEDIUM' : 'LOW',
    status: 'APPROVED',
    requesterPersonId: proj.projectManagerId,
    decidedByPersonId: proj.projectManagerId,
    decidedAt: addDays(proj.startsOn, rng(95, 120, i)),
    createdAt: addDays(proj.startsOn, rng(30, 90, i)),
    updatedAt: proj.endsOn,
  });
}

// ---------------------------------------------------------------------------
// PROJECT BUDGETS — one per project
// ---------------------------------------------------------------------------
let pbSeq = 0;
const pbid = (): string => ns(PB, ++pbSeq);

const projectBudgets = projects.map((p, idx) => {
  const fiscalYear = p.startsOn.getUTCFullYear();
  const baseBudget = 100000 + rng(50000, 500000, idx);
  const isActive = p.status === 'ACTIVE';
  const planned = isActive ? Math.floor(baseBudget * 0.6) : baseBudget;
  // One active project will show variance for testing
  const actual = idx === 7 ? Math.floor(planned * 1.15) : Math.floor(planned * (0.8 + (idx % 5) * 0.05));
  return {
    id: pbid(),
    projectId: p.id,
    fiscalYear,
    capexBudget: Math.floor(baseBudget * 0.4),
    opexBudget: Math.floor(baseBudget * 0.6),
    earnedValue: isActive ? Math.floor(baseBudget * 0.5) : baseBudget,
    actualCost: actual,
    plannedToDate: planned,
    eac: isActive ? Math.floor(baseBudget * 1.05) : baseBudget,
    currencyCode: 'AUD',
    updatedAt: NOW,
  };
});

// ---------------------------------------------------------------------------
// PROJECT ROLE PLANS — 4 per project
// ---------------------------------------------------------------------------
let prpSeq = 0;
const prpid = (): string => ns(PRP, ++prpSeq);

const projectRolePlans: Array<Record<string, unknown>> = [];
projects.forEach((p, idx) => {
  const roles = ['Lead Engineer', 'Senior Engineer', 'Engineer', 'QA Engineer'];
  roles.forEach((roleName, ri) => {
    projectRolePlans.push({
      id: prpid(),
      projectId: p.id,
      roleName,
      seniorityLevel: ri === 0 ? 'SENIOR' : ri < 3 ? 'MID' : 'JUNIOR',
      headcount: ri === 0 ? 1 : ri === 1 ? 2 : ri === 2 ? 3 : 1,
      allocationPercent: ri === 0 ? 100 : 80,
      requiredSkillIds: [],
      plannedStartDate: p.startsOn,
      plannedEndDate: p.endsOn,
      createdAt: p.startsOn,
      updatedAt: NOW,
    });
  });
});

// ---------------------------------------------------------------------------
// PROJECT RISKS — 2 per project
// ---------------------------------------------------------------------------
let rskSeq = 0;
const rskid = (): string => ns(RSK, ++rskSeq);

const projectRisks: Array<Record<string, unknown>> = [];
const riskTitles = [
  'Resource availability risk', 'Third-party API instability',
  'Scope creep from client', 'Underestimated complexity',
  'Compliance review delay', 'Data migration scale risk',
];
const riskCategories = ['SCOPE', 'TECHNICAL', 'SCHEDULE', 'BUSINESS', 'OPERATIONAL', 'BUDGET'];
projects.forEach((p, idx) => {
  for (let r = 0; r < 2; r++) {
    projectRisks.push({
      id: rskid(),
      projectId: p.id,
      title: riskTitles[(idx * 2 + r) % riskTitles.length],
      description: `Risk identified during ${r === 0 ? 'discovery' : 'mid-project'} phase`,
      category: riskCategories[(idx * 2 + r) % riskCategories.length],
      probability: 3 - (r % 3),
      impact: 3 + ((r + idx) % 3),
      strategyDescription: 'Mitigation plan in place; weekly review',
      status: p.status === 'ACTIVE' ? 'IDENTIFIED' : 'CLOSED',
      ownerPersonId: p.projectManagerId,
      raisedAt: addDays(p.startsOn, 7 + r * 14),
      createdAt: addDays(p.startsOn, 7 + r * 14),
      updatedAt: NOW,
    });
  }
});

// ---------------------------------------------------------------------------
// PROJECT RAG SNAPSHOTS — sampled rather than every-week
// ---------------------------------------------------------------------------
function mondayOf(d: Date): Date {
  const out = new Date(d);
  const day = out.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setUTCDate(out.getUTCDate() + diff);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

const projectRagSnapshots: Array<Record<string, unknown>> = [];
const ragRatings: Array<'GREEN' | 'AMBER' | 'RED'> = ['GREEN', 'GREEN', 'GREEN', 'AMBER', 'GREEN'];
let ragSeq = 0;
const ragid = (): string => ns(RAG, ++ragSeq);

// Active: weekly for last 12 weeks
activeProjects.forEach((p, idx) => {
  for (let w = 11; w >= 0; w--) {
    const monday = mondayOf(weekMonday(w));
    if (monday < p.startsOn) continue;
    // Project 7 (Helios) is the struggling one — RED + AMBER
    let rating: 'GREEN' | 'AMBER' | 'RED';
    if (idx === 7) rating = w < 3 ? 'RED' : 'AMBER';
    else if (idx === 2) rating = w < 6 ? 'AMBER' : 'GREEN';
    else rating = ragRatings[(w + idx) % ragRatings.length];
    projectRagSnapshots.push({
      id: ragid(),
      projectId: p.id,
      weekStarting: monday,
      staffingRag: rating,
      scheduleRag: idx === 7 && w < 3 ? 'RED' : rating,
      budgetRag: idx === 7 ? 'AMBER' : 'GREEN',
      clientRag: 'GREEN',
      overallRag: rating,
      autoComputedOverall: rating,
      isOverridden: false,
      narrative: rating === 'RED' ? 'Critical blocker on payment gateway integration' : rating === 'AMBER' ? 'Some schedule slip; recovery plan in place' : 'On track',
      recordedByPersonId: p.projectManagerId,
      createdAt: monday,
      updatedAt: NOW,
    });
  }
});
// Active: monthly historical back to start (skip the most recent 3 months covered above)
activeProjects.forEach((p, idx) => {
  let cursor = mondayOf(p.startsOn);
  while (cursor < monthsAgo(3)) {
    const rating = ragRatings[(cursor.getUTCMonth() + idx) % ragRatings.length];
    projectRagSnapshots.push({
      id: ragid(),
      projectId: p.id,
      weekStarting: cursor,
      staffingRag: rating, scheduleRag: rating, budgetRag: rating, clientRag: 'GREEN',
      overallRag: rating, autoComputedOverall: rating, isOverridden: false,
      narrative: 'Historical monthly summary',
      recordedByPersonId: p.projectManagerId,
      createdAt: cursor, updatedAt: NOW,
    });
    cursor = addMonths(cursor, 1);
    cursor = mondayOf(cursor);
  }
});
// Closed: monthly across lifespan
closedProjects.forEach((p, idx) => {
  let cursor = mondayOf(p.startsOn);
  const end = p.endsOn ?? p.startsOn;
  while (cursor < end) {
    let rating: 'GREEN' | 'AMBER' | 'RED' =
      p.outcomeRating === 'RED' ? (Math.random() < 0.3 ? 'RED' : 'AMBER') :
      p.outcomeRating === 'AMBER' ? (Math.random() < 0.3 ? 'AMBER' : 'GREEN') :
      'GREEN';
    // Make it deterministic
    rating = ragRatings[(cursor.getUTCMonth() + idx) % ragRatings.length];
    if (p.outcomeRating === 'RED') rating = 'RED';
    if (p.outcomeRating === 'AMBER' && rating === 'GREEN') rating = 'AMBER';
    projectRagSnapshots.push({
      id: ragid(),
      projectId: p.id,
      weekStarting: cursor,
      staffingRag: rating, scheduleRag: rating, budgetRag: rating, clientRag: rating,
      overallRag: rating, autoComputedOverall: rating, isOverridden: false,
      narrative: 'Historical monthly summary (closed project)',
      recordedByPersonId: p.projectManagerId,
      createdAt: cursor, updatedAt: NOW,
    });
    cursor = addMonths(cursor, 1);
    cursor = mondayOf(cursor);
  }
});

// ---------------------------------------------------------------------------
// PROJECT RETROSPECTIVES — one per closed project
// ---------------------------------------------------------------------------
let retSeq = 0;
const retid = (): string => ns(RET, ++retSeq);

const projectRetrospectives = closedProjects.map(p => ({
  id: retid(),
  projectId: p.id,
  outcomeRating: p.outcomeRating,
  lessonsLearned: p.lessonsLearned,
  wouldStaffSameWay: p.wouldStaffSameWay,
  retrospectiveDate: addDays(p.endsOn ?? NOW, 14),
  facilitatedByPersonId: carlos.id,
  createdAt: addDays(p.endsOn ?? NOW, 14),
  updatedAt: NOW,
}));

// Note: ProjectVendorEngagement requires real Vendor records (FK to Vendor model).
// Vendors are out-of-scope for this profile — skip vendor engagements.
const projectVendorEngagements: Array<Record<string, unknown>> = [];

// ---------------------------------------------------------------------------
// CASES — 12 with mixed types and statuses (incl. in-flight onboarding)
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
  // case-step plans
  stepCount: number;
  completedStepCount: number;
  dueOffsetDays: number;
}

const cases: CaseDef[] = [
  // 3 ONBOARDING (1 in-flight, 1 just-started, 1 completed)
  { id: cseid(), caseNumber: 'CASE-2026-001', caseTypeKey: 'ONBOARDING', subjectPersonId: juniorEngs[0].id, ownerPersonId: diana.id, status: 'IN_PROGRESS', summary: 'Onboarding: junior engineer hire (in-flight, 3/5 steps)', stepCount: 5, completedStepCount: 3, dueOffsetDays: 14 },
  { id: cseid(), caseNumber: 'CASE-2026-002', caseTypeKey: 'ONBOARDING', subjectPersonId: juniorEngs[1].id, ownerPersonId: diana.id, status: 'OPEN',         summary: 'Onboarding: junior engineer hire (just started)',     stepCount: 5, completedStepCount: 1, dueOffsetDays: 21 },
  { id: cseid(), caseNumber: 'CASE-2026-003', caseTypeKey: 'ONBOARDING', subjectPersonId: midEngs[0].id, ownerPersonId: hrMgr2.id, status: 'COMPLETED',     summary: 'Onboarding completed for mid engineer',                stepCount: 5, completedStepCount: 5, dueOffsetDays: -30 },
  // 2 OFFBOARDING
  { id: cseid(), caseNumber: 'CASE-2026-004', caseTypeKey: 'OFFBOARDING', subjectPersonId: terminated.id, ownerPersonId: diana.id, status: 'COMPLETED',    summary: 'Offboarding: senior engineer departure',               stepCount: 5, completedStepCount: 5, dueOffsetDays: -45 },
  { id: cseid(), caseNumber: 'CASE-2026-005', caseTypeKey: 'OFFBOARDING', subjectPersonId: onLeave.id, ownerPersonId: diana.id, status: 'IN_PROGRESS',     summary: 'Offboarding: in-progress for departing engineer',       stepCount: 5, completedStepCount: 2, dueOffsetDays: 7 },
  // 4 PERFORMANCE
  { id: cseid(), caseNumber: 'CASE-2026-006', caseTypeKey: 'PERFORMANCE', subjectPersonId: midEngs[3].id, ownerPersonId: hrMgr2.id, status: 'IN_PROGRESS', summary: 'Performance review in progress (mid engineer)',         stepCount: 4, completedStepCount: 2, dueOffsetDays: 5 },
  { id: cseid(), caseNumber: 'CASE-2026-007', caseTypeKey: 'PERFORMANCE', subjectPersonId: seniorEngs[0].id, ownerPersonId: diana.id, status: 'OPEN',     summary: 'Performance review for senior engineer (overdue)',     stepCount: 4, completedStepCount: 0, dueOffsetDays: -3 },
  { id: cseid(), caseNumber: 'CASE-2026-008', caseTypeKey: 'PERFORMANCE', subjectPersonId: seniorEngs[3].id, ownerPersonId: hrMgr2.id, status: 'COMPLETED', summary: 'Performance review completed (senior engineer)',      stepCount: 4, completedStepCount: 4, dueOffsetDays: -60 },
  { id: cseid(), caseNumber: 'CASE-2026-009', caseTypeKey: 'PERFORMANCE', subjectPersonId: midEngs[10].id, ownerPersonId: hrMgr2.id, status: 'COMPLETED', summary: 'Performance review completed (mid engineer)',          stepCount: 4, completedStepCount: 4, dueOffsetDays: -90 },
  // 3 TRANSFER
  { id: cseid(), caseNumber: 'CASE-2026-010', caseTypeKey: 'TRANSFER',    subjectPersonId: midEngs[2].id, ownerPersonId: diana.id, status: 'IN_PROGRESS',  summary: 'Transfer from Backend to DevOps department',           stepCount: 4, completedStepCount: 1, dueOffsetDays: 14 },
  { id: cseid(), caseNumber: 'CASE-2026-011', caseTypeKey: 'TRANSFER',    subjectPersonId: midEngs[5].id, ownerPersonId: hrMgr2.id, status: 'COMPLETED',   summary: 'Transfer completed (Frontend to Mobile&QA)',           stepCount: 4, completedStepCount: 4, dueOffsetDays: -30 },
  { id: cseid(), caseNumber: 'CASE-2026-012', caseTypeKey: 'TRANSFER',    subjectPersonId: midEngs[8].id, ownerPersonId: diana.id, status: 'OPEN',         summary: 'Pending transfer request',                              stepCount: 4, completedStepCount: 0, dueOffsetDays: 21 },
];

// ---------------------------------------------------------------------------
// TIMESHEETS — last 12 weeks for everyone, +8 weeks for active ICs
// ---------------------------------------------------------------------------
export function generateItCompanyTimesheets(): {
  weeks: Array<Record<string, unknown>>;
  entries: Array<Record<string, unknown>>;
} {
  const weeks: Array<Record<string, unknown>> = [];
  const entries: Array<Record<string, unknown>> = [];
  let tsSeq = 0;
  let teSeq = 0;

  // People who get the full 20 weeks: those with active assignments now
  const activeAsgPersonIds = new Set<string>(
    assignments.filter(a => a.status === 'ASSIGNED').map(a => a.personId),
  );

  for (const person of people) {
    if (person.employmentStatus === 'TERMINATED') continue;
    const isActiveIc = activeAsgPersonIds.has(person.id);
    const weekDepth = isActiveIc ? 20 : 12;

    for (let w = weekDepth - 1; w >= 0; w--) {
      const monday = weekMonday(w);
      if (monday < person.hiredAt) continue;
      tsSeq += 1;
      const weekId = ns(TS, tsSeq);

      // Status mix
      let status: string;
      if (w === 0) status = 'DRAFT';
      else if (w === 4 && person.id === ethan.id) status = 'REJECTED'; // edge case
      else if (w >= 1 && w <= 3) status = 'SUBMITTED';
      else status = 'APPROVED';

      weeks.push({
        id: weekId,
        personId: person.id,
        weekStart: monday,
        status,
        submittedAt: status !== 'DRAFT' ? monday : null,
        approvedBy: status === 'APPROVED' ? sophia.id : null,
        approvedAt: status === 'APPROVED' ? monday : null,
        rejectedReason: status === 'REJECTED' ? 'Hours don\'t match assignment allocation' : null,
        version: 1,
      });

      // 5 entries per week (Mon-Fri) for active ICs with assignments
      if (isActiveIc) {
        const personAsgns = assignments.filter(a =>
          a.personId === person.id &&
          a.validFrom <= monday &&
          (a.validTo === null || a.validTo >= monday),
        );
        if (personAsgns.length === 0) continue;
        for (let day = 0; day < 5; day++) {
          const entryDate = addDays(monday, day);
          if (entryDate > NOW) break;
          for (const a of personAsgns) {
            const hoursForProject = (a.allocationPercent / 100) * 8;
            if (hoursForProject <= 0) continue;
            teSeq += 1;
            entries.push({
              id: ns(TE, teSeq),
              timesheetWeekId: weekId,
              projectId: a.projectId,
              date: entryDate,
              hours: Math.round(hoursForProject * 10) / 10,
              capex: false,
              description: `Work on project`,
            });
          }
        }
      }
    }
  }

  return { weeks, entries };
}

// ---------------------------------------------------------------------------
// PULSE ENTRIES — 12 weeks for ICs
// ---------------------------------------------------------------------------
export function generateItCompanyPulseEntries(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let seq = 0;
  for (const ic of allIcs) {
    if (ic.employmentStatus !== 'ACTIVE') continue;
    const baseMood = 3 + ((seq % 3) === 0 ? 1 : 0);
    for (let w = 11; w >= 1; w--) {
      seq += 1;
      const monday = weekMonday(w);
      if (monday < ic.hiredAt) continue;
      let mood = baseMood;
      // Some declining-trend examples
      if (ic.id === midEngs[3].id && w < 5) mood = Math.max(1, baseMood - 2);
      if (w >= 6 && w <= 8) mood = Math.max(1, baseMood - 1);
      out.push({
        id: ns(PE, seq),
        personId: ic.id,
        weekStart: monday,
        mood,
        note: w === 7 ? 'Sprint pressure picking up' : w === 1 ? 'Good week, shipping a release' : null,
        submittedAt: monday,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// LEAVE REQUESTS — ~60 entries (mix of approved historic + pending + rejected)
// ---------------------------------------------------------------------------
export function generateItCompanyLeaveRequests(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let seq = 0;
  // 3 pending (HR queue)
  out.push({ id: ns(LR, ++seq), personId: ethan.id, type: 'ANNUAL', status: 'PENDING', startDate: addDays(NOW, 21), endDate: addDays(NOW, 28), notes: 'Family vacation', createdAt: daysAgo(2), updatedAt: daysAgo(2) });
  out.push({ id: ns(LR, ++seq), personId: midEngs[0].id, type: 'SICK', status: 'PENDING', startDate: daysAgo(0), endDate: daysAgo(0), notes: 'One-day sick leave', createdAt: daysAgo(0), updatedAt: daysAgo(0) });
  out.push({ id: ns(LR, ++seq), personId: seniorEngs[0].id, type: 'PERSONAL', status: 'PENDING', startDate: addDays(NOW, 14), endDate: addDays(NOW, 16), notes: 'Personal time', createdAt: daysAgo(1), updatedAt: daysAgo(1) });
  // 1 rejected
  out.push({ id: ns(LR, ++seq), personId: ethan.id, type: 'ANNUAL', status: 'REJECTED', startDate: addDays(NOW, 7), endDate: addDays(NOW, 14), notes: 'Conflicts with project deadline', createdAt: daysAgo(10), updatedAt: daysAgo(8) });
  // ~55 historical approved
  let i = 0;
  for (const ic of allIcs) {
    if (i >= 55) break;
    if (ic.employmentStatus !== 'ACTIVE') continue;
    const monthsBack = rng(1, 36, i + 200);
    const startDate = addDays(NOW, -monthsBack * 30 - rng(0, 15, i));
    const lengthDays = rng(2, 14, i + 50);
    const endDate = addDays(startDate, lengthDays);
    if (startDate < ic.hiredAt) continue;
    out.push({
      id: ns(LR, ++seq),
      personId: ic.id,
      type: ['ANNUAL', 'ANNUAL', 'SICK', 'PERSONAL'][i % 4],
      status: 'APPROVED',
      startDate,
      endDate,
      notes: 'Leave approved',
      createdAt: addDays(startDate, -7),
      updatedAt: addDays(startDate, -5),
    });
    i += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// IN-APP NOTIFICATIONS
// ---------------------------------------------------------------------------
export function generateItCompanyNotifications(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  let seq = 0;
  const nid = (): string => ns(NOT, ++seq);
  const defs: Array<{ recipient: string; eventType: string; title: string; body: string; link: string; daysAgo: number; unread?: boolean }> = [
    // Ethan (employee)
    { recipient: ethan.id, eventType: 'assignment.created', title: 'Assigned to Acme Portal', body: 'You are now assigned as Mid Engineer.', link: `/projects/${activeProjects[0].id}`, daysAgo: 5 },
    { recipient: ethan.id, eventType: 'pulse.reminder', title: 'Weekly pulse', body: 'Submit your pulse for this week.', link: '/pulse', daysAgo: 1, unread: true },
    { recipient: ethan.id, eventType: 'timesheet.rejected', title: 'Timesheet rejected', body: 'Your week-of-' + weekMonday(4).toISOString().slice(0, 10) + ' timesheet was rejected. Please review.', link: '/time-management', daysAgo: 14, unread: true },
    // Lucas (PM)
    { recipient: lucas.id, eventType: 'project.activated', title: 'Acme Portal activated', body: 'Your project is now ACTIVE.', link: `/projects/${activeProjects[0].id}`, daysAgo: 175 },
    { recipient: lucas.id, eventType: 'staffingRequest.fulfilled', title: 'Internal DC: 1 of 3 partial fulfilment', body: 'Frontend Engineer slot filled on Echo eCommerce v2.', link: '/staffing-requests', daysAgo: 7 },
    { recipient: lucas.id, eventType: 'project.rag_red', title: 'Helios Payments: RAG red', body: 'Helios Payments has been flagged RED for the past 3 weeks.', link: `/projects/${activeProjects[7].id}`, daysAgo: 1, unread: true },
    // Sophia (RM)
    { recipient: sophia.id, eventType: 'staffingRequest.submitted', title: 'New staffing request: Senior Engineer', body: 'Jade Partner Portal needs a senior engineer.', link: '/staffing-requests', daysAgo: 7, unread: true },
    { recipient: sophia.id, eventType: 'staffingRequest.urgent', title: 'URGENT: ML Engineer needed', body: 'Gamma AI Copilot needs an ML engineer urgently.', link: '/staffing-requests', daysAgo: 7, unread: true },
    { recipient: sophia.id, eventType: 'assignment.approval_pending', title: 'Approval queue: 5 pending', body: 'You have 5 assignment approvals pending.', link: '/staffing-desk', daysAgo: 1, unread: true },
    // Diana (HR)
    { recipient: diana.id, eventType: 'case.created', title: 'New onboarding case', body: 'Onboarding case for new junior engineer.', link: '/cases', daysAgo: 3 },
    { recipient: diana.id, eventType: 'case.overdue', title: 'Performance case overdue', body: 'Performance review for senior engineer is 3 days overdue.', link: '/cases', daysAgo: 1, unread: true },
    { recipient: diana.id, eventType: 'leave.pending', title: '3 leave requests pending', body: 'You have 3 leave requests awaiting approval.', link: '/leave-requests', daysAgo: 1, unread: true },
    // Carlos (delivery manager)
    { recipient: carlos.id, eventType: 'project.closed', title: 'Recent project closed', body: 'A project completed and was closed this week.', link: '/projects', daysAgo: 7 },
    { recipient: carlos.id, eventType: 'rag.dashboard', title: 'Portfolio RAG snapshot', body: 'Latest portfolio rollup is available.', link: '/dashboard/delivery-manager', daysAgo: 1 },
    // Noah (director)
    { recipient: noah.id, eventType: 'approval.escalation', title: 'Director-level approval needed', body: '2 assignments require director sign-off.', link: '/staffing-desk', daysAgo: 2, unread: true },
    { recipient: noah.id, eventType: 'budget.variance', title: 'Helios Payments: budget variance', body: 'Actual cost has exceeded planned-to-date.', link: `/projects/${activeProjects[7].id}`, daysAgo: 4, unread: true },
  ];
  defs.forEach(d => {
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
// SKILL ASSIGNMENTS — for the named test accounts
// ---------------------------------------------------------------------------
export const itCompanyPersonSkillAssignments: Array<{ personId: string; skillName: string; proficiency: number; certified: boolean }> = [
  { personId: ethan.id, skillName: 'TypeScript',  proficiency: 4, certified: false },
  { personId: ethan.id, skillName: 'React',       proficiency: 4, certified: false },
  { personId: ethan.id, skillName: 'NestJS',      proficiency: 3, certified: false },
  { personId: ethan.id, skillName: 'PostgreSQL',  proficiency: 3, certified: false },
  { personId: lucas.id, skillName: 'Project Management', proficiency: 5, certified: true },
  { personId: lucas.id, skillName: 'Agile/Scrum', proficiency: 5, certified: true },
  { personId: sophia.id, skillName: 'Agile/Scrum', proficiency: 4, certified: false },
  { personId: sophia.id, skillName: 'Project Management', proficiency: 4, certified: false },
];

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------
export const itCompanyPeople = people.map(p => ({
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

export const itCompanyOrgUnits = orgUnits.map(ou => ({
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

export const itCompanyPositions = positions;
export const itCompanyPersonOrgMemberships = personOrgMemberships;
export const itCompanyReportingLines = reportingLines;
export const itCompanyResourcePools = resourcePools.map(rp => ({
  id: rp.id, orgUnitId: rp.orgUnitId, code: rp.code, name: rp.name, description: rp.description,
  createdAt: monthsAgo(60), updatedAt: NOW,
}));
export const itCompanyResourcePoolMemberships = resourcePoolMemberships;

export const itCompanyProjects = projects.map(p => ({
  id: p.id, projectCode: p.projectCode, name: p.name, description: p.description,
  projectManagerId: p.projectManagerId, status: p.status,
  engagementModel: p.engagementModel,
  priority: p.priority,
  startsOn: p.startsOn, endsOn: p.endsOn,
  outcomeRating: p.outcomeRating,
  lessonsLearned: p.lessonsLearned,
  wouldStaffSameWay: p.wouldStaffSameWay,
  version: 1, createdAt: p.startsOn, updatedAt: NOW,
}));

export const itCompanyAssignments = assignments.map(a => ({
  id: a.id, personId: a.personId, projectId: a.projectId,
  requestedByPersonId: a.requestedByPersonId, assignmentCode: a.assignmentCode,
  staffingRole: a.staffingRole, status: a.status,
  allocationPercent: a.allocationPercent,
  requestedAt: a.requestedAt, approvedAt: a.approvedAt,
  validFrom: a.validFrom, validTo: a.validTo,
  notes: a.notes, version: 1,
  createdAt: a.requestedAt, updatedAt: NOW,
}));

export const itCompanyAssignmentApprovals = assignmentApprovals;
export const itCompanyAssignmentHistory = assignmentHistory;
export const itCompanyWorkEvidenceSources = workEvidenceSources;
export const itCompanyWorkEvidence = workEvidence;
export const itCompanyWorkEvidenceLinks = workEvidenceLinks;
export const itCompanyProjectExternalLinks = projectExternalLinks;
export const itCompanyExternalSyncStates = externalSyncStates;
export const itCompanyStaffingRequests = staffingRequests;
export const itCompanyStaffingRequestFulfilments = staffingRequestFulfilments;
export const itCompanyProjectMilestones = projectMilestones;
export const itCompanyProjectChangeRequests = projectChangeRequests;
export const itCompanyProjectBudgets = projectBudgets;
export const itCompanyProjectRolePlans = projectRolePlans;
export const itCompanyProjectRisks = projectRisks;
export const itCompanyProjectRagSnapshots = projectRagSnapshots;
export const itCompanyProjectRetrospectives = projectRetrospectives;
export const itCompanyProjectVendorEngagements = projectVendorEngagements;
export const itCompanyCases = cases;

// ---------------------------------------------------------------------------
// CASE STEPS — 4-5 per case, using deterministic templates
// ---------------------------------------------------------------------------
const STEP_TEMPLATES: Record<string, Array<{ stepKey: string; displayName: string }>> = {
  ONBOARDING: [
    { stepKey: 'provision-access', displayName: 'Provision System Access' },
    { stepKey: 'complete-paperwork', displayName: 'Complete Paperwork' },
    { stepKey: 'meet-manager', displayName: 'Meet Your Manager' },
    { stepKey: 'first-day-checkin', displayName: 'First Day Check-in' },
    { stepKey: 'week-1-review', displayName: 'Week-1 Review' },
  ],
  OFFBOARDING: [
    { stepKey: 'exit-interview', displayName: 'Exit Interview' },
    { stepKey: 'revoke-access', displayName: 'Revoke System Access' },
    { stepKey: 'return-equipment', displayName: 'Return Equipment' },
    { stepKey: 'knowledge-transfer', displayName: 'Knowledge Transfer' },
    { stepKey: 'final-payroll', displayName: 'Final Payroll Confirmation' },
  ],
  PERFORMANCE: [
    { stepKey: 'schedule-meeting', displayName: 'Schedule Review Meeting' },
    { stepKey: 'self-assessment', displayName: 'Complete Self-Assessment' },
    { stepKey: 'manager-assessment', displayName: 'Manager Assessment' },
    { stepKey: 'define-goals', displayName: 'Define Improvement Goals' },
  ],
  TRANSFER: [
    { stepKey: 'request', displayName: 'Submit Transfer Request' },
    { stepKey: 'manager-approval', displayName: 'Manager Approval' },
    { stepKey: 'destination-onboard', displayName: 'Destination Team Onboarding' },
    { stepKey: 'access-update', displayName: 'Update System Access' },
  ],
};

export function generateItCompanyCaseSteps(): Array<Record<string, unknown>> {
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
        completedAt: isCompleted ? daysAgo(rng(0, 30, seq)) : null,
      });
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// TEST ACCOUNTS — 8 LocalAccounts mapped to the named persons
// ---------------------------------------------------------------------------
export const itCompanyAccounts = [
  { email: 'noah.bennett@itco.local',     password: 'DirectorPass1!',    displayName: 'Noah Bennett',     roles: ['director'],                     personId: noah.id },
  { email: 'diana.walsh@itco.local',      password: 'HrManagerPass1!',   displayName: 'Diana Walsh',      roles: ['hr_manager'],                   personId: diana.id },
  { email: 'sophia.kim@itco.local',       password: 'ResourceMgrPass1!', displayName: 'Sophia Kim',       roles: ['resource_manager'],             personId: sophia.id },
  { email: 'lucas.reed@itco.local',       password: 'ProjectMgrPass1!',  displayName: 'Lucas Reed',       roles: ['project_manager'],              personId: lucas.id },
  { email: 'carlos.vega@itco.local',      password: 'DeliveryMgrPass1!', displayName: 'Carlos Vega',      roles: ['delivery_manager'],             personId: carlos.id },
  { email: 'ethan.brooks@itco.local',     password: 'EmployeePass1!',    displayName: 'Ethan Brooks',     roles: ['employee'],                     personId: ethan.id },
  { email: 'emma.garcia@itco.local',      password: 'DualRolePass1!',    displayName: 'Emma Garcia',      roles: ['resource_manager', 'hr_manager'], personId: emma.id },
];

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
export const itCompanyDatasetSummary = {
  profile: 'it-company',
  company: 'ITCo (Custom Software Development)',
  peopleCount: people.length,
  orgUnitCount: orgUnits.length,
  resourcePoolCount: resourcePools.length,
  projectCount: projects.length,
  activeProjectCount: activeProjects.length,
  closedProjectCount: closedProjects.length,
  assignmentCount: assignments.length,
  assignmentHistoryCount: assignmentHistory.length,
  workEvidenceCount: workEvidence.length,
  staffingRequestCount: staffingRequests.length,
  caseCount: cases.length,
  ragSnapshotCount: projectRagSnapshots.length,
  milestoneCount: projectMilestones.length,
  changeRequestCount: projectChangeRequests.length,
  budgetCount: projectBudgets.length,
  rolePlanCount: projectRolePlans.length,
  riskCount: projectRisks.length,
  retrospectiveCount: projectRetrospectives.length,
  vendorEngagementCount: projectVendorEngagements.length,
  windowYears: 5,
  resourceManagerCount: allRMs.length,
};
