/**
 * Realistic Dataset Generator for DeliveryCentral
 *
 * Generates a fully consistent consulting firm "Meridian Consulting Group"
 * with ~50 people, proper org hierarchy, 6 months of historical data, and
 * every entity properly linked — no orphans, no dangling references.
 *
 * Org shape:
 *   CEO
 *   ├── VP Delivery
 *   │   ├── Director Engineering
 *   │   │   ├── Engineering Manager (Team Lead)
 *   │   │   │   └── 6 Engineers (ICs)
 *   │   │   └── Data Manager (Team Lead)
 *   │   │       └── 4 Data Engineers (ICs)
 *   │   ├── Director Consulting
 *   │   │   ├── Consulting Manager
 *   │   │   │   └── 5 Consultants (ICs)
 *   │   │   └── Advisory Manager
 *   │   │       └── 3 Advisors (ICs)
 *   │   └── Delivery Manager (cross-cutting)
 *   ├── VP Operations
 *   │   ├── HR Director
 *   │   │   ├── HR Manager
 *   │   │   │   └── 2 HR Specialists
 *   │   │   └── Talent Acquisition Lead
 *   │   ├── Resource Manager (RM)
 *   │   │   └── 2 Resource Coordinators
 *   │   └── Finance Manager
 *   │       └── 2 Finance Analysts
 *   └── VP Product
 *       ├── Product Manager
 *       │   └── 2 Product Analysts
 *       └── Project Manager (PMO)
 *           └── 2 Project Coordinators
 *
 * Total: ~50 people
 */

// ---------------------------------------------------------------------------
// UUID helper — deterministic UUIDs for reproducibility
// ---------------------------------------------------------------------------
const ns = (prefix: string, seq: number): string => {
  const hex = seq.toString(16).padStart(4, '0');
  return `${prefix}-0000-0000-0000-${hex.padStart(12, '0')}`;
};

// Namespace prefixes (8 chars each, forming valid UUID segments)
const P   = 'aaaa0001'; // Person
const OU  = 'aaaa0002'; // OrgUnit
const POS = 'aaaa0003'; // Position
const MEM = 'aaaa0004'; // PersonOrgMembership
const RL  = 'aaaa0005'; // ReportingLine
const RP  = 'aaaa0006'; // ResourcePool
const RPM = 'aaaa0007'; // ResourcePoolMembership
const PRJ = 'aaaa0008'; // Project
const ASG = 'aaaa0009'; // Assignment
const APR = 'aaaa000a'; // AssignmentApproval
const AHI = 'aaaa000b'; // AssignmentHistory
const WES = 'aaaa000c'; // WorkEvidenceSource
const WEV = 'aaaa000d'; // WorkEvidence
const WEL = 'aaaa000e'; // WorkEvidenceLink
const PEL = 'aaaa000f'; // ProjectExternalLink
const ESS = 'aaaa0010'; // ExternalSyncState
const SRQ = 'aaaa0011'; // StaffingRequest
const SRF = 'aaaa0012'; // StaffingRequestFulfilment
const ACT = 'aaaa0013'; // EmployeeActivityEvent

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const NOW = new Date();
const SIX_MONTHS_AGO = new Date(NOW);
SIX_MONTHS_AGO.setMonth(SIX_MONTHS_AGO.getMonth() - 6);

