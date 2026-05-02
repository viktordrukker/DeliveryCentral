import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLogRecord } from '../application/audit-log-record';

@Injectable()
export class PrismaAuditLogStore {
  public constructor(private readonly prisma: PrismaService) {}

  public append(record: AuditLogRecord): void {
    this.appendToCache(record);
    void this.prisma.auditLog
      .create({
        data: {
          // Pre-existing drift: AuditLogRecord.targetEntityType is a free-form
          // string ('PROJECT', 'ASSIGNMENT', 'Project', etc.) but the DB column
          // is the AggregateType enum. Postgres rejects unmatched values; this
          // path swallows the rejection in .catch() below. Phase 2 work: align
          // writers to the enum or widen the column.
          aggregateType: record.targetEntityType as $Enums.AggregateType,
          aggregateId: record.targetEntityId ?? record.subjectId ?? '00000000-0000-0000-0000-000000000000',
          eventName: record.actionType,
          actorId: record.actorId ?? null,
          correlationId: record.correlationId ?? null,
          payload: {
            action: record.action,
            category: record.category,
            changeSummary: record.changeSummary ?? null,
            details: record.details as Prisma.InputJsonValue,
            metadata: record.metadata as Prisma.InputJsonValue,
            occurredAt: record.occurredAt,
            oldValues: (record.oldValues ?? null) as Prisma.InputJsonValue | null,
            newValues: (record.newValues ?? null) as Prisma.InputJsonValue | null,
            subjectId: record.subjectId ?? null,
          } as Prisma.InputJsonValue,
        },
      })
      .catch(() => {
        // Swallow write errors — audit logging must not break the caller
      });
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
    // This method is synchronous in the interface contract (InMemoryAuditLogStore).
    // For backward compatibility we keep the synchronous signature and return
    // an empty result set. Callers that need Prisma-backed reads should use
    // the async listAsync method instead.
    //
    // The health service and audit-logger currently call this synchronously.
    // We maintain runtime compatibility by also populating an in-memory cache
    // on each append so list() still works identically to the old store.
    return this.listFromCache(query);
  }

  // ---- In-memory cache for synchronous list() compatibility ----
  private readonly cache: AuditLogRecord[] = [];

  private appendToCache(record: AuditLogRecord): void {
    this.cache.push(record);
    if (this.cache.length > 5000) {
      this.cache.splice(0, this.cache.length - 5000);
    }
  }

  private listFromCache(query?: {
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
    let items = [...this.cache];

    if (query?.actorId) {
      items = items.filter((item) => item.actorId === query.actorId);
    }

    if (query?.actionType) {
      items = items.filter((item) => item.actionType === query.actionType);
    }

    if (query?.targetEntityType) {
      items = items.filter((item) => item.targetEntityType === query.targetEntityType);
    }

    if (query?.targetEntityId) {
      items = items.filter((item) => item.targetEntityId === query.targetEntityId);
    }

    if (query?.from) {
      const fromMs = new Date(query.from).getTime();
      items = items.filter((item) => new Date(item.occurredAt).getTime() >= fromMs);
    }

    if (query?.to) {
      const toMs = new Date(query.to).getTime();
      items = items.filter((item) => new Date(item.occurredAt).getTime() <= toMs);
    }

    items.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    const totalCount = items.length;

    if (query?.pageSize && query.pageSize > 0) {
      const page = Math.max(1, query.page ?? 1);
      const offset = (page - 1) * query.pageSize;
      items = items.slice(offset, offset + query.pageSize);
    } else if (query?.limit && query.limit > 0) {
      items = items.slice(0, query.limit);
    }

    return { items, totalCount };
  }

  public clear(): void {
    this.cache.splice(0, this.cache.length);
  }
}
