import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';
import { NotificationTemplateRepositoryPort } from '../../../domain/repositories/notification-template-repository.port';
import { NotificationsPrismaMapper } from './notifications-prisma.mapper';

// F-77 / 20c-10 — drop the hand-rolled Gateway (4 `any` methods) in
// favor of `Pick<>` over Prisma's typed delegate.
type Gateway = Pick<
  Prisma.NotificationTemplateDelegate,
  'delete' | 'findFirst' | 'findMany' | 'upsert'
>;

/**
 * F-6.2 / D-144 — cap on listActive(). Template tables are small (~50
 * rows in a typical tenant) so this is defensive; if a tenant adds
 * thousands of templates the warn log surfaces it before perf degrades.
 */
const LIST_ACTIVE_MAX = 500;

export class PrismaNotificationTemplateRepository implements NotificationTemplateRepositoryPort {
  private readonly logger = new Logger(PrismaNotificationTemplateRepository.name);

  public constructor(private readonly gateway: Gateway) {}

  public async delete(id: string): Promise<void> {
    await this.gateway.delete({ where: { id } });
  }

  public async findById(id: string): Promise<NotificationTemplate | null> {
    const record = await this.gateway.findFirst({ where: { id } });
    return record ? NotificationsPrismaMapper.toNotificationTemplate(record) : null;
  }

  public async findByTemplateKey(templateKey: string): Promise<NotificationTemplate | null> {
    const record = await this.gateway.findFirst({ where: { templateKey } });
    return record ? NotificationsPrismaMapper.toNotificationTemplate(record) : null;
  }

  public async listActive(): Promise<NotificationTemplate[]> {
    const records = await this.gateway.findMany({
      where: { archivedAt: null },
      orderBy: { templateKey: 'asc' },
      take: LIST_ACTIVE_MAX,
    });
    if (records.length === LIST_ACTIVE_MAX) {
      this.logger.warn(
        `listActive() hit the ${LIST_ACTIVE_MAX}-row cap; some templates omitted.`,
      );
    }
    return records.map((record) => NotificationsPrismaMapper.toNotificationTemplate(record));
  }

  public async save(aggregate: NotificationTemplate): Promise<void> {
    await this.gateway.upsert({
      create: {
        id: aggregate.id,
        bodyTemplate: aggregate.bodyTemplate,
        channelId: aggregate.channelId,
        displayName: aggregate.displayName,
        eventName: aggregate.eventName,
        isSystemManaged: aggregate.isSystemManaged,
        subjectTemplate: aggregate.subjectTemplate ?? null,
        templateKey: aggregate.templateKey,
      },
      update: {
        bodyTemplate: aggregate.bodyTemplate,
        channelId: aggregate.channelId,
        displayName: aggregate.displayName,
        eventName: aggregate.eventName,
        isSystemManaged: aggregate.isSystemManaged,
        subjectTemplate: aggregate.subjectTemplate ?? null,
      },
      where: { templateKey: aggregate.templateKey },
    });
  }
}