function monthsAgo(n: number): Date {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
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

function randomBetween(min: number, max: number, seed: number): number {
  // Simple deterministic pseudo-random based on seed
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  const r = x - Math.floor(x);
  return Math.floor(r * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// PEOPLE definition
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
  employmentStatus: string;
  hiredAt: Date;
  terminatedAt?: Date;
  orgLevel: 'CEO' | 'VP' | 'DIR' | 'MGR' | 'IC';
  managerId?: string;
  orgUnitId: string;
}

let pSeq = 0;
const pid = (): string => ns(P, ++pSeq);

// We'll define all people in a structured way
const people: PersonDef[] = [];

// --- C-suite ---
const ceoId = pid();
people.push({
  id: ceoId, personNumber: 'MCG-001', givenName: 'Catherine', familyName: 'Monroe',
  displayName: 'Catherine Monroe', primaryEmail: 'catherine.monroe@meridian.demo',
  grade: 'G14', role: 'CEO', skillsets: ['LEADERSHIP', 'STRATEGY'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(48), orgLevel: 'CEO', orgUnitId: '',
});

// --- VPs ---
const vpDeliveryId = pid();
const vpOpsId = pid();
const vpProductId = pid();

people.push({
  id: vpDeliveryId, personNumber: 'MCG-002', givenName: 'James', familyName: 'Whitfield',
  displayName: 'James Whitfield', primaryEmail: 'james.whitfield@meridian.demo',
  grade: 'G13', role: 'VP Delivery', skillsets: ['DELIVERY', 'LEADERSHIP'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(36), orgLevel: 'VP', managerId: ceoId, orgUnitId: '',
});

people.push({
  id: vpOpsId, personNumber: 'MCG-003', givenName: 'Laura', familyName: 'Chen',
  displayName: 'Laura Chen', primaryEmail: 'laura.chen@meridian.demo',
  grade: 'G13', role: 'VP Operations', skillsets: ['OPERATIONS', 'HR'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(30), orgLevel: 'VP', managerId: ceoId, orgUnitId: '',
});

people.push({
  id: vpProductId, personNumber: 'MCG-004', givenName: 'Marcus', familyName: 'Rivera',
  displayName: 'Marcus Rivera', primaryEmail: 'marcus.rivera@meridian.demo',
  grade: 'G13', role: 'VP Product', skillsets: ['PRODUCT', 'STRATEGY'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(24), orgLevel: 'VP', managerId: ceoId, orgUnitId: '',
});

// --- Directors ---
const dirEngId = pid();
const dirConId = pid();
const hrDirId = pid();

people.push({
  id: dirEngId, personNumber: 'MCG-005', givenName: 'Noah', familyName: 'Bennett',
  displayName: 'Noah Bennett', primaryEmail: 'noah.bennett@meridian.demo',
  grade: 'G12', role: 'Director', skillsets: ['ENGINEERING', 'LEADERSHIP'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(24), orgLevel: 'DIR', managerId: vpDeliveryId, orgUnitId: '',
});

people.push({
  id: dirConId, personNumber: 'MCG-006', givenName: 'Priya', familyName: 'Sharma',
  displayName: 'Priya Sharma', primaryEmail: 'priya.sharma@meridian.demo',
  grade: 'G12', role: 'Director', skillsets: ['CONSULTING', 'LEADERSHIP'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(20), orgLevel: 'DIR', managerId: vpDeliveryId, orgUnitId: '',
});

people.push({
  id: hrDirId, personNumber: 'MCG-007', givenName: 'Diana', familyName: 'Walsh',
  displayName: 'Diana Walsh', primaryEmail: 'diana.walsh@meridian.demo',
  grade: 'G12', role: 'HR Director', skillsets: ['HR', 'COMPLIANCE'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(18), orgLevel: 'DIR', managerId: vpOpsId, orgUnitId: '',
});

// --- Managers ---
const engMgrId = pid();
const dataMgrId = pid();
const conMgrId = pid();
const advMgrId = pid();
const deliveryMgrId = pid();
const hrMgrId = pid();
const talentLeadId = pid();
const rmId = pid();
const finMgrId = pid();
const prodMgrId = pid();
const pmId = pid();

people.push({
  id: engMgrId, personNumber: 'MCG-008', givenName: 'Sophia', familyName: 'Kim',
  displayName: 'Sophia Kim', primaryEmail: 'sophia.kim@meridian.demo',
  grade: 'G11', role: 'Engineering Manager', skillsets: ['ENGINEERING', 'MANAGEMENT'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(18), orgLevel: 'MGR', managerId: dirEngId, orgUnitId: '',
});

people.push({
  id: dataMgrId, personNumber: 'MCG-009', givenName: 'Raj', familyName: 'Patel',
  displayName: 'Raj Patel', primaryEmail: 'raj.patel@meridian.demo',
  grade: 'G11', role: 'Data Engineering Manager', skillsets: ['DATA', 'ENGINEERING'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(15), orgLevel: 'MGR', managerId: dirEngId, orgUnitId: '',
});

people.push({
  id: conMgrId, personNumber: 'MCG-010', givenName: 'Emma', familyName: 'Garcia',
  displayName: 'Emma Garcia', primaryEmail: 'emma.garcia@meridian.demo',
  grade: 'G11', role: 'Consulting Manager', skillsets: ['CONSULTING', 'MANAGEMENT'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(14), orgLevel: 'MGR', managerId: dirConId, orgUnitId: '',
});

people.push({
  id: advMgrId, personNumber: 'MCG-011', givenName: 'Tomasz', familyName: 'Novak',
  displayName: 'Tomasz Novak', primaryEmail: 'tomasz.novak@meridian.demo',
  grade: 'G11', role: 'Advisory Manager', skillsets: ['ADVISORY', 'CONSULTING'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(12), orgLevel: 'MGR', managerId: dirConId, orgUnitId: '',
});

people.push({
  id: deliveryMgrId, personNumber: 'MCG-012', givenName: 'Carlos', familyName: 'Vega',
  displayName: 'Carlos Vega', primaryEmail: 'carlos.vega@meridian.demo',
  grade: 'G11', role: 'Delivery Manager', skillsets: ['DELIVERY', 'GOVERNANCE'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(16), orgLevel: 'MGR', managerId: vpDeliveryId, orgUnitId: '',
});

people.push({
  id: hrMgrId, personNumber: 'MCG-013', givenName: 'Hannah', familyName: 'Brooks',
  displayName: 'Hannah Brooks', primaryEmail: 'hannah.brooks@meridian.demo',
  grade: 'G11', role: 'HR Manager', skillsets: ['HR', 'PEOPLE'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(14), orgLevel: 'MGR', managerId: hrDirId, orgUnitId: '',
});

people.push({
  id: talentLeadId, personNumber: 'MCG-014', givenName: 'Zara', familyName: 'Hussein',
  displayName: 'Zara Hussein', primaryEmail: 'zara.hussein@meridian.demo',
  grade: 'G10', role: 'Talent Acquisition Lead', skillsets: ['RECRUITMENT', 'HR'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(10), orgLevel: 'MGR', managerId: hrDirId, orgUnitId: '',
});

people.push({
  id: rmId, personNumber: 'MCG-015', givenName: 'Amir', familyName: 'Khoury',
  displayName: 'Amir Khoury', primaryEmail: 'amir.khoury@meridian.demo',
  grade: 'G11', role: 'Resource Manager', skillsets: ['RESOURCE_MGMT', 'PLANNING'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(13), orgLevel: 'MGR', managerId: vpOpsId, orgUnitId: '',
});

people.push({
  id: finMgrId, personNumber: 'MCG-016', givenName: 'Rachel', familyName: 'Foster',
  displayName: 'Rachel Foster', primaryEmail: 'rachel.foster@meridian.demo',
  grade: 'G11', role: 'Finance Manager', skillsets: ['FINANCE', 'GOVERNANCE'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(12), orgLevel: 'MGR', managerId: vpOpsId, orgUnitId: '',
});

people.push({
  id: prodMgrId, personNumber: 'MCG-017', givenName: 'Oliver', familyName: 'Park',
  displayName: 'Oliver Park', primaryEmail: 'oliver.park@meridian.demo',
  grade: 'G11', role: 'Product Manager', skillsets: ['PRODUCT', 'DESIGN'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(11), orgLevel: 'MGR', managerId: vpProductId, orgUnitId: '',
});

people.push({
  id: pmId, personNumber: 'MCG-018', givenName: 'Lucas', familyName: 'Reed',
  displayName: 'Lucas Reed', primaryEmail: 'lucas.reed@meridian.demo',
  grade: 'G11', role: 'Project Manager', skillsets: ['PMO', 'AGILE'],
  employmentStatus: 'ACTIVE', hiredAt: monthsAgo(14), orgLevel: 'MGR', managerId: vpProductId, orgUnitId: '',
});

// --- ICs: Engineers (6) ---
const engIcIds: string[] = [];
const engIcs = [
  { givenName: 'Ethan',  familyName: 'Brooks',    grade: 'G10', role: 'Senior Engineer',    skillsets: ['TYPESCRIPT', 'REACT', 'NESTJS'] },
  { givenName: 'Mia',    familyName: 'Lopez',     grade: 'G9',  role: 'Software Engineer',  skillsets: ['TYPESCRIPT', 'ANGULAR', 'NODE'] },
  { givenName: 'Liam',   familyName: 'O\'Connor', grade: 'G9',  role: 'Software Engineer',  skillsets: ['JAVA', 'SPRING', 'AWS'] },
  { givenName: 'Aisha',  familyName: 'Diallo',    grade: 'G8',  role: 'Junior Engineer',    skillsets: ['PYTHON', 'REACT'] },
  { givenName: 'Kevin',  familyName: 'Zhang',     grade: 'G9',  role: 'DevOps Engineer',    skillsets: ['DOCKER', 'KUBERNETES', 'TERRAFORM'] },
  { givenName: 'Freya',  familyName: 'Lindberg',  grade: 'G10', role: 'Platform Engineer',  skillsets: ['GO', 'AWS', 'KUBERNETES'] },
];
engIcs.forEach((ic, i) => {
  const id = pid();
  engIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(19 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase().replace("'", '')}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(6, 24, i)),
    orgLevel: 'IC', managerId: engMgrId, orgUnitId: '',
  });
});

// --- ICs: Data Engineers (4) ---
const dataIcIds: string[] = [];
const dataIcs = [
  { givenName: 'Yuki',    familyName: 'Tanaka',   grade: 'G10', role: 'Senior Data Engineer', skillsets: ['PYTHON', 'SPARK', 'SNOWFLAKE'] },
  { givenName: 'Pavel',   familyName: 'Volkov',   grade: 'G9',  role: 'Data Engineer',        skillsets: ['PYTHON', 'SQL', 'AIRFLOW'] },
  { givenName: 'Amara',   familyName: 'Osei',     grade: 'G8',  role: 'Junior Data Engineer', skillsets: ['PYTHON', 'SQL'] },
  { givenName: 'Dariusz', familyName: 'Kowalski', grade: 'G9',  role: 'ML Engineer',          skillsets: ['PYTHON', 'TENSORFLOW', 'AWS'] },
];
dataIcs.forEach((ic, i) => {
  const id = pid();
  dataIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(25 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase()}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(4, 18, i + 10)),
    orgLevel: 'IC', managerId: dataMgrId, orgUnitId: '',
  });
});

// --- ICs: Consultants (5) ---
const conIcIds: string[] = [];
const conIcs = [
  { givenName: 'Isabel',  familyName: 'Santos',    grade: 'G10', role: 'Senior Consultant',  skillsets: ['CONSULTING', 'AGILE'] },
  { givenName: 'Nathan',  familyName: 'Clarke',    grade: 'G9',  role: 'Consultant',         skillsets: ['CONSULTING', 'CHANGE_MGMT'] },
  { givenName: 'Fatima',  familyName: 'Al-Rashid', grade: 'G9',  role: 'Consultant',         skillsets: ['CONSULTING', 'BUSINESS_ANALYSIS'] },
  { givenName: 'Leo',     familyName: 'Huang',     grade: 'G8',  role: 'Associate Consultant', skillsets: ['CONSULTING'] },
  { givenName: 'Grace',   familyName: 'Murphy',    grade: 'G10', role: 'Senior Consultant',  skillsets: ['CONSULTING', 'STRATEGY'] },
];
conIcs.forEach((ic, i) => {
  const id = pid();
  conIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(29 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase().replace('-', '')}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: i === 3 ? 'INACTIVE' : 'ACTIVE', // Leo Huang is on leave
    hiredAt: monthsAgo(randomBetween(5, 20, i + 20)),
    orgLevel: 'IC', managerId: conMgrId, orgUnitId: '',
  });
});

// --- ICs: Advisors (3) ---
const advIcIds: string[] = [];
const advIcs = [
  { givenName: 'Henrik',  familyName: 'Johansson', grade: 'G10', role: 'Senior Advisor',   skillsets: ['ADVISORY', 'GOVERNANCE'] },
  { givenName: 'Chloe',   familyName: 'Dubois',    grade: 'G9',  role: 'Advisor',          skillsets: ['ADVISORY', 'RISK'] },
  { givenName: 'Kwame',   familyName: 'Asante',    grade: 'G9',  role: 'Advisor',          skillsets: ['ADVISORY', 'COMPLIANCE'] },
];
advIcs.forEach((ic, i) => {
  const id = pid();
  advIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(34 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase()}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(4, 16, i + 30)),
    orgLevel: 'IC', managerId: advMgrId, orgUnitId: '',
  });
});

// --- ICs: HR Specialists (2) ---
const hrIcIds: string[] = [];
const hrIcs = [
  { givenName: 'Maya',   familyName: 'Petrov',   grade: 'G8', role: 'HR Specialist',    skillsets: ['HR', 'COMPLIANCE'] },
  { givenName: 'Tobias', familyName: 'Schultz',  grade: 'G8', role: 'HR Specialist',    skillsets: ['HR', 'RECRUITMENT'] },
];
hrIcs.forEach((ic, i) => {
  const id = pid();
  hrIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(37 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase()}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(3, 12, i + 40)),
    orgLevel: 'IC', managerId: hrMgrId, orgUnitId: '',
  });
});

// --- ICs: Resource Coordinators (2) ---
const rmIcIds: string[] = [];
const rmIcs = [
  { givenName: 'Yara',   familyName: 'Mansour',  grade: 'G9', role: 'Resource Coordinator', skillsets: ['RESOURCE_MGMT', 'PLANNING'] },
  { givenName: 'Declan', familyName: 'O\'Brien',  grade: 'G8', role: 'Resource Coordinator', skillsets: ['RESOURCE_MGMT'] },
];
rmIcs.forEach((ic, i) => {
  const id = pid();
  rmIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(39 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase().replace("'", '')}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(3, 10, i + 50)),
    orgLevel: 'IC', managerId: rmId, orgUnitId: '',
  });
});

// --- ICs: Finance Analysts (2) ---
const finIcIds: string[] = [];
const finIcs = [
  { givenName: 'Ava',    familyName: 'Sinclair', grade: 'G9', role: 'Finance Analyst',   skillsets: ['FINANCE', 'ANALYSIS'] },
  { givenName: 'Oscar',  familyName: 'Rowe',     grade: 'G8', role: 'Finance Analyst',   skillsets: ['FINANCE'] },
];
finIcs.forEach((ic, i) => {
  const id = pid();
  finIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(41 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase()}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(3, 12, i + 60)),
    orgLevel: 'IC', managerId: finMgrId, orgUnitId: '',
  });
});

