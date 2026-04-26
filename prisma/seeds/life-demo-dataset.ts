/**
 * Life Demo Dataset — "Apex Digital Consulting: Q1 2026 Quarter-End Crunch"
 *
 * A 20-person digital consulting firm in a realistic, story-driven state:
 *   - NovaBridge Platform (flagship): understaffed, week-4 evidence gap
 *   - Two overallocated employees: Ethan Brooks (120%), Jordan Kim (130%)
 *   - At-risk employee: Jordan Kim — high workload, open HR concern
 *   - CloudFlex Migration: just kicked off, staffing still being confirmed
 *   - Q1 quarter-end: CAPEX/OPEX tracking for audit trail
 *
 * Reference date: 2026-04-06
 *
 * ID prefix conventions (life-demo namespace: 55/66/77/88/99 prefix ranges):
 *   People           : given in spec (11111111-... and 22222222-... ranges)
 *   OrgUnits         : 55000000-0000-0000-0000-xxxxxxxxxxxx
 *   Positions        : 55100000-0000-0000-0000-xxxxxxxxxxxx
 *   PersonOrgMembers : 55200000-0000-0000-0000-xxxxxxxxxxxx
 *   ReportingLines   : 55300000-0000-0000-0000-xxxxxxxxxxxx
 *   ResourcePools    : 55400000-0000-0000-0000-xxxxxxxxxxxx
 *   PoolMemberships  : 55500000-0000-0000-0000-xxxxxxxxxxxx
 *   Projects         : 66000000-0000-0000-0000-xxxxxxxxxxxx
 *   ExtLinks         : 66100000-0000-0000-0000-xxxxxxxxxxxx
 *   SyncStates       : 66200000-0000-0000-0000-xxxxxxxxxxxx
 *   Assignments      : 77000000-0000-0000-0000-xxxxxxxxxxxx
 *   AsgmtApprovals   : 77100000-0000-0000-0000-xxxxxxxxxxxx
 *   AsgmtHistory     : 77200000-0000-0000-0000-xxxxxxxxxxxx
 *   EvidenceSources  : 88000000-0000-0000-0000-xxxxxxxxxxxx
 *   WorkEvidence     : 88100000-0000-0000-0000-xxxxxxxxxxxx
 *   EvidenceLinks    : 88200000-0000-0000-0000-xxxxxxxxxxxx
 */

