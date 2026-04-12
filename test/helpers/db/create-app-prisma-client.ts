import { PrismaClient } from '@prisma/client';

export function createAppPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Set DATABASE_URL or TEST_DATABASE_URL before running app-backed tests.');
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}
