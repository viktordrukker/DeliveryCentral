import { PrismaClient } from '@prisma/client';

import { CustomFieldDefinition } from '@src/modules/metadata/domain/entities/custom-field-definition.entity';
import { PrismaCustomFieldDefinitionRepository } from '@src/modules/metadata/infrastructure/repositories/prisma/prisma-custom-field-definition.repository';
import { createTestPrismaClient } from '../../helpers/db/create-test-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import {
  persistenceReferenceIds,
  seedPersistenceReferenceData,
} from '../../helpers/db/seed-persistence-reference-data';

describe('Prisma metadata repository', () => {
  let prisma: PrismaClient;
  let repository: PrismaCustomFieldDefinitionRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    repository = new PrismaCustomFieldDefinitionRepository(
      prisma.customFieldDefinition as unknown as ConstructorParameters<typeof PrismaCustomFieldDefinitionRepository>[0],
    );
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedPersistenceReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists metadata-backed custom field definitions', async () => {
    const definition = CustomFieldDefinition.create(
      {
        dataType: 'ENUM',
        displayName: 'Project Type',
        entityType: 'Project',
        fieldKey: 'projectType',
        isRequired: true,
        metadataDictionaryId: persistenceReferenceIds.customFieldDictionaryId,
      },
      '92222222-0000-0000-0000-000000000001',
    );

    await repository.save(definition);

    const fields = await repository.findByEntityType('Project');

    expect(fields).toHaveLength(1);
    expect(fields[0]?.fieldKey).toBe('projectType');
    expect(fields[0]?.metadataDictionaryId).toBe(persistenceReferenceIds.customFieldDictionaryId);
  });

  it('enforces foreign-key consistency for metadata dictionaries', async () => {
    await expect(
      repository.save(
        CustomFieldDefinition.create(
          {
            dataType: 'ENUM',
            displayName: 'Broken Field',
            entityType: 'Project',
            fieldKey: 'brokenField',
            metadataDictionaryId: '92222222-0000-0000-0000-000000000999',
          },
          '92222222-0000-0000-0000-000000000002',
        ),
      ),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
