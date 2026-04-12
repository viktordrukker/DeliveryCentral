import { NotificationDeliveryFailure } from '../../application/notification-channel-adapter';
import { TeamsMessagePayload, TeamsWebhookTransport } from './teams-webhook.transport';

export class InMemoryTeamsWebhookTransport implements TeamsWebhookTransport {
  private readonly payloads: Array<{ payload: TeamsMessagePayload; webhookUrl: string }> = [];

  public async post(
    webhookUrl: string,
    payload: TeamsMessagePayload,
  ): Promise<{ messageId?: string }> {
    if (!webhookUrl.startsWith('https://')) {
      throw new NotificationDeliveryFailure('Teams webhook recipient is invalid.', false, 'TEAMS_WEBHOOK_INVALID');
    }

    if (webhookUrl.includes('fail')) {
      throw new NotificationDeliveryFailure('Teams webhook delivery failed.', false, 'TEAMS_TERMINAL');
    }

    if (webhookUrl.includes('retry')) {
      throw new NotificationDeliveryFailure('Teams webhook delivery temporarily failed.', true, 'TEAMS_RETRYABLE');
    }

    this.payloads.push({ payload, webhookUrl });

    return {
      messageId: `teams-${this.payloads.length}`,
    };
  }

  public getPayloads(): Array<{ payload: TeamsMessagePayload; webhookUrl: string }> {
    return [...this.payloads];
  }
}