// --- ICs: Product Analysts (2) ---
const prodIcIds: string[] = [];
const prodIcs = [
  { givenName: 'Sana',   familyName: 'Mirza',    grade: 'G9', role: 'Product Analyst',   skillsets: ['PRODUCT', 'UX'] },
  { givenName: 'Felix',  familyName: 'Engstrom', grade: 'G8', role: 'Product Analyst',   skillsets: ['PRODUCT', 'DATA'] },
];
prodIcs.forEach((ic, i) => {
  const id = pid();
  prodIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(43 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase()}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(3, 10, i + 70)),
    orgLevel: 'IC', managerId: prodMgrId, orgUnitId: '',
  });
});

// --- ICs: Project Coordinators (2) ---
const pmIcIds: string[] = [];
const pmIcs = [
  { givenName: 'Leila',  familyName: 'Bakir',    grade: 'G9', role: 'Project Coordinator', skillsets: ['PMO', 'AGILE'] },
  { givenName: 'Daniel', familyName: 'Torres',   grade: 'G8', role: 'Project Coordinator', skillsets: ['PMO'] },
];
pmIcs.forEach((ic, i) => {
  const id = pid();
  pmIcIds.push(id);
  people.push({
    id, personNumber: `MCG-${(45 + i).toString().padStart(3, '0')}`,
    givenName: ic.givenName, familyName: ic.familyName,
    displayName: `${ic.givenName} ${ic.familyName}`,
    primaryEmail: `${ic.givenName.toLowerCase()}.${ic.familyName.toLowerCase()}@meridian.demo`,
    grade: ic.grade, role: ic.role, skillsets: ic.skillsets,
    employmentStatus: 'ACTIVE', hiredAt: monthsAgo(randomBetween(3, 10, i + 80)),
    orgLevel: 'IC', managerId: pmId, orgUnitId: '',
  });
});

// One terminated person for offboarding case
const terminatedId = pid();
people.push({
  id: terminatedId, personNumber: 'MCG-047', givenName: 'Viktor', familyName: 'Drago',
  displayName: 'Viktor Drago', primaryEmail: 'viktor.drago@meridian.demo',
  grade: 'G9', role: 'Former Consultant', skillsets: ['CONSULTING'],
  employmentStatus: 'TERMINATED', hiredAt: monthsAgo(18), terminatedAt: monthsAgo(1),
  orgLevel: 'IC', managerId: conMgrId, orgUnitId: '',
});

// ---------------------------------------------------------------------------
// ORG UNITS
// ---------------------------------------------------------------------------
let ouSeq = 0;
const ouid = (): string => ns(OU, ++ouSeq);

interface OrgUnitDef {
  id: string;
  code: string;
  name: string;
  description: string;
  parentOrgUnitId: string | null;
  managerPersonId: string;
  kind: string;
}

const ouCeo = ouid();
const ouDelivery = ouid();
const ouOps = ouid();
const ouProduct = ouid();
const ouEngineering = ouid();
const ouData = ouid();
const ouConsulting = ouid();
const ouAdvisory = ouid();
const ouHR = ouid();
const ouRM = ouid();
const ouFinance = ouid();
const ouPMO = ouid();
const ouProductTeam = ouid();

const orgUnits: OrgUnitDef[] = [
  { id: ouCeo, code: 'MCG-EXEC', name: 'Executive Office', description: 'CEO and executive leadership', parentOrgUnitId: null, managerPersonId: ceoId, kind: 'directorate' },
  { id: ouDelivery, code: 'MCG-DEL', name: 'Delivery Directorate', description: 'Client delivery and professional services', parentOrgUnitId: ouCeo, managerPersonId: vpDeliveryId, kind: 'directorate' },
  { id: ouOps, code: 'MCG-OPS', name: 'Operations Directorate', description: 'HR, resource management, and finance', parentOrgUnitId: ouCeo, managerPersonId: vpOpsId, kind: 'directorate' },
  { id: ouProduct, code: 'MCG-PRD', name: 'Product Directorate', description: 'Product management and PMO', parentOrgUnitId: ouCeo, managerPersonId: vpProductId, kind: 'directorate' },
  { id: ouEngineering, code: 'DEP-ENG', name: 'Engineering Department', description: 'Software engineering teams', parentOrgUnitId: ouDelivery, managerPersonId: dirEngId, kind: 'department' },
  { id: ouData, code: 'DEP-DATA', name: 'Data Engineering Department', description: 'Data and ML engineering', parentOrgUnitId: ouDelivery, managerPersonId: dataMgrId, kind: 'department' },
  { id: ouConsulting, code: 'DEP-CON', name: 'Consulting Department', description: 'Consulting delivery', parentOrgUnitId: ouDelivery, managerPersonId: dirConId, kind: 'department' },
  { id: ouAdvisory, code: 'DEP-ADV', name: 'Advisory Department', description: 'Advisory and governance services', parentOrgUnitId: ouDelivery, managerPersonId: advMgrId, kind: 'department' },
  { id: ouHR, code: 'DEP-HR', name: 'Human Resources', description: 'People, talent, and compliance', parentOrgUnitId: ouOps, managerPersonId: hrDirId, kind: 'department' },
  { id: ouRM, code: 'DEP-RM', name: 'Resource Management', description: 'Resource allocation and planning', parentOrgUnitId: ouOps, managerPersonId: rmId, kind: 'department' },
  { id: ouFinance, code: 'DEP-FIN', name: 'Finance', description: 'Financial governance and reporting', parentOrgUnitId: ouOps, managerPersonId: finMgrId, kind: 'department' },
  { id: ouPMO, code: 'DEP-PMO', name: 'PMO', description: 'Project management office', parentOrgUnitId: ouProduct, managerPersonId: pmId, kind: 'department' },
  { id: ouProductTeam, code: 'DEP-PROD', name: 'Product Team', description: 'Product management and design', parentOrgUnitId: ouProduct, managerPersonId: prodMgrId, kind: 'department' },
];

// Assign orgUnitId back to people
const personToOrgUnit: Record<string, string> = {
  [ceoId]: ouCeo,
  [vpDeliveryId]: ouDelivery, [vpOpsId]: ouOps, [vpProductId]: ouProduct,
  [dirEngId]: ouEngineering, [dirConId]: ouConsulting, [hrDirId]: ouHR,
  [engMgrId]: ouEngineering, [dataMgrId]: ouData,
  [conMgrId]: ouConsulting, [advMgrId]: ouAdvisory,
  [deliveryMgrId]: ouDelivery,
  [hrMgrId]: ouHR, [talentLeadId]: ouHR,
  [rmId]: ouRM, [finMgrId]: ouFinance,
  [prodMgrId]: ouProductTeam, [pmId]: ouPMO,
};

// Map ICs to their org units
engIcIds.forEach(id => { personToOrgUnit[id] = ouEngineering; });
dataIcIds.forEach(id => { personToOrgUnit[id] = ouData; });
conIcIds.forEach(id => { personToOrgUnit[id] = ouConsulting; });
advIcIds.forEach(id => { personToOrgUnit[id] = ouAdvisory; });
hrIcIds.forEach(id => { personToOrgUnit[id] = ouHR; });
rmIcIds.forEach(id => { personToOrgUnit[id] = ouRM; });
finIcIds.forEach(id => { personToOrgUnit[id] = ouFinance; });
prodIcIds.forEach(id => { personToOrgUnit[id] = ouProductTeam; });
pmIcIds.forEach(id => { personToOrgUnit[id] = ouPMO; });
personToOrgUnit[terminatedId] = ouConsulting;

// Update people with orgUnitId
people.forEach(p => { p.orgUnitId = personToOrgUnit[p.id] ?? ouCeo; });

// ---------------------------------------------------------------------------
// POSITIONS — one per person, in their org unit
// ---------------------------------------------------------------------------
let posSeq = 0;
const posid = (): string => ns(POS, ++posSeq);

const positions = people.map(p => ({
  id: posid(),
  orgUnitId: p.orgUnitId,
  occupantPersonId: p.id,
  code: p.personNumber,
  title: p.role,
  description: `${p.role} position in ${orgUnits.find(ou => ou.id === p.orgUnitId)?.name ?? 'org'}`,
  isManagerial: p.orgLevel !== 'IC',
  validFrom: p.hiredAt,
  validTo: p.employmentStatus === 'TERMINATED' ? monthsAgo(1) : null,
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
  validTo: p.employmentStatus === 'TERMINATED' ? monthsAgo(1) : null,
  createdAt: p.hiredAt,
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// REPORTING LINES — every person reports to their manager
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
    authority: p.orgLevel === 'IC' ? 'APPROVER' : 'REVIEWER',
    isPrimary: true,
    validFrom: p.hiredAt,
    validTo: p.employmentStatus === 'TERMINATED' ? monthsAgo(1) : null,
    createdAt: p.hiredAt,
    updatedAt: NOW,
  }));

