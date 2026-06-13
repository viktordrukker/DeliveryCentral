import { PrismaClient } from '@prisma/client';

import {
  demoWorkEvidence,
  demoWorkEvidenceLinks,
  demoWorkEvidenceSources,
} from '../../../prisma/seeds/demo-dataset';

export async function seedDemoWorkEvidenceRuntimeData(prisma: PrismaClient): Promise<void> {
  await prisma.workEvidenceSource.createMany({
    data: demoWorkEvidenceSources,
  });

  await prisma.workEvidence.createMany({
    data: demoWorkEvidence.map((evidence) => ({
      ...evidence,
      // The demo-dataset fixture types these as plain strings; the Prisma
      // column is now an enum. Cast to satisfy *CreateManyInput, matching the
      // existing `status` cast.
      status: evidence.status as any,
      evidenceType: evidence.evidenceType as any,
    })),
  });

  await prisma.workEvidenceLink.createMany({
    data: demoWorkEvidenceLinks.map((link) => ({
      ...link,
      // Same enum drift as above: the fixture types `linkType` as a plain
      // string; the Prisma column is an enum.
      linkType: link.linkType as any,
    })),
  });
}
