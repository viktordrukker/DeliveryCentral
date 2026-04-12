import { NotificationChannelAdapter, NotificationSendPayload, NotificationSendResult } from '../../application/notification-channel-adapter';

export class InMemoryGenericNotificationChannelAdapter implements NotificationChannelAdapter {
  public readonly channelKey = 'generic';
  private readonly sent: NotificationSendPayload[] = [];

  public async send(
    payload: NotificationSendPayload,
    _config?: Record<string, unknown>,
  ): Promise<NotificationSendResult> {
    this.sent.push(payload);
    return { providerMessageId: `generic-${this.sent.length}` };
  }

  public async validateConfig(_config?: Record<string, unknown>): Promise<boolean> {
    return true;
  }

  public getSent(): NotificationSendPayload[] {
    return [...this.sent];
  }
}