// Add dotted-line relationships for cross-functional visibility
const dottedLines = [
  { subject: deliveryMgrId, manager: dirEngId },  // DM has dotted-line to Eng Dir
  { subject: deliveryMgrId, manager: dirConId },   // DM has dotted-line to Consulting Dir
  { subject: rmId, manager: vpDeliveryId },         // RM has dotted-line to VP Delivery
  { subject: pmId, manager: vpDeliveryId },          // PM has dotted-line to VP Delivery
];
dottedLines.forEach(dl => {
  reportingLines.push({
    id: rlid(),
    subjectPersonId: dl.subject,
    managerPersonId: dl.manager,
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
// RESOURCE POOLS — 4 pools covering all delivery staff
// ---------------------------------------------------------------------------
let rpSeq = 0;
const rpid = (): string => ns(RP, ++rpSeq);

const resourcePools = [
  { id: rpid(), orgUnitId: ouEngineering, code: 'POOL-ENG', name: 'Engineering Pool', description: 'Software and platform engineers' },
  { id: rpid(), orgUnitId: ouData, code: 'POOL-DATA', name: 'Data Engineering Pool', description: 'Data and ML engineers' },
  { id: rpid(), orgUnitId: ouConsulting, code: 'POOL-CON', name: 'Consulting Pool', description: 'Consultants and advisors' },
  { id: rpid(), orgUnitId: ouPMO, code: 'POOL-PMO', name: 'PMO Pool', description: 'Project managers and coordinators' },
];

let rpmSeq = 0;
const rpmid = (): string => ns(RPM, ++rpmSeq);

const resourcePoolMemberships: Array<Record<string, unknown>> = [];

// Engineers → Engineering Pool
[engMgrId, ...engIcIds].forEach(pid => {
  resourcePoolMemberships.push({
    id: rpmid(), personId: pid, resourcePoolId: resourcePools[0].id,
    validFrom: monthsAgo(12), validTo: null, createdAt: monthsAgo(12), updatedAt: NOW,
  });
});

// Data Engineers → Data Pool
[dataMgrId, ...dataIcIds].forEach(pid => {
  resourcePoolMemberships.push({
    id: rpmid(), personId: pid, resourcePoolId: resourcePools[1].id,
    validFrom: monthsAgo(12), validTo: null, createdAt: monthsAgo(12), updatedAt: NOW,
  });
});

// Consultants + Advisors → Consulting Pool
[conMgrId, advMgrId, ...conIcIds, ...advIcIds, terminatedId].forEach(pid => {
  resourcePoolMemberships.push({
    id: rpmid(), personId: pid, resourcePoolId: resourcePools[2].id,
    validFrom: monthsAgo(12), validTo: pid === terminatedId ? monthsAgo(1) : null,
    createdAt: monthsAgo(12), updatedAt: NOW,
  });
});

// PM/PMO → PMO Pool
[pmId, ...pmIcIds].forEach(pid => {
  resourcePoolMemberships.push({
    id: rpmid(), personId: pid, resourcePoolId: resourcePools[3].id,
    validFrom: monthsAgo(12), validTo: null, createdAt: monthsAgo(12), updatedAt: NOW,
  });
});

// ---------------------------------------------------------------------------
// PROJECTS — 10 realistic projects across the org
// ---------------------------------------------------------------------------
let prjSeq = 0;
const prjid = (): string => ns(PRJ, ++prjSeq);

interface ProjectDef {
  id: string;
  projectCode: string;
  name: string;
  description: string;
  projectManagerId: string;
  status: string;
  startsOn: Date;
  endsOn: Date | null;
}

const projects: ProjectDef[] = [
  {
    id: prjid(), projectCode: 'PRJ-100', name: 'Atlas ERP Integration',
    description: 'Enterprise ERP integration for Atlas Financial. Full-stack development with SAP connectivity.',
    projectManagerId: pmId, status: 'ACTIVE', startsOn: monthsAgo(5), endsOn: monthsAgo(-3),
  },
  {
    id: prjid(), projectCode: 'PRJ-101', name: 'DeliveryCentral Platform',
    description: 'Internal workforce operations platform. React + NestJS monolith.',
    projectManagerId: pmId, status: 'ACTIVE', startsOn: monthsAgo(6), endsOn: null,
  },
  {
    id: prjid(), projectCode: 'PRJ-102', name: 'Beacon Mobile Revamp',
    description: 'Mobile app redesign for Beacon Insurance. React Native with biometric auth.',
    projectManagerId: pmIcIds[0], status: 'ACTIVE', startsOn: monthsAgo(4), endsOn: monthsAgo(-2),
  },
  {
    id: prjid(), projectCode: 'PRJ-103', name: 'Nova Analytics Migration',
    description: 'Data warehouse migration from Oracle to Snowflake for Nova Retail.',
    projectManagerId: pmId, status: 'ACTIVE', startsOn: monthsAgo(3), endsOn: monthsAgo(-1),
  },
  {
    id: prjid(), projectCode: 'PRJ-104', name: 'Polaris Security Hardening',
    description: 'Security audit and hardening for Polaris Energy. Zero-trust architecture implementation.',
    projectManagerId: pmIcIds[1], status: 'ACTIVE', startsOn: monthsAgo(2), endsOn: monthsAgo(-4),
  },
  {
    id: prjid(), projectCode: 'PRJ-105', name: 'Meridian Internal Bench',
    description: 'Internal bench management — training, upskilling, and internal tooling.',
    projectManagerId: pmId, status: 'ACTIVE', startsOn: monthsAgo(6), endsOn: null,
  },
  {
    id: prjid(), projectCode: 'PRJ-106', name: 'Titan CRM Advisory',
    description: 'CRM strategy and Salesforce advisory engagement for Titan Corp.',
    projectManagerId: pmIcIds[0], status: 'ACTIVE', startsOn: monthsAgo(3), endsOn: monthsAgo(-3),
  },
  {
    id: prjid(), projectCode: 'PRJ-107', name: 'Compass Cloud Migration',
    description: 'On-premise to Azure migration for Compass Healthcare. Lift-and-shift + modernise.',
    projectManagerId: pmId, status: 'ACTIVE', startsOn: monthsAgo(4), endsOn: monthsAgo(-2),
  },
  {
    id: prjid(), projectCode: 'PRJ-108', name: 'Zenith Data Platform',
    description: 'Greenfield data lakehouse on AWS for Zenith Media. Spark + Airflow pipeline.',
    projectManagerId: pmIcIds[1], status: 'ACTIVE', startsOn: monthsAgo(2), endsOn: monthsAgo(-4),
  },
  {
    id: prjid(), projectCode: 'PRJ-109', name: 'Orion Regulatory Compliance',
    description: 'Regulatory reporting automation for Orion Banking. Completed project.',
    projectManagerId: pmId, status: 'CLOSED', startsOn: monthsAgo(6), endsOn: monthsAgo(1),
  },
];

// All billable ICs that can be assigned
const allBillableIcs = [...engIcIds, ...dataIcIds, ...conIcIds, ...advIcIds];

// ---------------------------------------------------------------------------
// ASSIGNMENTS — realistic staffing across projects
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
}

const assignments: AssignmentDef[] = [];

// PRJ-100 Atlas ERP: 3 engineers + 1 consultant
assignments.push({ id: asgid(), personId: engIcIds[0], projectId: projects[0].id, requestedByPersonId: pmId, assignmentCode: 'ASG-001', staffingRole: 'Lead Engineer', status: 'ACTIVE', allocationPercent: 80, validFrom: monthsAgo(5), validTo: monthsAgo(-3), notes: 'Lead full-stack development', approvedAt: monthsAgo(5) });
assignments.push({ id: asgid(), personId: engIcIds[1], projectId: projects[0].id, requestedByPersonId: pmId, assignmentCode: 'ASG-002', staffingRole: 'Software Engineer', status: 'ACTIVE', allocationPercent: 100, validFrom: monthsAgo(5), validTo: monthsAgo(-3), notes: 'Backend API development', approvedAt: monthsAgo(5) });
assignments.push({ id: asgid(), personId: engIcIds[4], projectId: projects[0].id, requestedByPersonId: pmId, assignmentCode: 'ASG-003', staffingRole: 'DevOps Engineer', status: 'ACTIVE', allocationPercent: 40, validFrom: monthsAgo(4), validTo: monthsAgo(-2), notes: 'CI/CD and deployment', approvedAt: monthsAgo(4) });
assignments.push({ id: asgid(), personId: conIcIds[0], projectId: projects[0].id, requestedByPersonId: pmId, assignmentCode: 'ASG-004', staffingRole: 'Senior Consultant', status: 'ACTIVE', allocationPercent: 50, validFrom: monthsAgo(5), validTo: monthsAgo(-1), notes: 'Client liaison and change management', approvedAt: monthsAgo(5) });

// PRJ-101 DeliveryCentral: 2 engineers
assignments.push({ id: asgid(), personId: engIcIds[0], projectId: projects[1].id, requestedByPersonId: pmId, assignmentCode: 'ASG-005', staffingRole: 'Lead Engineer', status: 'ACTIVE', allocationPercent: 20, validFrom: monthsAgo(6), validTo: null, notes: 'Technical architecture', approvedAt: monthsAgo(6) });
assignments.push({ id: asgid(), personId: engIcIds[5], projectId: projects[1].id, requestedByPersonId: pmId, assignmentCode: 'ASG-006', staffingRole: 'Platform Engineer', status: 'ACTIVE', allocationPercent: 80, validFrom: monthsAgo(6), validTo: null, notes: 'Infrastructure and platform', approvedAt: monthsAgo(6) });

// PRJ-102 Beacon Mobile: 2 engineers
assignments.push({ id: asgid(), personId: engIcIds[2], projectId: projects[2].id, requestedByPersonId: pmIcIds[0], assignmentCode: 'ASG-007', staffingRole: 'Mobile Engineer', status: 'ACTIVE', allocationPercent: 100, validFrom: monthsAgo(4), validTo: monthsAgo(-2), notes: 'React Native development', approvedAt: monthsAgo(4) });
assignments.push({ id: asgid(), personId: engIcIds[3], projectId: projects[2].id, requestedByPersonId: pmIcIds[0], assignmentCode: 'ASG-008', staffingRole: 'Junior Engineer', status: 'ACTIVE', allocationPercent: 80, validFrom: monthsAgo(3), validTo: monthsAgo(-2), notes: 'UI component development', approvedAt: monthsAgo(3) });

// PRJ-103 Nova Analytics: data team
assignments.push({ id: asgid(), personId: dataIcIds[0], projectId: projects[3].id, requestedByPersonId: pmId, assignmentCode: 'ASG-009', staffingRole: 'Lead Data Engineer', status: 'ACTIVE', allocationPercent: 100, validFrom: monthsAgo(3), validTo: monthsAgo(-1), notes: 'Snowflake migration lead', approvedAt: monthsAgo(3) });
assignments.push({ id: asgid(), personId: dataIcIds[1], projectId: projects[3].id, requestedByPersonId: pmId, assignmentCode: 'ASG-010', staffingRole: 'Data Engineer', status: 'ACTIVE', allocationPercent: 100, validFrom: monthsAgo(3), validTo: monthsAgo(-1), notes: 'ETL pipeline development', approvedAt: monthsAgo(3) });
assignments.push({ id: asgid(), personId: dataIcIds[2], projectId: projects[3].id, requestedByPersonId: pmId, assignmentCode: 'ASG-011', staffingRole: 'Junior Data Engineer', status: 'ACTIVE', allocationPercent: 60, validFrom: monthsAgo(2), validTo: monthsAgo(-1), notes: 'Data quality validation', approvedAt: monthsAgo(2) });

// PRJ-104 Polaris Security: 1 engineer + 1 advisor
assignments.push({ id: asgid(), personId: engIcIds[4], projectId: projects[4].id, requestedByPersonId: pmIcIds[1], assignmentCode: 'ASG-012', staffingRole: 'Security Engineer', status: 'ACTIVE', allocationPercent: 60, validFrom: monthsAgo(2), validTo: monthsAgo(-4), notes: 'Zero-trust implementation', approvedAt: monthsAgo(2) });
assignments.push({ id: asgid(), personId: advIcIds[2], projectId: projects[4].id, requestedByPersonId: pmIcIds[1], assignmentCode: 'ASG-013', staffingRole: 'Compliance Advisor', status: 'ACTIVE', allocationPercent: 40, validFrom: monthsAgo(2), validTo: monthsAgo(-4), notes: 'Regulatory compliance review', approvedAt: monthsAgo(2) });

// PRJ-105 Bench: people on bench
assignments.push({ id: asgid(), personId: conIcIds[3], projectId: projects[5].id, requestedByPersonId: rmId, assignmentCode: 'ASG-014', staffingRole: 'Bench (Training)', status: 'ACTIVE', allocationPercent: 100, validFrom: monthsAgo(2), validTo: null, notes: 'Upskilling during bench period', approvedAt: monthsAgo(2) });

// PRJ-106 Titan CRM: consultants
assignments.push({ id: asgid(), personId: conIcIds[1], projectId: projects[6].id, requestedByPersonId: pmIcIds[0], assignmentCode: 'ASG-015', staffingRole: 'Consultant', status: 'ACTIVE', allocationPercent: 100, validFrom: monthsAgo(3), validTo: monthsAgo(-3), notes: 'CRM process mapping', approvedAt: monthsAgo(3) });
assignments.push({ id: asgid(), personId: conIcIds[2], projectId: projects[6].id, requestedByPersonId: pmIcIds[0], assignmentCode: 'ASG-016', staffingRole: 'Business Analyst', status: 'ACTIVE', allocationPercent: 80, validFrom: monthsAgo(3), validTo: monthsAgo(-3), notes: 'Requirements gathering', approvedAt: monthsAgo(3) });
assignments.push({ id: asgid(), personId: conIcIds[4], projectId: projects[6].id, requestedByPersonId: pmIcIds[0], assignmentCode: 'ASG-017', staffingRole: 'Senior Consultant', status: 'ACTIVE', allocationPercent: 60, validFrom: monthsAgo(2), validTo: monthsAgo(-3), notes: 'Strategy advisory', approvedAt: monthsAgo(2) });

// PRJ-107 Compass Cloud: engineers
assignments.push({ id: asgid(), personId: engIcIds[5], projectId: projects[7].id, requestedByPersonId: pmId, assignmentCode: 'ASG-018', staffingRole: 'Cloud Architect', status: 'ACTIVE', allocationPercent: 20, validFrom: monthsAgo(4), validTo: monthsAgo(-2), notes: 'Architecture design and review', approvedAt: monthsAgo(4) });
assignments.push({ id: asgid(), personId: engIcIds[2], projectId: projects[7].id, requestedByPersonId: pmId, assignmentCode: 'ASG-019', staffingRole: 'Infrastructure Engineer', status: 'REQUESTED', allocationPercent: 40, validFrom: monthsAgo(1), validTo: monthsAgo(-2), notes: 'Pending resource allocation', approvedAt: null });

// PRJ-108 Zenith Data: data team
assignments.push({ id: asgid(), personId: dataIcIds[3], projectId: projects[8].id, requestedByPersonId: pmIcIds[1], assignmentCode: 'ASG-020', staffingRole: 'ML Engineer', status: 'ACTIVE', allocationPercent: 100, validFrom: monthsAgo(2), validTo: monthsAgo(-4), notes: 'ML pipeline development', approvedAt: monthsAgo(2) });

// PRJ-109 Orion (closed): advisors (ended)
assignments.push({ id: asgid(), personId: advIcIds[0], projectId: projects[9].id, requestedByPersonId: pmId, assignmentCode: 'ASG-021', staffingRole: 'Governance Lead', status: 'ENDED', allocationPercent: 100, validFrom: monthsAgo(6), validTo: monthsAgo(1), notes: 'Regulatory reporting automation', approvedAt: monthsAgo(6) });
assignments.push({ id: asgid(), personId: advIcIds[1], projectId: projects[9].id, requestedByPersonId: pmId, assignmentCode: 'ASG-022', staffingRole: 'Risk Advisor', status: 'ENDED', allocationPercent: 60, validFrom: monthsAgo(6), validTo: monthsAgo(1), notes: 'Risk assessment and mitigation', approvedAt: monthsAgo(6) });
assignments.push({ id: asgid(), personId: terminatedId, projectId: projects[9].id, requestedByPersonId: pmId, assignmentCode: 'ASG-023', staffingRole: 'Consultant', status: 'ENDED', allocationPercent: 100, validFrom: monthsAgo(6), validTo: monthsAgo(2), notes: 'Regulatory research', approvedAt: monthsAgo(6) });

// ---------------------------------------------------------------------------
// ASSIGNMENT APPROVALS — one per assignment
// ---------------------------------------------------------------------------
let aprSeq = 0;
const aprid = (): string => ns(APR, ++aprSeq);

const assignmentApprovals = assignments.map(a => ({
  id: aprid(),
  assignmentId: a.id,
  decidedByPersonId: a.status === 'REQUESTED' ? null : rmId,
  sequenceNumber: 1,
  decision: a.status === 'REQUESTED' ? 'PENDING' : 'APPROVED',
  decisionReason: a.status === 'REQUESTED' ? null : 'Resource available, skills match confirmed',
  decisionAt: a.approvedAt,
  createdAt: a.validFrom,
  updatedAt: NOW,
}));

// ---------------------------------------------------------------------------
// ASSIGNMENT HISTORY — creation + approval events
// ---------------------------------------------------------------------------
let ahiSeq = 0;
const ahiid = (): string => ns(AHI, ++ahiSeq);

const assignmentHistory: Array<Record<string, unknown>> = [];
assignments.forEach(a => {
  assignmentHistory.push({
    id: ahiid(), assignmentId: a.id, changedByPersonId: a.requestedByPersonId,
    changeType: 'ASSIGNMENT_CREATED', changeReason: 'Staffing request', occurredAt: a.validFrom,
  });
  if (a.approvedAt) {
    assignmentHistory.push({
      id: ahiid(), assignmentId: a.id, changedByPersonId: rmId,
      changeType: 'ASSIGNMENT_APPROVED', changeReason: 'Resource available', occurredAt: a.approvedAt,
    });
  }
  if (a.status === 'ENDED') {
    assignmentHistory.push({
      id: ahiid(), assignmentId: a.id, changedByPersonId: rmId,
      changeType: 'ASSIGNMENT_ENDED', changeReason: 'Project completed', occurredAt: a.validTo!,
    });
  }
});

// ---------------------------------------------------------------------------
// WORK EVIDENCE SOURCES
// ---------------------------------------------------------------------------
let wesSeq = 0;
const wesid = (): string => ns(WES, ++wesSeq);

const workEvidenceSources = [
  { id: wesid(), provider: 'jira', sourceType: 'worklogs', connectionKey: 'jira-cloud-primary', displayName: 'Jira Cloud Worklogs', createdAt: monthsAgo(6), updatedAt: NOW },
  { id: wesid(), provider: 'internal', sourceType: 'timesheet', connectionKey: 'internal-timesheet', displayName: 'Internal Timesheet', createdAt: monthsAgo(6), updatedAt: NOW },
  { id: wesid(), provider: 'github', sourceType: 'commits', connectionKey: 'github-meridian', displayName: 'GitHub Commits', createdAt: monthsAgo(6), updatedAt: NOW },
];

// ---------------------------------------------------------------------------
// WORK EVIDENCE — 6 months of weekly evidence for all assigned people
// ---------------------------------------------------------------------------
let wevSeq = 0;
const wevid = (): string => ns(WEV, ++wevSeq);
let welSeq = 0;
const welid = (): string => ns(WEL, ++welSeq);

const workEvidence: Array<Record<string, unknown>> = [];
const workEvidenceLinks: Array<Record<string, unknown>> = [];

// Generate evidence for active assignments over their validity period
assignments.filter(a => a.status !== 'REQUESTED').forEach(a => {
  const person = people.find(p => p.id === a.personId);
  if (!person) return;

  const start = a.validFrom;
  const end = a.validTo ?? NOW;
  const weeksInRange = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

  // Generate weekly evidence entries (2-3 per week per person)
  for (let w = 0; w < Math.min(weeksInRange, 26); w++) {
    const weekDate = new Date(start);
    weekDate.setDate(weekDate.getDate() + w * 7);
    if (weekDate > NOW) break;

    const sourceIdx = w % 2 === 0 ? 0 : (person.skillsets.includes('DATA') ? 1 : 2);
    const durationMinutes = randomBetween(120, 480, w * 100 + asgSeq);
    const evidenceId = wevid();

    workEvidence.push({
      id: evidenceId,
      workEvidenceSourceId: workEvidenceSources[sourceIdx].id,
      personId: a.personId,
      projectId: a.projectId,
      sourceRecordKey: `${a.assignmentCode}-W${(w + 1).toString().padStart(2, '0')}`,
      evidenceType: sourceIdx === 0 ? 'JIRA_WORKLOG' : (sourceIdx === 1 ? 'TIMESHEET_ENTRY' : 'GIT_COMMIT'),
      recordedAt: weekDate,
      occurredOn: weekDate,
      durationMinutes,
      status: 'CAPTURED',
      capex: w % 5 === 0,
      summary: `Week ${w + 1} work on ${a.staffingRole}`,
      createdAt: weekDate,
      updatedAt: weekDate,
    });

    // Add external link for Jira evidence
    if (sourceIdx === 0) {
      workEvidenceLinks.push({
        id: welid(),
        workEvidenceId: evidenceId,
        provider: 'jira',
        externalKey: `ATLAS-${randomBetween(100, 999, w + asgSeq)}`,
        externalUrl: `https://meridian.atlassian.net/browse/ATLAS-${randomBetween(100, 999, w + asgSeq)}`,
        linkType: 'ISSUE',
        createdAt: weekDate,
      });
    }
  }
});

// ---------------------------------------------------------------------------
// PROJECT EXTERNAL LINKS + SYNC STATE
// ---------------------------------------------------------------------------
let pelSeq = 0;
const pelid = (): string => ns(PEL, ++pelSeq);
let essSeq = 0;
const essid = (): string => ns(ESS, ++essSeq);

const projectExternalLinks: Array<Record<string, unknown>> = [];
const externalSyncStates: Array<Record<string, unknown>> = [];

// First 4 projects have Jira links
projects.slice(0, 4).forEach(p => {
  const linkId = pelid();
  projectExternalLinks.push({
    id: linkId, projectId: p.id, provider: 'jira', connectionKey: 'jira-cloud-primary',
    externalProjectKey: p.projectCode, externalProjectName: p.name,
    externalUrl: `https://meridian.atlassian.net/projects/${p.projectCode}`,
    createdAt: p.startsOn, updatedAt: NOW,
  });
  externalSyncStates.push({
    id: essid(), projectExternalLinkId: linkId, syncStatus: 'SUCCEEDED',
    lastSyncedAt: daysAgo(1), lastSuccessfulSyncedAt: daysAgo(1),
    createdAt: p.startsOn, updatedAt: NOW,
  });
});

// ---------------------------------------------------------------------------
// STAFFING REQUESTS
// ---------------------------------------------------------------------------
let srqSeq = 0;
const srqid = (): string => ns(SRQ, ++srqSeq);
let srfSeq = 0;
const srfid = (): string => ns(SRF, ++srfSeq);

const staffingRequests = [
  {
    id: srqid(), projectId: projects[0].id, requestedByPersonId: pmId,
    role: 'Lead Engineer', skills: ['TYPESCRIPT', 'REACT'], summary: 'Need lead engineer for Atlas ERP',
    allocationPercent: 80, headcountRequired: 1, headcountFulfilled: 1,
    priority: 'HIGH', status: 'FULFILLED', startDate: monthsAgo(5), endDate: monthsAgo(-3),
    createdAt: monthsAgo(5), updatedAt: monthsAgo(5),
  },
  {
    id: srqid(), projectId: projects[7].id, requestedByPersonId: pmId,
    role: 'Infrastructure Engineer', skills: ['AWS', 'TERRAFORM'], summary: 'Cloud migration support',
    allocationPercent: 40, headcountRequired: 1, headcountFulfilled: 0,
    priority: 'MEDIUM', status: 'OPEN', startDate: monthsAgo(1), endDate: monthsAgo(-2),
    createdAt: monthsAgo(1), updatedAt: monthsAgo(1),
  },
  {
    id: srqid(), projectId: projects[8].id, requestedByPersonId: pmIcIds[1],
    role: 'Data Analyst', skills: ['SQL', 'PYTHON'], summary: 'Additional support for Zenith data platform',
    allocationPercent: 60, headcountRequired: 2, headcountFulfilled: 1,
    priority: 'HIGH', status: 'IN_REVIEW', startDate: monthsAgo(1), endDate: monthsAgo(-4),
    createdAt: daysAgo(10), updatedAt: daysAgo(10),
  },
  {
    id: srqid(), projectId: projects[4].id, requestedByPersonId: pmIcIds[1],
    role: 'Security Analyst', skills: ['SECURITY', 'COMPLIANCE'], summary: 'Penetration testing specialist',
    allocationPercent: 100, headcountRequired: 1, headcountFulfilled: 0,
    priority: 'URGENT', status: 'OPEN', startDate: daysAgo(7), endDate: monthsAgo(-4),
    createdAt: daysAgo(7), updatedAt: daysAgo(7),
  },
];

const staffingRequestFulfilments = [
  {
    id: srfid(), requestId: staffingRequests[0].id,
    assignedPersonId: engIcIds[0], proposedByPersonId: rmId,
    fulfilledAt: monthsAgo(5),
  },
];

// ---------------------------------------------------------------------------
// EXPORT — Prisma-compatible records
// ---------------------------------------------------------------------------
export const realisticPeople = people.map(p => ({
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
  terminatedAt: p.employmentStatus === 'TERMINATED' ? monthsAgo(1) : null,
  createdAt: p.hiredAt,
  updatedAt: NOW,
}));

export const realisticOrgUnits = orgUnits.map(ou => ({
  id: ou.id,
  code: ou.code,
  name: ou.name,
  description: ou.description,
  status: 'ACTIVE',
  parentOrgUnitId: ou.parentOrgUnitId,
  managerPersonId: ou.managerPersonId,
  validFrom: monthsAgo(24),
  createdAt: monthsAgo(24),
  updatedAt: NOW,
  kind: ou.kind,
}));

export const realisticPositions = positions;
export const realisticPersonOrgMemberships = personOrgMemberships;
export const realisticReportingLines = reportingLines;
export const realisticResourcePools = resourcePools.map(rp => ({
  id: rp.id, orgUnitId: rp.orgUnitId, code: rp.code, name: rp.name, description: rp.description,
  createdAt: monthsAgo(12), updatedAt: NOW,
}));
export const realisticResourcePoolMemberships = resourcePoolMemberships;

export const realisticProjects = projects.map(p => ({
  id: p.id, projectCode: p.projectCode, name: p.name, description: p.description,
  projectManagerId: p.projectManagerId, status: p.status,
  startsOn: p.startsOn, endsOn: p.endsOn,
  version: 1, createdAt: p.startsOn, updatedAt: NOW,
}));

export const realisticAssignments = assignments.map(a => ({
  id: a.id, personId: a.personId, projectId: a.projectId,
  requestedByPersonId: a.requestedByPersonId, assignmentCode: a.assignmentCode,
  staffingRole: a.staffingRole, status: a.status,
  allocationPercent: a.allocationPercent,
  requestedAt: a.validFrom, approvedAt: a.approvedAt,
  validFrom: a.validFrom, validTo: a.validTo,
  notes: a.notes, version: 1,
  createdAt: a.validFrom, updatedAt: NOW,
}));

// Employee lifecycle activity events
let actSeq = 0;
const actId = (): string => ns(ACT, ++actSeq);

export const realisticActivityEvents = people.flatMap(p => {
  const events: Array<{ id: string; personId: string; eventType: string; occurredAt: Date; actorId: string | null; summary: string; relatedEntityId: string | null; metadata: Record<string, unknown> | null }> = [];
  events.push({ id: actId(), personId: p.id, eventType: 'HIRED', occurredAt: p.hiredAt, actorId: null, summary: `${p.displayName} joined as ${p.role}`, relatedEntityId: null, metadata: { grade: p.grade, role: p.role } });
  const personAssignments = assignments.filter(a => a.personId === p.id);
  for (const a of personAssignments) {
    events.push({ id: actId(), personId: p.id, eventType: 'ASSIGNED', occurredAt: a.validFrom, actorId: a.requestedByPersonId, summary: `Assigned to project as ${a.staffingRole} at ${a.allocationPercent}%`, relatedEntityId: a.id, metadata: { projectId: a.projectId, staffingRole: a.staffingRole, allocationPercent: a.allocationPercent } });
    if (a.validTo) {
      events.push({ id: actId(), personId: p.id, eventType: 'UNASSIGNED', occurredAt: a.validTo, actorId: null, summary: `Assignment ended for ${a.staffingRole} role`, relatedEntityId: a.id, metadata: { projectId: a.projectId } });
    }
  }
  if (p.employmentStatus === 'TERMINATED' && p.terminatedAt) {
    events.push({ id: actId(), personId: p.id, eventType: 'TERMINATED', occurredAt: p.terminatedAt, actorId: null, summary: `${p.displayName} terminated. ${personAssignments.filter(a => a.status === 'ENDED').length} assignment(s) ended.`, relatedEntityId: null, metadata: null });
  }
  return events;
});

export const realisticAssignmentApprovals = assignmentApprovals;
export const realisticAssignmentHistory = assignmentHistory;
export const realisticWorkEvidenceSources = workEvidenceSources;
export const realisticWorkEvidence = workEvidence;
export const realisticWorkEvidenceLinks = workEvidenceLinks;
export const realisticProjectExternalLinks = projectExternalLinks;
export const realisticExternalSyncStates = externalSyncStates;
export const realisticStaffingRequests = staffingRequests;
export const realisticStaffingRequestFulfilments = staffingRequestFulfilments;

// ---------------------------------------------------------------------------
// TEST ACCOUNTS — one per platform role
// ---------------------------------------------------------------------------
export const realisticAccounts = [
  { email: 'admin@deliverycentral.local', password: 'DeliveryCentral@Admin1', displayName: 'System Administrator', roles: ['admin'], personId: undefined as string | undefined },
  { email: 'noah.bennett@meridian.demo', password: 'DirectorPass1!', displayName: 'Noah Bennett', roles: ['director'], personId: dirEngId },
  { email: 'diana.walsh@meridian.demo', password: 'HrManagerPass1!', displayName: 'Diana Walsh', roles: ['hr_manager'], personId: hrDirId },
  { email: 'amir.khoury@meridian.demo', password: 'ResourceMgrPass1!', displayName: 'Amir Khoury', roles: ['resource_manager'], personId: rmId },
  { email: 'lucas.reed@meridian.demo', password: 'ProjectMgrPass1!', displayName: 'Lucas Reed', roles: ['project_manager'], personId: pmId },
  { email: 'carlos.vega@meridian.demo', password: 'DeliveryMgrPass1!', displayName: 'Carlos Vega', roles: ['delivery_manager'], personId: deliveryMgrId },
  { email: 'ethan.brooks@meridian.demo', password: 'EmployeePass1!', displayName: 'Ethan Brooks', roles: ['employee'], personId: engIcIds[0] },
  { email: 'emma.garcia@meridian.demo', password: 'DualRolePass1!', displayName: 'Emma Garcia', roles: ['resource_manager', 'hr_manager'], personId: conMgrId },
  { email: 'catherine.monroe@meridian.demo', password: 'CeoPass1!', displayName: 'Catherine Monroe', roles: ['director'], personId: ceoId },
  { email: 'sophia.kim@meridian.demo', password: 'EngMgrPass1!', displayName: 'Sophia Kim', roles: ['resource_manager'], personId: engMgrId },
];

// ---------------------------------------------------------------------------
// TIMESHEETS — 24 weeks (6 months) for all assigned ICs
// ---------------------------------------------------------------------------
export function generateTimesheets(): { weeks: Array<Record<string, unknown>>; entries: Array<Record<string, unknown>> } {
  const weeks: Array<Record<string, unknown>> = [];
  const entries: Array<Record<string, unknown>> = [];
  let weekSeq = 0;
  let entrySeq = 0;
  const currentWeekStart = weekMonday(0);
  const weekIdByPersonAndStart = new Map<string, string>();

  // Get unique assigned ICs with their project allocations
  const personAssignments = new Map<string, Array<{ projectId: string; allocationPercent: number; validFrom: Date; validTo: Date | null }>>();
  assignments.filter(a => a.status !== 'REQUESTED').forEach(a => {
    if (!personAssignments.has(a.personId)) personAssignments.set(a.personId, []);
    personAssignments.get(a.personId)!.push({
      projectId: a.projectId, allocationPercent: a.allocationPercent,
      validFrom: a.validFrom, validTo: a.validTo,
    });
  });

  let personIndex = 0;
  for (const [personId, asgns] of personAssignments) {
    personIndex++;
    for (let w = 24; w >= 0; w--) {
      const monday = weekMonday(w);
      weekSeq++;

      const status =
        w === 0 ? 'APPROVED' : w > 4 ? 'APPROVED' : (w > 2 ? 'SUBMITTED' : 'DRAFT');
      const weekId = `bbbb0001-ts00-0000-${String(weekSeq).padStart(4, '0')}-000000000000`;
      weekIdByPersonAndStart.set(`${personId}:${monday.toISOString().slice(0, 10)}`, weekId);

      weeks.push({
        id: weekId, personId, weekStart: monday, status,
        submittedAt: status !== 'DRAFT' ? monday : null,
        approvedBy: status === 'APPROVED' ? rmId : null,
        approvedAt: status === 'APPROVED' ? monday : null,
        version: 1,
      });

      // Distribute 8h/day across active assignments for this week
      const activeAsgns = asgns.filter(a =>
        a.validFrom <= monday && (a.validTo === null || a.validTo >= monday),
      );

      if (activeAsgns.length === 0) continue;
      if (w === 0 && personIndex % 5 === 0) continue;

      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        const entryDate = new Date(monday);
        entryDate.setDate(monday.getDate() + dayOffset);
        if (entryDate > NOW) break;

        for (const asgn of activeAsgns) {
          entrySeq++;
          const hoursForProject = Math.round((asgn.allocationPercent / 100) * 8 * 10) / 10;
          if (hoursForProject <= 0) continue;
          const adjustedHours =
            w === 0 && dayOffset === 0 && personIndex % 4 === 0
              ? Math.round((hoursForProject + 2) * 10) / 10
              : w === 0 && dayOffset === 4 && personIndex % 3 === 0
                ? Math.max(0, Math.round((hoursForProject - 2) * 10) / 10)
                : hoursForProject;
          if (adjustedHours <= 0) continue;

          entries.push({
            id: `bbbb0001-te00-0000-${String(entrySeq).padStart(4, '0')}-000000000000`,
            timesheetWeekId: weekId,
            projectId: asgn.projectId,
            date: entryDate,
            hours: adjustedHours,
            capex: entrySeq % 7 === 0,
            description: `Work on project`,
          });
        }
      }
    }
  }

  const people = [...personAssignments.keys()];
  const unassignedProject = assignments.find((assignment) =>
    people.length > 0 && assignment.personId !== people[0],
  );
  if (people[0] && unassignedProject) {
    const weekId = weekIdByPersonAndStart.get(`${people[0]}:${currentWeekStart.toISOString().slice(0, 10)}`);
    if (weekId) {
      entrySeq++;
      entries.push({
        id: `bbbb0001-te00-0000-${String(entrySeq).padStart(4, '0')}-000000000000`,
        timesheetWeekId: weekId,
        projectId: unassignedProject.projectId,
        date: currentWeekStart,
        hours: 6,
        capex: false,
        description: 'Unplanned support across shared services',
      });
    }
  }

  const endedAssignment = assignments.find((assignment) =>
    assignment.status !== 'REQUESTED' &&
    assignment.validTo !== null &&
    assignment.validTo < currentWeekStart,
  );
  if (endedAssignment) {
    const weekId = weekIdByPersonAndStart.get(`${endedAssignment.personId}:${currentWeekStart.toISOString().slice(0, 10)}`);
    if (weekId) {
      entrySeq++;
      entries.push({
        id: `bbbb0001-te00-0000-${String(entrySeq).padStart(4, '0')}-000000000000`,
        timesheetWeekId: weekId,
        projectId: endedAssignment.projectId,
        date: currentWeekStart,
        hours: 4,
        capex: false,
        description: 'Late approved activity after assignment end',
      });
    }
  }

  return { weeks, entries };
}

// ---------------------------------------------------------------------------
// PULSE ENTRIES — 24 weeks for all ICs
// ---------------------------------------------------------------------------
export function generatePulseEntries(): Array<Record<string, unknown>> {
  const pulseEntries: Array<Record<string, unknown>> = [];
  let pulseSeq = 0;
  const allIcs = [...engIcIds, ...dataIcIds, ...conIcIds, ...advIcIds, ...hrIcIds, ...rmIcIds, ...finIcIds, ...prodIcIds, ...pmIcIds];

  for (const personId of allIcs) {
    const baseMood = randomBetween(3, 5, pulseSeq);

    for (let w = 24; w >= 1; w--) {
      pulseSeq++;
      const monday = weekMonday(w);

      // Vary mood with realistic patterns: dip around weeks 10-12, improvement in recent weeks
      let mood = baseMood;
      if (w >= 10 && w <= 12) mood = Math.max(1, baseMood - 1);
      if (w <= 3) mood = Math.min(5, baseMood + 1);
      if (w % 4 === 0) mood = Math.max(1, mood - 1);

      const notes: string[] = [];
      if (w === 11) notes.push('Sprint was stressful, tight deadline');
      if (w === 1) notes.push('Feeling good about recent progress');
      if (w === 6) notes.push('Good collaboration with the team this week');

      pulseEntries.push({
        id: `bbbb0002-pu00-0000-${String(pulseSeq).padStart(4, '0')}-000000000000`,
        personId, weekStart: monday, mood,
        note: notes.length > 0 ? notes[0] : null,
        submittedAt: monday,
      });
    }
  }

  return pulseEntries;
}

// ---------------------------------------------------------------------------
// CASES — realistic lifecycle cases
// ---------------------------------------------------------------------------
export const realisticCases = [
  {
    id: 'cccc0001-ca5e-0000-0000-000000000001',
    caseNumber: 'CASE-R001',
    subjectPersonId: engIcIds[3], // Aisha (new hire)
    ownerPersonId: hrMgrId,
    status: 'IN_PROGRESS',
    summary: 'Onboarding: new junior engineer hire',
    caseTypeKey: 'ONBOARDING',
  },
  {
    id: 'cccc0001-ca5e-0000-0000-000000000002',
    caseNumber: 'CASE-R002',
    subjectPersonId: conIcIds[0], // Isabel (performance review)
    ownerPersonId: hrMgrId,
    status: 'OPEN',
    summary: 'Mid-year performance review for senior consultant',
    caseTypeKey: 'PERFORMANCE',
  },
  {
    id: 'cccc0001-ca5e-0000-0000-000000000003',
    caseNumber: 'CASE-R003',
    subjectPersonId: terminatedId,
    ownerPersonId: hrMgrId,
    status: 'IN_PROGRESS',
    summary: 'Offboarding: departing consultant',
    caseTypeKey: 'OFFBOARDING',
  },
  {
    id: 'cccc0001-ca5e-0000-0000-000000000004',
    caseNumber: 'CASE-R004',
    subjectPersonId: dataIcIds[2], // Amara (transfer)
    ownerPersonId: hrMgrId,
    status: 'OPEN',
    summary: 'Internal transfer from Data to Engineering team',
    caseTypeKey: 'TRANSFER',
  },
];

// ---------------------------------------------------------------------------
// IN-APP NOTIFICATIONS — realistic recent notifications
// ---------------------------------------------------------------------------
export function generateNotifications(): Array<Record<string, unknown>> {
  const notifications: Array<Record<string, unknown>> = [];
  let nSeq = 0;
  const nid = (): string => `dddd0001-1a00-0000-${String(++nSeq).padStart(4, '0')}-000000000000`;

  // Notifications for key role accounts
  const notifDefs = [
    // Employee (Ethan)
    { recipientPersonId: engIcIds[0], eventType: 'assignment.created', title: 'New assignment on Atlas ERP Integration', body: 'You have been assigned as Lead Engineer on PRJ-100.', link: `/projects/${projects[0].id}`, daysAgo: 2 },
    { recipientPersonId: engIcIds[0], eventType: 'pulse.reminder', title: 'Weekly pulse check-in', body: 'How are you feeling this week? Submit your pulse.', link: '/pulse', daysAgo: 1, unread: true },
    { recipientPersonId: engIcIds[0], eventType: 'timesheet.reminder', title: 'Timesheet not submitted', body: 'Your timesheet for this week is still in DRAFT.', link: '/timesheets', daysAgo: 0, unread: true },
    // HR (Diana)
    { recipientPersonId: hrDirId, eventType: 'case.created', title: 'New onboarding case opened', body: 'Onboarding case CASE-R001 opened for Aisha Diallo.', link: `/cases/${realisticCases[0].id}`, daysAgo: 3 },
    { recipientPersonId: hrDirId, eventType: 'case.step_completed', title: 'Offboarding step completed', body: '"Exit Interview" completed for Viktor Drago.', link: `/cases/${realisticCases[2].id}`, daysAgo: 1, unread: true },
    { recipientPersonId: hrDirId, eventType: 'employee.terminated', title: 'Employee termination processed', body: 'Viktor Drago has been terminated. Offboarding in progress.', link: `/people/${terminatedId}`, daysAgo: 5 },
    // RM (Amir)
    { recipientPersonId: rmId, eventType: 'staffingRequest.submitted', title: 'New staffing request: Infrastructure Engineer', body: 'Staffing request for Compass Cloud Migration.', link: '/staffing', daysAgo: 7, unread: true },
    { recipientPersonId: rmId, eventType: 'staffingRequest.submitted', title: 'Urgent: Security Analyst needed', body: 'Urgent staffing request for Polaris Security Hardening.', link: '/staffing', daysAgo: 3, unread: true },
    { recipientPersonId: rmId, eventType: 'assignment.approved', title: 'Assignment approved', body: 'Ethan Brooks approved for Atlas ERP Integration.', link: `/assignments/${assignments[0].id}`, daysAgo: 10 },
    // PM (Lucas)
    { recipientPersonId: pmId, eventType: 'project.activated', title: 'Project activated: Polaris Security', body: 'Polaris Security Hardening is now ACTIVE.', link: `/projects/${projects[4].id}`, daysAgo: 14 },
    { recipientPersonId: pmId, eventType: 'staffingRequest.fulfilled', title: 'Staffing request fulfilled', body: 'All headcount for Atlas ERP Lead Engineer has been filled.', link: '/staffing', daysAgo: 20 },
    // Delivery Manager (Carlos)
    { recipientPersonId: deliveryMgrId, eventType: 'assignment.ended', title: 'Assignment ended on Orion Compliance', body: 'Henrik Johansson\'s assignment has ended.', link: `/assignments/${assignments[20].id}`, daysAgo: 30 },
    { recipientPersonId: deliveryMgrId, eventType: 'project.closed', title: 'Project closed: Orion Regulatory', body: 'Orion Regulatory Compliance project has been closed.', link: `/projects/${projects[9].id}`, daysAgo: 28 },
    // Director (Noah)
    { recipientPersonId: dirEngId, eventType: 'staffingRequest.submitted', title: 'Staffing gap flagged', body: '2 open staffing requests in your directorate.', link: '/staffing', daysAgo: 5, unread: true },
  ];

  notifDefs.forEach(n => {
    notifications.push({
      id: nid(),
      recipientPersonId: n.recipientPersonId,
      eventType: n.eventType,
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.unread ? null : daysAgo(n.daysAgo > 0 ? n.daysAgo - 1 : 0),
      createdAt: daysAgo(n.daysAgo),
    });
  });

  return notifications;
}

// ---------------------------------------------------------------------------
// DATASET SUMMARY
// ---------------------------------------------------------------------------
export const realisticDatasetSummary = {
  profile: 'realistic',
  company: 'Meridian Consulting Group',
  peopleCount: people.length,
  orgUnitCount: orgUnits.length,
  projectCount: projects.length,
  assignmentCount: assignments.length,
  workEvidenceCount: workEvidence.length,
  resourcePoolCount: resourcePools.length,
  staffingRequestCount: staffingRequests.length,
  caseCount: realisticCases.length,
  historyDepthWeeks: 24,
};
