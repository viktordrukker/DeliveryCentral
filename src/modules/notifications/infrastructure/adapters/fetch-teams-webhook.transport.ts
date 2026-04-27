import { Injectable } from '@nestjs/common';

import { NotificationDeliveryFailure } from '@src/modules/notifications/application/notification-channel-adapter';

import { TeamsMessagePayload, TeamsWebhookTransport } from './teams-webhook.transport';

@Injectable()
export class FetchTeamsWebhookTransport implements TeamsWebhookTransport {
  public async post(
    webhookUrl: string,
    payload: TeamsMessagePayload,
  ): Promise<{ messageId?: string }> {
    if (!webhookUrl.startsWith('https://')) {
      throw new NotificationDeliveryFailure(
        'Teams webhook URL must use HTTPS.',
        false,
        'TEAMS_WEBHOOK_INVALID_SCHEME',
      );
    }

    const response = await fetch(webhookUrl, {
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      // Drain the body so the connection can be reused; we don't surface the
      // remote error message into the failure today (Teams returns generic
      // strings) but the read avoids leaking the response stream.
      await response.text();
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      throw new NotificationDeliveryFailure(
        retryable ? 'Teams webhook delivery temporarily failed.' : 'Teams webhook delivery failed.',
        retryable,
        `TEAMS_HTTP_${response.status}`,
      );
    }

    return {
      messageId: response.headers.get('x-ms-activity-id') ?? undefined,
    };
  }
}
