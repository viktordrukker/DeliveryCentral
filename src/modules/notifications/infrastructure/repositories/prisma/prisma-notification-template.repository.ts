import { NotificationTemplate } from '../../../domain/entities/notification-template.entity';
import { NotificationTemplateRepositoryPort } from '../../../domain/repositories/notification-template-repository.port';
import { NotificationsPrismaMapper } from './notifications-prisma.mapper';

interface Gateway {
  delete(args: any): Promise<unknown>;
  findFirst(args?: any): Promise<any>;
  findMany(args?: any): Promise<any[]>;
  upsert(args: any): Promise<unknown>;
}

export class PrismaNotificationTemplateRepository implements NotificationTemplateRepositoryPort {
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
    const records = await this.gateway.findMany({ where: { archivedAt: null } });
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
