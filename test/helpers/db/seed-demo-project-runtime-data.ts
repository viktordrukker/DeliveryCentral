import { PrismaClient } from '@prisma/client';

import {
  demoExternalSyncStates,
  demoProjectExternalLinks,
  demoProjects,
} from '../../../prisma/seeds/demo-dataset';

export async function seedDemoProjectRuntimeData(prisma: PrismaClient): Promise<void> {
  await prisma.project.createMany({
    data: demoProjects.map((project) => ({
      ...project,
      status: project.status as any,
    })),
    skipDuplicates: true,
  });

  await prisma.projectExternalLink.createMany({
    data: demoProjectExternalLinks,
    skipDuplicates: true,
  });

  await prisma.externalSyncState.createMany({
    data: demoExternalSyncStates.map((state) => ({
      ...state,
      syncStatus: state.syncStatus as any,
    })),
    skipDuplicates: true,
  });
}
