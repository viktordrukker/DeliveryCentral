import { Injectable } from '@nestjs/common';

import { AuditLogRecord } from './audit-log-record';

@Injectable()
export class InMemoryAuditLogStore {
  private readonly records: AuditLogRecord[] = [];

  public append(record: AuditLogRecord): void {
    this.records.push(record);
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
    let items = [...this.records];

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
    this.records.splice(0, this.records.length);
  }
}
