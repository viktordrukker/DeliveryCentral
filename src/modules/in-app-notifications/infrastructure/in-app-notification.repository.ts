import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface InAppNotificationRecord {
  id: string;
  recipientPersonId: string;
  eventType: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class InAppNotificationRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async create(data: {
    recipientPersonId: string;
    eventType: string;
    title: string;
    body?: string;
    link?: string;
  }): Promise<InAppNotificationRecord> {
    return this.prisma.inAppNotification.create({
      data: {
        recipientPersonId: data.recipientPersonId,
        eventType: data.eventType,
        title: data.title,
        body: data.body ?? null,
        link: data.link ?? null,
      },
    });
  }

  public async findForRecipient(
    recipientPersonId: string,
    opts: { unreadOnly?: boolean; limit?: number },
  ): Promise<InAppNotificationRecord[]> {
    return this.prisma.inAppNotification.findMany({
      where: {
        recipientPersonId,
        ...(opts.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 20,
    });
  }

  public async markRead(id: string, recipientPersonId: string): Promise<InAppNotificationRecord | null> {
    // Atomic compound match prevents TOCTOU race where another process could change the
    // recipient between a check and a non-scoped update.
    const result = await this.prisma.inAppNotification.updateMany({
      where: { id, recipientPersonId },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      return null;
    }
    return this.prisma.inAppNotification.findUnique({ where: { id } });
  }

  public async markAllRead(recipientPersonId: string): Promise<void> {
    await this.prisma.inAppNotification.updateMany({
      where: { recipientPersonId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
