import { Injectable } from '@nestjs/common';

import { CorrelationIdContext } from '@src/shared/observability/correlation-id.context';
import { StructuredLoggerService } from '@src/shared/observability/logger.service';

import { AuditLogRecord } from './audit-log-record';
import { InMemoryAuditLogStore } from './in-memory-audit-log.store';

@Injectable()
export class AuditLoggerService {
  public constructor(
    private readonly store: InMemoryAuditLogStore,
    private readonly logger: StructuredLoggerService,
  ) {}

  public record(
    input: Omit<AuditLogRecord, 'action' | 'correlationId' | 'occurredAt'> & {
      action?: string;
      occurredAt?: string;
    },
  ): void {
    const record: AuditLogRecord = {
      ...input,
      action: input.action ?? input.actionType,
      actionType: input.actionType ?? input.action,
      correlationId: CorrelationIdContext.getCorrelationId() ?? null,
      details: input.details ?? input.metadata ?? {},
      metadata: input.metadata ?? input.details ?? {},
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      subjectId: input.subjectId ?? input.targetEntityId ?? null,
      targetEntityId: input.targetEntityId ?? input.subjectId ?? null,
      oldValues: input.oldValues ?? null,
      newValues: input.newValues ?? null,
    };

    this.store.append(record);
    this.logger.logEvent(
      {
        ...record,
        type: 'business_audit',
      },
      'AuditLoggerService',
    );
  }

  public list(query?: {
    actionType?: string;
    actorId?: string;
    from?: string;
    limit?: number;
    page?: number;
    pageSize?: number;
    targetEntityId?: string;
    targetEntityType?: string;
    to?: string;
  }): { items: AuditLogRecord[]; totalCount: number } {
    return this.store.list(query);
  }
}
