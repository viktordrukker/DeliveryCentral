import { demoMetadataEntries } from '../../../../../../prisma/seeds/demo-dataset';
import { MetadataEntry } from '../../../domain/entities/metadata-entry.entity';
import { InMemoryMetadataEntryRepository } from './in-memory-metadata-entry.repository';

// Grade entries for the seeded 'grade' dictionary (id: 42222222-0000-0000-0000-000000000101)
const gradeEntries = [
  { id: 'grade-entry-01', entryValue: 'G7',  entryKey: 'g7',  displayName: 'G7 — Junior',             sortOrder: 1 },
  { id: 'grade-entry-02', entryValue: 'G8',  entryKey: 'g8',  displayName: 'G8 — Associate',           sortOrder: 2 },
  { id: 'grade-entry-03', entryValue: 'G9',  entryKey: 'g9',  displayName: 'G9 — Consultant',          sortOrder: 3 },
  { id: 'grade-entry-04', entryValue: 'G10', entryKey: 'g10', displayName: 'G10 — Senior Consultant',  sortOrder: 4 },
  { id: 'grade-entry-05', entryValue: 'G11', entryKey: 'g11', displayName: 'G11 — Manager',            sortOrder: 5 },
  { id: 'grade-entry-06', entryValue: 'G12', entryKey: 'g12', displayName: 'G12 — Senior Manager',     sortOrder: 6 },
  { id: 'grade-entry-07', entryValue: 'G13', entryKey: 'g13', displayName: 'G13 — Director',           sortOrder: 7 },
  { id: 'grade-entry-08', entryValue: 'G14', entryKey: 'g14', displayName: 'G14 — Partner',            sortOrder: 8 },
].map((e) => ({
  ...e,
  isEnabled: true,
  metadataDictionaryId: '42222222-0000-0000-0000-000000000101',
}));

export function createSeededInMemoryMetadataEntryRepository(): InMemoryMetadataEntryRepository {
  const allEntries = [...demoMetadataEntries, ...gradeEntries];

  return new InMemoryMetadataEntryRepository(
    allEntries.map((entry) =>
      MetadataEntry.create(
        {
          archivedAt: (entry as typeof entry & { archivedAt?: Date }).archivedAt ?? undefined,
          displayName: entry.displayName,
          entryKey: entry.entryKey,
          entryValue: entry.entryValue,
          isEnabled: entry.isEnabled,
          metadataDictionaryId: entry.metadataDictionaryId,
          sortOrder: entry.sortOrder,
        },
        entry.id,
      ),
    ),
  );
}