// ─────────────────────────────────────────────────────────────────────────────
// PEOPLE (20 total)
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoPeople = [
  // ── Key personas (fixed IDs from spec) ────────────────────────────────────
  {
    id: '11111111-1111-1111-1111-111111111002',
    personNumber: 'LD-001',
    givenName: 'Noah',
    familyName: 'Bennett',
    displayName: 'Noah Bennett',
    primaryEmail: 'noah.bennett@apexdigital.demo',
    grade: 'G15',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2019-03-01T00:00:00Z'),
    role: 'Managing Director',
  },
  {
    id: '11111111-1111-1111-2222-000000000001',
    personNumber: 'LD-002',
    givenName: 'Diana',
    familyName: 'Walsh',
    displayName: 'Diana Walsh',
    primaryEmail: 'diana.walsh@apexdigital.demo',
    grade: 'G13',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2020-06-15T00:00:00Z'),
    role: 'HR Manager',
  },
  {
    id: '11111111-1111-1111-1111-111111111006',
    personNumber: 'LD-003',
    givenName: 'Sophia',
    familyName: 'Kim',
    displayName: 'Sophia Kim',
    primaryEmail: 'sophia.kim@apexdigital.demo',
    grade: 'G13',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2020-09-01T00:00:00Z'),
    role: 'Engineering Manager',
  },
  {
    id: '11111111-1111-1111-1111-111111111010',
    personNumber: 'LD-004',
    givenName: 'Lucas',
    familyName: 'Reed',
    displayName: 'Lucas Reed',
    primaryEmail: 'lucas.reed@apexdigital.demo',
    grade: 'G12',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2021-01-10T00:00:00Z'),
    role: 'Senior Project Manager',
  },
  {
    id: '11111111-1111-1111-2222-000000000003',
    personNumber: 'LD-005',
    givenName: 'Carlos',
    familyName: 'Vega',
    displayName: 'Carlos Vega',
    primaryEmail: 'carlos.vega@apexdigital.demo',
    grade: 'G13',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2020-04-01T00:00:00Z'),
    role: 'Delivery Manager',
  },
  {
    id: '11111111-1111-1111-1111-111111111008',
    personNumber: 'LD-006',
    givenName: 'Ethan',
    familyName: 'Brooks',
    displayName: 'Ethan Brooks',
    primaryEmail: 'ethan.brooks@apexdigital.demo',
    grade: 'G10',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2022-03-07T00:00:00Z'),
    role: 'Senior Software Engineer',
  },
  {
    id: '11111111-1111-1111-1111-111111111005',
    personNumber: 'LD-007',
    givenName: 'Emma',
    familyName: 'Garcia',
    displayName: 'Emma Garcia',
    primaryEmail: 'emma.garcia@apexdigital.demo',
    grade: 'G13',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2020-11-01T00:00:00Z'),
    role: 'PMO & Compliance Manager',
  },
  // ── Additional 13 ─────────────────────────────────────────────────────────
  {
    id: '22222222-0000-0000-0000-000000000001',
    personNumber: 'LD-008',
    givenName: 'Jordan',
    familyName: 'Kim',
    displayName: 'Jordan Kim',
    primaryEmail: 'jordan.kim@apexdigital.demo',
    grade: 'G9',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2023-02-13T00:00:00Z'),
    role: 'Full-Stack Engineer',
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    personNumber: 'LD-009',
    givenName: 'Alex',
    familyName: 'Torres',
    displayName: 'Alex Torres',
    primaryEmail: 'alex.torres@apexdigital.demo',
    grade: 'G10',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2021-07-19T00:00:00Z'),
    role: 'Senior Engineer',
  },
  {
    id: '22222222-0000-0000-0000-000000000003',
    personNumber: 'LD-010',
    givenName: 'Priya',
    familyName: 'Sharma',
    displayName: 'Priya Sharma',
    primaryEmail: 'priya.sharma@apexdigital.demo',
    grade: 'G9',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2022-08-22T00:00:00Z'),
    role: 'Data Analyst',
  },
  {
    id: '22222222-0000-0000-0000-000000000004',
    personNumber: 'LD-011',
    givenName: 'Marcus',
    familyName: 'Webb',
    displayName: 'Marcus Webb',
    primaryEmail: 'marcus.webb@apexdigital.demo',
    grade: 'G9',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2022-05-02T00:00:00Z'),
    role: 'Backend Engineer',
  },
  {
    id: '22222222-0000-0000-0000-000000000005',
    personNumber: 'LD-012',
    givenName: 'Zara',
    familyName: 'Ahmed',
    displayName: 'Zara Ahmed',
    primaryEmail: 'zara.ahmed@apexdigital.demo',
    grade: 'G9',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2022-10-17T00:00:00Z'),
    role: 'UX Designer',
  },
  {
    id: '22222222-0000-0000-0000-000000000006',
    personNumber: 'LD-013',
    givenName: 'Ryan',
    familyName: 'Chen',
    displayName: 'Ryan Chen',
    primaryEmail: 'ryan.chen@apexdigital.demo',
    grade: 'G9',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2021-11-08T00:00:00Z'),
    role: 'DevOps Engineer',
  },
  {
    id: '22222222-0000-0000-0000-000000000007',
    personNumber: 'LD-014',
    givenName: 'Maya',
    familyName: 'Patel',
    displayName: 'Maya Patel',
    primaryEmail: 'maya.patel@apexdigital.demo',
    grade: 'G8',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2024-01-15T00:00:00Z'),
    role: 'Business Analyst',
  },
  {
    id: '22222222-0000-0000-0000-000000000008',
    personNumber: 'LD-015',
    givenName: 'Tom',
    familyName: 'Fischer',
    displayName: 'Tom Fischer',
    primaryEmail: 'tom.fischer@apexdigital.demo',
    grade: 'G11',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2020-02-03T00:00:00Z'),
    role: 'Principal Architect',
  },
  {
    id: '22222222-0000-0000-0000-000000000009',
    personNumber: 'LD-016',
    givenName: 'Lena',
    familyName: 'Murphy',
    displayName: 'Lena Murphy',
    primaryEmail: 'lena.murphy@apexdigital.demo',
    grade: 'G8',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2023-09-04T00:00:00Z'),
    role: 'QA Engineer',
  },
  {
    id: '22222222-0000-0000-0000-000000000010',
    personNumber: 'LD-017',
    givenName: "Sam",
    familyName: "O'Brien",
    displayName: "Sam O'Brien",
    primaryEmail: 'sam.obrien@apexdigital.demo',
    grade: 'G8',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2024-03-11T00:00:00Z'),
    role: 'PM Assistant',
  },
  {
    id: '22222222-0000-0000-0000-000000000011',
    personNumber: 'LD-018',
    givenName: 'Kai',
    familyName: 'Nakamura',
    displayName: 'Kai Nakamura',
    primaryEmail: 'kai.nakamura@apexdigital.demo',
    grade: 'G9',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2022-06-27T00:00:00Z'),
    role: 'Data Engineer',
  },
  {
    id: '22222222-0000-0000-0000-000000000012',
    personNumber: 'LD-019',
    givenName: 'Isabel',
    familyName: 'Reyes',
    displayName: 'Isabel Reyes',
    primaryEmail: 'isabel.reyes@apexdigital.demo',
    grade: 'G8',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2023-07-10T00:00:00Z'),
    role: 'Frontend Developer',
  },
  {
    id: '22222222-0000-0000-0000-000000000013',
    personNumber: 'LD-020',
    givenName: 'Dev',
    familyName: 'Patel',
    displayName: 'Dev Patel',
    primaryEmail: 'dev.patel@apexdigital.demo',
    grade: 'G8',
    employmentStatus: 'ACTIVE',
    hiredAt: new Date('2023-11-20T00:00:00Z'),
    role: 'Mobile Developer',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ORG UNITS (root → departments → guilds/teams)
// Note: seed.ts strips the `kind` field before inserting via:
//   dataset.orgUnits.map(({ kind: _kind, ...orgUnit }) => orgUnit)
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoOrgUnits = [
  {
    id: '55000000-0000-0000-0000-000000000001',
    code: 'APEX-ROOT',
    name: 'Apex Digital Consulting',
    description: 'Root organisation — Apex Digital Consulting.',
    kind: 'COMPANY',
    parentOrgUnitId: null,
    managerPersonId: '11111111-1111-1111-1111-111111111002', // Noah Bennett
    validFrom: new Date('2018-01-01T00:00:00Z'),
  },
  // ── Departments ────────────────────────────────────────────────────────────
  {
    id: '55000000-0000-0000-0000-000000000002',
    code: 'APEX-ENG',
    name: 'Engineering',
    description: 'Software engineering, DevOps and QA.',
    kind: 'DEPARTMENT',
    parentOrgUnitId: '55000000-0000-0000-0000-000000000001',
    managerPersonId: '11111111-1111-1111-1111-111111111006', // Sophia Kim
    validFrom: new Date('2018-01-01T00:00:00Z'),
  },
  {
    id: '55000000-0000-0000-0000-000000000003',
    code: 'APEX-DATA',
    name: 'Data & Analytics',
    description: 'Data engineering, analytics and BI.',
    kind: 'DEPARTMENT',
    parentOrgUnitId: '55000000-0000-0000-0000-000000000001',
    managerPersonId: '11111111-1111-1111-1111-111111111005', // Emma Garcia
    validFrom: new Date('2018-01-01T00:00:00Z'),
  },
  {
    id: '55000000-0000-0000-0000-000000000004',
    code: 'APEX-DES',
    name: 'Design',
    description: 'UX/UI design and product design.',
    kind: 'DEPARTMENT',
    parentOrgUnitId: '55000000-0000-0000-0000-000000000001',
    managerPersonId: '11111111-1111-1111-2222-000000000003', // Carlos Vega
    validFrom: new Date('2018-01-01T00:00:00Z'),
  },
  {
    id: '55000000-0000-0000-0000-000000000005',
    code: 'APEX-DEL',
    name: 'Delivery',
    description: 'Project delivery and PMO.',
    kind: 'DEPARTMENT',
    parentOrgUnitId: '55000000-0000-0000-0000-000000000001',
    managerPersonId: '11111111-1111-1111-2222-000000000003', // Carlos Vega
    validFrom: new Date('2018-01-01T00:00:00Z'),
  },
  // ── Engineering guilds ─────────────────────────────────────────────────────
  {
    id: '55000000-0000-0000-0000-000000000006',
    code: 'APEX-BACK',
    name: 'Backend Guild',
    description: 'Backend engineering practice.',
    kind: 'TEAM',
    parentOrgUnitId: '55000000-0000-0000-0000-000000000002',
    managerPersonId: '22222222-0000-0000-0000-000000000004', // Marcus Webb (lead)
    validFrom: new Date('2021-01-01T00:00:00Z'),
  },
  {
    id: '55000000-0000-0000-0000-000000000007',
    code: 'APEX-FRONT',
    name: 'Frontend Guild',
    description: 'Frontend engineering practice.',
    kind: 'TEAM',
    parentOrgUnitId: '55000000-0000-0000-0000-000000000002',
    managerPersonId: '22222222-0000-0000-0000-000000000012', // Isabel Reyes (lead)
    validFrom: new Date('2021-01-01T00:00:00Z'),
  },
  {
    id: '55000000-0000-0000-0000-000000000008',
    code: 'APEX-DEVOPS',
    name: 'DevOps Guild',
    description: 'Infrastructure and DevOps practice.',
    kind: 'TEAM',
    parentOrgUnitId: '55000000-0000-0000-0000-000000000002',
    managerPersonId: '22222222-0000-0000-0000-000000000006', // Ryan Chen (lead)
    validFrom: new Date('2021-01-01T00:00:00Z'),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoPositions = [
  // Root
  { id: '55100000-0000-0000-0000-000000000001', code: 'MD-001',    title: 'Managing Director',        orgUnitId: '55000000-0000-0000-0000-000000000001', occupantPersonId: '11111111-1111-1111-1111-111111111002', isManagerial: true,  validFrom: new Date('2018-01-01T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000002', code: 'HR-001',    title: 'HR Manager',               orgUnitId: '55000000-0000-0000-0000-000000000001', occupantPersonId: '11111111-1111-1111-2222-000000000001', isManagerial: true,  validFrom: new Date('2020-06-15T00:00:00Z') },
  // Engineering
  { id: '55100000-0000-0000-0000-000000000003', code: 'ENG-MGR',   title: 'Engineering Manager',      orgUnitId: '55000000-0000-0000-0000-000000000002', occupantPersonId: '11111111-1111-1111-1111-111111111006', isManagerial: true,  validFrom: new Date('2020-09-01T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000004', code: 'ENG-SR1',   title: 'Senior Software Engineer', orgUnitId: '55000000-0000-0000-0000-000000000002', occupantPersonId: '11111111-1111-1111-1111-111111111008', isManagerial: false, validFrom: new Date('2022-03-07T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000005', code: 'ENG-SR2',   title: 'Senior Engineer',          orgUnitId: '55000000-0000-0000-0000-000000000002', occupantPersonId: '22222222-0000-0000-0000-000000000002', isManagerial: false, validFrom: new Date('2021-07-19T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000006', code: 'ENG-BE1',   title: 'Backend Engineer',         orgUnitId: '55000000-0000-0000-0000-000000000006', occupantPersonId: '22222222-0000-0000-0000-000000000004', isManagerial: false, validFrom: new Date('2022-05-02T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000007', code: 'ENG-QA1',   title: 'QA Engineer',              orgUnitId: '55000000-0000-0000-0000-000000000002', occupantPersonId: '22222222-0000-0000-0000-000000000009', isManagerial: false, validFrom: new Date('2023-09-04T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000008', code: 'ENG-FS1',   title: 'Full-Stack Engineer',      orgUnitId: '55000000-0000-0000-0000-000000000002', occupantPersonId: '22222222-0000-0000-0000-000000000001', isManagerial: false, validFrom: new Date('2023-02-13T00:00:00Z') },
  // Frontend Guild
  { id: '55100000-0000-0000-0000-000000000009', code: 'FE-001',    title: 'Frontend Developer',       orgUnitId: '55000000-0000-0000-0000-000000000007', occupantPersonId: '22222222-0000-0000-0000-000000000012', isManagerial: false, validFrom: new Date('2023-07-10T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000010', code: 'MOB-001',   title: 'Mobile Developer',         orgUnitId: '55000000-0000-0000-0000-000000000007', occupantPersonId: '22222222-0000-0000-0000-000000000013', isManagerial: false, validFrom: new Date('2023-11-20T00:00:00Z') },
  // DevOps Guild
  { id: '55100000-0000-0000-0000-000000000011', code: 'DEVOPS-001', title: 'DevOps Engineer',         orgUnitId: '55000000-0000-0000-0000-000000000008', occupantPersonId: '22222222-0000-0000-0000-000000000006', isManagerial: false, validFrom: new Date('2021-11-08T00:00:00Z') },
  // Data & Analytics
  { id: '55100000-0000-0000-0000-000000000012', code: 'DATA-MGR',  title: 'Data & Analytics Manager', orgUnitId: '55000000-0000-0000-0000-000000000003', occupantPersonId: '11111111-1111-1111-1111-111111111005', isManagerial: true,  validFrom: new Date('2020-11-01T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000013', code: 'DATA-AN1',  title: 'Data Analyst',             orgUnitId: '55000000-0000-0000-0000-000000000003', occupantPersonId: '22222222-0000-0000-0000-000000000003', isManagerial: false, validFrom: new Date('2022-08-22T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000014', code: 'DATA-EN1',  title: 'Data Engineer',            orgUnitId: '55000000-0000-0000-0000-000000000003', occupantPersonId: '22222222-0000-0000-0000-000000000011', isManagerial: false, validFrom: new Date('2022-06-27T00:00:00Z') },
  // Design
  { id: '55100000-0000-0000-0000-000000000015', code: 'DES-UX1',   title: 'UX Designer',              orgUnitId: '55000000-0000-0000-0000-000000000004', occupantPersonId: '22222222-0000-0000-0000-000000000005', isManagerial: false, validFrom: new Date('2022-10-17T00:00:00Z') },
  // Delivery
  { id: '55100000-0000-0000-0000-000000000016', code: 'DEL-MGR',   title: 'Delivery Manager',         orgUnitId: '55000000-0000-0000-0000-000000000005', occupantPersonId: '11111111-1111-1111-2222-000000000003', isManagerial: true,  validFrom: new Date('2020-04-01T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000017', code: 'DEL-PM1',   title: 'Senior Project Manager',   orgUnitId: '55000000-0000-0000-0000-000000000005', occupantPersonId: '11111111-1111-1111-1111-111111111010', isManagerial: false, validFrom: new Date('2021-01-10T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000018', code: 'DEL-ARC',   title: 'Principal Architect',      orgUnitId: '55000000-0000-0000-0000-000000000005', occupantPersonId: '22222222-0000-0000-0000-000000000008', isManagerial: false, validFrom: new Date('2020-02-03T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000019', code: 'DEL-BA1',   title: 'Business Analyst',         orgUnitId: '55000000-0000-0000-0000-000000000005', occupantPersonId: '22222222-0000-0000-0000-000000000007', isManagerial: false, validFrom: new Date('2024-01-15T00:00:00Z') },
  { id: '55100000-0000-0000-0000-000000000020', code: 'DEL-PMA',   title: 'PM Assistant',             orgUnitId: '55000000-0000-0000-0000-000000000005', occupantPersonId: '22222222-0000-0000-0000-000000000010', isManagerial: false, validFrom: new Date('2024-03-11T00:00:00Z') },
];

// ─────────────────────────────────────────────────────────────────────────────
// PERSON ORG MEMBERSHIPS (derived from positions)
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoPersonOrgMemberships = lifeDemoPositions.map((pos, i) => ({
  id: `55200000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
  personId: pos.occupantPersonId,
  orgUnitId: pos.orgUnitId,
  positionId: pos.id,
  isPrimary: true,
  validFrom: pos.validFrom,
}));

// ─────────────────────────────────────────────────────────────────────────────
// REPORTING LINES
// Convention: Sophia Kim manages all Engineering; Emma Garcia manages Data/Analytics;
// Carlos Vega manages Design and Delivery; Noah Bennett manages all managers;
// Diana Walsh reports to Noah.
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoReportingLines = [
  // ── Direct reports to Noah Bennett ────────────────────────────────────────
  { id: '55300000-0000-0000-0000-000000000001', subjectPersonId: '11111111-1111-1111-1111-111111111006', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2020-09-01T00:00:00Z') }, // Sophia Kim
  { id: '55300000-0000-0000-0000-000000000002', subjectPersonId: '11111111-1111-1111-1111-111111111005', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2020-11-01T00:00:00Z') }, // Emma Garcia
  { id: '55300000-0000-0000-0000-000000000003', subjectPersonId: '11111111-1111-1111-2222-000000000003', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2020-04-01T00:00:00Z') }, // Carlos Vega
  { id: '55300000-0000-0000-0000-000000000004', subjectPersonId: '11111111-1111-1111-1111-111111111010', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2021-01-10T00:00:00Z') }, // Lucas Reed
  { id: '55300000-0000-0000-0000-000000000005', subjectPersonId: '11111111-1111-1111-2222-000000000001', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2020-06-15T00:00:00Z') }, // Diana Walsh
  // ── Engineering (Sophia Kim) ───────────────────────────────────────────────
  { id: '55300000-0000-0000-0000-000000000006', subjectPersonId: '11111111-1111-1111-1111-111111111008', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2022-03-07T00:00:00Z') }, // Ethan Brooks
  { id: '55300000-0000-0000-0000-000000000007', subjectPersonId: '22222222-0000-0000-0000-000000000001', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2023-02-13T00:00:00Z') }, // Jordan Kim
  { id: '55300000-0000-0000-0000-000000000008', subjectPersonId: '22222222-0000-0000-0000-000000000002', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2021-07-19T00:00:00Z') }, // Alex Torres
  { id: '55300000-0000-0000-0000-000000000009', subjectPersonId: '22222222-0000-0000-0000-000000000004', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2022-05-02T00:00:00Z') }, // Marcus Webb
  { id: '55300000-0000-0000-0000-000000000010', subjectPersonId: '22222222-0000-0000-0000-000000000006', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2021-11-08T00:00:00Z') }, // Ryan Chen
  { id: '55300000-0000-0000-0000-000000000011', subjectPersonId: '22222222-0000-0000-0000-000000000009', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2023-09-04T00:00:00Z') }, // Lena Murphy
  { id: '55300000-0000-0000-0000-000000000012', subjectPersonId: '22222222-0000-0000-0000-000000000012', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2023-07-10T00:00:00Z') }, // Isabel Reyes
  { id: '55300000-0000-0000-0000-000000000013', subjectPersonId: '22222222-0000-0000-0000-000000000013', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2023-11-20T00:00:00Z') }, // Dev Patel
  // ── Data & Analytics (Emma Garcia) ────────────────────────────────────────
  { id: '55300000-0000-0000-0000-000000000014', subjectPersonId: '22222222-0000-0000-0000-000000000003', managerPersonId: '11111111-1111-1111-1111-111111111005', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2022-08-22T00:00:00Z') }, // Priya Sharma
  { id: '55300000-0000-0000-0000-000000000015', subjectPersonId: '22222222-0000-0000-0000-000000000011', managerPersonId: '11111111-1111-1111-1111-111111111005', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2022-06-27T00:00:00Z') }, // Kai Nakamura
  // ── Design & Delivery (Carlos Vega) ───────────────────────────────────────
  { id: '55300000-0000-0000-0000-000000000016', subjectPersonId: '22222222-0000-0000-0000-000000000005', managerPersonId: '11111111-1111-1111-2222-000000000003', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2022-10-17T00:00:00Z') }, // Zara Ahmed
  { id: '55300000-0000-0000-0000-000000000017', subjectPersonId: '22222222-0000-0000-0000-000000000007', managerPersonId: '11111111-1111-1111-2222-000000000003', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2024-01-15T00:00:00Z') }, // Maya Patel
  { id: '55300000-0000-0000-0000-000000000018', subjectPersonId: '22222222-0000-0000-0000-000000000008', managerPersonId: '11111111-1111-1111-2222-000000000003', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2020-02-03T00:00:00Z') }, // Tom Fischer
  { id: '55300000-0000-0000-0000-000000000019', subjectPersonId: '22222222-0000-0000-0000-000000000010', managerPersonId: '11111111-1111-1111-2222-000000000003', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true, validFrom: new Date('2024-03-11T00:00:00Z') }, // Sam O'Brien
  // ── Dotted lines (Jordan Kim → Lucas Reed for project oversight) ───────────
  { id: '55300000-0000-0000-0000-000000000020', subjectPersonId: '22222222-0000-0000-0000-000000000001', managerPersonId: '11111111-1111-1111-1111-111111111010', relationshipType: 'DOTTED_LINE', authority: 'REVIEWER', isPrimary: false, validFrom: new Date('2026-01-05T00:00:00Z') }, // Jordan Kim → Lucas Reed
];

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE POOLS
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoResourcePools = [
  {
    id: '55400000-0000-0000-0000-000000000001',
    code: 'POOL-LD-ENG',
    name: 'Engineering Pool',
    description: 'All engineering contributors available for project staffing.',
    orgUnitId: '55000000-0000-0000-0000-000000000002',
  },
  {
    id: '55400000-0000-0000-0000-000000000002',
    code: 'POOL-LD-DATA',
    name: 'Data Pool',
    description: 'Data analysts and engineers available for analytics projects.',
    orgUnitId: '55000000-0000-0000-0000-000000000003',
  },
  {
    id: '55400000-0000-0000-0000-000000000003',
    code: 'POOL-LD-DES',
    name: 'Design & UX',
    description: 'UX and design resources available for product projects.',
    orgUnitId: '55000000-0000-0000-0000-000000000004',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE POOL MEMBERSHIPS
// Engineering Pool: Ethan, Alex, Marcus, Ryan, Lena, Isabel, Dev, Jordan
// Data Pool: Priya, Kai
// Design & UX: Zara
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoResourcePoolMemberships = [
  // Engineering Pool
  { id: '55500000-0000-0000-0000-000000000001', personId: '11111111-1111-1111-1111-111111111008', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2022-03-07T00:00:00Z') }, // Ethan Brooks
  { id: '55500000-0000-0000-0000-000000000002', personId: '22222222-0000-0000-0000-000000000002', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2021-07-19T00:00:00Z') }, // Alex Torres
  { id: '55500000-0000-0000-0000-000000000003', personId: '22222222-0000-0000-0000-000000000004', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2022-05-02T00:00:00Z') }, // Marcus Webb
  { id: '55500000-0000-0000-0000-000000000004', personId: '22222222-0000-0000-0000-000000000006', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2021-11-08T00:00:00Z') }, // Ryan Chen
  { id: '55500000-0000-0000-0000-000000000005', personId: '22222222-0000-0000-0000-000000000009', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2023-09-04T00:00:00Z') }, // Lena Murphy
  { id: '55500000-0000-0000-0000-000000000006', personId: '22222222-0000-0000-0000-000000000012', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2023-07-10T00:00:00Z') }, // Isabel Reyes
  { id: '55500000-0000-0000-0000-000000000007', personId: '22222222-0000-0000-0000-000000000013', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2023-11-20T00:00:00Z') }, // Dev Patel
  { id: '55500000-0000-0000-0000-000000000008', personId: '22222222-0000-0000-0000-000000000001', resourcePoolId: '55400000-0000-0000-0000-000000000001', validFrom: new Date('2023-02-13T00:00:00Z') }, // Jordan Kim
  // Data Pool
  { id: '55500000-0000-0000-0000-000000000009', personId: '22222222-0000-0000-0000-000000000003', resourcePoolId: '55400000-0000-0000-0000-000000000002', validFrom: new Date('2022-08-22T00:00:00Z') }, // Priya Sharma
  { id: '55500000-0000-0000-0000-000000000010', personId: '22222222-0000-0000-0000-000000000011', resourcePoolId: '55400000-0000-0000-0000-000000000002', validFrom: new Date('2022-06-27T00:00:00Z') }, // Kai Nakamura
  // Design & UX Pool
  { id: '55500000-0000-0000-0000-000000000011', personId: '22222222-0000-0000-0000-000000000005', resourcePoolId: '55400000-0000-0000-0000-000000000003', validFrom: new Date('2022-10-17T00:00:00Z') }, // Zara Ahmed
];

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS (8)
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoProjects = [
  {
    id: '66000000-0000-0000-0000-000000000001',
    projectCode: 'PRJ-NOVA-001',
    name: 'NovaBridge Platform',
    description: 'Flagship client platform — CAPEX intensive, Q1 delivery milestone. Understaffed for final sprint; evidence gap in week 4.',
    projectManagerId: '11111111-1111-1111-1111-111111111010', // Lucas Reed
    status: 'ACTIVE',
    startsOn: new Date('2025-10-01T00:00:00Z'),
    endsOn: new Date('2026-06-30T00:00:00Z'),
  },
  {
    id: '66000000-0000-0000-0000-000000000002',
    projectCode: 'PRJ-CLOUD-002',
    name: 'CloudFlex Migration',
    description: 'Cloud migration initiative — kicked off Q1 2026, staffing confirmation in progress.',
    projectManagerId: '11111111-1111-1111-1111-111111111010', // Lucas Reed
    status: 'ACTIVE',
    startsOn: new Date('2026-02-17T00:00:00Z'),
    endsOn: new Date('2026-09-30T00:00:00Z'),
  },
  {
    id: '66000000-0000-0000-0000-000000000003',
    projectCode: 'PRJ-DATA-003',
    name: 'DataPulse Analytics',
    description: 'Ongoing analytics platform — steady state, healthy evidence cadence.',
    projectManagerId: '11111111-1111-1111-1111-111111111010', // Lucas Reed
    status: 'ACTIVE',
    startsOn: new Date('2025-07-01T00:00:00Z'),
    endsOn: new Date('2026-12-31T00:00:00Z'),
  },
  {
    id: '66000000-0000-0000-0000-000000000004',
    projectCode: 'PRJ-MOB-004',
    name: 'MobileFirst Redesign',
    description: 'Consumer mobile app redesign — design-heavy phase, strong UX evidence.',
    projectManagerId: '11111111-1111-1111-1111-111111111010', // Lucas Reed
    status: 'ACTIVE',
    startsOn: new Date('2025-11-03T00:00:00Z'),
    endsOn: new Date('2026-07-31T00:00:00Z'),
  },
  {
    id: '66000000-0000-0000-0000-000000000005',
    projectCode: 'PRJ-INFRA-005',
    name: 'Infrastructure Hardening',
    description: 'Internal OPEX project — security patches and infra resilience uplift.',
    projectManagerId: '22222222-0000-0000-0000-000000000008', // Tom Fischer (lead)
    status: 'ACTIVE',
    startsOn: new Date('2026-01-05T00:00:00Z'),
    endsOn: new Date('2026-05-31T00:00:00Z'),
  },
  {
    id: '66000000-0000-0000-0000-000000000006',
    projectCode: 'PRJ-AUDIT-006',
    name: 'Compliance & Audit Prep',
    description: 'Q1 audit readiness — OPEX, Emma Garcia leading. Must close before quarter-end.',
    projectManagerId: '11111111-1111-1111-1111-111111111005', // Emma Garcia
    status: 'ACTIVE',
    startsOn: new Date('2026-01-12T00:00:00Z'),
    endsOn: new Date('2026-04-30T00:00:00Z'),
  },
  {
    id: '66000000-0000-0000-0000-000000000007',
    projectCode: 'PRJ-ARCH-007',
    name: 'Platform Architecture Review',
    description: 'DRAFT — forward-looking architecture study for 2026 H2. Tom Fischer owner.',
    projectManagerId: '22222222-0000-0000-0000-000000000008', // Tom Fischer
    status: 'DRAFT',
    startsOn: new Date('2026-07-01T00:00:00Z'),
    endsOn: null,
  },
  {
    id: '66000000-0000-0000-0000-000000000008',
    projectCode: 'PRJ-LEGACY-008',
    name: 'Legacy Decommission',
    description: 'Decommissioning legacy billing system — CLOSING, winding down. Carlos Vega owns the close-out.',
    projectManagerId: '11111111-1111-1111-2222-000000000003', // Carlos Vega
    status: 'ACTIVE', // winding down but still open — CLOSING is not in ProjectStatus enum; ACTIVE reflects the project is still live
    startsOn: new Date('2025-04-01T00:00:00Z'),
    endsOn: new Date('2026-04-30T00:00:00Z'),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT EXTERNAL LINKS
// NovaBridge → Jira (primary), CloudFlex → Jira (new), DataPulse → Jira
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoProjectExternalLinks = [
  {
    id: '66100000-0000-0000-0000-000000000001',
    projectId: '66000000-0000-0000-0000-000000000001',
    provider: 'JIRA',
    connectionKey: 'jira-cloud-primary',
    externalProjectKey: 'NOVABRIDGE',
    externalProjectName: 'NovaBridge Platform',
    externalUrl: 'https://jira.apexdigital.demo/projects/NOVABRIDGE',
    providerEnvironment: 'cloud',
    lastSeenAt: new Date('2026-04-05T09:00:00Z'),
  },
  {
    id: '66100000-0000-0000-0000-000000000002',
    projectId: '66000000-0000-0000-0000-000000000002',
    provider: 'JIRA',
    connectionKey: 'jira-cloud-primary',
    externalProjectKey: 'CLOUDFLEX',
    externalProjectName: 'CloudFlex Migration',
    externalUrl: 'https://jira.apexdigital.demo/projects/CLOUDFLEX',
    providerEnvironment: 'cloud',
    lastSeenAt: new Date('2026-04-04T14:30:00Z'),
  },
  {
    id: '66100000-0000-0000-0000-000000000003',
    projectId: '66000000-0000-0000-0000-000000000003',
    provider: 'JIRA',
    connectionKey: 'jira-cloud-primary',
    externalProjectKey: 'DATAPULSE',
    externalProjectName: 'DataPulse Analytics',
    externalUrl: 'https://jira.apexdigital.demo/projects/DATAPULSE',
    providerEnvironment: 'cloud',
    lastSeenAt: new Date('2026-04-05T11:15:00Z'),
  },
  {
    id: '66100000-0000-0000-0000-000000000004',
    projectId: '66000000-0000-0000-0000-000000000004',
    provider: 'FIGMA',
    connectionKey: 'figma-workspace',
    externalProjectKey: 'MOBILEFIRST',
    externalProjectName: 'MobileFirst Redesign',
    externalUrl: 'https://www.figma.com/files/project/apexdigital/mobilefirst',
    providerEnvironment: 'cloud',
    lastSeenAt: new Date('2026-04-03T16:00:00Z'),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL SYNC STATES
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoExternalSyncStates = lifeDemoProjectExternalLinks.map((link, i) => ({
  id: `66200000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
  projectExternalLinkId: link.id,
  syncStatus: i < 3 ? 'SUCCEEDED' : 'IDLE',
  lastSyncedAt: i < 3 ? new Date('2026-04-05T12:00:00Z') : null,
  lastSuccessfulSyncedAt: i < 3 ? new Date('2026-04-05T12:00:00Z') : null,
  lastPayloadFingerprint: i < 3 ? `fp-lifedemo-${i + 1}-q1` : null,
}));

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENTS
// Overallocation story:
//   Ethan Brooks:  NovaBridge 80% + DataPulse 40%  = 120%
//   Jordan Kim:    NovaBridge 70% + CloudFlex 60%  = 130%
// All others at or under 100%.
// CloudFlex new joiners have APPROVED (not yet ACTIVE) status.
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoAssignments = [
  // ── NovaBridge Platform (PRJ-NOVA-001) ────────────────────────────────────
  { id: '77000000-0000-0000-0000-000000000001', assignmentCode: 'ASN-NOVA-LR', personId: '11111111-1111-1111-1111-111111111010', projectId: '66000000-0000-0000-0000-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111002', staffingRole: 'Project Manager',      status: 'ASSIGNED',    allocationPercent: '20.00', requestedAt: new Date('2025-09-15T00:00:00Z'), approvedAt: new Date('2025-09-17T00:00:00Z'), validFrom: new Date('2025-10-01T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000002', assignmentCode: 'ASN-NOVA-EB', personId: '11111111-1111-1111-1111-111111111008', projectId: '66000000-0000-0000-0000-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Lead Engineer',        status: 'ASSIGNED',    allocationPercent: '80.00', requestedAt: new Date('2025-09-20T00:00:00Z'), approvedAt: new Date('2025-09-22T00:00:00Z'), validFrom: new Date('2025-10-01T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000003', assignmentCode: 'ASN-NOVA-JK', personId: '22222222-0000-0000-0000-000000000001', projectId: '66000000-0000-0000-0000-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Full-Stack Engineer',  status: 'ASSIGNED',    allocationPercent: '70.00', requestedAt: new Date('2025-09-20T00:00:00Z'), approvedAt: new Date('2025-09-23T00:00:00Z'), validFrom: new Date('2025-10-01T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000004', assignmentCode: 'ASN-NOVA-AT', personId: '22222222-0000-0000-0000-000000000002', projectId: '66000000-0000-0000-0000-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Senior Engineer',      status: 'ASSIGNED',    allocationPercent: '60.00', requestedAt: new Date('2025-09-25T00:00:00Z'), approvedAt: new Date('2025-09-27T00:00:00Z'), validFrom: new Date('2025-10-01T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000005', assignmentCode: 'ASN-NOVA-MW', personId: '22222222-0000-0000-0000-000000000004', projectId: '66000000-0000-0000-0000-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Backend Engineer',     status: 'ASSIGNED',    allocationPercent: '50.00', requestedAt: new Date('2025-09-25T00:00:00Z'), approvedAt: new Date('2025-09-27T00:00:00Z'), validFrom: new Date('2025-10-01T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000006', assignmentCode: 'ASN-NOVA-LM', personId: '22222222-0000-0000-0000-000000000009', projectId: '66000000-0000-0000-0000-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'QA Engineer',           status: 'ASSIGNED',    allocationPercent: '60.00', requestedAt: new Date('2025-10-01T00:00:00Z'), approvedAt: new Date('2025-10-03T00:00:00Z'), validFrom: new Date('2025-10-15T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000007', assignmentCode: 'ASN-NOVA-SO', personId: '22222222-0000-0000-0000-000000000010', projectId: '66000000-0000-0000-0000-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'PM Support',           status: 'ASSIGNED',    allocationPercent: '40.00', requestedAt: new Date('2025-10-01T00:00:00Z'), approvedAt: new Date('2025-10-03T00:00:00Z'), validFrom: new Date('2025-10-15T00:00:00Z') },
  // ── CloudFlex Migration (PRJ-CLOUD-002) — new, some still APPROVED pending start ──
  { id: '77000000-0000-0000-0000-000000000008', assignmentCode: 'ASN-CLOUD-JK', personId: '22222222-0000-0000-0000-000000000001', projectId: '66000000-0000-0000-0000-000000000002', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Full-Stack Engineer',  status: 'ASSIGNED',   allocationPercent: '60.00', requestedAt: new Date('2026-02-01T00:00:00Z'), approvedAt: new Date('2026-02-05T00:00:00Z'), validFrom: new Date('2026-02-17T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000009', assignmentCode: 'ASN-CLOUD-MP', personId: '22222222-0000-0000-0000-000000000007', projectId: '66000000-0000-0000-0000-000000000002', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Business Analyst',    status: 'ASSIGNED',   allocationPercent: '80.00', requestedAt: new Date('2026-02-01T00:00:00Z'), approvedAt: new Date('2026-02-05T00:00:00Z'), validFrom: new Date('2026-02-17T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000010', assignmentCode: 'ASN-CLOUD-IR', personId: '22222222-0000-0000-0000-000000000012', projectId: '66000000-0000-0000-0000-000000000002', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Frontend Developer',  status: 'BOOKED', allocationPercent: '20.00', requestedAt: new Date('2026-03-10T00:00:00Z'), approvedAt: new Date('2026-03-12T00:00:00Z'), validFrom: new Date('2026-04-14T00:00:00Z') },
  // ── DataPulse Analytics (PRJ-DATA-003) ────────────────────────────────────
  { id: '77000000-0000-0000-0000-000000000011', assignmentCode: 'ASN-DATA-EB', personId: '11111111-1111-1111-1111-111111111008', projectId: '66000000-0000-0000-0000-000000000003', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Data Platform Engineer', status: 'ASSIGNED',  allocationPercent: '40.00', requestedAt: new Date('2025-11-01T00:00:00Z'), approvedAt: new Date('2025-11-03T00:00:00Z'), validFrom: new Date('2025-11-17T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000012', assignmentCode: 'ASN-DATA-PS', personId: '22222222-0000-0000-0000-000000000003', projectId: '66000000-0000-0000-0000-000000000003', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Data Analyst',         status: 'ASSIGNED',  allocationPercent: '80.00', requestedAt: new Date('2025-11-01T00:00:00Z'), approvedAt: new Date('2025-11-03T00:00:00Z'), validFrom: new Date('2025-11-17T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000013', assignmentCode: 'ASN-DATA-KN', personId: '22222222-0000-0000-0000-000000000011', projectId: '66000000-0000-0000-0000-000000000003', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Data Engineer',        status: 'ASSIGNED',  allocationPercent: '100.00', requestedAt: new Date('2025-11-01T00:00:00Z'), approvedAt: new Date('2025-11-03T00:00:00Z'), validFrom: new Date('2025-11-17T00:00:00Z') },
  // ── MobileFirst Redesign (PRJ-MOB-004) ────────────────────────────────────
  { id: '77000000-0000-0000-0000-000000000014', assignmentCode: 'ASN-MOB-ZA', personId: '22222222-0000-0000-0000-000000000005', projectId: '66000000-0000-0000-0000-000000000004', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Lead UX Designer',     status: 'ASSIGNED',  allocationPercent: '100.00', requestedAt: new Date('2025-10-15T00:00:00Z'), approvedAt: new Date('2025-10-17T00:00:00Z'), validFrom: new Date('2025-11-03T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000015', assignmentCode: 'ASN-MOB-IR', personId: '22222222-0000-0000-0000-000000000012', projectId: '66000000-0000-0000-0000-000000000004', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Frontend Developer',  status: 'ASSIGNED',  allocationPercent: '80.00', requestedAt: new Date('2025-10-15T00:00:00Z'), approvedAt: new Date('2025-10-17T00:00:00Z'), validFrom: new Date('2025-11-03T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000016', assignmentCode: 'ASN-MOB-DP', personId: '22222222-0000-0000-0000-000000000013', projectId: '66000000-0000-0000-0000-000000000004', requestedByPersonId: '11111111-1111-1111-1111-111111111010', staffingRole: 'Mobile Developer',    status: 'ASSIGNED',  allocationPercent: '60.00', requestedAt: new Date('2025-10-15T00:00:00Z'), approvedAt: new Date('2025-10-17T00:00:00Z'), validFrom: new Date('2025-11-03T00:00:00Z') },
  // ── Infrastructure Hardening (PRJ-INFRA-005) ──────────────────────────────
  { id: '77000000-0000-0000-0000-000000000017', assignmentCode: 'ASN-INFRA-TF', personId: '22222222-0000-0000-0000-000000000008', projectId: '66000000-0000-0000-0000-000000000005', requestedByPersonId: '11111111-1111-1111-2222-000000000003', staffingRole: 'Lead Architect',       status: 'ASSIGNED',  allocationPercent: '40.00', requestedAt: new Date('2025-12-10T00:00:00Z'), approvedAt: new Date('2025-12-12T00:00:00Z'), validFrom: new Date('2026-01-05T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000018', assignmentCode: 'ASN-INFRA-MW', personId: '22222222-0000-0000-0000-000000000004', projectId: '66000000-0000-0000-0000-000000000005', requestedByPersonId: '11111111-1111-1111-2222-000000000003', staffingRole: 'Backend Engineer',     status: 'ASSIGNED',  allocationPercent: '50.00', requestedAt: new Date('2025-12-10T00:00:00Z'), approvedAt: new Date('2025-12-12T00:00:00Z'), validFrom: new Date('2026-01-05T00:00:00Z') },
  { id: '77000000-0000-0000-0000-000000000019', assignmentCode: 'ASN-INFRA-RC', personId: '22222222-0000-0000-0000-000000000006', projectId: '66000000-0000-0000-0000-000000000005', requestedByPersonId: '11111111-1111-1111-2222-000000000003', staffingRole: 'DevOps Engineer',      status: 'ASSIGNED',  allocationPercent: '80.00', requestedAt: new Date('2025-12-10T00:00:00Z'), approvedAt: new Date('2025-12-12T00:00:00Z'), validFrom: new Date('2026-01-05T00:00:00Z') },
  // ── Compliance & Audit Prep (PRJ-AUDIT-006) ───────────────────────────────
  { id: '77000000-0000-0000-0000-000000000020', assignmentCode: 'ASN-AUDIT-EG', personId: '11111111-1111-1111-1111-111111111005', projectId: '66000000-0000-0000-0000-000000000006', requestedByPersonId: '11111111-1111-1111-1111-111111111002', staffingRole: 'Compliance Lead',      status: 'ASSIGNED',  allocationPercent: '100.00', requestedAt: new Date('2026-01-05T00:00:00Z'), approvedAt: new Date('2026-01-07T00:00:00Z'), validFrom: new Date('2026-01-12T00:00:00Z') },
  // ── Platform Architecture Review (PRJ-ARCH-007) — DRAFT, assignment REQUESTED ──
  { id: '77000000-0000-0000-0000-000000000021', assignmentCode: 'ASN-ARCH-TF', personId: '22222222-0000-0000-0000-000000000008', projectId: '66000000-0000-0000-0000-000000000007', requestedByPersonId: '11111111-1111-1111-1111-111111111002', staffingRole: 'Principal Architect',  status: 'PROPOSED', allocationPercent: '60.00', requestedAt: new Date('2026-04-01T00:00:00Z'), validFrom: new Date('2026-07-01T00:00:00Z') },
  // ── Legacy Decommission (PRJ-LEGACY-008) — winding down ──────────────────
  { id: '77000000-0000-0000-0000-000000000022', assignmentCode: 'ASN-LEGACY-CV', personId: '11111111-1111-1111-2222-000000000003', projectId: '66000000-0000-0000-0000-000000000008', requestedByPersonId: '11111111-1111-1111-1111-111111111002', staffingRole: 'Programme Sponsor',   status: 'ASSIGNED',  allocationPercent: '20.00', requestedAt: new Date('2025-03-15T00:00:00Z'), approvedAt: new Date('2025-03-17T00:00:00Z'), validFrom: new Date('2025-04-01T00:00:00Z'), validTo: new Date('2026-04-30T00:00:00Z') },
];

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT APPROVALS (one per ACTIVE / APPROVED / ENDED assignment)
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoAssignmentApprovals = lifeDemoAssignments
  .filter((a) => ['ACTIVE', 'APPROVED', 'ENDED'].includes(a.status))
  .map((a, i) => ({
    id: `77100000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
    assignmentId: a.id,
    decidedByPersonId: a.requestedByPersonId,
    sequenceNumber: 1,
    decision: 'APPROVED',
    decisionReason: 'Approved during Q1 2026 staffing review.',
    decisionAt: a.approvedAt ?? a.requestedAt,
  }));

// ─────────────────────────────────────────────────────────────────────────────
// ASSIGNMENT HISTORY (creation event for every assignment)
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoAssignmentHistory = lifeDemoAssignments.map((a, i) => ({
  id: `77200000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
  assignmentId: a.id,
  changedByPersonId: a.requestedByPersonId,
  changeType: 'STATUS_PROPOSED',
  changeReason: 'Life demo dataset — initial assignment created.',
  previousSnapshot: null,
  newSnapshot: {
    allocationPercent: a.allocationPercent,
    personId: a.personId,
    projectId: a.projectId,
    status: a.status,
    staffingRole: a.staffingRole,
  },
  occurredAt: a.requestedAt,
}));

// ─────────────────────────────────────────────────────────────────────────────
// WORK EVIDENCE SOURCES
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoWorkEvidenceSources = [
  {
    id: '88000000-0000-0000-0000-000000000001',
    provider: 'JIRA',
    sourceType: 'WORKLOG',
    connectionKey: 'jira-cloud-primary',
    displayName: 'Jira Cloud Worklogs',
  },
  {
    id: '88000000-0000-0000-0000-000000000002',
    provider: 'INTERNAL',
    sourceType: 'TIMESHEET',
    connectionKey: 'internal-timesheet',
    displayName: 'Internal Timesheet System',
  },
  {
    id: '88000000-0000-0000-0000-000000000003',
    provider: 'FIGMA',
    sourceType: 'FILE_ACTIVITY',
    connectionKey: 'figma-workspace',
    displayName: 'Figma Design Activity',
  },
  {
    id: '88000000-0000-0000-0000-000000000004',
    provider: 'MANUAL',
    sourceType: 'MANUAL_LOG',
    connectionKey: 'manual-evidence-entry',
    displayName: 'Manual Evidence Entry',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// WORK EVIDENCE
//
// Weeks (Monday dates):
//   Week 1: 2026-03-02 .. 2026-03-08
//   Week 2: 2026-03-09 .. 2026-03-15
//   Week 3: 2026-03-16 .. 2026-03-22
//   Week 4: 2026-03-23 .. 2026-03-29  ← GAP: no NovaBridge evidence from Ethan/Jordan
//
// Story:
//   - Ethan Brooks logs timesheets ~36h/week: 90% NovaBridge, 10% DataPulse
//   - Jordan Kim logs Jira worklogs: NovaBridge weeks 1-3, gap in week 4
//   - Priya Sharma: steady DataPulse evidence weeks 1-4
//   - Kai Nakamura: steady DataPulse evidence weeks 1-4
//   - Zara Ahmed: Figma design activity MobileFirst weeks 1-4
//   - Alex Torres: NovaBridge Jira worklogs weeks 1-3 (week 4 light)
//   - Marcus Webb: NovaBridge + Infra weeks 1-4
//   - CloudFlex: minimal evidence (just started)
// ─────────────────────────────────────────────────────────────────────────────

// Helper: generate a Date from a week-Monday offset + day offset
function wd(weekMonday: string, dayOffset: number, hour = 10): Date {
  const d = new Date(`${weekMonday}T${String(hour).padStart(2, '0')}:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d;
}

const novaEvidence: Array<Record<string, unknown>> = [];
let evSeq = 1;

// ── Ethan Brooks — timesheet entries: 4 weeks
// Weeks 1-4: NovaBridge (~324 min/day = ~90% of 360-min day)
// Week 4: NO NovaBridge (the gap) — only DataPulse appears
const ethanWeeks = [
  { monday: '2026-03-02', w: 1 },
  { monday: '2026-03-09', w: 2 },
  { monday: '2026-03-16', w: 3 },
  // Week 4 = gap for NovaBridge
];

for (const { monday, w } of ethanWeeks) {
  // Monday through Thursday — 4 NovaBridge entries per week
  for (let d = 0; d < 4; d++) {
    const seq = String(evSeq).padStart(12, '0');
    novaEvidence.push({
      id: `88100000-0000-0000-0000-${seq}`,
      workEvidenceSourceId: '88000000-0000-0000-0000-000000000002',
      personId: '11111111-1111-1111-1111-111111111008', // Ethan Brooks
      projectId: '66000000-0000-0000-0000-000000000001', // NovaBridge
      sourceRecordKey: `TS-NOVA-EB-W${w}-D${d + 1}`,
      evidenceType: 'TIMESHEET_ENTRY',
      recordedAt: wd(monday, d, 18),
      occurredOn: wd(monday, d, 0),
      durationMinutes: d < 3 ? 324 : 300,
      status: w < 3 ? 'RECONCILED' : 'CAPTURED',
      capex: true,
      summary: `NovaBridge backend work — week ${w}, day ${d + 1}.`,
      details: { category: 'development', sprint: `Q1-S${w + 8}` },
    });
    evSeq++;
  }
  // Friday — DataPulse timesheet entry (10%)
  const seqF = String(evSeq).padStart(12, '0');
  novaEvidence.push({
    id: `88100000-0000-0000-0000-${seqF}`,
    workEvidenceSourceId: '88000000-0000-0000-0000-000000000002',
    personId: '11111111-1111-1111-1111-111111111008', // Ethan Brooks
    projectId: '66000000-0000-0000-0000-000000000003', // DataPulse
    sourceRecordKey: `TS-DATA-EB-W${w}-F`,
    evidenceType: 'TIMESHEET_ENTRY',
    recordedAt: wd(monday, 4, 18),
    occurredOn: wd(monday, 4, 0),
    durationMinutes: 120,
    status: 'RECONCILED',
    capex: false,
    summary: `DataPulse data review — week ${w}.`,
    details: { category: 'data-review' },
  });
  evSeq++;
}

// Ethan week 4: ONLY DataPulse (NovaBridge gap)
for (let d = 0; d < 3; d++) {
  const seq = String(evSeq).padStart(12, '0');
  novaEvidence.push({
    id: `88100000-0000-0000-0000-${seq}`,
    workEvidenceSourceId: '88000000-0000-0000-0000-000000000002',
    personId: '11111111-1111-1111-1111-111111111008', // Ethan Brooks
    projectId: '66000000-0000-0000-0000-000000000003', // DataPulse — no NovaBridge this week
    sourceRecordKey: `TS-DATA-EB-W4-D${d + 1}`,
    evidenceType: 'TIMESHEET_ENTRY',
    recordedAt: wd('2026-03-23', d, 18),
    occurredOn: wd('2026-03-23', d, 0),
    durationMinutes: 240,
    status: 'CAPTURED',
    capex: false,
    summary: `DataPulse pipeline review — week 4, day ${d + 1}. (NovaBridge gap week.)`,
    details: { category: 'data-review', note: 'Reassigned to DataPulse emergency sprint' },
  });
  evSeq++;
}

// ── Jordan Kim — Jira worklogs weeks 1-3 (NovaBridge), GAP in week 4
const jordanWeeks = [
  { monday: '2026-03-02', w: 1 },
  { monday: '2026-03-09', w: 2 },
  { monday: '2026-03-16', w: 3 },
];
for (const { monday, w } of jordanWeeks) {
  for (let d = 0; d < 4; d++) {
    const seq = String(evSeq).padStart(12, '0');
    novaEvidence.push({
      id: `88100000-0000-0000-0000-${seq}`,
      workEvidenceSourceId: '88000000-0000-0000-0000-000000000001',
      personId: '22222222-0000-0000-0000-000000000001', // Jordan Kim
      projectId: '66000000-0000-0000-0000-000000000001', // NovaBridge
      sourceRecordKey: `WL-NOVA-JK-W${w}-D${d + 1}`,
      evidenceType: 'JIRA_WORKLOG',
      recordedAt: wd(monday, d + 1, 10),
      occurredOn: wd(monday, d, 0),
      durationMinutes: 360 + (d % 2) * 60,
      status: w < 3 ? 'RECONCILED' : 'CAPTURED',
      capex: true,
      summary: `NovaBridge feature work — week ${w}, day ${d + 1}.`,
      details: { issueKey: `NOVA-${200 + w * 10 + d}`, sprint: `Q1-S${w + 8}` },
    });
    evSeq++;
  }
}
// Jordan week 4: NO NovaBridge evidence (gap) — only a CloudFlex minimal entry
const seqJCloudFlex = String(evSeq).padStart(12, '0');
novaEvidence.push({
  id: `88100000-0000-0000-0000-${seqJCloudFlex}`,
  workEvidenceSourceId: '88000000-0000-0000-0000-000000000001',
  personId: '22222222-0000-0000-0000-000000000001', // Jordan Kim
  projectId: '66000000-0000-0000-0000-000000000002', // CloudFlex (gap from NovaBridge)
  sourceRecordKey: 'WL-CLOUD-JK-W4-D1',
  evidenceType: 'JIRA_WORKLOG',
  recordedAt: new Date('2026-03-24T11:00:00Z'),
  occurredOn: new Date('2026-03-23T00:00:00Z'),
  durationMinutes: 240,
  status: 'CAPTURED',
  capex: false,
  summary: 'CloudFlex infra planning session — week 4.',
  details: { issueKey: 'CLOUDFLEX-15', note: 'Pulled to CloudFlex kickoff — NovaBridge coverage gap' },
});
evSeq++;

// ── Alex Torres — NovaBridge Jira worklogs weeks 1-4 (week 4 light)
const alexWeeks = [
  { monday: '2026-03-02', w: 1, days: 4 },
  { monday: '2026-03-09', w: 2, days: 4 },
  { monday: '2026-03-16', w: 3, days: 4 },
  { monday: '2026-03-23', w: 4, days: 2 }, // light — only 2 days logged
];
for (const { monday, w, days } of alexWeeks) {
  for (let d = 0; d < days; d++) {
    const seq = String(evSeq).padStart(12, '0');
    novaEvidence.push({
      id: `88100000-0000-0000-0000-${seq}`,
      workEvidenceSourceId: '88000000-0000-0000-0000-000000000001',
      personId: '22222222-0000-0000-0000-000000000002', // Alex Torres
      projectId: '66000000-0000-0000-0000-000000000001', // NovaBridge
      sourceRecordKey: `WL-NOVA-AT-W${w}-D${d + 1}`,
      evidenceType: 'JIRA_WORKLOG',
      recordedAt: wd(monday, d + 1, 9),
      occurredOn: wd(monday, d, 0),
      durationMinutes: 420,
      status: w < 4 ? 'RECONCILED' : 'CAPTURED',
      capex: true,
      summary: `NovaBridge API development — week ${w}, day ${d + 1}.`,
      details: { issueKey: `NOVA-${300 + w * 10 + d}`, component: 'API Gateway' },
    });
    evSeq++;
  }
}

// ── Marcus Webb — NovaBridge (50%) + Infrastructure (50%) weeks 1-4
const marcusProjects = [
  { projectId: '66000000-0000-0000-0000-000000000001', sourceKey: 'NOVA', srcId: '88000000-0000-0000-0000-000000000001', role: 'backend', capex: true },
  { projectId: '66000000-0000-0000-0000-000000000005', sourceKey: 'INFRA', srcId: '88000000-0000-0000-0000-000000000002', role: 'infra', capex: false },
];
for (const { monday, w } of [{ monday: '2026-03-02', w: 1 }, { monday: '2026-03-09', w: 2 }, { monday: '2026-03-16', w: 3 }, { monday: '2026-03-23', w: 4 }]) {
  for (const proj of marcusProjects) {
    for (let d = 0; d < 2; d++) {
      const seq = String(evSeq).padStart(12, '0');
      novaEvidence.push({
        id: `88100000-0000-0000-0000-${seq}`,
        workEvidenceSourceId: proj.srcId,
        personId: '22222222-0000-0000-0000-000000000004', // Marcus Webb
        projectId: proj.projectId,
        sourceRecordKey: `TS-${proj.sourceKey}-MW-W${w}-D${d + 1}`,
        evidenceType: proj.srcId === '88000000-0000-0000-0000-000000000001' ? 'JIRA_WORKLOG' : 'TIMESHEET_ENTRY',
        recordedAt: wd(monday, d * 2, 17),
        occurredOn: wd(monday, d * 2, 0),
        durationMinutes: 360,
        status: w < 4 ? 'RECONCILED' : 'CAPTURED',
        capex: proj.capex,
        summary: `${proj.sourceKey} ${proj.role} work — week ${w}.`,
        details: { category: proj.role, sprint: `Q1-S${w + 8}` },
      });
      evSeq++;
    }
  }
}

// ── Priya Sharma — DataPulse, steady cadence weeks 1-4
for (const { monday, w } of [{ monday: '2026-03-02', w: 1 }, { monday: '2026-03-09', w: 2 }, { monday: '2026-03-16', w: 3 }, { monday: '2026-03-23', w: 4 }]) {
  for (let d = 0; d < 3; d++) {
    const seq = String(evSeq).padStart(12, '0');
    novaEvidence.push({
      id: `88100000-0000-0000-0000-${seq}`,
      workEvidenceSourceId: '88000000-0000-0000-0000-000000000001',
      personId: '22222222-0000-0000-0000-000000000003', // Priya Sharma
      projectId: '66000000-0000-0000-0000-000000000003', // DataPulse
      sourceRecordKey: `WL-DATA-PS-W${w}-D${d + 1}`,
      evidenceType: 'JIRA_WORKLOG',
      recordedAt: wd(monday, d + 1, 11),
      occurredOn: wd(monday, d, 0),
      durationMinutes: 420 + (d % 2) * 60,
      status: w < 4 ? 'RECONCILED' : 'CAPTURED',
      capex: false,
      summary: `DataPulse analysis — week ${w}, day ${d + 1}.`,
      details: { issueKey: `DATAPULSE-${100 + w * 10 + d}`, dashboard: 'Q1 Revenue' },
    });
    evSeq++;
  }
}

// ── Kai Nakamura — DataPulse, steady cadence weeks 1-4
for (const { monday, w } of [{ monday: '2026-03-02', w: 1 }, { monday: '2026-03-09', w: 2 }, { monday: '2026-03-16', w: 3 }, { monday: '2026-03-23', w: 4 }]) {
  for (let d = 0; d < 3; d++) {
    const seq = String(evSeq).padStart(12, '0');
    novaEvidence.push({
      id: `88100000-0000-0000-0000-${seq}`,
      workEvidenceSourceId: '88000000-0000-0000-0000-000000000002',
      personId: '22222222-0000-0000-0000-000000000011', // Kai Nakamura
      projectId: '66000000-0000-0000-0000-000000000003', // DataPulse
      sourceRecordKey: `TS-DATA-KN-W${w}-D${d + 1}`,
      evidenceType: 'TIMESHEET_ENTRY',
      recordedAt: wd(monday, d, 18),
      occurredOn: wd(monday, d, 0),
      durationMinutes: 480,
      status: w < 4 ? 'RECONCILED' : 'CAPTURED',
      capex: false,
      summary: `DataPulse pipeline engineering — week ${w}, day ${d + 1}.`,
      details: { category: 'data-engineering', pipeline: 'ingestion' },
    });
    evSeq++;
  }
}

// ── Zara Ahmed — Figma design activity MobileFirst weeks 1-4
for (const { monday, w } of [{ monday: '2026-03-02', w: 1 }, { monday: '2026-03-09', w: 2 }, { monday: '2026-03-16', w: 3 }, { monday: '2026-03-23', w: 4 }]) {
  for (let d = 0; d < 3; d++) {
    const seq = String(evSeq).padStart(12, '0');
    novaEvidence.push({
      id: `88100000-0000-0000-0000-${seq}`,
      workEvidenceSourceId: '88000000-0000-0000-0000-000000000003',
      personId: '22222222-0000-0000-0000-000000000005', // Zara Ahmed
      projectId: '66000000-0000-0000-0000-000000000004', // MobileFirst
      sourceRecordKey: `FIG-MOB-ZA-W${w}-D${d + 1}`,
      evidenceType: 'FIGMA_FILE_ACTIVITY',
      recordedAt: wd(monday, d, 16),
      occurredOn: wd(monday, d, 0),
      durationMinutes: 300 + (d % 3) * 60,
      status: w < 3 ? 'RECONCILED' : 'CAPTURED',
      capex: true,
      summary: `MobileFirst UX design — week ${w}, screen ${d + 1}.`,
      details: { fileKey: `mobile-redesign-v${w}`, screen: `onboarding-${d + 1}` },
    });
    evSeq++;
  }
}

// ── Lena Murphy — NovaBridge QA weeks 1-3 (week 4 lighter)
for (const { monday, w, days } of [{ monday: '2026-03-02', w: 1, days: 3 }, { monday: '2026-03-09', w: 2, days: 3 }, { monday: '2026-03-16', w: 3, days: 3 }, { monday: '2026-03-23', w: 4, days: 1 }]) {
  for (let d = 0; d < days; d++) {
    const seq = String(evSeq).padStart(12, '0');
    novaEvidence.push({
      id: `88100000-0000-0000-0000-${seq}`,
      workEvidenceSourceId: '88000000-0000-0000-0000-000000000002',
      personId: '22222222-0000-0000-0000-000000000009', // Lena Murphy
      projectId: '66000000-0000-0000-0000-000000000001', // NovaBridge
      sourceRecordKey: `TS-NOVA-LM-W${w}-D${d + 1}`,
      evidenceType: 'TIMESHEET_ENTRY',
      recordedAt: wd(monday, d, 17),
      occurredOn: wd(monday, d, 0),
      durationMinutes: 360,
      status: w < 4 ? 'RECONCILED' : 'CAPTURED',
      capex: true,
      summary: `NovaBridge QA testing — week ${w}.`,
      details: { category: 'testing', testSuite: `regression-sprint${w + 8}` },
    });
    evSeq++;
  }
}

// ── CloudFlex — minimal early-phase evidence (Ryan Chen + Maya Patel, week 3-4)
for (const { personId, role, w, monday, srcId, evType } of [
  { personId: '22222222-0000-0000-0000-000000000007', role: 'BA', w: 3, monday: '2026-03-16', srcId: '88000000-0000-0000-0000-000000000004', evType: 'MANUAL_ENTRY' },
  { personId: '22222222-0000-0000-0000-000000000007', role: 'BA', w: 4, monday: '2026-03-23', srcId: '88000000-0000-0000-0000-000000000002', evType: 'TIMESHEET_ENTRY' },
  { personId: '22222222-0000-0000-0000-000000000006', role: 'DevOps', w: 4, monday: '2026-03-23', srcId: '88000000-0000-0000-0000-000000000001', evType: 'JIRA_WORKLOG' },
]) {
  const seq = String(evSeq).padStart(12, '0');
  novaEvidence.push({
    id: `88100000-0000-0000-0000-${seq}`,
    workEvidenceSourceId: srcId,
    personId,
    projectId: '66000000-0000-0000-0000-000000000002', // CloudFlex
    sourceRecordKey: `EV-CLOUD-${role}-W${w}`,
    evidenceType: evType,
    recordedAt: wd(monday, 1, 14),
    occurredOn: wd(monday, 0, 0),
    durationMinutes: 180,
    status: 'CAPTURED',
    capex: false,
    summary: `CloudFlex ${role} kickoff work — week ${w}.`,
    details: { category: 'planning', note: 'Early-stage project' },
  });
  evSeq++;
}

// ── Infrastructure — Ryan Chen additional evidence (weeks 2-3)
for (const { monday, w } of [{ monday: '2026-03-09', w: 2 }, { monday: '2026-03-16', w: 3 }]) {
  const seq = String(evSeq).padStart(12, '0');
  novaEvidence.push({
    id: `88100000-0000-0000-0000-${seq}`,
    workEvidenceSourceId: '88000000-0000-0000-0000-000000000002',
    personId: '22222222-0000-0000-0000-000000000006', // Ryan Chen
    projectId: '66000000-0000-0000-0000-000000000005', // Infrastructure
    sourceRecordKey: `TS-INFRA-RC-W${w}`,
    evidenceType: 'TIMESHEET_ENTRY',
    recordedAt: wd(monday, 3, 17),
    occurredOn: wd(monday, 3, 0),
    durationMinutes: 480,
    status: 'RECONCILED',
    capex: false,
    summary: `Infrastructure hardening — patches applied, week ${w}.`,
    details: { category: 'infrastructure', ticket: `INFRA-${50 + w}` },
  });
  evSeq++;
}

// ── Compliance / Audit evidence — Emma Garcia (weeks 3-4)
for (const { monday, w } of [{ monday: '2026-03-16', w: 3 }, { monday: '2026-03-23', w: 4 }]) {
  const seq = String(evSeq).padStart(12, '0');
  novaEvidence.push({
    id: `88100000-0000-0000-0000-${seq}`,
    workEvidenceSourceId: '88000000-0000-0000-0000-000000000004',
    personId: '11111111-1111-1111-1111-111111111005', // Emma Garcia
    projectId: '66000000-0000-0000-0000-000000000006', // Compliance
    sourceRecordKey: `MAN-AUDIT-EG-W${w}`,
    evidenceType: 'MANUAL_ENTRY',
    recordedAt: wd(monday, 4, 15),
    occurredOn: wd(monday, 4, 0),
    durationMinutes: 300,
    status: 'CAPTURED',
    capex: false,
    summary: `Audit prep — policy review and evidence collation, week ${w}.`,
    details: { category: 'compliance', auditRef: `Q1-AUDIT-${w}` },
  });
  evSeq++;
}

export const lifeDemoWorkEvidence = novaEvidence as Array<{
  id: string;
  workEvidenceSourceId: string;
  personId: string;
  projectId: string;
  sourceRecordKey: string;
  evidenceType: string;
  recordedAt: Date;
  occurredOn: Date;
  durationMinutes: number;
  status: 'CAPTURED' | 'RECONCILED' | 'IGNORED' | 'ARCHIVED';
  capex: boolean;
  summary: string;
  details: Record<string, unknown>;
}>;

// ─────────────────────────────────────────────────────────────────────────────
// WORK EVIDENCE LINKS
// Link Jira-sourced evidence entries to their external issue keys
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoWorkEvidenceLinks = lifeDemoWorkEvidence
  .filter(
    (ev) =>
      ev.workEvidenceSourceId === '88000000-0000-0000-0000-000000000001' &&
      ev.details.issueKey !== undefined,
  )
  .map((ev, i) => ({
    id: `88200000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
    workEvidenceId: ev.id,
    provider: 'JIRA',
    externalKey: ev.details.issueKey as string,
    externalUrl: `https://jira.apexdigital.demo/browse/${ev.details.issueKey}`,
    linkType: 'ISSUE',
  }));

// ─────────────────────────────────────────────────────────────────────────────
// DATASET SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

export const lifeDemoDatasetSummary = {
  profile: 'life-demo',
  story: 'Apex Digital Consulting — Q1 2026 Quarter-End Crunch',
  people: lifeDemoPeople.length,
  orgUnits: lifeDemoOrgUnits.length,
  projects: lifeDemoProjects.length,
  assignments: lifeDemoAssignments.length,
  workEvidenceEntries: lifeDemoWorkEvidence.length,
  resourcePools: lifeDemoResourcePools.length,
  keyTensions: [
    'NovaBridge Platform: understaffed + week-4 evidence gap (Ethan & Jordan)',
    'Ethan Brooks overallocated at 120% (NovaBridge 80% + DataPulse 40%)',
    'Jordan Kim overallocated at 130% (NovaBridge 70% + CloudFlex 60%)',
    'Jordan Kim at-risk: open HR concern, high workload, low pulse scores',
    'CloudFlex Migration: just started, minimal evidence, staffing pending',
    'Q1 quarter-end: CAPEX/OPEX tracking required for auditors',
  ],
  referenceDate: '2026-04-06',
  note: 'Life-demo dataset. Reference date: 2026-04-06. Week-4 NovaBridge evidence intentionally missing for Ethan Brooks and Jordan Kim.',
};
