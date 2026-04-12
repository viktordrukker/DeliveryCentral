import { NotificationChannelAdapter, NotificationSendPayload, NotificationSendResult } from '../../application/notification-channel-adapter';

export class InMemoryEmailNotificationChannelAdapter implements NotificationChannelAdapter {
  public readonly channelKey = 'email';
  private readonly sent: NotificationSendPayload[] = [];

  public async send(
    payload: NotificationSendPayload,
    _config?: Record<string, unknown>,
  ): Promise<NotificationSendResult> {
    if (!payload.recipient.includes('@')) {
      throw new Error('Email recipient is invalid.');
    }

    if (payload.recipient === 'fail@example.com') {
      throw new Error('Email delivery failed.');
    }

    this.sent.push(payload);
    return { providerMessageId: `email-${this.sent.length}` };
  }

  public async validateConfig(_config?: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  public getSent(): NotificationSendPayload[] {
    return [...this.sent];
  }
}
