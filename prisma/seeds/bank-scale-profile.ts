import {
  demoAssignmentApprovals,
  demoAssignmentHistory,
  demoAssignments,
  demoDatasetSummary,
  demoExternalSyncStates,
  demoOrgUnits,
  demoPeople,
  demoPersonOrgMemberships,
  demoPositions,
  demoProjectExternalLinks,
  demoProjects,
  demoReportingLines,
  demoResourcePoolMemberships,
  demoResourcePools,
  demoWorkEvidence,
  demoWorkEvidenceLinks,
  demoWorkEvidenceSources,
} from './demo-dataset';

const AS_OF = new Date('2026-04-04T00:00:00.000Z');
const BASE_DATE = new Date('2024-01-01T00:00:00.000Z');

const DIRECTORATE_COUNT = 8;
const DEPARTMENTS_PER_DIRECTORATE = 12;
const DEPARTMENT_COUNT = DIRECTORATE_COUNT * DEPARTMENTS_PER_DIRECTORATE;
const GENERATED_PERSON_TARGET = 10240 - demoPeople.length;
const GENERATED_PROJECT_COUNT = 1500;
const GENERATED_EVIDENCE_SOURCE_COUNT = 3;

const BANK_EXECUTIVE_INDEX = 0;
const BANK_HR_LEAD_INDEX = 1;
const DIRECTORATE_MANAGER_START_INDEX = 2;
const DEPARTMENT_MANAGER_START_INDEX = DIRECTORATE_MANAGER_START_INDEX + DIRECTORATE_COUNT;
const PROJECT_MANAGER_START_INDEX = DEPARTMENT_MANAGER_START_INDEX + DEPARTMENT_COUNT;
const PROJECT_MANAGER_COUNT = 200;
const DELIVERY_STAFF_START_INDEX = PROJECT_MANAGER_START_INDEX + PROJECT_MANAGER_COUNT;

interface SeedDataset {
  assignmentApprovals: Array<Record<string, any>>;
  assignmentHistory: Array<Record<string, any>>;
  assignments: Array<Record<string, any>>;
  externalSyncStates: Array<Record<string, any>>;
  orgUnits: Array<Record<string, any>>;
  people: Array<Record<string, any>>;
  personOrgMemberships: Array<Record<string, any>>;
  positions: Array<Record<string, any>>;
  projectExternalLinks: Array<Record<string, any>>;
  projects: Array<Record<string, any>>;
  reportingLines: Array<Record<string, any>>;
  resourcePoolMemberships: Array<Record<string, any>>;
  resourcePools: Array<Record<string, any>>;
  summary: {
    benchmarkReferences: {
      departmentId: string;
      employeePersonId: string;
      exceptionProjectId: string;
      hrDashboardPersonId: string;
      projectId: string;
      projectManagerPersonId: string;
      resourceManagerPersonId: string;
      teamId: string;
    };
    counts: {
      activeAssignments: number;
      assignments: number;
      orgUnits: number;
      people: number;
      projects: number;
      resourcePools: number;
      workEvidence: number;
    };
    profile: 'bank-scale';
    profileNotes: string[];
  };
  workEvidence: Array<Record<string, any>>;
  workEvidenceLinks: Array<Record<string, any>>;
  workEvidenceSources: Array<Record<string, any>>;
}

