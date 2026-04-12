import { PrismaClient } from '@prisma/client';

export async function resetTestDatabase(prisma?: PrismaClient): Promise<void> {
  if (!prisma) {
    return;
  }

  // Keep the helper explicit and opt-in. Tests can pass a Prisma client when
  // repository or integration coverage starts using a disposable database.
  await prisma.$transaction([]);
}
