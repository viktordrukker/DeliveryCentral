/**
 * Phase 2 seed dataset — expanded organisation for JTBD verification.
 *
 * Reference date: 2026-04-05 ("today" during Phase 2 development).
 * All "current" assignments use validFrom ≤ 2026-04-05 ≤ validTo.
 * All "future" assignments use validFrom > 2026-04-05.
 * All "ended" assignments use validTo < 2026-04-05 with status ENDED.
 *
 * ID prefix conventions (to avoid collision with demo dataset):
 *   People           : 11111111-1111-1111-2222-xxxxxxxxxxxx
 *   OrgUnits         : 22222222-2222-2222-2222-2222222222xx  (new units only, demo ones reused by code)
 *   Positions        : 23333333-0000-0000-2222-xxxxxxxxxxxx
 *   PersonOrgMembers : 24444444-0000-0000-2222-xxxxxxxxxxxx
 *   ReportingLines   : 25555555-0000-0000-2222-xxxxxxxxxxxx
 *   ResourcePools    : 26666666-0000-0000-2222-xxxxxxxxxxxx
 *   PoolMemberships  : 27777777-0000-0000-2222-xxxxxxxxxxxx
 *   Projects         : 33333333-3333-3333-2222-xxxxxxxxxxxx
 *   ExtLinks         : 34444444-0000-0000-2222-xxxxxxxxxxxx
 *   SyncStates       : 35555555-0000-0000-2222-xxxxxxxxxxxx
 *   Assignments      : 36666666-0000-0000-2222-xxxxxxxxxxxx
 *   AsgmtApprovals   : 37777777-0000-0000-2222-xxxxxxxxxxxx
 *   AsgmtHistory     : 38888888-0000-0000-2222-xxxxxxxxxxxx
 *   EvidenceSources  : 39999999-0000-0000-2222-xxxxxxxxxxxx
 *   WorkEvidence     : 40000000-0000-0000-2222-xxxxxxxxxxxx
 *   EvidenceLinks    : 41111111-0000-0000-2222-xxxxxxxxxxxx
 *   LocalAccounts    : (created separately via seedPhase2Accounts)
 */

// ---------------------------------------------------------------------------
// PEOPLE (32 total: 12 existing demo + 20 new)
// Existing demo IDs are reused verbatim — this dataset REPLACES the demo set.
// ---------------------------------------------------------------------------

