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
      status: evidence.status as any,
    })),
  });

  await prisma.workEvidenceLink.createMany({
    data: demoWorkEvidenceLinks,
  });
}
