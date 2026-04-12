import { TeamsMessagePayload, TeamsWebhookTransport } from './teams-webhook.transport';
import { TeamsNotificationChannelAdapter } from './teams-notification-channel.adapter';

export class InMemoryTeamsWebhookNotificationChannelAdapter extends TeamsNotificationChannelAdapter {
  public constructor(private readonly inMemoryTransport: TeamsWebhookTransport) {
    super(inMemoryTransport);
  }

  public getSentPayloads() {
    if (!('getPayloads' in this.inMemoryTransport)) {
      return [] as Array<{ payload: TeamsMessagePayload; webhookUrl: string }>;
    }

    return (
      this.inMemoryTransport as {
        getPayloads(): Array<{ payload: TeamsMessagePayload; webhookUrl: string }>;
      }
    ).getPayloads();
  }
}
