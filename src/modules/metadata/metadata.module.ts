import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
import { CreateDictionaryEntryService } from './application/create-dictionary-entry.service';
import { ToggleDictionaryEntryService } from './application/toggle-dictionary-entry.service';
import { MetadataDictionaryQueryService } from './application/metadata-dictionary-query.service';
import { METADATA_RELATED_ENTITIES_REPOSITORY } from './application/ports/metadata-related-entities.repository.port';
import { InMemoryMetadataDictionaryRepository } from './infrastructure/repositories/in-memory/in-memory-metadata-dictionary.repository';
import { InMemoryMetadataEntryRepository } from './infrastructure/repositories/in-memory/in-memory-metadata-entry.repository';
import { PrismaMetadataDictionaryRepository } from './infrastructure/repositories/prisma/prisma-metadata-dictionary.repository';
import { PrismaMetadataEntryRepository } from './infrastructure/repositories/prisma/prisma-metadata-entry.repository';
import { PrismaMetadataRelatedEntitiesRepository } from './infrastructure/repositories/prisma/prisma-metadata-related-entities.repository';
import { MetadataDictionariesController } from './presentation/metadata-dictionaries.controller';

@Module({
  controllers: [MetadataDictionariesController],
  providers: [
    {
      provide: InMemoryMetadataDictionaryRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaMetadataDictionaryRepository(prisma.metadataDictionary),
      inject: [PrismaService],
    },
    {
      provide: InMemoryMetadataEntryRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaMetadataEntryRepository(prisma.metadataEntry),
      inject: [PrismaService],
    },
    {
      // F-14.4 / 20c-04 — bind the new related-entities port to the
      // Prisma adapter. Queries that used to call Prisma directly from
      // the application layer now go through this port.
      provide: METADATA_RELATED_ENTITIES_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaMetadataRelatedEntitiesRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: MetadataDictionaryQueryService,
      useFactory: (
        metadataDictionaryRepository: InMemoryMetadataDictionaryRepository,
        metadataEntryRepository: InMemoryMetadataEntryRepository,
        relatedEntities: PrismaMetadataRelatedEntitiesRepository,
      ) =>
        new MetadataDictionaryQueryService(
          metadataDictionaryRepository,
          metadataEntryRepository,
          relatedEntities,
        ),
      inject: [
        InMemoryMetadataDictionaryRepository,
        InMemoryMetadataEntryRepository,
        METADATA_RELATED_ENTITIES_REPOSITORY,
      ],
    },
    {
      provide: CreateDictionaryEntryService,
      useFactory: (
        metadataDictionaryRepository: InMemoryMetadataDictionaryRepository,
        metadataEntryRepository: InMemoryMetadataEntryRepository,
        auditLogger: AuditLoggerService,
      ) =>
        new CreateDictionaryEntryService(
          metadataDictionaryRepository,
          metadataEntryRepository,
          auditLogger,
        ),
      inject: [InMemoryMetadataDictionaryRepository, InMemoryMetadataEntryRepository, AuditLoggerService],
    },
    {
      provide: ToggleDictionaryEntryService,
      useFactory: (metadataEntryRepository: InMemoryMetadataEntryRepository) =>
        new ToggleDictionaryEntryService(metadataEntryRepository),
      inject: [InMemoryMetadataEntryRepository],
    },
  ],
  exports: [MetadataDictionaryQueryService, CreateDictionaryEntryService, ToggleDictionaryEntryService],
})
export class MetadataModule {}
