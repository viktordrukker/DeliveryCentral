import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
import { CreateDictionaryEntryService } from './application/create-dictionary-entry.service';
import { ToggleDictionaryEntryService } from './application/toggle-dictionary-entry.service';
import { MetadataDictionaryQueryService } from './application/metadata-dictionary-query.service';
import { InMemoryMetadataDictionaryRepository } from './infrastructure/repositories/in-memory/in-memory-metadata-dictionary.repository';
import { InMemoryMetadataEntryRepository } from './infrastructure/repositories/in-memory/in-memory-metadata-entry.repository';
import { PrismaMetadataDictionaryRepository } from './infrastructure/repositories/prisma/prisma-metadata-dictionary.repository';
import { PrismaMetadataEntryRepository } from './infrastructure/repositories/prisma/prisma-metadata-entry.repository';
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
      provide: MetadataDictionaryQueryService,
      useFactory: (
        metadataDictionaryRepository: InMemoryMetadataDictionaryRepository,
        metadataEntryRepository: InMemoryMetadataEntryRepository,
      ) =>
        new MetadataDictionaryQueryService(
          metadataDictionaryRepository,
          metadataEntryRepository,
        ),
      inject: [InMemoryMetadataDictionaryRepository, InMemoryMetadataEntryRepository],
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