function deterministicUuid(seed: number, index: number): string {
  const prefix = seed.toString(16).padStart(8, '0').slice(-8);
  const suffix = index.toString(16).padStart(24, '0').slice(-24);

  return `${prefix}-${suffix.slice(0, 4)}-${suffix.slice(4, 8)}-${suffix.slice(8, 12)}-${suffix.slice(12)}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function personIndexToName(index: number): { familyName: string; givenName: string } {
  const given = [
    'Aiden',
    'Aisha',
    'Aria',
    'Caleb',
    'Elena',
    'Farah',
    'Hugo',
    'Iris',
    'Jonah',
    'Leah',
    'Mira',
    'Nolan',
    'Omar',
    'Priya',
    'Rhea',
    'Soren',
    'Talia',
    'Vikram',
    'Yasmin',
    'Zane',
  ];
  const family = [
    'Akhtar',
    'Bishop',
    'Chowdhury',
    'Dawson',
    'Ellis',
    'Farouk',
    'Gibson',
    'Hart',
    'Iqbal',
    'Jensen',
    'Khan',
    'Lawson',
    'Mehta',
    'Nair',
    'Owens',
    'Patel',
    'Quinn',
    'Rahman',
    'Shah',
    'Turner',
  ];

  return {
    familyName: `${family[Math.floor(index / given.length) % family.length]}${Math.floor(index / 400)}`,
    givenName: given[index % given.length],
  };
}

function createBankScaleDataset(): SeedDataset {
  const people: Array<Record<string, any>> = [...demoPeople];
  const orgUnits: Array<Record<string, any>> = [...demoOrgUnits];
  const positions: Array<Record<string, any>> = [...demoPositions];
  const personOrgMemberships: Array<Record<string, any>> = [...demoPersonOrgMemberships];
  const reportingLines: Array<Record<string, any>> = [...demoReportingLines];
  const resourcePools: Array<Record<string, any>> = [...demoResourcePools];
  const resourcePoolMemberships: Array<Record<string, any>> = [...demoResourcePoolMemberships];
  const projects: Array<Record<string, any>> = [...demoProjects];
  const projectExternalLinks: Array<Record<string, any>> = [...demoProjectExternalLinks];
  const externalSyncStates: Array<Record<string, any>> = [...demoExternalSyncStates];
  const assignments: Array<Record<string, any>> = [...demoAssignments];
  const assignmentApprovals: Array<Record<string, any>> = [...demoAssignmentApprovals];
  const assignmentHistory: Array<Record<string, any>> = [...demoAssignmentHistory];
  const workEvidenceSources: Array<Record<string, any>> = [...demoWorkEvidenceSources];
  const workEvidence: Array<Record<string, any>> = [...demoWorkEvidence];
  const workEvidenceLinks: Array<Record<string, any>> = [...demoWorkEvidenceLinks];

  const rootOrgUnitId = deterministicUuid(0x72000001, 1);
  const generatedDirectorateIds: string[] = [];
  const generatedDepartmentIds: string[] = [];
  const generatedTeamIds: string[] = [];
  const generatedPersonIds: string[] = [];
  const projectManagerIds: string[] = [];
  const activeProjectIds: string[] = [];
  const closedProjectIds: string[] = [];
  const closedConflictProjectIds: string[] = [];

  for (let index = 0; index < GENERATED_PERSON_TARGET; index += 1) {
    const personId = deterministicUuid(0x61000001, index + 1);
    const { familyName, givenName } = personIndexToName(index);
    const isExecutive = index === BANK_EXECUTIVE_INDEX;
    const isHrLead = index === BANK_HR_LEAD_INDEX;
    const isDirectorateManager =
      index >= DIRECTORATE_MANAGER_START_INDEX &&
      index < DEPARTMENT_MANAGER_START_INDEX;
    const isDepartmentManager =
      index >= DEPARTMENT_MANAGER_START_INDEX &&
      index < PROJECT_MANAGER_START_INDEX;
    const isProjectManager =
      index >= PROJECT_MANAGER_START_INDEX &&
      index < DELIVERY_STAFF_START_INDEX;
    const isInactive = index >= DELIVERY_STAFF_START_INDEX && index % 47 === 0;
    const role = isExecutive
      ? 'Technology Executive'
      : isHrLead
        ? 'HR Director'
        : isDirectorateManager
          ? 'Director'
          : isDepartmentManager
            ? 'Team Delivery Manager'
            : isProjectManager
              ? 'Project Manager'
              : ['Software Engineer', 'Business Analyst', 'Platform Engineer', 'Delivery Analyst'][
                  index % 4
                ];
    const grade = isExecutive
      ? 'G15'
      : isHrLead || isDirectorateManager
        ? 'G14'
        : isDepartmentManager
          ? 'G13'
          : isProjectManager
            ? 'G11'
            : ['G7', 'G8', 'G9', 'G10'][index % 4];
    const hiredAt = addDays(new Date('2018-01-01T00:00:00.000Z'), index % 1800);
    const terminatedAt = isInactive ? addDays(AS_OF, -(index % 180) - 15) : undefined;

    generatedPersonIds.push(personId);
    if (isProjectManager) {
      projectManagerIds.push(personId);
    }

    people.push({
      id: personId,
      personNumber: `B-${(index + 1).toString().padStart(5, '0')}`,
      givenName,
      familyName,
      displayName: `${givenName} ${familyName}`,
      primaryEmail: `bank.${(index + 1).toString().padStart(5, '0')}@example.bank`,
      grade,
      employmentStatus: isInactive ? 'INACTIVE' : 'ACTIVE',
      hiredAt,
      terminatedAt,
      role,
    });
  }

  const executivePersonId = generatedPersonIds[BANK_EXECUTIVE_INDEX];
  const hrLeadPersonId = generatedPersonIds[BANK_HR_LEAD_INDEX];

  orgUnits.push({
    id: rootOrgUnitId,
    code: 'BANK-IT',
    name: 'Bank Technology',
    description: 'Enterprise-scale technology operating model used for performance validation.',
    managerPersonId: executivePersonId,
    validFrom: BASE_DATE,
  });

  for (let directorateIndex = 0; directorateIndex < DIRECTORATE_COUNT; directorateIndex += 1) {
    const directorateId = deterministicUuid(0x72000002, directorateIndex + 1);
    const managerPersonId =
      generatedPersonIds[DIRECTORATE_MANAGER_START_INDEX + directorateIndex];

    generatedDirectorateIds.push(directorateId);
    orgUnits.push({
      id: directorateId,
      code: `BANK-DIR-${(directorateIndex + 1).toString().padStart(2, '0')}`,
      name: `Technology Directorate ${directorateIndex + 1}`,
      description: `Generated directorate ${directorateIndex + 1} for bank-scale performance profile.`,
      parentOrgUnitId: rootOrgUnitId,
      managerPersonId,
      validFrom: BASE_DATE,
    });
  }

  for (let departmentIndex = 0; departmentIndex < DEPARTMENT_COUNT; departmentIndex += 1) {
    const departmentId = deterministicUuid(0x72000003, departmentIndex + 1);
    const directorateId = generatedDirectorateIds[Math.floor(departmentIndex / DEPARTMENTS_PER_DIRECTORATE)];
    const managerPersonId =
      generatedPersonIds[DEPARTMENT_MANAGER_START_INDEX + departmentIndex];
    const resourcePoolId = deterministicUuid(0x76000001, departmentIndex + 1);

    generatedDepartmentIds.push(departmentId);
    generatedTeamIds.push(resourcePoolId);

    orgUnits.push({
      id: departmentId,
      code: `BANK-DEP-${(departmentIndex + 1).toString().padStart(3, '0')}`,
      name: `Delivery Department ${departmentIndex + 1}`,
      description: `Generated department ${departmentIndex + 1} for bank-scale staffing tests.`,
      parentOrgUnitId: directorateId,
      managerPersonId,
      validFrom: BASE_DATE,
    });

    resourcePools.push({
      id: resourcePoolId,
      code: `BANK-TEAM-${(departmentIndex + 1).toString().padStart(3, '0')}`,
      name: `Team ${departmentIndex + 1}`,
      description: `Persistent team ${departmentIndex + 1} aligned to department ${departmentIndex + 1}.`,
      orgUnitId: departmentId,
    });
  }

  for (let personIndex = 0; personIndex < generatedPersonIds.length; personIndex += 1) {
    const personId = generatedPersonIds[personIndex];
    let orgUnitId = rootOrgUnitId;
    let title = 'Technology Executive';
    let isManagerial = true;

    if (personIndex === BANK_HR_LEAD_INDEX) {
      title = 'HR Director';
    } else if (
      personIndex >= DIRECTORATE_MANAGER_START_INDEX &&
      personIndex < DEPARTMENT_MANAGER_START_INDEX
    ) {
      orgUnitId = generatedDirectorateIds[personIndex - DIRECTORATE_MANAGER_START_INDEX];
      title = `Directorate Manager ${personIndex - DIRECTORATE_MANAGER_START_INDEX + 1}`;
    } else if (
      personIndex >= DEPARTMENT_MANAGER_START_INDEX &&
      personIndex < PROJECT_MANAGER_START_INDEX
    ) {
      orgUnitId = generatedDepartmentIds[personIndex - DEPARTMENT_MANAGER_START_INDEX];
      title = `Department Manager ${personIndex - DEPARTMENT_MANAGER_START_INDEX + 1}`;
    } else {
      const departmentId =
        generatedDepartmentIds[
          (personIndex - PROJECT_MANAGER_START_INDEX + DEPARTMENT_COUNT * 10) % DEPARTMENT_COUNT
        ];
      orgUnitId = departmentId;
      isManagerial = false;
      title =
        personIndex < DELIVERY_STAFF_START_INDEX ? 'Project Manager' : 'Delivery Specialist';
    }

    const positionId = deterministicUuid(0x73000001, personIndex + 1);
    const validTo =
      people.find((candidate) => candidate.id === personId)?.employmentStatus === 'INACTIVE'
        ? people.find((candidate) => candidate.id === personId)?.terminatedAt
        : undefined;

    positions.push({
      id: positionId,
      orgUnitId,
      occupantPersonId: personId,
      code: `BANK-POS-${(personIndex + 1).toString().padStart(5, '0')}`,
      title,
      description: `${title} seeded for the bank-scale performance profile.`,
      isManagerial,
      validFrom: BASE_DATE,
      validTo,
    });

    personOrgMemberships.push({
      id: deterministicUuid(0x74000001, personIndex + 1),
      personId,
      orgUnitId,
      positionId,
      isPrimary: true,
      validFrom: BASE_DATE,
      validTo,
    });

    if (orgUnitId !== rootOrgUnitId) {
      const departmentIndex = generatedDepartmentIds.indexOf(orgUnitId);
      if (departmentIndex >= 0) {
        resourcePoolMemberships.push({
          id: deterministicUuid(0x77000001, personIndex + 1),
          personId,
          resourcePoolId: generatedTeamIds[departmentIndex],
          validFrom: BASE_DATE,
          validTo,
        });
      }
    }
  }

  reportingLines.push({
    id: deterministicUuid(0x75000001, 1),
    subjectPersonId: hrLeadPersonId,
    managerPersonId: executivePersonId,
    relationshipType: 'SOLID_LINE',
    authority: 'APPROVER',
    isPrimary: true,
    validFrom: BASE_DATE,
  });

  generatedDirectorateIds.forEach((_, index) => {
    reportingLines.push({
      id: deterministicUuid(0x75000002, index + 1),
      subjectPersonId: generatedPersonIds[DIRECTORATE_MANAGER_START_INDEX + index],
      managerPersonId: executivePersonId,
      relationshipType: 'SOLID_LINE',
      authority: 'APPROVER',
      isPrimary: true,
      validFrom: BASE_DATE,
    });
  });

  generatedDepartmentIds.forEach((_, index) => {
    const directorateManagerId =
      generatedPersonIds[
        DIRECTORATE_MANAGER_START_INDEX + Math.floor(index / DEPARTMENTS_PER_DIRECTORATE)
      ];

    reportingLines.push({
      id: deterministicUuid(0x75000003, index + 1),
      subjectPersonId: generatedPersonIds[DEPARTMENT_MANAGER_START_INDEX + index],
      managerPersonId: directorateManagerId,
      relationshipType: 'SOLID_LINE',
      authority: 'APPROVER',
      isPrimary: true,
      validFrom: BASE_DATE,
    });
  });

  for (let personIndex = PROJECT_MANAGER_START_INDEX; personIndex < generatedPersonIds.length; personIndex += 1) {
    const departmentId =
      generatedDepartmentIds[
        (personIndex - PROJECT_MANAGER_START_INDEX + DEPARTMENT_COUNT * 10) % DEPARTMENT_COUNT
      ];
    const departmentIndex = generatedDepartmentIds.indexOf(departmentId);
    const managerPersonId = generatedPersonIds[DEPARTMENT_MANAGER_START_INDEX + departmentIndex];
    const personId = generatedPersonIds[personIndex];
    const validTo =
      people.find((candidate) => candidate.id === personId)?.employmentStatus === 'INACTIVE'
        ? people.find((candidate) => candidate.id === personId)?.terminatedAt
        : undefined;

    reportingLines.push({
      id: deterministicUuid(0x75000004, personIndex + 1),
      subjectPersonId: personId,
      managerPersonId,
      relationshipType: 'SOLID_LINE',
      authority: 'APPROVER',
      isPrimary: true,
      validFrom: BASE_DATE,
      validTo,
    });
  }

  for (let index = 0; index < GENERATED_PROJECT_COUNT; index += 1) {
    const projectId = deterministicUuid(0x83000001, index + 1);
    const projectManagerId = projectManagerIds[index % projectManagerIds.length];
    const isClosed = index >= 1320;
    const isDraft = !isClosed && index >= 1080;
    const status = isClosed ? 'CLOSED' : isDraft ? 'DRAFT' : 'ACTIVE';
    const startsOn = addDays(new Date('2025-01-01T00:00:00.000Z'), index % 365);
    const endsOn = isClosed
      ? addDays(new Date('2026-01-01T00:00:00.000Z'), -(index % 160) - 1)
      : addDays(startsOn, 180 + (index % 120));

    projects.push({
      id: projectId,
      projectCode: `BANK-PROJ-${(index + 1).toString().padStart(4, '0')}`,
      name: `Bank Transformation Initiative ${index + 1}`,
      description: 'Generated project for scale-oriented staffing tests.',
      projectManagerId,
      status,
      startsOn,
      endsOn,
      version: 1,
    });

    if (status === 'ACTIVE') {
      activeProjectIds.push(projectId);
    } else if (status === 'CLOSED') {
      closedProjectIds.push(projectId);
      if (closedConflictProjectIds.length < 16) {
        closedConflictProjectIds.push(projectId);
      }
    }
  }

  const workEvidenceSourceIds = Array.from({ length: GENERATED_EVIDENCE_SOURCE_COUNT }, (_, index) =>
    deterministicUuid(0x39000001, index + 10),
  );

  workEvidenceSources.push(
    {
      id: workEvidenceSourceIds[0],
      provider: 'JIRA',
      sourceType: 'JIRA_WORKLOG',
      connectionKey: 'bank-jira',
      displayName: 'Bank Jira Data Center',
    },
    {
      id: workEvidenceSourceIds[1],
      provider: 'TIMESHEET',
      sourceType: 'TIMESHEET_ENTRY',
      connectionKey: 'bank-timesheet',
      displayName: 'Bank Timesheet Platform',
    },
    {
      id: workEvidenceSourceIds[2],
      provider: 'M365',
      sourceType: 'M365_ACTIVITY',
      connectionKey: 'bank-m365',
      displayName: 'Bank M365 Activity',
    },
  );

  const generatedActivePeople = people.filter(
    (person) =>
      person.id.startsWith('61000001-') &&
      person.employmentStatus === 'ACTIVE' &&
      person.id !== executivePersonId &&
      person.id !== hrLeadPersonId,
  );
  const assignmentEligiblePeople = generatedActivePeople.slice(0, 9200);
  const assignmentSeedProjects = activeProjectIds.slice(0, 1000);
  let assignmentSequence = 0;

  assignmentEligiblePeople.forEach((person, personIndex) => {
    const assignmentSlots = personIndex % 4 === 0 ? 2 : 3;

    for (let slot = 0; slot < assignmentSlots; slot += 1) {
      assignmentSequence += 1;

      const assignmentId = deterministicUuid(0x34000001, assignmentSequence);
      const projectId =
        slot === 0 && personIndex < closedConflictProjectIds.length * 3
          ? closedConflictProjectIds[personIndex % closedConflictProjectIds.length]
          : assignmentSeedProjects[(personIndex * 7 + slot * 17) % assignmentSeedProjects.length];
      const requestedByPersonId =
        projects.find((project) => project.id === projectId)?.projectManagerId ??
        projectManagerIds[personIndex % projectManagerIds.length];
      const primaryStartDate = addDays(new Date('2025-01-01T00:00:00.000Z'), personIndex % 330);
      const startDate = addDays(primaryStartDate, slot * 45);
      let status: 'PROPOSED' | 'BOOKED' | 'ASSIGNED' | 'COMPLETED' = 'ASSIGNED';
      let validTo: Date | undefined;
      let approvedAt: Date | undefined;
      let requestedAt = addDays(startDate, -7);

      if (slot === 1 && personIndex % 10 === 0) {
        status = 'PROPOSED';
        requestedAt = addDays(AS_OF, -30 - (personIndex % 60));
      } else if (slot === 2 && personIndex % 6 === 0) {
        status = 'COMPLETED';
        validTo = addDays(startDate, 35);
        approvedAt = addDays(startDate, -2);
      } else if (slot === 2 || (slot === 1 && personIndex % 5 === 0)) {
        status = 'BOOKED';
        approvedAt = addDays(startDate, -3);
      } else {
        status = 'ASSIGNED';
        approvedAt = addDays(startDate, -4);
      }

      assignments.push({
        id: assignmentId,
        personId: person.id,
        projectId,
        requestedByPersonId,
        assignmentCode: `BANK-ASG-${assignmentSequence.toString().padStart(6, '0')}`,
        staffingRole:
          person.role === 'Project Manager' ? 'PROJECT_MANAGER' : ['ENGINEER', 'ANALYST', 'CONSULTANT'][assignmentSequence % 3],
        status,
        allocationPercent: [25, 50, 75, 100][assignmentSequence % 4],
        requestedAt,
        approvedAt,
        validFrom: startDate,
        validTo,
        notes: 'Generated bank-scale staffing assignment.',
        version: 1,
      });

      assignmentApprovals.push({
        id: deterministicUuid(0x35000001, assignmentSequence),
        assignmentId,
        decidedByPersonId: status === 'PROPOSED' ? undefined : requestedByPersonId,
        sequenceNumber: 1,
        decision: status === 'PROPOSED' ? 'PENDING' : 'APPROVED',
        decisionReason:
          status === 'PROPOSED' ? undefined : 'Approved by generated performance profile.',
        decisionAt: status === 'PROPOSED' ? undefined : approvedAt,
      });

      assignmentHistory.push({
        id: deterministicUuid(0x36000001, assignmentSequence * 10),
        assignmentId,
        changedByPersonId: requestedByPersonId,
        changeType: 'STATUS_PROPOSED',
        changeReason: 'Generated performance pack seed.',
        previousSnapshot: null,
        newSnapshot: {
          personId: person.id,
          projectId,
          status: 'PROPOSED',
        },
        occurredAt: requestedAt,
      });

      if (status !== 'PROPOSED') {
        assignmentHistory.push({
          id: deterministicUuid(0x36000001, assignmentSequence * 10 + 1),
          assignmentId,
          changedByPersonId: requestedByPersonId,
          changeType: 'STATUS_BOOKED',
          changeReason: 'Generated approval event.',
          previousSnapshot: {
            status: 'PROPOSED',
          },
          newSnapshot: {
            status,
          },
          occurredAt: approvedAt ?? addDays(startDate, -2),
        });
      }

      if (status === 'COMPLETED') {
        assignmentHistory.push({
          id: deterministicUuid(0x36000001, assignmentSequence * 10 + 2),
          assignmentId,
          changedByPersonId: requestedByPersonId,
          changeType: 'STATUS_COMPLETED',
          changeReason: 'Generated ended assignment for lifecycle coverage.',
          previousSnapshot: {
            status: 'ASSIGNED',
          },
          newSnapshot: {
            status: 'COMPLETED',
            validTo: validTo?.toISOString(),
          },
          occurredAt: validTo ?? addDays(startDate, 35),
        });
      }
    }
  });

  let workEvidenceSequence = demoWorkEvidence.length;
  assignments
    .filter((assignment) => ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'].includes(assignment.status) && assignment.validFrom <= AS_OF)
    .forEach((assignment, index) => {
      if (index % 6 === 0) {
        return;
      }

      const evidenceCopies = index % 5 === 0 ? 1 : 2;

      for (let copy = 0; copy < evidenceCopies; copy += 1) {
        workEvidenceSequence += 1;
        const workEvidenceId = deterministicUuid(0x40000001, workEvidenceSequence);
        const occurredOn = addDays(
          assignment.validFrom,
          Math.min(20 + copy * 3, Math.max(1, (index % 40) + 1)),
        );

        workEvidence.push({
          id: workEvidenceId,
          workEvidenceSourceId: workEvidenceSourceIds[(index + copy) % workEvidenceSourceIds.length],
          personId: assignment.personId,
          projectId: assignment.projectId,
          sourceRecordKey: `BANK-WE-${workEvidenceSequence.toString().padStart(7, '0')}`,
          evidenceType: ['JIRA_WORKLOG', 'TIMESHEET_ENTRY', 'M365_ACTIVITY'][(index + copy) % 3],
          recordedAt: occurredOn,
          occurredOn,
          durationMinutes: [60, 90, 120, 180][(index + copy) % 4],
          status: 'CAPTURED',
          summary: 'Generated work evidence aligned to assignment coverage.',
          details: {
            slot: copy + 1,
            sourceKind: 'generated-performance-pack',
          },
          trace: {
            generator: 'bank-scale-profile',
          },
        });

        if (workEvidenceSequence % 3 === 0) {
          workEvidenceLinks.push({
            id: deterministicUuid(0x41000001, workEvidenceSequence),
            workEvidenceId,
            provider: 'JIRA',
            externalKey: `BANK-${workEvidenceSequence}`,
            externalUrl: `https://jira.example.bank/browse/BANK-${workEvidenceSequence}`,
            linkType: 'ISSUE',
          });
        }
      }
    });

  const orphanEvidencePeople = assignmentEligiblePeople.slice(0, 120);
  orphanEvidencePeople.forEach((person, index) => {
    workEvidenceSequence += 1;
    const workEvidenceId = deterministicUuid(0x40000001, workEvidenceSequence);
    const projectId = activeProjectIds[(index * 5) % activeProjectIds.length];

    workEvidence.push({
      id: workEvidenceId,
      workEvidenceSourceId: workEvidenceSourceIds[index % workEvidenceSourceIds.length],
      personId: person.id,
      projectId,
      sourceRecordKey: `BANK-ORPHAN-${workEvidenceSequence.toString().padStart(7, '0')}`,
      evidenceType: 'JIRA_WORKLOG',
      recordedAt: addDays(AS_OF, -(index % 14) - 1),
      occurredOn: addDays(AS_OF, -(index % 14) - 1),
      durationMinutes: 60,
      status: 'CAPTURED',
      summary: 'Generated orphan work evidence for exception-queue coverage.',
      details: {
        anomaly: 'EVIDENCE_WITHOUT_ASSIGNMENT',
      },
      trace: {
        generator: 'bank-scale-profile',
      },
    });
  });

  const summary = {
    profile: 'bank-scale' as const,
    counts: {
      activeAssignments: assignments.filter((assignment) => assignment.status === 'ASSIGNED').length,
      assignments: assignments.length,
      orgUnits: orgUnits.length,
      people: people.length,
      projects: projects.length,
      resourcePools: resourcePools.length,
      workEvidence: workEvidence.length,
    },
    benchmarkReferences: {
      departmentId: generatedDepartmentIds[0],
      employeePersonId: assignmentEligiblePeople[25]?.id ?? generatedPersonIds[DELIVERY_STAFF_START_INDEX],
      exceptionProjectId: closedConflictProjectIds[0],
      hrDashboardPersonId: hrLeadPersonId,
      projectId: activeProjectIds[0],
      projectManagerPersonId: projectManagerIds[0],
      resourceManagerPersonId: demoPeople[1].id,
      teamId: generatedTeamIds[0],
    },
    profileNotes: [
      'Adds deterministic generated enterprise-scale data on top of the existing demo dataset.',
      'Includes closed-project staffing conflicts, stale approval requests, and orphan evidence for exception smoke coverage.',
      'Some dashboard services still read directly from demo seed modules; those endpoints are included as smoke checks, not full-scale database benchmarks.',
    ],
  };

  return {
    assignmentApprovals,
    assignmentHistory,
    assignments,
    externalSyncStates,
    orgUnits,
    people,
    personOrgMemberships,
    positions,
    projectExternalLinks,
    projects,
    reportingLines,
    resourcePoolMemberships,
    resourcePools,
    summary,
    workEvidence,
    workEvidenceLinks,
    workEvidenceSources,
  };
}

export const bankScaleDataset = createBankScaleDataset();
export const bankScaleDatasetSummary = bankScaleDataset.summary;
export const bankScaleProfileSummary = {
  ...bankScaleDatasetSummary,
  demoBaseline: demoDatasetSummary,
};
