import { PrismaClient } from '@prisma/client';

interface ReferenceIds {
  assignmentCode?: string;
  assignmentId?: string;
  caseOwnerPersonId: string;
  caseSubjectPersonId: string;
  caseTypeId: string;
  customFieldDictionaryId: string;
  managerPersonId: string;
  orgUnitId: string;
  projectId: string;
  projectIdTwo: string;
  requestedByPersonId: string;
  resourceManagerId: string;
  subjectPersonId: string;
  workEvidenceSourceId: string;
}

export const persistenceReferenceIds: ReferenceIds = {
  caseOwnerPersonId: '90000000-0000-0000-0000-000000000001',
  caseSubjectPersonId: '90000000-0000-0000-0000-000000000002',
  caseTypeId: '91000000-0000-0000-0000-000000000001',
  customFieldDictionaryId: '92000000-0000-0000-0000-000000000001',
  managerPersonId: '90000000-0000-0000-0000-000000000003',
  orgUnitId: '93000000-0000-0000-0000-000000000001',
  projectId: '94000000-0000-0000-0000-000000000001',
  projectIdTwo: '94000000-0000-0000-0000-000000000002',
  requestedByPersonId: '90000000-0000-0000-0000-000000000004',
  resourceManagerId: '90000000-0000-0000-0000-000000000005',
  subjectPersonId: '90000000-0000-0000-0000-000000000006',
  workEvidenceSourceId: '95000000-0000-0000-0000-000000000001',
};

export async function seedPersistenceReferenceData(prisma: PrismaClient): Promise<void> {
  await prisma.person.createMany({
    data: [
      {
        displayName: 'Case Owner',
        familyName: 'Owner',
        givenName: 'Case',
        id: persistenceReferenceIds.caseOwnerPersonId,
      },
      {
        displayName: 'Case Subject',
        familyName: 'Subject',
        givenName: 'Case',
        id: persistenceReferenceIds.caseSubjectPersonId,
      },
      {
        displayName: 'Line Manager',
        familyName: 'Manager',
        givenName: 'Line',
        id: persistenceReferenceIds.managerPersonId,
      },
      {
        displayName: 'Requester',
        familyName: 'Requester',
        givenName: 'Assignment',
        id: persistenceReferenceIds.requestedByPersonId,
      },
      {
        displayName: 'Resource Manager',
        familyName: 'Manager',
        givenName: 'Resource',
        id: persistenceReferenceIds.resourceManagerId,
      },
      {
        displayName: 'Subject Person',
        familyName: 'Contributor',
        givenName: 'Subject',
        id: persistenceReferenceIds.subjectPersonId,
      },
    ],
  });

  await prisma.orgUnit.create({
    data: {
      code: 'DEP-TST',
      id: persistenceReferenceIds.orgUnitId,
      managerPersonId: persistenceReferenceIds.managerPersonId,
      name: 'Persistence Test Department',
      validFrom: new Date('2025-01-01T00:00:00.000Z'),
    },
  });

  await prisma.project.createMany({
    data: [
      {
        id: persistenceReferenceIds.projectId,
        name: 'Persistence Test Project',
        projectCode: 'PRJ-TST-1',
        status: 'ACTIVE',
      },
      {
        id: persistenceReferenceIds.projectIdTwo,
        name: 'Persistence Test Project Two',
        projectCode: 'PRJ-TST-2',
        status: 'ACTIVE',
      },
    ],
  });

  await prisma.workEvidenceSource.create({
    data: {
      displayName: 'Internal Test Source',
      id: persistenceReferenceIds.workEvidenceSourceId,
      provider: 'INTERNAL',
      sourceType: 'TIMESHEET',
    },
  });

  await prisma.caseType.create({
    data: {
      displayName: 'Onboarding',
      id: persistenceReferenceIds.caseTypeId,
      key: 'ONBOARDING',
    },
  });

  await prisma.metadataDictionary.create({
    data: {
      dictionaryKey: 'project-types',
      displayName: 'Project Types',
      entityType: 'Project',
      id: persistenceReferenceIds.customFieldDictionaryId,
    },
  });
}
