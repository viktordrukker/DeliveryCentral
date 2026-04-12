import { Injectable } from '@nestjs/common';

import { InAppNotificationRepository, InAppNotificationRecord } from '../infrastructure/in-app-notification.repository';

@Injectable()
export class InAppNotificationService {
  public constructor(private readonly repository: InAppNotificationRepository) {}

  public async createNotification(
    recipientPersonId: string,
    eventType: string,
    title: string,
    body?: string,
    link?: string,
  ): Promise<void> {
    try {
      await this.repository.create({ recipientPersonId, eventType, title, body, link });
    } catch {
      // In-app notification creation must not block business workflows.
    }
  }

  public async getInbox(
    recipientPersonId: string,
    opts: { unreadOnly?: boolean; limit?: number },
  ): Promise<InAppNotificationRecord[]> {
    return this.repository.findForRecipient(recipientPersonId, opts);
  }

  public async markRead(id: string, recipientPersonId: string): Promise<InAppNotificationRecord | null> {
    return this.repository.markRead(id, recipientPersonId);
  }

  public async markAllRead(recipientPersonId: string): Promise<void> {
    return this.repository.markAllRead(recipientPersonId);
  }
}
