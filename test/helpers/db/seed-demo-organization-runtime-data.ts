import { PrismaClient } from '@prisma/client';

import {
  demoOrgUnits,
  demoPeople,
  demoPersonOrgMemberships,
  demoPositions,
  demoReportingLines,
  demoResourcePoolMemberships,
  demoResourcePools,
} from '../../../prisma/seeds/demo-dataset';

export async function seedDemoOrganizationRuntimeData(prisma: PrismaClient): Promise<void> {
  await prisma.person.createMany({
    data: demoPeople.map((person) => ({
      ...person,
      employmentStatus: person.employmentStatus as any,
    })),
    skipDuplicates: true,
  });

  await prisma.orgUnit.createMany({
    data: demoOrgUnits.map(({ kind: _kind, ...orgUnit }) => orgUnit),
    skipDuplicates: true,
  });

  await prisma.position.createMany({
    data: demoPositions,
    skipDuplicates: true,
  });

  await prisma.personOrgMembership.createMany({
    data: demoPersonOrgMemberships,
    skipDuplicates: true,
  });

  await prisma.reportingLine.createMany({
    data: demoReportingLines.map((line) => ({
      ...line,
      authority: line.authority as any,
      relationshipType: line.relationshipType as any,
    })),
    skipDuplicates: true,
  });

  await prisma.resourcePool.createMany({
    data: demoResourcePools,
    skipDuplicates: true,
  });

  await prisma.personResourcePoolMembership.createMany({
    data: demoResourcePoolMemberships,
    skipDuplicates: true,
  });
}
