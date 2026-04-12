import { demoMetadataDictionaries } from '../../../../../../prisma/seeds/demo-dataset';
import { MetadataDictionary } from '../../../domain/entities/metadata-dictionary.entity';
import { InMemoryMetadataDictionaryRepository } from './in-memory-metadata-dictionary.repository';

const personDictionarySeeds = [
  {
    id: '42222222-0000-0000-0000-000000000101',
    dictionaryKey: 'grade',
    displayName: 'Employee Grades',
    description: 'Metadata-backed employee grades.',
    entityType: 'Person',
    isSystemManaged: false,
  },
  {
    id: '42222222-0000-0000-0000-000000000102',
    dictionaryKey: 'role',
    displayName: 'Employee Roles',
    description: 'Metadata-backed employee roles.',
    entityType: 'Person',
    isSystemManaged: false,
  },
  {
    id: '42222222-0000-0000-0000-000000000103',
    dictionaryKey: 'skillset',
    displayName: 'Employee Skillsets',
    description: 'Metadata-backed employee skillsets.',
    entityType: 'Person',
    isSystemManaged: false,
  },
];

export function createSeededInMemoryMetadataDictionaryRepository(): InMemoryMetadataDictionaryRepository {
  return new InMemoryMetadataDictionaryRepository(
    [...demoMetadataDictionaries, ...personDictionarySeeds].map((dictionary) => {
      const seededDictionary = dictionary as typeof dictionary & {
        archivedAt?: Date | null;
        effectiveFrom?: Date;
        scopeOrgUnitId?: string;
      };

      return MetadataDictionary.create(
        {
          archivedAt: seededDictionary.archivedAt ?? undefined,
          description: seededDictionary.description ?? undefined,
          dictionaryKey: seededDictionary.dictionaryKey,
          displayName: seededDictionary.displayName,
          effectiveFrom: seededDictionary.effectiveFrom,
          entityType: seededDictionary.entityType,
          isSystemManaged: seededDictionary.isSystemManaged,
          scopeOrgUnitId: seededDictionary.scopeOrgUnitId ?? undefined,
        },
        seededDictionary.id,
      );
    }),
  );
}
