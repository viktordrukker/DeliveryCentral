import { Global, Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { InMemoryAuditLogStore } from './application/in-memory-audit-log.store';
import { AuditLoggerService } from './application/audit-logger.service';
import { BusinessAuditQueryService } from './application/business-audit-query.service';
import { DomainEventService } from './application/domain-event.service';
import { OutboxEventHandlerRegistry } from './application/outbox-event-handler-registry';
import { OutboxEventPublisherService } from './application/outbox-event-publisher.service';
import { PrismaAuditLogStore } from './infrastructure/prisma-audit-log.store';
import { BusinessAuditController } from './presentation/business-audit.controller';

@Global()
@Module({
  controllers: [BusinessAuditController],
  providers: [
    PrismaService,
    {
      provide: PrismaAuditLogStore,
      useFactory: (prisma: PrismaService) => new PrismaAuditLogStore(prisma),
      inject: [PrismaService],
    },
    {
      provide: InMemoryAuditLogStore,
      useExisting: PrismaAuditLogStore,
    },
    AuditLoggerService,
    BusinessAuditQueryService,
    DomainEventService,
    OutboxEventHandlerRegistry,
    OutboxEventPublisherService,
  ],
  exports: [
    InMemoryAuditLogStore,
    PrismaAuditLogStore,
    AuditLoggerService,
    BusinessAuditQueryService,
    DomainEventService,
    OutboxEventHandlerRegistry,
    OutboxEventPublisherService,
  ],
})
export class AuditObservabilityModule {}
