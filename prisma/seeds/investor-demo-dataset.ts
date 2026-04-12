/**
 * Investor Demo Dataset — SEED_PROFILE=investor-demo
 *
 * 30 people · 5 departments · 10 projects · 40+ assignments
 * Designed to showcase all major product surfaces in a 5-minute walkthrough.
 *
 * UUID pattern: idXXXXXXX-YYYY-0000-0000-000000000000
 *   XX = entity prefix (pe=person, pr=project, as=assignment, ou=org-unit, etc.)
 *   YY = sequential index
 */

// ─────────────────────────────────────────────────────────────────────────────
// ORG UNITS (5 departments + root)
// ─────────────────────────────────────────────────────────────────────────────
export const idOrgUnits = [
  { id: 'id000001-ou00-0000-0000-000000000000', code: 'APEX',     name: 'Apex Digital',         parentId: null,                              depth: 0, isActive: true },
  { id: 'id000002-ou00-0000-0000-000000000000', code: 'ENG',      name: 'Engineering',           parentId: 'id000001-ou00-0000-0000-000000000000', depth: 1, isActive: true },
  { id: 'id000003-ou00-0000-0000-000000000000', code: 'CON',      name: 'Consulting',            parentId: 'id000001-ou00-0000-0000-000000000000', depth: 1, isActive: true },
  { id: 'id000004-ou00-0000-0000-000000000000', code: 'DES',      name: 'Design & UX',           parentId: 'id000001-ou00-0000-0000-000000000000', depth: 1, isActive: true },
  { id: 'id000005-ou00-0000-0000-000000000000', code: 'DAT',      name: 'Data & Analytics',      parentId: 'id000001-ou00-0000-0000-000000000000', depth: 1, isActive: true },
  { id: 'id000006-ou00-0000-0000-000000000000', code: 'OPS',      name: 'Operations',            parentId: 'id000001-ou00-0000-0000-000000000000', depth: 1, isActive: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE POOLS
// ─────────────────────────────────────────────────────────────────────────────
export const idResourcePools = [
  { id: 'id000001-rp00-0000-0000-000000000000', code: 'ENG-POOL',  name: 'Engineering Pool',  managerId: null },
  { id: 'id000002-rp00-0000-0000-000000000000', code: 'CON-POOL',  name: 'Consulting Pool',   managerId: null },
  { id: 'id000003-rp00-0000-0000-000000000000', code: 'DES-POOL',  name: 'Design Pool',       managerId: null },
  { id: 'id000004-rp00-0000-0000-000000000000', code: 'DAT-POOL',  name: 'Data Pool',         managerId: null },
  { id: 'id000005-rp00-0000-0000-000000000000', code: 'OPS-POOL',  name: 'Operations Pool',   managerId: null },
];

// ─────────────────────────────────────────────────────────────────────────────
// PEOPLE (30 total: 29 ACTIVE, 1 INACTIVE)
// ─────────────────────────────────────────────────────────────────────────────
// Hierarchy: CEO (root) → 5 Directors → 5 Managers → 19 ICs
// person IDs: id0000XX-pe00-0000-0000-000000000000

const D = (y: number, m: number, d: number): Date => new Date(`20${String(y).padStart(2,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T00:00:00Z`);

export const idPeople = [
  // ── C-Suite (no managers — root nodes) ───────────────────────────────────
  { id: 'id000001-pe00-0000-0000-000000000000', personNumber: 'ID-001', givenName: 'Catherine', familyName: 'Monroe',  displayName: 'Catherine Monroe', primaryEmail: 'catherine.monroe@apexdigital.demo', grade: 'G15', employmentStatus: 'ACTIVE',   hiredAt: D(16,1,15), role: 'Chief Executive Officer' },
  { id: 'id000002-pe00-0000-0000-000000000000', personNumber: 'ID-002', givenName: 'David',     familyName: 'Okafor',  displayName: 'David Okafor',     primaryEmail: 'david.okafor@apexdigital.demo',     grade: 'G14', employmentStatus: 'ACTIVE',   hiredAt: D(16,3,1),  role: 'Chief Operating Officer' },
  // ── Department Directors ──────────────────────────────────────────────────
  { id: 'id000003-pe00-0000-0000-000000000000', personNumber: 'ID-003', givenName: 'Priya',     familyName: 'Nair',    displayName: 'Priya Nair',       primaryEmail: 'priya.nair@apexdigital.demo',       grade: 'G13', employmentStatus: 'ACTIVE',   hiredAt: D(17,5,20), role: 'Director of Engineering' },
  { id: 'id000004-pe00-0000-0000-000000000000', personNumber: 'ID-004', givenName: 'Marcus',    familyName: 'Chen',    displayName: 'Marcus Chen',      primaryEmail: 'marcus.chen@apexdigital.demo',      grade: 'G13', employmentStatus: 'ACTIVE',   hiredAt: D(17,8,14), role: 'Director of Consulting' },
  { id: 'id000005-pe00-0000-0000-000000000000', personNumber: 'ID-005', givenName: 'Sofia',     familyName: 'Reyes',   displayName: 'Sofia Reyes',      primaryEmail: 'sofia.reyes@apexdigital.demo',      grade: 'G13', employmentStatus: 'ACTIVE',   hiredAt: D(18,2,1),  role: 'Director of Design & UX' },
  { id: 'id000006-pe00-0000-0000-000000000000', personNumber: 'ID-006', givenName: 'James',     familyName: 'Osei',    displayName: 'James Osei',       primaryEmail: 'james.osei@apexdigital.demo',       grade: 'G13', employmentStatus: 'ACTIVE',   hiredAt: D(18,6,15), role: 'Director of Data & Analytics' },
  { id: 'id000007-pe00-0000-0000-000000000000', personNumber: 'ID-007', givenName: 'Laura',     familyName: 'Petrov',  displayName: 'Laura Petrov',     primaryEmail: 'laura.petrov@apexdigital.demo',     grade: 'G13', employmentStatus: 'ACTIVE',   hiredAt: D(19,1,7),  role: 'Director of Operations' },
  // ── Managers ──────────────────────────────────────────────────────────────
  { id: 'id000008-pe00-0000-0000-000000000000', personNumber: 'ID-008', givenName: 'Ethan',     familyName: 'Grant',   displayName: 'Ethan Grant',      primaryEmail: 'ethan.grant@apexdigital.demo',      grade: 'G12', employmentStatus: 'ACTIVE',   hiredAt: D(18,9,3),  role: 'Engineering Manager' },
  { id: 'id000009-pe00-0000-0000-000000000000', personNumber: 'ID-009', givenName: 'Amara',     familyName: 'Diallo',  displayName: 'Amara Diallo',     primaryEmail: 'amara.diallo@apexdigital.demo',     grade: 'G12', employmentStatus: 'ACTIVE',   hiredAt: D(19,4,22), role: 'Consulting Manager' },
  { id: 'id000010-pe00-0000-0000-000000000000', personNumber: 'ID-010', givenName: 'Noah',      familyName: 'Blake',   displayName: 'Noah Blake',       primaryEmail: 'noah.blake@apexdigital.demo',       grade: 'G12', employmentStatus: 'ACTIVE',   hiredAt: D(19,7,10), role: 'Design Lead' },
  { id: 'id000011-pe00-0000-0000-000000000000', personNumber: 'ID-011', givenName: 'Ling',      familyName: 'Wu',      displayName: 'Ling Wu',          primaryEmail: 'ling.wu@apexdigital.demo',          grade: 'G12', employmentStatus: 'ACTIVE',   hiredAt: D(19,9,1),  role: 'Data Engineering Manager' },
  { id: 'id000012-pe00-0000-0000-000000000000', personNumber: 'ID-012', givenName: 'Samuel',    familyName: 'Adeyemi', displayName: 'Samuel Adeyemi',   primaryEmail: 'samuel.adeyemi@apexdigital.demo',   grade: 'G12', employmentStatus: 'ACTIVE',   hiredAt: D(20,1,15), role: 'Operations Manager' },
  // ── Engineering ICs ───────────────────────────────────────────────────────
  { id: 'id000013-pe00-0000-0000-000000000000', personNumber: 'ID-013', givenName: 'Aisha',     familyName: 'Patel',   displayName: 'Aisha Patel',      primaryEmail: 'aisha.patel@apexdigital.demo',      grade: 'G11', employmentStatus: 'ACTIVE',   hiredAt: D(20,3,16), role: 'Senior Software Engineer' },
  { id: 'id000014-pe00-0000-0000-000000000000', personNumber: 'ID-014', givenName: 'Ben',       familyName: 'Wright',  displayName: 'Ben Wright',       primaryEmail: 'ben.wright@apexdigital.demo',       grade: 'G10', employmentStatus: 'ACTIVE',   hiredAt: D(20,6,1),  role: 'Software Engineer' },
  { id: 'id000015-pe00-0000-0000-000000000000', personNumber: 'ID-015', givenName: 'Carmen',    familyName: 'Lopez',   displayName: 'Carmen Lopez',     primaryEmail: 'carmen.lopez@apexdigital.demo',     grade: 'G10', employmentStatus: 'ACTIVE',   hiredAt: D(21,2,14), role: 'Backend Engineer' },
  { id: 'id000016-pe00-0000-0000-000000000000', personNumber: 'ID-016', givenName: 'Darius',    familyName: 'Ford',    displayName: 'Darius Ford',      primaryEmail: 'darius.ford@apexdigital.demo',      grade: 'G9',  employmentStatus: 'ACTIVE',   hiredAt: D(22,8,22), role: 'Frontend Engineer' },
  // ── Consulting ICs ────────────────────────────────────────────────────────
  { id: 'id000017-pe00-0000-0000-000000000000', personNumber: 'ID-017', givenName: 'Elena',     familyName: 'Novak',   displayName: 'Elena Novak',      primaryEmail: 'elena.novak@apexdigital.demo',      grade: 'G11', employmentStatus: 'ACTIVE',   hiredAt: D(20,4,5),  role: 'Senior Consultant' },
  { id: 'id000018-pe00-0000-0000-000000000000', personNumber: 'ID-018', givenName: 'Felix',     familyName: 'Müller',  displayName: 'Felix Müller',     primaryEmail: 'felix.muller@apexdigital.demo',     grade: 'G10', employmentStatus: 'ACTIVE',   hiredAt: D(21,1,18), role: 'Business Consultant' },
  { id: 'id000019-pe00-0000-0000-000000000000', personNumber: 'ID-019', givenName: 'Grace',     familyName: 'Kim',     displayName: 'Grace Kim',        primaryEmail: 'grace.kim@apexdigital.demo',        grade: 'G10', employmentStatus: 'ACTIVE',   hiredAt: D(21,7,30), role: 'Change Consultant' },
  { id: 'id000020-pe00-0000-0000-000000000000', personNumber: 'ID-020', givenName: 'Hamid',     familyName: 'Rashidi', displayName: 'Hamid Rashidi',    primaryEmail: 'hamid.rashidi@apexdigital.demo',    grade: 'G9',  employmentStatus: 'ACTIVE',   hiredAt: D(23,2,6),  role: 'Junior Consultant' },
  // ── Design ICs ────────────────────────────────────────────────────────────
  { id: 'id000021-pe00-0000-0000-000000000000', personNumber: 'ID-021', givenName: 'Ingrid',    familyName: 'Larsen',  displayName: 'Ingrid Larsen',    primaryEmail: 'ingrid.larsen@apexdigital.demo',    grade: 'G11', employmentStatus: 'ACTIVE',   hiredAt: D(20,5,12), role: 'Lead UX Designer' },
  { id: 'id000022-pe00-0000-0000-000000000000', personNumber: 'ID-022', givenName: 'Jake',      familyName: 'Santos',  displayName: 'Jake Santos',      primaryEmail: 'jake.santos@apexdigital.demo',      grade: 'G10', employmentStatus: 'ACTIVE',   hiredAt: D(21,3,25), role: 'UX Designer' },
  { id: 'id000023-pe00-0000-0000-000000000000', personNumber: 'ID-023', givenName: 'Katya',     familyName: 'Volkov',  displayName: 'Katya Volkov',     primaryEmail: 'katya.volkov@apexdigital.demo',     grade: 'G9',  employmentStatus: 'ACTIVE',   hiredAt: D(22,9,19), role: 'Visual Designer' },
  { id: 'id000024-pe00-0000-0000-000000000000', personNumber: 'ID-024', givenName: 'Leo',       familyName: 'Huang',   displayName: 'Leo Huang',        primaryEmail: 'leo.huang@apexdigital.demo',        grade: 'G9',  employmentStatus: 'INACTIVE', hiredAt: D(22,11,1), role: 'Motion Designer' },  // ← 1 inactive
  // ── Data ICs ──────────────────────────────────────────────────────────────
  { id: 'id000025-pe00-0000-0000-000000000000', personNumber: 'ID-025', givenName: 'Maya',      familyName: 'Singh',   displayName: 'Maya Singh',       primaryEmail: 'maya.singh@apexdigital.demo',       grade: 'G11', employmentStatus: 'ACTIVE',   hiredAt: D(20,7,8),  role: 'Senior Data Scientist' },
  { id: 'id000026-pe00-0000-0000-000000000000', personNumber: 'ID-026', givenName: 'Omar',      familyName: 'Hassan',  displayName: 'Omar Hassan',      primaryEmail: 'omar.hassan@apexdigital.demo',      grade: 'G10', employmentStatus: 'ACTIVE',   hiredAt: D(21,6,14), role: 'Data Engineer' },
  { id: 'id000027-pe00-0000-0000-000000000000', personNumber: 'ID-027', givenName: 'Paula',     familyName: 'Costa',   displayName: 'Paula Costa',      primaryEmail: 'paula.costa@apexdigital.demo',      grade: 'G9',  employmentStatus: 'ACTIVE',   hiredAt: D(22,4,3),  role: 'Data Analyst' },
  // ── Operations ICs ────────────────────────────────────────────────────────
  { id: 'id000028-pe00-0000-0000-000000000000', personNumber: 'ID-028', givenName: 'Rafael',    familyName: 'Moreno',  displayName: 'Rafael Moreno',    primaryEmail: 'rafael.moreno@apexdigital.demo',    grade: 'G11', employmentStatus: 'ACTIVE',   hiredAt: D(20,8,17), role: 'Senior Project Manager' },
  { id: 'id000029-pe00-0000-0000-000000000000', personNumber: 'ID-029', givenName: 'Sara',      familyName: 'Russo',   displayName: 'Sara Russo',       primaryEmail: 'sara.russo@apexdigital.demo',       grade: 'G10', employmentStatus: 'ACTIVE',   hiredAt: D(21,10,5), role: 'Project Coordinator' },
  { id: 'id000030-pe00-0000-0000-000000000000', personNumber: 'ID-030', givenName: 'Tom',       familyName: 'Erikson', displayName: 'Tom Erikson',      primaryEmail: 'tom.erikson@apexdigital.demo',      grade: 'G9',  employmentStatus: 'ACTIVE',   hiredAt: D(23,1,23), role: 'Operations Analyst' },
];

// ─────────────────────────────────────────────────────────────────────────────
// POSITIONS (one per person, placed in their org unit)
// ─────────────────────────────────────────────────────────────────────────────
const positionOrgUnit: Record<string, string> = {
  'id000001-pe00-0000-0000-000000000000': 'id000001-ou00-0000-0000-000000000000', // CEO → root
  'id000002-pe00-0000-0000-000000000000': 'id000001-ou00-0000-0000-000000000000', // COO → root
  'id000003-pe00-0000-0000-000000000000': 'id000002-ou00-0000-0000-000000000000', // Dir Eng
  'id000004-pe00-0000-0000-000000000000': 'id000003-ou00-0000-0000-000000000000', // Dir Con
  'id000005-pe00-0000-0000-000000000000': 'id000004-ou00-0000-0000-000000000000', // Dir Des
  'id000006-pe00-0000-0000-000000000000': 'id000005-ou00-0000-0000-000000000000', // Dir Dat
  'id000007-pe00-0000-0000-000000000000': 'id000006-ou00-0000-0000-000000000000', // Dir Ops
  'id000008-pe00-0000-0000-000000000000': 'id000002-ou00-0000-0000-000000000000', // Eng Mgr
  'id000009-pe00-0000-0000-000000000000': 'id000003-ou00-0000-0000-000000000000', // Con Mgr
  'id000010-pe00-0000-0000-000000000000': 'id000004-ou00-0000-0000-000000000000', // Des Lead
  'id000011-pe00-0000-0000-000000000000': 'id000005-ou00-0000-0000-000000000000', // Dat Mgr
  'id000012-pe00-0000-0000-000000000000': 'id000006-ou00-0000-0000-000000000000', // Ops Mgr
  'id000013-pe00-0000-0000-000000000000': 'id000002-ou00-0000-0000-000000000000', // Eng IC
  'id000014-pe00-0000-0000-000000000000': 'id000002-ou00-0000-0000-000000000000',
  'id000015-pe00-0000-0000-000000000000': 'id000002-ou00-0000-0000-000000000000',
  'id000016-pe00-0000-0000-000000000000': 'id000002-ou00-0000-0000-000000000000',
  'id000017-pe00-0000-0000-000000000000': 'id000003-ou00-0000-0000-000000000000', // Con IC
  'id000018-pe00-0000-0000-000000000000': 'id000003-ou00-0000-0000-000000000000',
  'id000019-pe00-0000-0000-000000000000': 'id000003-ou00-0000-0000-000000000000',
  'id000020-pe00-0000-0000-000000000000': 'id000003-ou00-0000-0000-000000000000',
  'id000021-pe00-0000-0000-000000000000': 'id000004-ou00-0000-0000-000000000000', // Des IC
  'id000022-pe00-0000-0000-000000000000': 'id000004-ou00-0000-0000-000000000000',
  'id000023-pe00-0000-0000-000000000000': 'id000004-ou00-0000-0000-000000000000',
  'id000024-pe00-0000-0000-000000000000': 'id000004-ou00-0000-0000-000000000000', // inactive
  'id000025-pe00-0000-0000-000000000000': 'id000005-ou00-0000-0000-000000000000', // Dat IC
  'id000026-pe00-0000-0000-000000000000': 'id000005-ou00-0000-0000-000000000000',
  'id000027-pe00-0000-0000-000000000000': 'id000005-ou00-0000-0000-000000000000',
  'id000028-pe00-0000-0000-000000000000': 'id000006-ou00-0000-0000-000000000000', // Ops IC
  'id000029-pe00-0000-0000-000000000000': 'id000006-ou00-0000-0000-000000000000',
  'id000030-pe00-0000-0000-000000000000': 'id000006-ou00-0000-0000-000000000000',
};

export const idPositions = idPeople.map((p, i) => ({
  id: `id${String(i + 1).padStart(6, '0')}-pos0-0000-0000-000000000000`,
  code: `POS-${String(i + 1).padStart(3, '0')}`,
  title: p.role,
  orgUnitId: positionOrgUnit[p.id],
  occupantPersonId: p.id,
  isManagerial: i < 12, // CEO, COO, 5 directors, 5 managers
  validFrom: p.hiredAt,
}));

export const idPersonOrgMemberships = idPositions.map((pos, i) => ({
  id: `id${String(i + 1).padStart(6, '0')}-pom0-0000-0000-000000000000`,
  personId: pos.occupantPersonId,
  orgUnitId: pos.orgUnitId,
  positionId: pos.id,
  isPrimary: true,
  validFrom: pos.validFrom,
}));

// ─────────────────────────────────────────────────────────────────────────────
// REPORTING LINES (manager hierarchy)
// ─────────────────────────────────────────────────────────────────────────────
// CEO (1) and COO (2) have no manager (root nodes = 2 without manager)
// Directors report to CEO; Managers report to Directors; ICs report to Managers
export const idReportingLines = [
  // Directors → CEO
  { id: 'id000001-rl00-0000-0000-000000000000', subjectPersonId: 'id000003-pe00-0000-0000-000000000000', managerPersonId: 'id000001-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(17,5,20) },
  { id: 'id000002-rl00-0000-0000-000000000000', subjectPersonId: 'id000004-pe00-0000-0000-000000000000', managerPersonId: 'id000001-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(17,8,14) },
  { id: 'id000003-rl00-0000-0000-000000000000', subjectPersonId: 'id000005-pe00-0000-0000-000000000000', managerPersonId: 'id000001-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(18,2,1) },
  { id: 'id000004-rl00-0000-0000-000000000000', subjectPersonId: 'id000006-pe00-0000-0000-000000000000', managerPersonId: 'id000001-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(18,6,15) },
  { id: 'id000005-rl00-0000-0000-000000000000', subjectPersonId: 'id000007-pe00-0000-0000-000000000000', managerPersonId: 'id000002-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(19,1,7) },
  // Managers → Directors
  { id: 'id000006-rl00-0000-0000-000000000000', subjectPersonId: 'id000008-pe00-0000-0000-000000000000', managerPersonId: 'id000003-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(18,9,3) },
  { id: 'id000007-rl00-0000-0000-000000000000', subjectPersonId: 'id000009-pe00-0000-0000-000000000000', managerPersonId: 'id000004-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(19,4,22) },
  { id: 'id000008-rl00-0000-0000-000000000000', subjectPersonId: 'id000010-pe00-0000-0000-000000000000', managerPersonId: 'id000005-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(19,7,10) },
  { id: 'id000009-rl00-0000-0000-000000000000', subjectPersonId: 'id000011-pe00-0000-0000-000000000000', managerPersonId: 'id000006-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(19,9,1) },
  { id: 'id000010-rl00-0000-0000-000000000000', subjectPersonId: 'id000012-pe00-0000-0000-000000000000', managerPersonId: 'id000007-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(20,1,15) },
  // Engineering ICs → Eng Manager
  { id: 'id000011-rl00-0000-0000-000000000000', subjectPersonId: 'id000013-pe00-0000-0000-000000000000', managerPersonId: 'id000008-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(20,3,16) },
  { id: 'id000012-rl00-0000-0000-000000000000', subjectPersonId: 'id000014-pe00-0000-0000-000000000000', managerPersonId: 'id000008-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(20,6,1) },
  { id: 'id000013-rl00-0000-0000-000000000000', subjectPersonId: 'id000015-pe00-0000-0000-000000000000', managerPersonId: 'id000008-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(21,2,14) },
  { id: 'id000014-rl00-0000-0000-000000000000', subjectPersonId: 'id000016-pe00-0000-0000-000000000000', managerPersonId: 'id000008-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(22,8,22) },
  // Consulting ICs → Con Manager
  { id: 'id000015-rl00-0000-0000-000000000000', subjectPersonId: 'id000017-pe00-0000-0000-000000000000', managerPersonId: 'id000009-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(20,4,5) },
  { id: 'id000016-rl00-0000-0000-000000000000', subjectPersonId: 'id000018-pe00-0000-0000-000000000000', managerPersonId: 'id000009-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(21,1,18) },
  { id: 'id000017-rl00-0000-0000-000000000000', subjectPersonId: 'id000019-pe00-0000-0000-000000000000', managerPersonId: 'id000009-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(21,7,30) },
  { id: 'id000018-rl00-0000-0000-000000000000', subjectPersonId: 'id000020-pe00-0000-0000-000000000000', managerPersonId: 'id000009-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(23,2,6) },
  // Design ICs → Des Lead
  { id: 'id000019-rl00-0000-0000-000000000000', subjectPersonId: 'id000021-pe00-0000-0000-000000000000', managerPersonId: 'id000010-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(20,5,12) },
  { id: 'id000020-rl00-0000-0000-000000000000', subjectPersonId: 'id000022-pe00-0000-0000-000000000000', managerPersonId: 'id000010-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(21,3,25) },
  { id: 'id000021-rl00-0000-0000-000000000000', subjectPersonId: 'id000023-pe00-0000-0000-000000000000', managerPersonId: 'id000010-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(22,9,19) },
  { id: 'id000022-rl00-0000-0000-000000000000', subjectPersonId: 'id000024-pe00-0000-0000-000000000000', managerPersonId: 'id000010-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(22,11,1) },
  // Data ICs → Dat Manager
  { id: 'id000023-rl00-0000-0000-000000000000', subjectPersonId: 'id000025-pe00-0000-0000-000000000000', managerPersonId: 'id000011-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(20,7,8) },
  { id: 'id000024-rl00-0000-0000-000000000000', subjectPersonId: 'id000026-pe00-0000-0000-000000000000', managerPersonId: 'id000011-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(21,6,14) },
  { id: 'id000025-rl00-0000-0000-000000000000', subjectPersonId: 'id000027-pe00-0000-0000-000000000000', managerPersonId: 'id000011-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(22,4,3) },
  // Operations ICs → Ops Manager
  { id: 'id000026-rl00-0000-0000-000000000000', subjectPersonId: 'id000028-pe00-0000-0000-000000000000', managerPersonId: 'id000012-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(20,8,17) },
  { id: 'id000027-rl00-0000-0000-000000000000', subjectPersonId: 'id000029-pe00-0000-0000-000000000000', managerPersonId: 'id000012-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(21,10,5) },
  { id: 'id000028-rl00-0000-0000-000000000000', subjectPersonId: 'id000030-pe00-0000-0000-000000000000', managerPersonId: 'id000012-pe00-0000-0000-000000000000', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: D(23,1,23) },
];

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE POOL MEMBERSHIPS
// ─────────────────────────────────────────────────────────────────────────────
const poolMap: Record<string, string> = {
  'id000013-pe00-0000-0000-000000000000': 'id000001-rp00-0000-0000-000000000000',
  'id000014-pe00-0000-0000-000000000000': 'id000001-rp00-0000-0000-000000000000',
  'id000015-pe00-0000-0000-000000000000': 'id000001-rp00-0000-0000-000000000000',
  'id000016-pe00-0000-0000-000000000000': 'id000001-rp00-0000-0000-000000000000',
  'id000008-pe00-0000-0000-000000000000': 'id000001-rp00-0000-0000-000000000000',
  'id000017-pe00-0000-0000-000000000000': 'id000002-rp00-0000-0000-000000000000',
  'id000018-pe00-0000-0000-000000000000': 'id000002-rp00-0000-0000-000000000000',
  'id000019-pe00-0000-0000-000000000000': 'id000002-rp00-0000-0000-000000000000',
  'id000020-pe00-0000-0000-000000000000': 'id000002-rp00-0000-0000-000000000000',
  'id000021-pe00-0000-0000-000000000000': 'id000003-rp00-0000-0000-000000000000',
  'id000022-pe00-0000-0000-000000000000': 'id000003-rp00-0000-0000-000000000000',
  'id000023-pe00-0000-0000-000000000000': 'id000003-rp00-0000-0000-000000000000',
  'id000025-pe00-0000-0000-000000000000': 'id000004-rp00-0000-0000-000000000000',
  'id000026-pe00-0000-0000-000000000000': 'id000004-rp00-0000-0000-000000000000',
  'id000027-pe00-0000-0000-000000000000': 'id000004-rp00-0000-0000-000000000000',
  'id000028-pe00-0000-0000-000000000000': 'id000005-rp00-0000-0000-000000000000',
  'id000029-pe00-0000-0000-000000000000': 'id000005-rp00-0000-0000-000000000000',
  'id000030-pe00-0000-0000-000000000000': 'id000005-rp00-0000-0000-000000000000',
};

export const idResourcePoolMemberships = Object.entries(poolMap).map(([personId, resourcePoolId], i) => ({
  id: `id${String(i + 1).padStart(6, '0')}-rpm0-0000-0000-000000000000`,
  personId,
  resourcePoolId,
  validFrom: new Date('2024-01-01T00:00:00Z'),
}));

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS (10: 7 active, 2 nearing closure, 1 draft)
// ─────────────────────────────────────────────────────────────────────────000
const NEAR = new Date('2026-04-20T00:00:00Z'); // nearing closure = 13 days from demo date

export const idProjects = [
  // 7 ACTIVE
  { id: 'id000001-pr00-0000-0000-000000000000', projectCode: 'PRJ-A01', name: 'Apex CRM Transformation',    status: 'ACTIVE',  managerId: 'id000028-pe00-0000-0000-000000000000', plannedStartDate: D(24,1,15), plannedEndDate: D(26,9,30),  budget: 1_200_000 },
  { id: 'id000002-pr00-0000-0000-000000000000', projectCode: 'PRJ-A02', name: 'Cloud Infrastructure Lift',  status: 'ACTIVE',  managerId: 'id000028-pe00-0000-0000-000000000000', plannedStartDate: D(24,3,1),  plannedEndDate: D(26,8,31),  budget: 850_000  },
  { id: 'id000003-pr00-0000-0000-000000000000', projectCode: 'PRJ-A03', name: 'Data Lake Modernisation',   status: 'ACTIVE',  managerId: 'id000028-pe00-0000-0000-000000000000', plannedStartDate: D(24,6,1),  plannedEndDate: D(26,12,31), budget: null     },
  { id: 'id000004-pr00-0000-0000-000000000000', projectCode: 'PRJ-A04', name: 'UX Design System v2',       status: 'ACTIVE',  managerId: 'id000029-pe00-0000-0000-000000000000', plannedStartDate: D(25,1,1),  plannedEndDate: D(26,7,31),  budget: 320_000  },
  { id: 'id000005-pr00-0000-0000-000000000000', projectCode: 'PRJ-A05', name: 'Regulatory Compliance ERP', status: 'ACTIVE',  managerId: 'id000029-pe00-0000-0000-000000000000', plannedStartDate: D(24,9,1),  plannedEndDate: D(26,11,30), budget: null     },
  { id: 'id000006-pr00-0000-0000-000000000000', projectCode: 'PRJ-A06', name: 'AI Insights Platform',      status: 'ACTIVE',  managerId: 'id000029-pe00-0000-0000-000000000000', plannedStartDate: D(25,3,15), plannedEndDate: D(27,2,28),  budget: null     },
  { id: 'id000007-pr00-0000-0000-000000000000', projectCode: 'PRJ-A07', name: 'Mobile Customer Portal',    status: 'ACTIVE',  managerId: 'id000028-pe00-0000-0000-000000000000', plannedStartDate: D(25,6,1),  plannedEndDate: D(26,10,31), budget: null     },
  // 2 NEARING CLOSURE (within 14 days)
  { id: 'id000008-pr00-0000-0000-000000000000', projectCode: 'PRJ-A08', name: 'Legacy Migration Phase 1',  status: 'ACTIVE',  managerId: 'id000028-pe00-0000-0000-000000000000', plannedStartDate: D(23,6,1),  plannedEndDate: NEAR,        budget: null     },
  { id: 'id000009-pr00-0000-0000-000000000000', projectCode: 'PRJ-A09', name: 'Security Audit & Hardening',status: 'ACTIVE',  managerId: 'id000029-pe00-0000-0000-000000000000', plannedStartDate: D(25,10,1), plannedEndDate: NEAR,        budget: null     },
  // 1 DRAFT
  { id: 'id000010-pr00-0000-0000-000000000000', projectCode: 'PRJ-A10', name: 'GenAI Productivity Suite',  status: 'DRAFT',   managerId: 'id000029-pe00-0000-0000-000000000000', plannedStartDate: D(26,7,1),  plannedEndDate: D(27,6,30),  budget: null     },
];

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS (40+)
// Allocation targets:
//   2 people overallocated (>100%): Aisha Patel [id013] at 120%, Darius Ford [id016] at 110%
//   20 people at 70-100%: most seniors
//   8 people at <50%: juniors / bench
// ─────────────────────────────────────────────────────────────────────────────
const START = new Date('2025-01-01T00:00:00Z');
const FAR   = new Date('2027-12-31T00:00:00Z');

// Helper to create an assignment record
let _asnIdx = 0;
function asn(personId: string, projectId: string, alloc: number, status: 'ACTIVE' | 'APPROVED' = 'ACTIVE'): Record<string, unknown> {
  _asnIdx++;
  return {
    id: `id${String(_asnIdx).padStart(6, '0')}-as00-0000-0000-000000000000`,
    personId,
    projectId,
    role: 'Contributor',
    allocationPercent: alloc,
    startDate: START,
    endDate: FAR,
    status,
    requestedAt: new Date('2025-01-01T08:00:00Z'),
    requestedById: 'id000001-pe00-0000-0000-000000000000',
  };
}

const P = (n: number) => `id${String(n).padStart(6, '0')}-pe00-0000-0000-000000000000`;
const PR = (n: number) => `id${String(n).padStart(6, '0')}-pr00-0000-0000-000000000000`;

export const idAssignments: Record<string, unknown>[] = [
  // Overallocated: Aisha Patel (id013) = 120% total
  asn(P(13), PR(1), 80), // 80% on CRM
  asn(P(13), PR(2), 40), // +40% on Cloud → 120% total OVERALLOCATED

  // Overallocated: Darius Ford (id016) = 110% total
  asn(P(16), PR(4), 70), // 70% on UX
  asn(P(16), PR(7), 40), // +40% on Mobile → 110% total OVERALLOCATED

  // Senior engineers (70-100%)
  asn(P(14), PR(1), 80),
  asn(P(15), PR(2), 90),
  asn(P(8),  PR(3), 100), // Eng manager fully on Data Lake

  // Senior consultants (70-100%)
  asn(P(17), PR(5), 80),
  asn(P(18), PR(5), 90),
  asn(P(9),  PR(1), 70), // Con manager on CRM

  // Designers (70-100%)
  asn(P(21), PR(4), 100),
  asn(P(22), PR(4), 80),
  asn(P(10), PR(4), 70), // Des lead

  // Data team (70-100%)
  asn(P(25), PR(3), 90),
  asn(P(26), PR(3), 80),
  asn(P(11), PR(6), 100), // Dat manager on AI platform

  // Operations (70-100%)
  asn(P(28), PR(8), 80),
  asn(P(29), PR(9), 90),
  asn(P(12), PR(1), 70), // Ops manager on CRM

  // Mixed allocation
  asn(P(3),  PR(1), 50), // Dir Eng on CRM
  asn(P(4),  PR(5), 50), // Dir Con on ERP
  asn(P(5),  PR(4), 50), // Dir Des on UX

  // Bench/low allocation (<50%)
  asn(P(19), PR(7), 30), // Grace Kim
  asn(P(20), PR(8), 20), // Hamid Rashidi (junior)
  asn(P(23), PR(9), 40), // Katya Volkov
  asn(P(27), PR(6), 30), // Paula Costa
  asn(P(30), PR(8), 20), // Tom Erikson

  // Nearing closure projects
  asn(P(14), PR(8), 20), // Ben Wright part-time on legacy
  asn(P(18), PR(9), 10), // Felix Müller part-time on security

  // Additional assignments for project coverage
  asn(P(6),  PR(3), 40), // Dir Data on Data Lake
  asn(P(7),  PR(8), 40), // Dir Ops on Legacy
  asn(P(15), PR(7), 10), // Carmen Lopez minimal on Mobile
  asn(P(17), PR(6), 20), // Elena on AI platform
  asn(P(25), PR(6), 10), // Maya on AI platform
  asn(P(26), PR(7), 20), // Omar on Mobile
  asn(P(28), PR(9), 20), // Rafael on Security audit
  asn(P(29), PR(7), 10), // Sara on Mobile
];

// All assignment approvals
export const idAssignmentApprovals = idAssignments.map((a, i) => ({
  id: `id${String(i + 1).padStart(6, '0')}-aa00-0000-0000-000000000000`,
  assignmentId: a.id,
  approverId: 'id000001-pe00-0000-0000-000000000000',
  approvedAt: new Date('2025-01-05T09:00:00Z'),
  notes: null,
}));

export const idAssignmentHistory: unknown[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// WORK EVIDENCE (2+ per person, total ≥ 60 records)
// ─────────────────────────────────────────────────────────────────────────────
let _evIdx = 0;
function ev(personId: string, projectId: string, date: string, hours: number, summary: string): Record<string, unknown> {
  _evIdx++;
  return {
    id: `id${String(_evIdx).padStart(6, '0')}-we00-0000-0000-000000000000`,
    personId,
    projectId,
    activityDate: new Date(`${date}T00:00:00Z`),
    effortHours: hours,
    sourceType: 'MANUAL',
    sourceRecordKey: `manual-${_evIdx}`,
    summary,
    recordedAt: new Date(`${date}T16:00:00Z`),
  };
}

export const idWorkEvidence: Record<string, unknown>[] = [
  ev(P(13), PR(1), '2026-03-01', 8, 'CRM API integration sprint — completed user auth module'),
  ev(P(13), PR(2), '2026-03-15', 6, 'Cloud infra — deployed monitoring stack to staging'),
  ev(P(14), PR(1), '2026-03-02', 7, 'CRM front-end build — dashboard widgets'),
  ev(P(14), PR(8), '2026-03-20', 4, 'Legacy migration — data validation scripts'),
  ev(P(15), PR(2), '2026-03-10', 8, 'Cloud infra — CI/CD pipeline setup'),
  ev(P(15), PR(7), '2026-03-22', 3, 'Mobile portal — backend API review'),
  ev(P(16), PR(4), '2026-03-05', 7, 'Design system — token library implementation'),
  ev(P(16), PR(7), '2026-03-18', 6, 'Mobile portal — responsive layout components'),
  ev(P(17), PR(5), '2026-03-08', 8, 'ERP compliance — gap analysis workshop'),
  ev(P(17), PR(6), '2026-03-25', 4, 'AI platform — stakeholder requirements'),
  ev(P(18), PR(5), '2026-03-12', 7, 'ERP compliance — vendor evaluation report'),
  ev(P(18), PR(9), '2026-03-28', 3, 'Security audit — pen test review'),
  ev(P(19), PR(7), '2026-03-14', 5, 'Mobile portal — user research synthesis'),
  ev(P(19), PR(7), '2026-03-27', 4, 'Mobile portal — usability testing'),
  ev(P(20), PR(8), '2026-03-16', 4, 'Legacy migration — stakeholder comms'),
  ev(P(20), PR(8), '2026-03-29', 3, 'Legacy migration — go-live checklist review'),
  ev(P(21), PR(4), '2026-03-03', 8, 'Design system — component audit'),
  ev(P(21), PR(4), '2026-03-24', 7, 'Design system — Figma token sync'),
  ev(P(22), PR(4), '2026-03-06', 6, 'Design system — accessibility review'),
  ev(P(22), PR(4), '2026-03-21', 5, 'Design system — icon library'),
  ev(P(23), PR(9), '2026-03-11', 5, 'Security audit — threat model documentation'),
  ev(P(23), PR(9), '2026-03-26', 4, 'Security audit — findings remediation tracker'),
  ev(P(25), PR(3), '2026-03-04', 8, 'Data lake — schema design'),
  ev(P(25), PR(6), '2026-03-19', 6, 'AI platform — ML pipeline prototype'),
  ev(P(26), PR(3), '2026-03-09', 7, 'Data lake — ETL pipeline implementation'),
  ev(P(26), PR(7), '2026-03-23', 4, 'Mobile portal — analytics integration'),
  ev(P(27), PR(6), '2026-03-13', 5, 'AI platform — data exploration report'),
  ev(P(27), PR(6), '2026-03-30', 4, 'AI platform — model evaluation'),
  ev(P(28), PR(8), '2026-03-07', 7, 'Legacy migration — kickoff and scoping'),
  ev(P(28), PR(9), '2026-03-20', 6, 'Security audit — scope definition'),
  ev(P(29), PR(9), '2026-03-17', 6, 'Security audit — vendor coordination'),
  ev(P(29), PR(7), '2026-03-28', 4, 'Mobile portal — project tracking update'),
  ev(P(30), PR(8), '2026-03-15', 4, 'Legacy migration — resource scheduling'),
  ev(P(30), PR(8), '2026-03-31', 3, 'Legacy migration — lessons learned draft'),
  // Directors / managers
  ev(P(3),  PR(1), '2026-03-10', 4, 'CRM — architecture review'),
  ev(P(4),  PR(5), '2026-03-17', 3, 'ERP — steering committee'),
  ev(P(5),  PR(4), '2026-03-24', 3, 'Design system — exec walk-through'),
  ev(P(6),  PR(3), '2026-03-08', 4, 'Data lake — strategy alignment'),
  ev(P(7),  PR(8), '2026-03-22', 4, 'Legacy — go-live planning'),
  ev(P(8),  PR(3), '2026-03-12', 5, 'Data lake — sprint planning'),
  ev(P(9),  PR(1), '2026-03-19', 4, 'CRM — consulting handover'),
  ev(P(10), PR(4), '2026-03-26', 3, 'Design system — design critique'),
  ev(P(11), PR(6), '2026-03-14', 5, 'AI platform — data governance'),
  ev(P(12), PR(1), '2026-03-21', 3, 'CRM — ops readiness'),
];

export const idWorkEvidenceSources: unknown[] = [];
export const idWorkEvidenceLinks: unknown[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// STAFFING REQUESTS (varied states)
// ─────────────────────────────────────────────────────────────────────────────
export const idStaffingRequests = [
  { id: 'id000001-sr00-0000-0000-000000000000', projectId: PR(1), role: 'Senior Backend Engineer', status: 'OPEN',      priority: 'HIGH',   startDate: '2026-05-01', headcountRequired: 1, headcountFulfilled: 0, requestedById: P(28), createdAt: new Date('2026-03-15T10:00:00Z'), updatedAt: new Date('2026-03-15T10:00:00Z'), notes: 'Need Kubernetes expertise for scaling' },
  { id: 'id000002-sr00-0000-0000-000000000000', projectId: PR(2), role: 'DevOps Engineer',         status: 'IN_REVIEW', priority: 'MEDIUM', startDate: '2026-06-01', headcountRequired: 1, headcountFulfilled: 0, requestedById: P(28), createdAt: new Date('2026-03-10T11:00:00Z'), updatedAt: new Date('2026-03-20T14:00:00Z'), notes: 'Cloud automation specialist needed' },
  { id: 'id000003-sr00-0000-0000-000000000000', projectId: PR(6), role: 'ML Engineer',             status: 'OPEN',      priority: 'HIGH',   startDate: '2026-05-15', headcountRequired: 2, headcountFulfilled: 0, requestedById: P(29), createdAt: new Date('2026-03-20T09:00:00Z'), updatedAt: new Date('2026-03-20T09:00:00Z'), notes: 'Python/PyTorch skills essential' },
  { id: 'id000004-sr00-0000-0000-000000000000', projectId: PR(5), role: 'ERP Consultant',          status: 'FULFILLED', priority: 'LOW',    startDate: '2026-02-01', headcountRequired: 1, headcountFulfilled: 1, requestedById: P(29), createdAt: new Date('2026-01-15T10:00:00Z'), updatedAt: new Date('2026-02-01T09:00:00Z'), notes: null },
  { id: 'id000005-sr00-0000-0000-000000000000', projectId: PR(3), role: 'Data Architect',          status: 'DRAFT',     priority: 'MEDIUM', startDate: '2026-07-01', headcountRequired: 1, headcountFulfilled: 0, requestedById: P(28), createdAt: new Date('2026-03-25T14:00:00Z'), updatedAt: new Date('2026-03-25T14:00:00Z'), notes: 'Lakehouse architecture experience' },
];

export const idStaffingRequestFulfilments = [
  { id: 'id000001-srf0-0000-0000-000000000000', requestId: 'id000004-sr00-0000-0000-000000000000', personId: P(17), assignmentId: null, fulfilledAt: new Date('2026-02-01T09:00:00Z'), notes: 'Elena Novak assigned' },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL SYNC STATES (empty for investor demo)
// ─────────────────────────────────────────────────────────────────────────────
export const idExternalSyncStates: unknown[] = [];
export const idProjectExternalLinks: unknown[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
export const idDatasetSummary = {
  people: idPeople.length,                    // 30
  activeProjects: idProjects.filter(p => p.status === 'ACTIVE').length, // 9
  draftProjects: idProjects.filter(p => p.status === 'DRAFT').length,   // 1
  assignments: idAssignments.length,          // 40+
  workEvidence: idWorkEvidence.length,        // 43
  staffingRequests: idStaffingRequests.length, // 5
};
