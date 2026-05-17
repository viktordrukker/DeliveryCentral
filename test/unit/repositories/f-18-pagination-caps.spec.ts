import { PrismaNotificationRequestRepository } from '@src/modules/notifications/infrastructure/repositories/prisma/prisma-notification-request.repository';
import { PrismaProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/prisma/prisma-project.repository';
import { PrismaMetadataEntryRepository } from '@src/modules/metadata/infrastructure/repositories/prisma/prisma-metadata-entry.repository';
import { PrismaCustomFieldDefinitionRepository } from '@src/modules/metadata/infrastructure/repositories/prisma/prisma-custom-field-definition.repository';

/**
 * F-18 / 20c-12 — assert each capped repository forwards a `take`
 * limit to its Prisma gateway. The cap value itself isn't asserted
 * (it's an implementation tuning knob); only that one is set. The
 * old behaviour was an unbounded `findMany()` with no args.
 */
describe('F-18 / 20c-12 — pagination caps on list-shaped finders', () => {
  it('PrismaNotificationRequestRepository.listAll passes a take limit', async () => {
    const gateway = {
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    };
    const repo = new PrismaNotificationRequestRepository(gateway);
    await repo.listAll();
    expect(gateway.findMany).toHaveBeenCalledTimes(1);
    const args = gateway.findMany.mock.calls[0]?.[0] ?? {};
    expect(args.take).toBeGreaterThan(0);
  });

  it('PrismaProjectRepository.findAll passes a take limit', async () => {
    const gateway = {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    };
    const repo = new PrismaProjectRepository(gateway);
    await repo.findAll();
    expect(gateway.findMany).toHaveBeenCalledTimes(1);
    const args = gateway.findMany.mock.calls[0]?.[0] ?? {};
    expect(args.take).toBeGreaterThan(0);
  });

  it('PrismaMetadataEntryRepository.findByDictionaryId passes a take limit', async () => {
    const gateway = {
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    };
    const repo = new PrismaMetadataEntryRepository(gateway);
    await repo.findByDictionaryId('dict-1');
    expect(gateway.findMany).toHaveBeenCalledTimes(1);
    const args = gateway.findMany.mock.calls[0]?.[0] ?? {};
    expect(args.take).toBeGreaterThan(0);
    expect(args.where).toEqual({ metadataDictionaryId: 'dict-1' });
  });

  it('PrismaCustomFieldDefinitionRepository.findByEntityType passes a take limit', async () => {
    const gateway = {
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
    };
    const repo = new PrismaCustomFieldDefinitionRepository(gateway);
    await repo.findByEntityType('Project');
    expect(gateway.findMany).toHaveBeenCalledTimes(1);
    const args = gateway.findMany.mock.calls[0]?.[0] ?? {};
    expect(args.take).toBeGreaterThan(0);
    expect(args.where.entityType).toBe('Project');
  });
});
