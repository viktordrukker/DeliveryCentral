/**
 * Phase 2 seed identifiers for E2E tests.
 * Requires: SEED_PROFILE=phase2 applied to the database before running.
 */
export const p2 = {
  accounts: {
    admin: { email: 'admin@deliverycentral.local', password: 'DeliveryCentral@Admin1' },
    director: { email: 'noah.bennett@example.com', password: 'DirectorPass1!' },
    hrManager: { email: 'diana.walsh@example.com', password: 'HrManagerPass1!' },
    resourceManager: { email: 'sophia.kim@example.com', password: 'ResourceMgrPass1!' },
    projectManager: { email: 'lucas.reed@example.com', password: 'ProjectMgrPass1!' },
    deliveryManager: { email: 'carlos.vega@example.com', password: 'DeliveryMgrPass1!' },
    employee: { email: 'ethan.brooks@example.com', password: 'EmployeePass1!' },
    dualRole: { email: 'emma.garcia@example.com', password: 'DualRolePass1!' },
  },

  people: {
    ethanBrooks: '11111111-1111-1111-1111-111111111008',   // employee, 120% allocated
    noahBennett: '11111111-1111-1111-1111-111111111002',   // director
    oliviaChen: '11111111-1111-1111-1111-111111111003',    // platform director
    liamPatel: '11111111-1111-1111-1111-111111111004',     // consulting manager
    emmaGarcia: '11111111-1111-1111-1111-111111111005',    // PMO manager / dual rm+hr
    sophiaKim: '11111111-1111-1111-1111-111111111006',     // engineering manager / RM
    masonSingh: '11111111-1111-1111-1111-111111111007',    // data engineering manager
    miaLopez: '11111111-1111-1111-1111-111111111009',      // software engineer
    lucasReed: '11111111-1111-1111-1111-111111111010',     // program manager / PM
    harperAli: '11111111-1111-1111-1111-111111111011',     // business analyst
    zoeTurner: '11111111-1111-1111-1111-111111111012',     // consultant
    dianaWalsh: '11111111-1111-1111-2222-000000000001',    // hr_manager
    carlosVega: '11111111-1111-1111-2222-000000000003',    // delivery_manager
    tylerGrant: '11111111-1111-1111-2222-000000000005',    // frontend engineer
    noraBLake: '11111111-1111-1111-2222-000000000006',     // backend engineer (unassigned)
    aishaMusa: '11111111-1111-1111-2222-000000000011',     // senior consultant
    rajKapoor: '11111111-1111-1111-2222-000000000016',     // project coordinator (pending assignments)
    isabelFerreira: '11111111-1111-1111-2222-000000000017', // on LEAVE
    alexMorgan: '11111111-1111-1111-2222-000000000019',    // orphaned — no org unit
    sophieWright: '11111111-1111-1111-2222-000000000020',  // recent joiner 2026-03-17
  },

  projects: {
    deliveryCentral: '33333333-3333-3333-3333-333333333002',  // PRJ-101 ACTIVE
    atlasERP: '33333333-3333-3333-3333-333333333003',         // PRJ-102 ACTIVE
    beaconMobile: '33333333-3333-3333-3333-333333333004',     // PRJ-103 ACTIVE
    novaAnalytics: '33333333-3333-3333-3333-333333333005',    // PRJ-104 ACTIVE
    polarisHardening: '33333333-3333-3333-3333-333333333006', // PRJ-105 ACTIVE
    mercuryInfra: '33333333-3333-3333-2222-000000000001',     // PRJ-106 DRAFT
    jupiterPortal: '33333333-3333-3333-2222-000000000002',    // PRJ-107 ACTIVE (staffing gap)
    saturnCompliance: '33333333-3333-3333-2222-000000000003', // PRJ-108 ON_HOLD
    venusOnboarding: '33333333-3333-3333-2222-000000000004',  // PRJ-109 COMPLETED
    marsLakehouse: '33333333-3333-3333-2222-000000000005',    // PRJ-110 ACTIVE (evidence anomaly)
    plutoMigration: '33333333-3333-3333-2222-000000000006',   // PRJ-111 ARCHIVED
  },

  assignments: {
    ethanOnDeliveryCentral: '36666666-0000-0000-2222-000000000001',  // ACTIVE 80%
    lucasOnDeliveryCentral: '36666666-0000-0000-2222-000000000002',  // ACTIVE 40%
    rajOnJupiterRequested: '36666666-0000-0000-2222-000000000010',   // REQUESTED (staffing gap)
    rajOnMercuryRequested: '36666666-0000-0000-2222-000000000021',   // REQUESTED
  },
};
