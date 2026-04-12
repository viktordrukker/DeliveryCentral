import { PrismaClient } from '@prisma/client';

export function createTestPrismaClient(): PrismaClient {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Set TEST_DATABASE_URL or DATABASE_URL before running persistence tests.');
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}