export const phase2People = [
  // ── Existing 12 (unchanged) ─────────────────────────────────────────────
  { id: '11111111-1111-1111-1111-111111111001', personNumber: 'P-001', givenName: 'Ava',    familyName: 'Rowe',     displayName: 'Ava Rowe',     primaryEmail: 'ava.rowe@example.com',     grade: 'G11', employmentStatus: 'ACTIVE',      hiredAt: new Date('2021-01-15T00:00:00Z'), role: 'Delivery Analyst' },
  { id: '11111111-1111-1111-1111-111111111002', personNumber: 'P-002', givenName: 'Noah',   familyName: 'Bennett',  displayName: 'Noah Bennett',  primaryEmail: 'noah.bennett@example.com',  grade: 'G14', employmentStatus: 'ACTIVE',      hiredAt: new Date('2021-02-10T00:00:00Z'), role: 'Delivery Director' },
  { id: '11111111-1111-1111-1111-111111111003', personNumber: 'P-003', givenName: 'Olivia', familyName: 'Chen',     displayName: 'Olivia Chen',   primaryEmail: 'olivia.chen@example.com',   grade: 'G14', employmentStatus: 'ACTIVE',      hiredAt: new Date('2021-03-01T00:00:00Z'), role: 'Platform Director' },
  { id: '11111111-1111-1111-1111-111111111004', personNumber: 'P-004', givenName: 'Liam',   familyName: 'Patel',    displayName: 'Liam Patel',    primaryEmail: 'liam.patel@example.com',    grade: 'G13', employmentStatus: 'ACTIVE',      hiredAt: new Date('2022-01-10T00:00:00Z'), role: 'Consulting Manager' },
  { id: '11111111-1111-1111-1111-111111111005', personNumber: 'P-005', givenName: 'Emma',   familyName: 'Garcia',   displayName: 'Emma Garcia',   primaryEmail: 'emma.garcia@example.com',   grade: 'G13', employmentStatus: 'ACTIVE',      hiredAt: new Date('2022-02-10T00:00:00Z'), role: 'PMO Manager' },
  { id: '11111111-1111-1111-1111-111111111006', personNumber: 'P-006', givenName: 'Sophia', familyName: 'Kim',      displayName: 'Sophia Kim',    primaryEmail: 'sophia.kim@example.com',    grade: 'G13', employmentStatus: 'ACTIVE',      hiredAt: new Date('2022-03-10T00:00:00Z'), role: 'Engineering Manager' },
  { id: '11111111-1111-1111-1111-111111111007', personNumber: 'P-007', givenName: 'Mason',  familyName: 'Singh',    displayName: 'Mason Singh',   primaryEmail: 'mason.singh@example.com',   grade: 'G13', employmentStatus: 'ACTIVE',      hiredAt: new Date('2022-04-10T00:00:00Z'), role: 'Data Engineering Manager' },
  { id: '11111111-1111-1111-1111-111111111008', personNumber: 'P-008', givenName: 'Ethan',  familyName: 'Brooks',   displayName: 'Ethan Brooks',  primaryEmail: 'ethan.brooks@example.com',  grade: 'G9',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-01-15T00:00:00Z'), role: 'Senior Software Engineer' },
  { id: '11111111-1111-1111-1111-111111111009', personNumber: 'P-009', givenName: 'Mia',    familyName: 'Lopez',    displayName: 'Mia Lopez',     primaryEmail: 'mia.lopez@example.com',     grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-02-20T00:00:00Z'), role: 'Software Engineer' },
  { id: '11111111-1111-1111-1111-111111111010', personNumber: 'P-010', givenName: 'Lucas',  familyName: 'Reed',     displayName: 'Lucas Reed',    primaryEmail: 'lucas.reed@example.com',    grade: 'G11', employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-03-05T00:00:00Z'), role: 'Program Manager' },
  { id: '11111111-1111-1111-1111-111111111011', personNumber: 'P-011', givenName: 'Harper', familyName: 'Ali',      displayName: 'Harper Ali',    primaryEmail: 'harper.ali@example.com',    grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-04-01T00:00:00Z'), role: 'Business Analyst' },
  { id: '11111111-1111-1111-1111-111111111012', personNumber: 'P-012', givenName: 'Zoe',    familyName: 'Turner',   displayName: 'Zoe Turner',    primaryEmail: 'zoe.turner@example.com',    grade: 'G7',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2024-01-08T00:00:00Z'), role: 'Consultant' },

  // ── New 20 ───────────────────────────────────────────────────────────────
  // HR & People unit
  { id: '11111111-1111-1111-2222-000000000001', personNumber: 'P-013', givenName: 'Diana',  familyName: 'Walsh',    displayName: 'Diana Walsh',   primaryEmail: 'diana.walsh@example.com',   grade: 'G12', employmentStatus: 'ACTIVE',      hiredAt: new Date('2022-06-01T00:00:00Z'), role: 'HR Manager' },
  { id: '11111111-1111-1111-2222-000000000002', personNumber: 'P-014', givenName: 'James',  familyName: 'Okafor',   displayName: 'James Okafor',  primaryEmail: 'james.okafor@example.com',  grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2024-09-02T00:00:00Z'), role: 'HR Coordinator' },

  // Operations Directorate
  { id: '11111111-1111-1111-2222-000000000003', personNumber: 'P-015', givenName: 'Carlos', familyName: 'Vega',     displayName: 'Carlos Vega',   primaryEmail: 'carlos.vega@example.com',   grade: 'G12', employmentStatus: 'ACTIVE',      hiredAt: new Date('2021-07-15T00:00:00Z'), role: 'Delivery Manager' },
  { id: '11111111-1111-1111-2222-000000000004', personNumber: 'P-016', givenName: 'Priya',  familyName: 'Nair',     displayName: 'Priya Nair',    primaryEmail: 'priya.nair@example.com',    grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2024-02-15T00:00:00Z'), role: 'Operations Analyst' },

  // Application Engineering — FE/BE teams
  { id: '11111111-1111-1111-2222-000000000005', personNumber: 'P-017', givenName: 'Tyler',  familyName: 'Grant',    displayName: 'Tyler Grant',   primaryEmail: 'tyler.grant@example.com',   grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-08-01T00:00:00Z'), role: 'Frontend Engineer' },
  { id: '11111111-1111-1111-2222-000000000006', personNumber: 'P-018', givenName: 'Nora',   familyName: 'Blake',    displayName: 'Nora Blake',    primaryEmail: 'nora.blake@example.com',    grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-09-15T00:00:00Z'), role: 'Backend Engineer' },
  { id: '11111111-1111-1111-2222-000000000007', personNumber: 'P-019', givenName: 'Sam',    familyName: 'Osei',     displayName: 'Sam Osei',      primaryEmail: 'sam.osei@example.com',      grade: 'G7',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2025-01-06T00:00:00Z'), role: 'Junior Frontend Engineer' },
  { id: '11111111-1111-1111-2222-000000000008', personNumber: 'P-020', givenName: 'Lin',    familyName: 'Zhao',     displayName: 'Lin Zhao',      primaryEmail: 'lin.zhao@example.com',      grade: 'G7',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2025-01-06T00:00:00Z'), role: 'Junior Backend Engineer' },

  // Data Engineering — Analytics team
  { id: '11111111-1111-1111-2222-000000000009', personNumber: 'P-021', givenName: 'Rin',    familyName: 'Yamamoto', displayName: 'Rin Yamamoto',  primaryEmail: 'rin.yamamoto@example.com',  grade: 'G9',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-06-01T00:00:00Z'), role: 'Analytics Engineer' },
  { id: '11111111-1111-1111-2222-000000000010', personNumber: 'P-022', givenName: 'Kwame',  familyName: 'Mensah',   displayName: 'Kwame Mensah',  primaryEmail: 'kwame.mensah@example.com',  grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2024-03-10T00:00:00Z'), role: 'Data Engineer' },

  // Consulting — APAC/EMEA teams
  { id: '11111111-1111-1111-2222-000000000011', personNumber: 'P-023', givenName: 'Aisha',  familyName: 'Musa',     displayName: 'Aisha Musa',    primaryEmail: 'aisha.musa@example.com',    grade: 'G9',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2022-10-01T00:00:00Z'), role: 'Senior Consultant' },
  { id: '11111111-1111-1111-2222-000000000012', personNumber: 'P-024', givenName: 'Felix',  familyName: 'Bauer',    displayName: 'Felix Bauer',   primaryEmail: 'felix.bauer@example.com',   grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-01-09T00:00:00Z'), role: 'Consultant' },
  { id: '11111111-1111-1111-2222-000000000013', personNumber: 'P-025', givenName: 'Mei',    familyName: 'Lin',      displayName: 'Mei Lin',       primaryEmail: 'mei.lin@example.com',       grade: 'G8',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-05-15T00:00:00Z'), role: 'Consultant' },
  { id: '11111111-1111-1111-2222-000000000014', personNumber: 'P-026', givenName: 'Pedro',  familyName: 'Costa',    displayName: 'Pedro Costa',   primaryEmail: 'pedro.costa@example.com',   grade: 'G7',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2024-07-01T00:00:00Z'), role: 'Junior Consultant' },

  // PMO — additional program managers
  { id: '11111111-1111-1111-2222-000000000015', personNumber: 'P-027', givenName: 'Fiona',  familyName: 'McLeod',   displayName: 'Fiona McLeod',  primaryEmail: 'fiona.mcleod@example.com',  grade: 'G10', employmentStatus: 'ACTIVE',      hiredAt: new Date('2022-11-01T00:00:00Z'), role: 'Senior Program Manager' },
  { id: '11111111-1111-1111-2222-000000000016', personNumber: 'P-028', givenName: 'Raj',    familyName: 'Kapoor',   displayName: 'Raj Kapoor',    primaryEmail: 'raj.kapoor@example.com',    grade: 'G9',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2023-07-10T00:00:00Z'), role: 'Project Coordinator' },

  // Edge case: on LEAVE (tests allocation indicator edge case, JTBD-RM1)
  { id: '11111111-1111-1111-2222-000000000017', personNumber: 'P-029', givenName: 'Isabel', familyName: 'Ferreira', displayName: 'Isabel Ferreira', primaryEmail: 'isabel.ferreira@example.com', grade: 'G8', employmentStatus: 'LEAVE', hiredAt: new Date('2022-08-15T00:00:00Z'), role: 'Software Engineer' },

  // Edge case: TERMINATED (tests JTBD-HR6 — terminate endpoint)
  { id: '11111111-1111-1111-2222-000000000018', personNumber: 'P-030', givenName: 'Victor', familyName: 'Huang',    displayName: 'Victor Huang',  primaryEmail: 'victor.huang@example.com',  grade: 'G8',  employmentStatus: 'TERMINATED', hiredAt: new Date('2021-05-20T00:00:00Z'), role: 'Software Engineer', terminatedAt: new Date('2026-01-31T00:00:00Z') },

  // Edge case: orphaned person (no org unit, tests JTBD-HR2 data quality)
  { id: '11111111-1111-1111-2222-000000000019', personNumber: 'P-031', givenName: 'Alex',   familyName: 'Morgan',   displayName: 'Alex Morgan',   primaryEmail: 'alex.morgan@example.com',   grade: 'G7',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2025-10-01T00:00:00Z'), role: 'Graduate Analyst' },

  // New joiner (recent hire, tests JTBD-HR5 recent joiner activity)
  { id: '11111111-1111-1111-2222-000000000020', personNumber: 'P-032', givenName: 'Sophie', familyName: 'Wright',   displayName: 'Sophie Wright', primaryEmail: 'sophie.wright@example.com', grade: 'G7',  employmentStatus: 'ACTIVE',      hiredAt: new Date('2026-03-17T00:00:00Z'), role: 'Graduate Analyst' },
];

// ---------------------------------------------------------------------------
// ORG UNITS — 4-level hierarchy
// Reusing all 6 demo org unit IDs; adding 9 new units.
// ---------------------------------------------------------------------------

export const phase2OrgUnits = [
  // ── Root (new) ───────────────────────────────────────────────────────────
  { id: '22222222-2222-2222-2222-222222222099', code: 'ROOT',        name: 'GlobalTech Ltd',              kind: 'COMPANY',      validFrom: new Date('2020-01-01T00:00:00Z') },

  // ── Directorates (existing, now parented to ROOT) ────────────────────────
  { id: '22222222-2222-2222-2222-222222222001', code: 'DIR-DEL', name: 'Delivery Directorate',   description: 'Client delivery and program execution.',             kind: 'DIRECTORATE', parentOrgUnitId: '22222222-2222-2222-2222-222222222099', managerPersonId: '11111111-1111-1111-1111-111111111002', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222002', code: 'DIR-PLT', name: 'Platform Directorate',   description: 'Internal engineering platform and architecture.',    kind: 'DIRECTORATE', parentOrgUnitId: '22222222-2222-2222-2222-222222222099', managerPersonId: '11111111-1111-1111-1111-111111111003', validFrom: new Date('2024-01-01T00:00:00Z') },

  // ── New: Operations Directorate ──────────────────────────────────────────
  { id: '22222222-2222-2222-2222-222222222010', code: 'DIR-OPS', name: 'Operations Directorate', description: 'Delivery operations and quality.',                   kind: 'DIRECTORATE', parentOrgUnitId: '22222222-2222-2222-2222-222222222099', managerPersonId: '11111111-1111-1111-2222-000000000003', validFrom: new Date('2024-01-01T00:00:00Z') },

  // ── Existing departments (re-parented unchanged) ─────────────────────────
  { id: '22222222-2222-2222-2222-222222222003', code: 'DEP-CON', name: 'Consulting Delivery',      description: 'Consulting and solution delivery teams.',          kind: 'DEPARTMENT',  parentOrgUnitId: '22222222-2222-2222-2222-222222222001', managerPersonId: '11111111-1111-1111-1111-111111111004', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222004', code: 'DEP-PMO', name: 'Program Management Office', description: 'Portfolio and PMO leadership.',                  kind: 'DEPARTMENT',  parentOrgUnitId: '22222222-2222-2222-2222-222222222001', managerPersonId: '11111111-1111-1111-1111-111111111005', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222005', code: 'DEP-APP', name: 'Application Engineering',  description: 'Product and app engineering.',                   kind: 'DEPARTMENT',  parentOrgUnitId: '22222222-2222-2222-2222-222222222002', managerPersonId: '11111111-1111-1111-1111-111111111006', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222006', code: 'DEP-DAT', name: 'Data Engineering',         description: 'Data platform and analytics engineering.',       kind: 'DEPARTMENT',  parentOrgUnitId: '22222222-2222-2222-2222-222222222002', managerPersonId: '11111111-1111-1111-1111-111111111007', validFrom: new Date('2024-01-01T00:00:00Z') },

  // ── New departments ──────────────────────────────────────────────────────
  { id: '22222222-2222-2222-2222-222222222011', code: 'DEP-HR',     name: 'HR & People',              description: 'HR and people operations.',               kind: 'DEPARTMENT',  parentOrgUnitId: '22222222-2222-2222-2222-222222222001', managerPersonId: '11111111-1111-1111-2222-000000000001', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222012', code: 'DEP-OPS',    name: 'Delivery Operations',      description: 'Operational delivery quality and metrics.', kind: 'DEPARTMENT',  parentOrgUnitId: '22222222-2222-2222-2222-222222222010', managerPersonId: '11111111-1111-1111-2222-000000000003', validFrom: new Date('2024-01-01T00:00:00Z') },

  // ── Teams (new) ──────────────────────────────────────────────────────────
  { id: '22222222-2222-2222-2222-222222222020', code: 'TEAM-CON-APAC', name: 'APAC Consulting',      description: 'Asia-Pacific consulting delivery.',          kind: 'TEAM',        parentOrgUnitId: '22222222-2222-2222-2222-222222222003', managerPersonId: '11111111-1111-1111-2222-000000000011', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222021', code: 'TEAM-CON-EMEA', name: 'EMEA Consulting',      description: 'Europe/Middle-East/Africa consulting.',      kind: 'TEAM',        parentOrgUnitId: '22222222-2222-2222-2222-222222222003', managerPersonId: '11111111-1111-1111-2222-000000000012', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222022', code: 'TEAM-PMO-ENT',  name: 'Enterprise PMO',       description: 'Enterprise-level programme delivery.',       kind: 'TEAM',        parentOrgUnitId: '22222222-2222-2222-2222-222222222004', managerPersonId: '11111111-1111-1111-2222-000000000015', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222023', code: 'TEAM-APP-FE',   name: 'Frontend Guild',       description: 'Frontend engineering guild.',                kind: 'TEAM',        parentOrgUnitId: '22222222-2222-2222-2222-222222222005', managerPersonId: '11111111-1111-1111-1111-111111111008', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222024', code: 'TEAM-APP-BE',   name: 'Backend Guild',        description: 'Backend engineering guild.',                 kind: 'TEAM',        parentOrgUnitId: '22222222-2222-2222-2222-222222222005', managerPersonId: '11111111-1111-1111-1111-111111111009', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '22222222-2222-2222-2222-222222222025', code: 'TEAM-DAT-ANA',  name: 'Analytics Engineering', description: 'Analytics engineering sub-team.',           kind: 'TEAM',        parentOrgUnitId: '22222222-2222-2222-2222-222222222006', managerPersonId: '11111111-1111-1111-2222-000000000009', validFrom: new Date('2025-01-01T00:00:00Z') },
];

// ---------------------------------------------------------------------------
// POSITIONS
// ---------------------------------------------------------------------------

export const phase2Positions = [
  // Existing (same IDs)
  { id: '23333333-0000-0000-0000-000000000001', code: 'DIR-DEL-01', title: 'Delivery Director',         orgUnitId: '22222222-2222-2222-2222-222222222001', occupantPersonId: '11111111-1111-1111-1111-111111111002', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000002', code: 'DIR-PLT-01', title: 'Platform Director',         orgUnitId: '22222222-2222-2222-2222-222222222002', occupantPersonId: '11111111-1111-1111-1111-111111111003', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000003', code: 'MGR-CON-01', title: 'Consulting Manager',        orgUnitId: '22222222-2222-2222-2222-222222222003', occupantPersonId: '11111111-1111-1111-1111-111111111004', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000004', code: 'MGR-PMO-01', title: 'PMO Manager',               orgUnitId: '22222222-2222-2222-2222-222222222004', occupantPersonId: '11111111-1111-1111-1111-111111111005', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000005', code: 'MGR-APP-01', title: 'Engineering Manager',       orgUnitId: '22222222-2222-2222-2222-222222222005', occupantPersonId: '11111111-1111-1111-1111-111111111006', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000006', code: 'MGR-DAT-01', title: 'Data Engineering Manager',  orgUnitId: '22222222-2222-2222-2222-222222222006', occupantPersonId: '11111111-1111-1111-1111-111111111007', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000007', code: 'ENG-APP-01', title: 'Senior Software Engineer',  orgUnitId: '22222222-2222-2222-2222-222222222023', occupantPersonId: '11111111-1111-1111-1111-111111111008', isManagerial: false, validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000008', code: 'ENG-APP-02', title: 'Software Engineer',         orgUnitId: '22222222-2222-2222-2222-222222222024', occupantPersonId: '11111111-1111-1111-1111-111111111009', isManagerial: false, validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000009', code: 'PM-PMO-01',  title: 'Program Manager',           orgUnitId: '22222222-2222-2222-2222-222222222022', occupantPersonId: '11111111-1111-1111-1111-111111111010', isManagerial: false, validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000010', code: 'ANL-DAT-01', title: 'Business Analyst',          orgUnitId: '22222222-2222-2222-2222-222222222025', occupantPersonId: '11111111-1111-1111-1111-111111111011', isManagerial: false, validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-0000-000000000011', code: 'CON-CON-01', title: 'Consultant',                orgUnitId: '22222222-2222-2222-2222-222222222020', occupantPersonId: '11111111-1111-1111-1111-111111111012', isManagerial: false, validFrom: new Date('2024-01-01T00:00:00Z') },
  // New positions
  { id: '23333333-0000-0000-2222-000000000001', code: 'MGR-HR-01',  title: 'HR Manager',               orgUnitId: '22222222-2222-2222-2222-222222222011', occupantPersonId: '11111111-1111-1111-2222-000000000001', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000002', code: 'HR-OPS-01',  title: 'HR Coordinator',            orgUnitId: '22222222-2222-2222-2222-222222222011', occupantPersonId: '11111111-1111-1111-2222-000000000002', isManagerial: false, validFrom: new Date('2024-09-02T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000003', code: 'DIR-OPS-01', title: 'Delivery Manager',          orgUnitId: '22222222-2222-2222-2222-222222222012', occupantPersonId: '11111111-1111-1111-2222-000000000003', isManagerial: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000004', code: 'OPS-ANL-01', title: 'Operations Analyst',        orgUnitId: '22222222-2222-2222-2222-222222222012', occupantPersonId: '11111111-1111-1111-2222-000000000004', isManagerial: false, validFrom: new Date('2024-02-15T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000005', code: 'ENG-FE-01',  title: 'Frontend Engineer',         orgUnitId: '22222222-2222-2222-2222-222222222023', occupantPersonId: '11111111-1111-1111-2222-000000000005', isManagerial: false, validFrom: new Date('2023-08-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000006', code: 'ENG-BE-01',  title: 'Backend Engineer',          orgUnitId: '22222222-2222-2222-2222-222222222024', occupantPersonId: '11111111-1111-1111-2222-000000000006', isManagerial: false, validFrom: new Date('2023-09-15T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000007', code: 'ENG-FE-02',  title: 'Junior Frontend Engineer',  orgUnitId: '22222222-2222-2222-2222-222222222023', occupantPersonId: '11111111-1111-1111-2222-000000000007', isManagerial: false, validFrom: new Date('2025-01-06T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000008', code: 'ENG-BE-02',  title: 'Junior Backend Engineer',   orgUnitId: '22222222-2222-2222-2222-222222222024', occupantPersonId: '11111111-1111-1111-2222-000000000008', isManagerial: false, validFrom: new Date('2025-01-06T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000009', code: 'DAT-ANA-01', title: 'Analytics Engineer',        orgUnitId: '22222222-2222-2222-2222-222222222025', occupantPersonId: '11111111-1111-1111-2222-000000000009', isManagerial: false, validFrom: new Date('2023-06-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000010', code: 'DAT-ENG-01', title: 'Data Engineer',             orgUnitId: '22222222-2222-2222-2222-222222222025', occupantPersonId: '11111111-1111-1111-2222-000000000010', isManagerial: false, validFrom: new Date('2024-03-10T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000011', code: 'CON-APC-01', title: 'Senior Consultant (APAC)',  orgUnitId: '22222222-2222-2222-2222-222222222020', occupantPersonId: '11111111-1111-1111-2222-000000000011', isManagerial: true,  validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000012', code: 'CON-EME-01', title: 'Senior Consultant (EMEA)',  orgUnitId: '22222222-2222-2222-2222-222222222021', occupantPersonId: '11111111-1111-1111-2222-000000000012', isManagerial: true,  validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000013', code: 'CON-APC-02', title: 'Consultant (APAC)',         orgUnitId: '22222222-2222-2222-2222-222222222020', occupantPersonId: '11111111-1111-1111-2222-000000000013', isManagerial: false, validFrom: new Date('2023-05-15T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000014', code: 'CON-EME-02', title: 'Junior Consultant (EMEA)',  orgUnitId: '22222222-2222-2222-2222-222222222021', occupantPersonId: '11111111-1111-1111-2222-000000000014', isManagerial: false, validFrom: new Date('2024-07-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000015', code: 'PM-ENT-01',  title: 'Senior Program Manager',   orgUnitId: '22222222-2222-2222-2222-222222222022', occupantPersonId: '11111111-1111-1111-2222-000000000015', isManagerial: true,  validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '23333333-0000-0000-2222-000000000016', code: 'PM-ENT-02',  title: 'Project Coordinator',      orgUnitId: '22222222-2222-2222-2222-222222222022', occupantPersonId: '11111111-1111-1111-2222-000000000016', isManagerial: false, validFrom: new Date('2023-07-10T00:00:00Z') },
  // On-leave engineer: in DEP-APP, but no current position occupancy to test allocation edge case
  { id: '23333333-0000-0000-2222-000000000017', code: 'ENG-APP-03', title: 'Software Engineer (Leave)', orgUnitId: '22222222-2222-2222-2222-222222222024', occupantPersonId: '11111111-1111-1111-2222-000000000017', isManagerial: false, validFrom: new Date('2022-08-15T00:00:00Z') },
  // Recent joiner gets a position
  { id: '23333333-0000-0000-2222-000000000018', code: 'GRD-PMO-01', title: 'Graduate Analyst',          orgUnitId: '22222222-2222-2222-2222-222222222004', occupantPersonId: '11111111-1111-1111-2222-000000000020', isManagerial: false, validFrom: new Date('2026-03-17T00:00:00Z') },
  // Alex Morgan (orphaned, intentionally no position/org membership)
];

// ---------------------------------------------------------------------------
// PERSON → ORG MEMBERSHIPS (derived from positions, same logic as demo)
// Alex Morgan (P-031) intentionally omitted to trigger JTBD-HR2 data quality.
// ---------------------------------------------------------------------------

export const phase2PersonOrgMemberships = phase2Positions.map((pos, i) => ({
  id: `24444444-0000-0000-2222-${String(i + 1).padStart(12, '0')}`,
  personId: pos.occupantPersonId,
  orgUnitId: pos.orgUnitId,
  positionId: pos.id,
  isPrimary: true,
  validFrom: pos.validFrom,
}));

// ---------------------------------------------------------------------------
// REPORTING LINES
// ---------------------------------------------------------------------------

export const phase2ReportingLines = [
  // Existing 11 reporting lines
  { id: '25555555-0000-0000-0000-000000000001', subjectPersonId: '11111111-1111-1111-1111-111111111004', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000002', subjectPersonId: '11111111-1111-1111-1111-111111111005', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000003', subjectPersonId: '11111111-1111-1111-1111-111111111006', managerPersonId: '11111111-1111-1111-1111-111111111003', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000004', subjectPersonId: '11111111-1111-1111-1111-111111111007', managerPersonId: '11111111-1111-1111-1111-111111111003', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000005', subjectPersonId: '11111111-1111-1111-1111-111111111008', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000006', subjectPersonId: '11111111-1111-1111-1111-111111111009', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000007', subjectPersonId: '11111111-1111-1111-1111-111111111010', managerPersonId: '11111111-1111-1111-1111-111111111005', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000008', subjectPersonId: '11111111-1111-1111-1111-111111111011', managerPersonId: '11111111-1111-1111-1111-111111111007', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000009', subjectPersonId: '11111111-1111-1111-1111-111111111012', managerPersonId: '11111111-1111-1111-1111-111111111004', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000010', subjectPersonId: '11111111-1111-1111-1111-111111111008', managerPersonId: '11111111-1111-1111-1111-111111111010', relationshipType: 'DOTTED_LINE', authority: 'REVIEWER', isPrimary: false, validFrom: new Date('2024-06-01T00:00:00Z') },
  { id: '25555555-0000-0000-0000-000000000011', subjectPersonId: '11111111-1111-1111-1111-111111111011', managerPersonId: '11111111-1111-1111-1111-111111111005', relationshipType: 'DOTTED_LINE', authority: 'VIEWER',   isPrimary: false, validFrom: new Date('2024-06-01T00:00:00Z') },
  // New reporting lines
  { id: '25555555-0000-0000-2222-000000000001', subjectPersonId: '11111111-1111-1111-2222-000000000001', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000002', subjectPersonId: '11111111-1111-1111-2222-000000000002', managerPersonId: '11111111-1111-1111-2222-000000000001', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-09-02T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000003', subjectPersonId: '11111111-1111-1111-2222-000000000003', managerPersonId: '11111111-1111-1111-1111-111111111002', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000004', subjectPersonId: '11111111-1111-1111-2222-000000000004', managerPersonId: '11111111-1111-1111-2222-000000000003', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-02-15T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000005', subjectPersonId: '11111111-1111-1111-2222-000000000005', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2023-08-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000006', subjectPersonId: '11111111-1111-1111-2222-000000000006', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2023-09-15T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000007', subjectPersonId: '11111111-1111-1111-2222-000000000007', managerPersonId: '11111111-1111-1111-1111-111111111008', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2025-01-06T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000008', subjectPersonId: '11111111-1111-1111-2222-000000000008', managerPersonId: '11111111-1111-1111-1111-111111111009', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2025-01-06T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000009', subjectPersonId: '11111111-1111-1111-2222-000000000009', managerPersonId: '11111111-1111-1111-1111-111111111007', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2023-06-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000010', subjectPersonId: '11111111-1111-1111-2222-000000000010', managerPersonId: '11111111-1111-1111-1111-111111111007', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-03-10T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000011', subjectPersonId: '11111111-1111-1111-2222-000000000011', managerPersonId: '11111111-1111-1111-1111-111111111004', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000012', subjectPersonId: '11111111-1111-1111-2222-000000000012', managerPersonId: '11111111-1111-1111-1111-111111111004', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000013', subjectPersonId: '11111111-1111-1111-2222-000000000013', managerPersonId: '11111111-1111-1111-2222-000000000011', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2023-05-15T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000014', subjectPersonId: '11111111-1111-1111-2222-000000000014', managerPersonId: '11111111-1111-1111-2222-000000000012', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2024-07-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000015', subjectPersonId: '11111111-1111-1111-2222-000000000015', managerPersonId: '11111111-1111-1111-1111-111111111005', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000016', subjectPersonId: '11111111-1111-1111-2222-000000000016', managerPersonId: '11111111-1111-1111-2222-000000000015', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2023-07-10T00:00:00Z') },
  { id: '25555555-0000-0000-2222-000000000017', subjectPersonId: '11111111-1111-1111-2222-000000000017', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2022-08-15T00:00:00Z') },
  // Victor (terminated) had a manager — kept for audit trail
  { id: '25555555-0000-0000-2222-000000000018', subjectPersonId: '11111111-1111-1111-2222-000000000018', managerPersonId: '11111111-1111-1111-1111-111111111006', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2021-05-20T00:00:00Z') },
  // Sophie (new joiner) has a manager
  { id: '25555555-0000-0000-2222-000000000020', subjectPersonId: '11111111-1111-1111-2222-000000000020', managerPersonId: '11111111-1111-1111-1111-111111111005', relationshipType: 'SOLID_LINE', authority: 'APPROVER', isPrimary: true,  validFrom: new Date('2026-03-17T00:00:00Z') },
  // Alex Morgan (P-031) intentionally has NO reporting line — triggers JTBD-HR2
];

// ---------------------------------------------------------------------------
// RESOURCE POOLS
// ---------------------------------------------------------------------------

export const phase2ResourcePools = [
  { id: '26666666-0000-0000-0000-000000000001', code: 'POOL-ENG', name: 'Engineering Pool',       description: 'Engineering contributors and leads.', orgUnitId: '22222222-2222-2222-2222-222222222002' },
  { id: '26666666-0000-0000-0000-000000000002', code: 'POOL-CON', name: 'Consulting Pool',        description: 'Consulting and program delivery.', orgUnitId: '22222222-2222-2222-2222-222222222001' },
  { id: '26666666-0000-0000-2222-000000000001', code: 'POOL-DAT', name: 'Data & Analytics Pool',  description: 'Data engineering and analytics.', orgUnitId: '22222222-2222-2222-2222-222222222006' },
  { id: '26666666-0000-0000-2222-000000000002', code: 'POOL-OPS', name: 'Operations Pool',        description: 'Delivery operations contributors.', orgUnitId: '22222222-2222-2222-2222-222222222012' },
];

export const phase2ResourcePoolMemberships = [
  // POOL-ENG members
  { id: '27777777-0000-0000-0000-000000000001', personId: '11111111-1111-1111-1111-111111111006', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-0000-000000000002', personId: '11111111-1111-1111-1111-111111111007', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-0000-000000000003', personId: '11111111-1111-1111-1111-111111111008', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-0000-000000000004', personId: '11111111-1111-1111-1111-111111111009', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000001', personId: '11111111-1111-1111-2222-000000000005', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2023-08-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000002', personId: '11111111-1111-1111-2222-000000000006', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2023-09-15T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000003', personId: '11111111-1111-1111-2222-000000000007', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2025-01-06T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000004', personId: '11111111-1111-1111-2222-000000000008', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2025-01-06T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000005', personId: '11111111-1111-1111-2222-000000000017', resourcePoolId: '26666666-0000-0000-0000-000000000001', validFrom: new Date('2022-08-15T00:00:00Z') },
  // POOL-CON members
  { id: '27777777-0000-0000-0000-000000000005', personId: '11111111-1111-1111-1111-111111111004', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-0000-000000000006', personId: '11111111-1111-1111-1111-111111111005', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-0000-000000000007', personId: '11111111-1111-1111-1111-111111111010', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-0000-000000000008', personId: '11111111-1111-1111-1111-111111111012', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000006', personId: '11111111-1111-1111-2222-000000000011', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000007', personId: '11111111-1111-1111-2222-000000000012', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000008', personId: '11111111-1111-1111-2222-000000000013', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2023-05-15T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000009', personId: '11111111-1111-1111-2222-000000000014', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2024-07-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000010', personId: '11111111-1111-1111-2222-000000000015', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2025-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000011', personId: '11111111-1111-1111-2222-000000000016', resourcePoolId: '26666666-0000-0000-0000-000000000002', validFrom: new Date('2023-07-10T00:00:00Z') },
  // POOL-DAT members
  { id: '27777777-0000-0000-2222-000000000012', personId: '11111111-1111-1111-1111-111111111011', resourcePoolId: '26666666-0000-0000-2222-000000000001', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000013', personId: '11111111-1111-1111-2222-000000000009', resourcePoolId: '26666666-0000-0000-2222-000000000001', validFrom: new Date('2023-06-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000014', personId: '11111111-1111-1111-2222-000000000010', resourcePoolId: '26666666-0000-0000-2222-000000000001', validFrom: new Date('2024-03-10T00:00:00Z') },
  // POOL-OPS members
  { id: '27777777-0000-0000-2222-000000000015', personId: '11111111-1111-1111-2222-000000000003', resourcePoolId: '26666666-0000-0000-2222-000000000002', validFrom: new Date('2024-01-01T00:00:00Z') },
  { id: '27777777-0000-0000-2222-000000000016', personId: '11111111-1111-1111-2222-000000000004', resourcePoolId: '26666666-0000-0000-2222-000000000002', validFrom: new Date('2024-02-15T00:00:00Z') },
];

// ---------------------------------------------------------------------------
// PROJECTS (12 total)
// Reference date: 2026-04-05. "nearing closure" = endsOn within 30 days.
// ---------------------------------------------------------------------------

export const phase2Projects = [
  // Existing 6 (IDs unchanged, endsOn adjusted to be relevant to today)
  { id: '33333333-3333-3333-3333-333333333001', projectCode: 'PRJ-100', name: 'Internal Bench Planning',       description: 'Ongoing capacity and bench planning.',              projectManagerId: '11111111-1111-1111-1111-111111111005', status: 'ACTIVE',     startsOn: new Date('2025-01-01T00:00:00Z') },
  { id: '33333333-3333-3333-3333-333333333002', projectCode: 'PRJ-101', name: 'Delivery Central Platform',     description: 'Internal staffing and planning platform.',          projectManagerId: '11111111-1111-1111-1111-111111111010', status: 'ACTIVE',     startsOn: new Date('2025-01-15T00:00:00Z') },
  { id: '33333333-3333-3333-3333-333333333003', projectCode: 'PRJ-102', name: 'Atlas ERP Rollout',             description: 'Jira-linked ERP rollout — nearing closure.',        projectManagerId: '11111111-1111-1111-1111-111111111006', status: 'ACTIVE',     startsOn: new Date('2025-02-01T00:00:00Z'), endsOn: new Date('2026-04-20T00:00:00Z') },
  { id: '33333333-3333-3333-3333-333333333004', projectCode: 'PRJ-103', name: 'Beacon Mobile Revamp',          description: 'Mobile modernisation with 12-week evidence history.', projectManagerId: '11111111-1111-1111-1111-111111111006', status: 'ACTIVE',     startsOn: new Date('2025-02-10T00:00:00Z') },
  { id: '33333333-3333-3333-3333-333333333005', projectCode: 'PRJ-104', name: 'Nova Analytics Migration',      description: 'Analytics delivery — nearing closure.',             projectManagerId: '11111111-1111-1111-1111-111111111006', status: 'ACTIVE',     startsOn: new Date('2025-02-20T00:00:00Z'), endsOn: new Date('2026-04-28T00:00:00Z') },
  { id: '33333333-3333-3333-3333-333333333006', projectCode: 'PRJ-105', name: 'Polaris Security Hardening',    description: 'Security hardening initiative.',                    projectManagerId: '11111111-1111-1111-1111-111111111007', status: 'ACTIVE',     startsOn: new Date('2025-03-01T00:00:00Z') },
  // New 6
  { id: '33333333-3333-3333-2222-000000000001', projectCode: 'PRJ-106', name: 'Mercury Infrastructure',        description: 'Cloud infra uplift — still in draft.',              projectManagerId: '11111111-1111-1111-1111-111111111010', status: 'DRAFT',      startsOn: new Date('2026-05-01T00:00:00Z') },
  { id: '33333333-3333-3333-2222-000000000002', projectCode: 'PRJ-107', name: 'Jupiter Client Portal',         description: 'Client portal — no active staffing (gap).',        projectManagerId: '11111111-1111-1111-1111-111111111010', status: 'ACTIVE',     startsOn: new Date('2026-01-15T00:00:00Z') },
  { id: '33333333-3333-3333-2222-000000000003', projectCode: 'PRJ-108', name: 'Saturn Compliance Audit',       description: 'Compliance audit — on hold.',                       projectManagerId: '11111111-1111-1111-1111-111111111005', status: 'ON_HOLD',    startsOn: new Date('2025-10-01T00:00:00Z') },
  { id: '33333333-3333-3333-2222-000000000004', projectCode: 'PRJ-109', name: 'Venus Onboarding Revamp',       description: 'HR onboarding process revamp — completed.',        projectManagerId: '11111111-1111-1111-1111-111111111002', status: 'COMPLETED',  startsOn: new Date('2025-01-01T00:00:00Z'), endsOn: new Date('2025-12-31T00:00:00Z') },
  { id: '33333333-3333-3333-2222-000000000005', projectCode: 'PRJ-110', name: 'Mars Data Lakehouse',           description: 'Data lakehouse — evidence without approved assignment.', projectManagerId: '11111111-1111-1111-1111-111111111007', status: 'ACTIVE', startsOn: new Date('2025-09-01T00:00:00Z') },
  { id: '33333333-3333-3333-2222-000000000006', projectCode: 'PRJ-111', name: 'Pluto Legacy Migration',        description: 'Legacy system migration — archived.',               projectManagerId: '11111111-1111-1111-1111-111111111010', status: 'ARCHIVED',   startsOn: new Date('2024-01-01T00:00:00Z'), endsOn: new Date('2025-06-30T00:00:00Z') },
];

// ---------------------------------------------------------------------------
// PROJECT EXTERNAL LINKS
// ---------------------------------------------------------------------------

export const phase2ProjectExternalLinks = [
  { id: '34444444-0000-0000-0000-000000000001', projectId: '33333333-3333-3333-3333-333333333003', provider: 'JIRA', connectionKey: 'jira-cloud-primary',     externalProjectKey: 'ATLAS',  externalProjectName: 'Atlas ERP Rollout',    externalUrl: 'https://jira.example.com/projects/ATLAS',            providerEnvironment: 'cloud',  lastSeenAt: new Date('2026-04-01T10:00:00Z') },
  { id: '34444444-0000-0000-0000-000000000002', projectId: '33333333-3333-3333-3333-333333333004', provider: 'JIRA', connectionKey: 'jira-cloud-primary',     externalProjectKey: 'BEACON', externalProjectName: 'Beacon Mobile Revamp', externalUrl: 'https://jira.example.com/projects/BEACON',           providerEnvironment: 'cloud',  lastSeenAt: new Date('2026-04-01T10:05:00Z') },
  { id: '34444444-0000-0000-0000-000000000003', projectId: '33333333-3333-3333-3333-333333333005', provider: 'JIRA', connectionKey: 'jira-onprem-analytics', externalProjectKey: 'NOVA',   externalProjectName: 'Nova Analytics',       externalUrl: 'https://jira.onprem.example.com/projects/NOVA',     providerEnvironment: 'onprem', lastSeenAt: new Date('2026-04-01T10:10:00Z') },
  { id: '34444444-0000-0000-2222-000000000001', projectId: '33333333-3333-3333-2222-000000000002', provider: 'JIRA', connectionKey: 'jira-cloud-primary',     externalProjectKey: 'JUPIT',  externalProjectName: 'Jupiter Client Portal', externalUrl: 'https://jira.example.com/projects/JUPIT',          providerEnvironment: 'cloud',  lastSeenAt: new Date('2026-03-01T09:00:00Z') },
];

export const phase2ExternalSyncStates = phase2ProjectExternalLinks.map((link, i) => ({
  id: `35555555-0000-0000-2222-${String(i + 1).padStart(12, '0')}`,
  projectExternalLinkId: link.id,
  syncStatus: 'SUCCEEDED',
  lastSyncedAt: new Date('2026-04-01T11:00:00Z'),
  lastSuccessfulSyncedAt: new Date('2026-04-01T11:00:00Z'),
  lastPayloadFingerprint: `fp-phase2-${i + 1}`,
}));

// ---------------------------------------------------------------------------
// ASSIGNMENTS (25 entries covering all statuses)
// ---------------------------------------------------------------------------

export const phase2Assignments = [
  // PRJ-101 Delivery Central — Ethan Brooks 80%, Lucas Reed 40% (fully allocated)
  { id: '36666666-0000-0000-2222-000000000001', personId: '11111111-1111-1111-1111-111111111008', projectId: '33333333-3333-3333-3333-333333333002', requestedByPersonId: '11111111-1111-1111-1111-111111111010', assignmentCode: 'ASN-101', staffingRole: 'Lead Engineer',       status: 'ASSIGNED',    allocationPercent: '80.00', requestedAt: new Date('2025-10-01T00:00:00Z'), approvedAt: new Date('2025-10-03T00:00:00Z'), validFrom: new Date('2025-10-15T00:00:00Z') },
  { id: '36666666-0000-0000-2222-000000000002', personId: '11111111-1111-1111-1111-111111111010', projectId: '33333333-3333-3333-3333-333333333002', requestedByPersonId: '11111111-1111-1111-1111-111111111005', assignmentCode: 'ASN-102', staffingRole: 'Program Manager',     status: 'ASSIGNED',    allocationPercent: '40.00', requestedAt: new Date('2025-09-15T00:00:00Z'), approvedAt: new Date('2025-09-17T00:00:00Z'), validFrom: new Date('2025-10-01T00:00:00Z') },

  // PRJ-102 Atlas — Ethan Brooks 40% (overallocated: 80+40=120%), Tyler Grant 100%
  { id: '36666666-0000-0000-2222-000000000003', personId: '11111111-1111-1111-1111-111111111008', projectId: '33333333-3333-3333-3333-333333333003', requestedByPersonId: '11111111-1111-1111-1111-111111111006', assignmentCode: 'ASN-103', staffingRole: 'Lead Engineer',       status: 'ASSIGNED',    allocationPercent: '40.00', requestedAt: new Date('2025-12-01T00:00:00Z'), approvedAt: new Date('2025-12-03T00:00:00Z'), validFrom: new Date('2026-01-01T00:00:00Z'), validTo: new Date('2026-04-30T00:00:00Z') },
  { id: '36666666-0000-0000-2222-000000000004', personId: '11111111-1111-1111-2222-000000000005', projectId: '33333333-3333-3333-3333-333333333003', requestedByPersonId: '11111111-1111-1111-1111-111111111006', assignmentCode: 'ASN-104', staffingRole: 'Frontend Engineer',   status: 'ASSIGNED',    allocationPercent: '100.00', requestedAt: new Date('2025-12-01T00:00:00Z'), approvedAt: new Date('2025-12-03T00:00:00Z'), validFrom: new Date('2026-01-01T00:00:00Z'), validTo: new Date('2026-04-30T00:00:00Z') },

  // PRJ-103 Beacon — Mia Lopez active
  { id: '36666666-0000-0000-2222-000000000005', personId: '11111111-1111-1111-1111-111111111009', projectId: '33333333-3333-3333-3333-333333333004', requestedByPersonId: '11111111-1111-1111-1111-111111111006', assignmentCode: 'ASN-105', staffingRole: 'Mobile Engineer',     status: 'ASSIGNED',    allocationPercent: '100.00', requestedAt: new Date('2025-11-01T00:00:00Z'), approvedAt: new Date('2025-11-03T00:00:00Z'), validFrom: new Date('2025-11-15T00:00:00Z') },
  { id: '36666666-0000-0000-2222-000000000006', personId: '11111111-1111-1111-2222-000000000006', projectId: '33333333-3333-3333-3333-333333333004', requestedByPersonId: '11111111-1111-1111-1111-111111111006', assignmentCode: 'ASN-106', staffingRole: 'Backend Engineer',    status: 'ASSIGNED',    allocationPercent: '80.00', requestedAt: new Date('2025-11-01T00:00:00Z'), approvedAt: new Date('2025-11-03T00:00:00Z'), validFrom: new Date('2025-11-15T00:00:00Z') },

  // PRJ-104 Nova — Rin Yamamoto active
  { id: '36666666-0000-0000-2222-000000000007', personId: '11111111-1111-1111-2222-000000000009', projectId: '33333333-3333-3333-3333-333333333005', requestedByPersonId: '11111111-1111-1111-1111-111111111006', assignmentCode: 'ASN-107', staffingRole: 'Analytics Engineer',  status: 'ASSIGNED',    allocationPercent: '60.00', requestedAt: new Date('2025-10-01T00:00:00Z'), approvedAt: new Date('2025-10-03T00:00:00Z'), validFrom: new Date('2025-10-15T00:00:00Z'), validTo: new Date('2026-04-30T00:00:00Z') },

  // PRJ-105 Polaris — Harper Ali active (60%), Kwame Mensah active
  { id: '36666666-0000-0000-2222-000000000008', personId: '11111111-1111-1111-1111-111111111011', projectId: '33333333-3333-3333-3333-333333333006', requestedByPersonId: '11111111-1111-1111-1111-111111111007', assignmentCode: 'ASN-108', staffingRole: 'Security Analyst',    status: 'ASSIGNED',    allocationPercent: '60.00', requestedAt: new Date('2025-12-01T00:00:00Z'), approvedAt: new Date('2025-12-03T00:00:00Z'), validFrom: new Date('2026-01-01T00:00:00Z') },
  { id: '36666666-0000-0000-2222-000000000009', personId: '11111111-1111-1111-2222-000000000010', projectId: '33333333-3333-3333-3333-333333333006', requestedByPersonId: '11111111-1111-1111-1111-111111111007', assignmentCode: 'ASN-109', staffingRole: 'Data Analyst',         status: 'BOOKED',  allocationPercent: '40.00', requestedAt: new Date('2026-01-15T00:00:00Z'), approvedAt: new Date('2026-01-17T00:00:00Z'), validFrom: new Date('2026-02-01T00:00:00Z') },

  // PRJ-107 Jupiter — only a REQUESTED assignment (no APPROVED/ACTIVE) → staffing gap
  { id: '36666666-0000-0000-2222-000000000010', personId: '11111111-1111-1111-2222-000000000016', projectId: '33333333-3333-3333-2222-000000000002', requestedByPersonId: '11111111-1111-1111-1111-111111111010', assignmentCode: 'ASN-110', staffingRole: 'Project Coordinator',  status: 'PROPOSED', allocationPercent: '50.00', requestedAt: new Date('2026-03-10T00:00:00Z'), validFrom: new Date('2026-04-15T00:00:00Z') },

  // PRJ-110 Mars — REJECTED assignment for Harper Ali but evidence exists → anomaly
  { id: '36666666-0000-0000-2222-000000000011', personId: '11111111-1111-1111-1111-111111111011', projectId: '33333333-3333-3333-2222-000000000005', requestedByPersonId: '11111111-1111-1111-1111-111111111007', assignmentCode: 'ASN-111', staffingRole: 'Data Analyst',         status: 'REJECTED',  allocationPercent: '20.00', requestedAt: new Date('2025-11-01T00:00:00Z'), validFrom: new Date('2025-11-15T00:00:00Z') },

  // PRJ-108 Saturn (ON_HOLD) — Fiona McLeod was active, now ENDED before hold
  { id: '36666666-0000-0000-2222-000000000012', personId: '11111111-1111-1111-2222-000000000015', projectId: '33333333-3333-3333-2222-000000000003', requestedByPersonId: '11111111-1111-1111-1111-111111111005', assignmentCode: 'ASN-112', staffingRole: 'Senior Program Manager', status: 'COMPLETED',   allocationPercent: '50.00', requestedAt: new Date('2025-09-15T00:00:00Z'), approvedAt: new Date('2025-09-17T00:00:00Z'), validFrom: new Date('2025-10-01T00:00:00Z'), validTo: new Date('2026-01-31T00:00:00Z') },

  // PRJ-100 Bench — Consulting team on bench assignments (approved)
  { id: '36666666-0000-0000-2222-000000000013', personId: '11111111-1111-1111-2222-000000000013', projectId: '33333333-3333-3333-3333-333333333001', requestedByPersonId: '11111111-1111-1111-1111-111111111005', assignmentCode: 'ASN-113', staffingRole: 'Bench Consultant',    status: 'ASSIGNED',    allocationPercent: '100.00', requestedAt: new Date('2026-02-01T00:00:00Z'), approvedAt: new Date('2026-02-03T00:00:00Z'), validFrom: new Date('2026-02-15T00:00:00Z') },
  { id: '36666666-0000-0000-2222-000000000014', personId: '11111111-1111-1111-2222-000000000014', projectId: '33333333-3333-3333-3333-333333333001', requestedByPersonId: '11111111-1111-1111-1111-111111111005', assignmentCode: 'ASN-114', staffingRole: 'Bench Consultant',    status: 'BOOKED',  allocationPercent: '100.00', requestedAt: new Date('2026-02-01T00:00:00Z'), approvedAt: new Date('2026-02-03T00:00:00Z'), validFrom: new Date('2026-03-01T00:00:00Z') },

  // PRJ-101 — past ended assignment for date-range filter test (JTBD-DM4)
  { id: '36666666-0000-0000-2222-000000000015', personId: '11111111-1111-1111-2222-000000000018', projectId: '33333333-3333-3333-3333-333333333002', requestedByPersonId: '11111111-1111-1111-1111-111111111010', assignmentCode: 'ASN-115', staffingRole: 'Backend Engineer',    status: 'COMPLETED',     allocationPercent: '100.00', requestedAt: new Date('2025-05-01T00:00:00Z'), approvedAt: new Date('2025-05-03T00:00:00Z'), validFrom: new Date('2025-06-01T00:00:00Z'), validTo: new Date('2026-01-31T00:00:00Z') },
  // Victor's assignment ended when he was terminated
  { id: '36666666-0000-0000-2222-000000000016', personId: '11111111-1111-1111-2222-000000000018', projectId: '33333333-3333-3333-3333-333333333004', requestedByPersonId: '11111111-1111-1111-1111-111111111006', assignmentCode: 'ASN-116', staffingRole: 'Software Engineer',   status: 'COMPLETED',     allocationPercent: '60.00', requestedAt: new Date('2025-03-01T00:00:00Z'), approvedAt: new Date('2025-03-03T00:00:00Z'), validFrom: new Date('2025-03-15T00:00:00Z'), validTo: new Date('2026-01-31T00:00:00Z') },

  // REVOKED assignment (on-leave engineer, Isabel Ferreira)
  { id: '36666666-0000-0000-2222-000000000017', personId: '11111111-1111-1111-2222-000000000017', projectId: '33333333-3333-3333-3333-333333333003', requestedByPersonId: '11111111-1111-1111-1111-111111111006', assignmentCode: 'ASN-117', staffingRole: 'Software Engineer',   status: 'CANCELLED',   allocationPercent: '50.00', requestedAt: new Date('2025-10-01T00:00:00Z'), approvedAt: new Date('2025-10-03T00:00:00Z'), validFrom: new Date('2025-11-01T00:00:00Z'), validTo: new Date('2026-03-31T00:00:00Z') },

  // Future pipeline (validFrom > today, JTBD-RM3)
  { id: '36666666-0000-0000-2222-000000000018', personId: '11111111-1111-1111-2222-000000000007', projectId: '33333333-3333-3333-2222-000000000002', requestedByPersonId: '11111111-1111-1111-1111-111111111010', assignmentCode: 'ASN-118', staffingRole: 'Frontend Engineer',   status: 'BOOKED',  allocationPercent: '80.00', requestedAt: new Date('2026-04-01T00:00:00Z'), approvedAt: new Date('2026-04-03T00:00:00Z'), validFrom: new Date('2026-06-01T00:00:00Z') },

  // Nora Blake unassigned (tests UNASSIGNED allocation indicator)
  // — Nora is in POOL-ENG but has no current assignment intentionally

  // Zoe Turner — consultant currently on PRJ-100 bench (covers POOL-CON)
  { id: '36666666-0000-0000-2222-000000000019', personId: '11111111-1111-1111-1111-111111111012', projectId: '33333333-3333-3333-3333-333333333001', requestedByPersonId: '11111111-1111-1111-1111-111111111005', assignmentCode: 'ASN-119', staffingRole: 'Bench Consultant',    status: 'ASSIGNED',    allocationPercent: '100.00', requestedAt: new Date('2026-01-15T00:00:00Z'), approvedAt: new Date('2026-01-17T00:00:00Z'), validFrom: new Date('2026-02-01T00:00:00Z') },

  // Aisha Musa — on PRJ-105 Polaris (active, 50%)
  { id: '36666666-0000-0000-2222-000000000020', personId: '11111111-1111-1111-2222-000000000011', projectId: '33333333-3333-3333-3333-333333333006', requestedByPersonId: '11111111-1111-1111-1111-111111111007', assignmentCode: 'ASN-120', staffingRole: 'Senior Consultant',   status: 'ASSIGNED',    allocationPercent: '50.00', requestedAt: new Date('2026-01-10T00:00:00Z'), approvedAt: new Date('2026-01-12T00:00:00Z'), validFrom: new Date('2026-02-01T00:00:00Z') },

  // Raj Kapoor — pending approval for PRJ-106 Mercury (DRAFT project, REQUESTED)
  { id: '36666666-0000-0000-2222-000000000021', personId: '11111111-1111-1111-2222-000000000016', projectId: '33333333-3333-3333-2222-000000000001', requestedByPersonId: '11111111-1111-1111-1111-111111111010', assignmentCode: 'ASN-121', staffingRole: 'Project Coordinator', status: 'PROPOSED', allocationPercent: '100.00', requestedAt: new Date('2026-04-01T00:00:00Z'), validFrom: new Date('2026-05-01T00:00:00Z') },

  // Priya Nair — ops analyst on PRJ-101 (active, supports Director dashboard)
  { id: '36666666-0000-0000-2222-000000000022', personId: '11111111-1111-1111-2222-000000000004', projectId: '33333333-3333-3333-3333-333333333002', requestedByPersonId: '11111111-1111-1111-2222-000000000003', assignmentCode: 'ASN-122', staffingRole: 'Operations Analyst',  status: 'ASSIGNED',    allocationPercent: '50.00', requestedAt: new Date('2025-12-01T00:00:00Z'), approvedAt: new Date('2025-12-03T00:00:00Z'), validFrom: new Date('2026-01-01T00:00:00Z') },
];

// ---------------------------------------------------------------------------
// ASSIGNMENT APPROVALS (one per approved/active/ended/revoked assignment)
// ---------------------------------------------------------------------------

export const phase2AssignmentApprovals = phase2Assignments
  .filter((a) => ['ACTIVE', 'APPROVED', 'ENDED', 'REVOKED'].includes(a.status))
  .map((a, i) => ({
    id: `37777777-0000-0000-2222-${String(i + 1).padStart(12, '0')}`,
    assignmentId: a.id,
    decidedByPersonId: a.requestedByPersonId,
    sequenceNumber: 1,
    decision: 'APPROVED',
    decisionReason: 'Phase 2 dataset — seeded approval.',
    decisionAt: a.approvedAt ?? a.requestedAt,
  }));

// Rejection approval for PRJ-110 Mars (JTBD anomaly)
export const phase2RejectionApproval = {
  id: '37777777-0000-0000-2222-999999999001',
  assignmentId: '36666666-0000-0000-2222-000000000011',
  decidedByPersonId: '11111111-1111-1111-1111-111111111007',
  sequenceNumber: 1,
  decision: 'REJECTED',
  decisionReason: 'Resource not available for Mars project.',
  decisionAt: new Date('2025-11-10T00:00:00Z'),
};

export const allPhase2AssignmentApprovals = [...phase2AssignmentApprovals, phase2RejectionApproval];

// ---------------------------------------------------------------------------
// ASSIGNMENT HISTORY
// ---------------------------------------------------------------------------

export const phase2AssignmentHistory = phase2Assignments.map((a, i) => ({
  id: `38888888-0000-0000-2222-${String(i + 1).padStart(12, '0')}`,
  assignmentId: a.id,
  changedByPersonId: a.requestedByPersonId,
  changeType: 'STATUS_PROPOSED',
  changeReason: 'Phase 2 dataset initialization.',
  previousSnapshot: null,
  newSnapshot: { allocationPercent: a.allocationPercent, personId: a.personId, projectId: a.projectId, status: a.status },
  occurredAt: a.requestedAt,
}));

// ---------------------------------------------------------------------------
// WORK EVIDENCE SOURCES (3)
// ---------------------------------------------------------------------------

export const phase2WorkEvidenceSources = [
  { id: '39999999-0000-0000-2222-000000000001', provider: 'JIRA',     sourceType: 'WORKLOG',    connectionKey: 'jira-cloud-primary',    displayName: 'Jira Cloud Worklogs' },
  { id: '39999999-0000-0000-2222-000000000002', provider: 'INTERNAL', sourceType: 'TIMESHEET',  connectionKey: 'internal-timesheet',    displayName: 'Internal Timesheet' },
  { id: '39999999-0000-0000-2222-000000000003', provider: 'MANUAL',   sourceType: 'MANUAL_LOG', connectionKey: 'manual-evidence-entry', displayName: 'Manual Evidence Entry' },
];

// Helper — generate week starts (Monday) going back N weeks from 2026-04-06
function mondaysBefore(n: number): Date[] {
  // 2026-04-06 is the Monday of week containing 2026-04-05
  const base = new Date('2026-04-06T00:00:00Z');
  const weeks: Date[] = [];
  for (let w = n - 1; w >= 0; w--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - w * 7);
    weeks.push(d);
  }
  return weeks;
}

const beaconWeeks = mondaysBefore(12);

// ---------------------------------------------------------------------------
// WORK EVIDENCE
// ---------------------------------------------------------------------------

// Beacon 12-week series for Mia Lopez (JTBD-DM5 evidenceByWeek chart)
const beaconEvidence = beaconWeeks.map((weekStart, i) => {
  const occurredOn = new Date(weekStart);
  occurredOn.setUTCDate(weekStart.getUTCDate() + 2); // Wednesday of the week
  return {
    id: `40000000-0000-0000-2222-${String(i + 1).padStart(12, '0')}`,
    workEvidenceSourceId: '39999999-0000-0000-2222-000000000001',
    personId: '11111111-1111-1111-1111-111111111009', // Mia Lopez
    projectId: '33333333-3333-3333-3333-333333333004', // PRJ-103 Beacon
    sourceRecordKey: `WL-BEACON-W${i + 1}`,
    evidenceType: 'JIRA_WORKLOG',
    recordedAt: new Date(occurredOn.getTime() + 86400000),
    occurredOn,
    durationMinutes: 360 + (i % 3) * 60, // 6-8 h variation
    status: i < 10 ? 'RECONCILED' : 'CAPTURED',
    summary: `Beacon sprint work — week ${i + 1}.`,
    details: { issueKey: `BEACON-${100 + i}` },
  };
});

export const phase2WorkEvidence = [
  ...beaconEvidence,

  // PRJ-101 Delivery Central — Ethan Brooks (multiple entries, RECONCILED)
  { id: '40000000-0000-0000-2222-000000000101', workEvidenceSourceId: '39999999-0000-0000-2222-000000000002', personId: '11111111-1111-1111-1111-111111111008', projectId: '33333333-3333-3333-3333-333333333002', sourceRecordKey: 'TS-DELCENT-E1', evidenceType: 'TIMESHEET_ENTRY', recordedAt: new Date('2026-03-31T18:00:00Z'), occurredOn: new Date('2026-03-30T00:00:00Z'), durationMinutes: 480, status: 'RECONCILED', summary: 'Backend API work.',         details: { category: 'development' } },
  { id: '40000000-0000-0000-2222-000000000102', workEvidenceSourceId: '39999999-0000-0000-2222-000000000002', personId: '11111111-1111-1111-1111-111111111008', projectId: '33333333-3333-3333-3333-333333333002', sourceRecordKey: 'TS-DELCENT-E2', evidenceType: 'TIMESHEET_ENTRY', recordedAt: new Date('2026-04-01T18:00:00Z'), occurredOn: new Date('2026-04-01T00:00:00Z'), durationMinutes: 360, status: 'CAPTURED',    summary: 'Code review.',             details: { category: 'review' } },
  { id: '40000000-0000-0000-2222-000000000103', workEvidenceSourceId: '39999999-0000-0000-2222-000000000002', personId: '11111111-1111-1111-1111-111111111008', projectId: '33333333-3333-3333-3333-333333333002', sourceRecordKey: 'TS-DELCENT-E3', evidenceType: 'TIMESHEET_ENTRY', recordedAt: new Date('2026-04-02T18:00:00Z'), occurredOn: new Date('2026-04-02T00:00:00Z'), durationMinutes: 480, status: 'CAPTURED',    summary: 'Sprint planning.',         details: { category: 'planning' } },
  { id: '40000000-0000-0000-2222-000000000104', workEvidenceSourceId: '39999999-0000-0000-2222-000000000002', personId: '11111111-1111-1111-1111-111111111008', projectId: '33333333-3333-3333-3333-333333333003', sourceRecordKey: 'TS-ATLAS-E1',   evidenceType: 'TIMESHEET_ENTRY', recordedAt: new Date('2026-04-03T18:00:00Z'), occurredOn: new Date('2026-04-03T00:00:00Z'), durationMinutes: 240, status: 'CAPTURED',    summary: 'Atlas integration work.',  details: { category: 'integration' } },

  // PRJ-102 Atlas — Tyler Grant (100% assigned, recent evidence)
  { id: '40000000-0000-0000-2222-000000000105', workEvidenceSourceId: '39999999-0000-0000-2222-000000000001', personId: '11111111-1111-1111-2222-000000000005', projectId: '33333333-3333-3333-3333-333333333003', sourceRecordKey: 'WL-ATLAS-FE1', evidenceType: 'JIRA_WORKLOG',   recordedAt: new Date('2026-04-02T10:00:00Z'), occurredOn: new Date('2026-04-01T00:00:00Z'), durationMinutes: 420, status: 'CAPTURED',    summary: 'Atlas frontend component.', details: { issueKey: 'ATLAS-201' } },
  { id: '40000000-0000-0000-2222-000000000106', workEvidenceSourceId: '39999999-0000-0000-2222-000000000001', personId: '11111111-1111-1111-2222-000000000005', projectId: '33333333-3333-3333-3333-333333333003', sourceRecordKey: 'WL-ATLAS-FE2', evidenceType: 'JIRA_WORKLOG',   recordedAt: new Date('2026-04-04T10:00:00Z'), occurredOn: new Date('2026-04-03T00:00:00Z'), durationMinutes: 360, status: 'CAPTURED',    summary: 'Atlas form validation.',    details: { issueKey: 'ATLAS-202' } },

  // PRJ-110 Mars — Harper Ali evidence WITHOUT approved assignment (anomaly, JTBD-DM2)
  { id: '40000000-0000-0000-2222-000000000107', workEvidenceSourceId: '39999999-0000-0000-2222-000000000003', personId: '11111111-1111-1111-1111-111111111011', projectId: '33333333-3333-3333-2222-000000000005', sourceRecordKey: 'MAN-MARS-1',   evidenceType: 'MANUAL_ENTRY',   recordedAt: new Date('2026-03-20T12:00:00Z'), occurredOn: new Date('2026-03-19T00:00:00Z'), durationMinutes: 180, status: 'CAPTURED',    summary: 'Mars data modelling review.', details: { note: 'Unassigned participation' } },
  { id: '40000000-0000-0000-2222-000000000108', workEvidenceSourceId: '39999999-0000-0000-2222-000000000003', personId: '11111111-1111-1111-1111-111111111011', projectId: '33333333-3333-3333-2222-000000000005', sourceRecordKey: 'MAN-MARS-2',   evidenceType: 'MANUAL_ENTRY',   recordedAt: new Date('2026-04-01T12:00:00Z'), occurredOn: new Date('2026-04-01T00:00:00Z'), durationMinutes: 120, status: 'CAPTURED',    summary: 'Mars schema review.',         details: { note: 'Unassigned participation' } },

  // PRJ-102 Atlas — old evidence after assignment end (IGNORED, anomaly test)
  { id: '40000000-0000-0000-2222-000000000109', workEvidenceSourceId: '39999999-0000-0000-2222-000000000001', personId: '11111111-1111-1111-2222-000000000017', projectId: '33333333-3333-3333-3333-333333333003', sourceRecordKey: 'WL-ATLAS-OLD', evidenceType: 'JIRA_WORKLOG',   recordedAt: new Date('2026-04-01T10:00:00Z'), occurredOn: new Date('2026-04-01T00:00:00Z'), durationMinutes: 60,  status: 'IGNORED',     summary: 'Stale worklog after leave.', details: { issueKey: 'ATLAS-OLD' } },

  // PRJ-105 Polaris — Harper Ali (recent, active assignment exists)
  { id: '40000000-0000-0000-2222-000000000110', workEvidenceSourceId: '39999999-0000-0000-2222-000000000002', personId: '11111111-1111-1111-1111-111111111011', projectId: '33333333-3333-3333-3333-333333333006', sourceRecordKey: 'TS-POLAR-H1', evidenceType: 'TIMESHEET_ENTRY', recordedAt: new Date('2026-04-03T18:00:00Z'), occurredOn: new Date('2026-04-02T00:00:00Z'), durationMinutes: 300, status: 'CAPTURED',    summary: 'Security testing session.', details: { category: 'testing' } },

  // PRJ-104 Nova — Rin Yamamoto (active and evidence present)
  { id: '40000000-0000-0000-2222-000000000111', workEvidenceSourceId: '39999999-0000-0000-2222-000000000002', personId: '11111111-1111-1111-2222-000000000009', projectId: '33333333-3333-3333-3333-333333333005', sourceRecordKey: 'TS-NOVA-R1',  evidenceType: 'TIMESHEET_ENTRY', recordedAt: new Date('2026-04-04T18:00:00Z'), occurredOn: new Date('2026-04-03T00:00:00Z'), durationMinutes: 420, status: 'CAPTURED',    summary: 'Nova pipeline migration.',  details: { category: 'migration' } },

  // ARCHIVED evidence (historical, tests WorkEvidenceStatus enum coverage)
  { id: '40000000-0000-0000-2222-000000000112', workEvidenceSourceId: '39999999-0000-0000-2222-000000000001', personId: '11111111-1111-1111-1111-111111111008', projectId: '33333333-3333-3333-2222-000000000006', sourceRecordKey: 'WL-PLUTO-OLD', evidenceType: 'JIRA_WORKLOG',  recordedAt: new Date('2025-05-01T10:00:00Z'), occurredOn: new Date('2025-04-30T00:00:00Z'), durationMinutes: 240, status: 'ARCHIVED',    summary: 'Pluto legacy work (archived).', details: { issueKey: 'PLUTO-1' } },
];

// ---------------------------------------------------------------------------
// WORK EVIDENCE LINKS
// ---------------------------------------------------------------------------

export const phase2WorkEvidenceLinks = [
  ...beaconEvidence.map((ev, i) => ({
    id: `41111111-0000-0000-2222-${String(i + 1).padStart(12, '0')}`,
    workEvidenceId: ev.id,
    provider: 'JIRA',
    externalKey: ev.details.issueKey,
    externalUrl: `https://jira.example.com/browse/${ev.details.issueKey}`,
    linkType: 'ISSUE',
  })),
  { id: '41111111-0000-0000-2222-000000000101', workEvidenceId: '40000000-0000-0000-2222-000000000105', provider: 'JIRA', externalKey: 'ATLAS-201', externalUrl: 'https://jira.example.com/browse/ATLAS-201', linkType: 'ISSUE' },
  { id: '41111111-0000-0000-2222-000000000102', workEvidenceId: '40000000-0000-0000-2222-000000000106', provider: 'JIRA', externalKey: 'ATLAS-202', externalUrl: 'https://jira.example.com/browse/ATLAS-202', linkType: 'ISSUE' },
  { id: '41111111-0000-0000-2222-000000000103', workEvidenceId: '40000000-0000-0000-2222-000000000109', provider: 'JIRA', externalKey: 'ATLAS-OLD', externalUrl: 'https://jira.example.com/browse/ATLAS-OLD', linkType: 'ISSUE' },
  { id: '41111111-0000-0000-2222-000000000104', workEvidenceId: '40000000-0000-0000-2222-000000000112', provider: 'JIRA', externalKey: 'PLUTO-1',   externalUrl: 'https://jira.example.com/browse/PLUTO-1',   linkType: 'ISSUE' },
];

// ---------------------------------------------------------------------------
// STAFFING REQUESTS (6 requests across key projects — DD-4.1/DD-4.2 fix)
// ---------------------------------------------------------------------------

export const phase2StaffingRequests = [
  // PRJ-107 Jupiter Client Portal — open gap, PM looking for frontend help
  {
    id: '44444444-0000-0000-2222-000000000001',
    projectId: '33333333-3333-3333-2222-000000000002',
    requestedByPersonId: '11111111-1111-1111-1111-111111111010',
    role: 'Frontend Engineer',
    skills: ['React', 'TypeScript', 'CSS'],
    summary: 'Need a frontend engineer to build out the client portal UI.',
    allocationPercent: 80,
    headcountRequired: 1,
    headcountFulfilled: 0,
    priority: 'HIGH',
    status: 'OPEN',
    startDate: new Date('2026-05-01T00:00:00Z'),
    endDate: new Date('2026-10-31T00:00:00Z'),
    createdAt: new Date('2026-03-15T09:00:00Z'),
    updatedAt: new Date('2026-03-16T10:00:00Z'),
  },
  // PRJ-101 Delivery Central Platform — under review, backend engineer proposal
  {
    id: '44444444-0000-0000-2222-000000000002',
    projectId: '33333333-3333-3333-3333-333333333002',
    requestedByPersonId: '11111111-1111-1111-1111-111111111010',
    role: 'Backend Engineer',
    skills: ['NestJS', 'PostgreSQL', 'Prisma'],
    summary: 'Platform needs an additional backend engineer for Q2 delivery.',
    allocationPercent: 100,
    headcountRequired: 1,
    headcountFulfilled: 0,
    priority: 'MEDIUM',
    status: 'IN_REVIEW',
    startDate: new Date('2026-04-15T00:00:00Z'),
    endDate: new Date('2026-12-31T00:00:00Z'),
    createdAt: new Date('2026-03-20T11:00:00Z'),
    updatedAt: new Date('2026-03-25T14:00:00Z'),
  },
  // PRJ-103 Beacon Mobile Revamp — open, QA needed
  {
    id: '44444444-0000-0000-2222-000000000003',
    projectId: '33333333-3333-3333-3333-333333333004',
    requestedByPersonId: '11111111-1111-1111-1111-111111111006',
    role: 'QA Engineer',
    skills: ['Playwright', 'Mobile Testing'],
    summary: 'QA resource needed for mobile regression testing before release.',
    allocationPercent: 50,
    headcountRequired: 1,
    headcountFulfilled: 0,
    priority: 'HIGH',
    status: 'OPEN',
    startDate: new Date('2026-04-20T00:00:00Z'),
    endDate: new Date('2026-06-30T00:00:00Z'),
    createdAt: new Date('2026-04-01T08:00:00Z'),
    updatedAt: new Date('2026-04-01T08:00:00Z'),
  },
  // PRJ-106 Mercury Infrastructure — draft, not yet submitted
  {
    id: '44444444-0000-0000-2222-000000000004',
    projectId: '33333333-3333-3333-2222-000000000001',
    requestedByPersonId: '11111111-1111-1111-1111-111111111010',
    role: 'DevOps Engineer',
    skills: ['Terraform', 'AWS', 'Kubernetes'],
    summary: 'Planning ahead for Mercury cloud infrastructure buildout.',
    allocationPercent: 100,
    headcountRequired: 2,
    headcountFulfilled: 0,
    priority: 'LOW',
    status: 'DRAFT',
    startDate: new Date('2026-06-01T00:00:00Z'),
    endDate: new Date('2026-12-31T00:00:00Z'),
    createdAt: new Date('2026-04-02T15:00:00Z'),
    updatedAt: new Date('2026-04-02T15:00:00Z'),
  },
  // PRJ-105 Polaris Security Hardening — fulfilled
  {
    id: '44444444-0000-0000-2222-000000000005',
    projectId: '33333333-3333-3333-3333-333333333006',
    requestedByPersonId: '11111111-1111-1111-1111-111111111007',
    role: 'Security Analyst',
    skills: ['SAST', 'Penetration Testing'],
    summary: 'Security analyst needed for Polaris hardening sprint.',
    allocationPercent: 60,
    headcountRequired: 1,
    headcountFulfilled: 1,
    priority: 'URGENT',
    status: 'FULFILLED',
    startDate: new Date('2026-01-15T00:00:00Z'),
    endDate: new Date('2026-04-30T00:00:00Z'),
    createdAt: new Date('2025-12-20T10:00:00Z'),
    updatedAt: new Date('2026-01-10T09:00:00Z'),
  },
  // PRJ-102 Atlas ERP Rollout — cancelled due to project closing
  {
    id: '44444444-0000-0000-2222-000000000006',
    projectId: '33333333-3333-3333-3333-333333333003',
    requestedByPersonId: '11111111-1111-1111-1111-111111111006',
    role: 'Business Analyst',
    skills: ['ERP', 'Process Mapping'],
    summary: 'BA for final Atlas ERP integration phase — cancelled as scope reduced.',
    allocationPercent: 80,
    headcountRequired: 1,
    headcountFulfilled: 0,
    priority: 'MEDIUM',
    status: 'CANCELLED',
    startDate: new Date('2026-03-01T00:00:00Z'),
    endDate: new Date('2026-04-30T00:00:00Z'),
    cancelledAt: new Date('2026-02-28T16:00:00Z'),
    createdAt: new Date('2026-02-10T09:00:00Z'),
    updatedAt: new Date('2026-02-28T16:00:00Z'),
  },
];

// Fulfilment record for the FULFILLED Polaris security request
export const phase2StaffingRequestFulfilments = [
  {
    id: '44444444-0000-0000-3333-000000000001',
    requestId: '44444444-0000-0000-2222-000000000005',
    assignedPersonId: '11111111-1111-1111-1111-111111111011', // Harper Ali
    proposedByPersonId: '11111111-1111-1111-1111-111111111006', // Sophia Kim
    fulfilledAt: new Date('2026-01-10T09:00:00Z'),
  },
];

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------

export const phase2DatasetSummary = {
  profile: 'phase2',
  people: phase2People.length,
  orgUnits: phase2OrgUnits.length,
  projects: phase2Projects.length,
  assignments: phase2Assignments.length,
  workEvidenceEntries: phase2WorkEvidence.length,
  resourcePools: phase2ResourcePools.length,
  staffingRequests: phase2StaffingRequests.length,
  localAccounts: 8,
  note: 'Full JTBD verification dataset. Reference date: 2026-04-05.',
};
