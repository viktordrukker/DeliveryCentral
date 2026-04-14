import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';
import { AuditLoggerService } from './audit-logger.service';
import { BusinessAuditResponseDto } from './contracts/business-audit.dto';

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class BusinessAuditQueryService {
  public constructor(
    private readonly auditLogger: AuditLoggerService,
    private readonly prisma: PrismaService,
  ) {}

  public async execute(query: {
    actionType?: string;
    actorId?: string;
    from?: string;
    limit?: number;
    page?: number;
    pageSize?: number;
    targetEntityId?: string;
    targetEntityType?: string;
    to?: string;
  }): Promise<BusinessAuditResponseDto> {
    const pageSize = query.pageSize ?? query.limit ?? DEFAULT_PAGE_SIZE;
    const page = query.page ?? 1;

    const { items, totalCount } = this.auditLogger.list({
      actionType: query.actionType,
      actorId: query.actorId,
      from: query.from,
      page,
      pageSize,
      targetEntityId: query.targetEntityId,
      targetEntityType: query.targetEntityType,
      to: query.to,
    });

    const actorIds = [...new Set(items.map((r) => r.actorId).filter((id): id is string => Boolean(id)))];
    const dbPeople = actorIds.length > 0
      ? await this.prisma.person.findMany({ select: { id: true, displayName: true }, where: { id: { in: actorIds } } })
      : [];
    const peopleById = new Map(dbPeople.map((p) => [p.id, p.displayName]));

    return {
      items: items.map((record) => ({
        actionType: record.actionType,
        actorId: record.actorId ?? null,
        actorDisplayName: record.actorId ? (peopleById.get(record.actorId) ?? null) : null,
        changeSummary: record.changeSummary ?? null,
        correlationId: record.correlationId ?? null,
        metadata: record.metadata,
        occurredAt: record.occurredAt,
        targetEntityId: record.targetEntityId ?? null,
        targetEntityType: record.targetEntityType,
        oldValues: record.oldValues ?? null,
        newValues: record.newValues ?? null,
      })),
      page,
      pageSize,
      totalCount,
    };
  }
}
