import request from 'supertest';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { InMemoryMetadataDictionaryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/in-memory-metadata-dictionary.repository';
import { InMemoryMetadataEntryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/in-memory-metadata-entry.repository';
import { createSeededInMemoryMetadataDictionaryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-dictionary.repository';
import { createSeededInMemoryMetadataEntryRepository } from '@src/modules/metadata/infrastructure/repositories/in-memory/create-seeded-in-memory-metadata-entry.repository';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createApiTestApp } from '../helpers/api/create-api-test-app';
import { createPrismaServiceStub } from '../helpers/db/mock-prisma-client';

describe('metadata dictionary API contract', () => {
  it('returns stable dictionary list fields required by the admin UI', async () => {
    const app = await createApiTestApp((builder) =>
      builder
        .overrideProvider(InMemoryMetadataDictionaryRepository)
        .useValue(createSeededInMemoryMetadataDictionaryRepository())
        .overrideProvider(InMemoryMetadataEntryRepository)
        .useValue(createSeededInMemoryMetadataEntryRepository())
        .overrideProvider(PrismaService)
        .useValue(
          createPrismaServiceStub({
            customFieldDefinition: { count: async () => 0 },
            entityLayoutDefinition: { findMany: async () => [] },
            workflowDefinition: {
              count: async () => 0,
              findMany: async () => [],
            },
            // Two app paths read platformSetting at boot/per-request:
            //  - assignment-sla-sweep.service.onModuleInit -> findUnique('sla.sweep.intervalMs')
            //  - require-setup-complete.guard -> findUnique('setup.completedAt')
            // The guard returns 503 unless setup.completedAt is non-null;
            // mark it complete so contract tests can hit business endpoints.
            platformSetting: {
              findUnique: async ({ where }: { where: { key: string } }) => {
                if (where?.key === 'setup.completedAt') {
                  return {
                    key: 'setup.completedAt',
                    value: new Date('2026-01-01T00:00:00.000Z').toISOString(),
                  };
                }
                return null;
              },
              findMany: async () => [],
            },
          }),
        ),
    );

    const response = await request(app.getHttpServer())
      .get('/metadata/dictionaries')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        dictionaryKey: expect.any(String),
        displayName: expect.any(String),
        enabledEntryCount: expect.any(Number),
        entityType: expect.any(String),
        entryCount: expect.any(Number),
        id: expect.any(String),
      }),
    );

    await app.close();
  }, 15_000);
});
