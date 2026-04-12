import { NotificationChannelAdapter, NotificationSendPayload, NotificationSendResult } from '../../application/notification-channel-adapter';
import { TeamsMessagePayload, TeamsWebhookTransport } from './teams-webhook.transport';

interface TeamsChannelConfig {
  fallbackWebhookUrl?: string;
  themeColor?: string;
  titlePrefix?: string;
}

export class TeamsNotificationChannelAdapter implements NotificationChannelAdapter {
  public readonly channelKey = 'ms_teams_webhook';

  public constructor(private readonly transport: TeamsWebhookTransport) {}

  public buildMessagePayload(
    payload: NotificationSendPayload,
    config?: Record<string, unknown>,
  ): TeamsMessagePayload {
    const teamsConfig = this.parseConfig(config);
    const titleBase = payload.subject?.trim() || 'Notification';
    const title = teamsConfig.titlePrefix
      ? `${teamsConfig.titlePrefix} ${titleBase}`
      : titleBase;

    return {
      '@context': 'https://schema.org/extensions',
      '@type': 'MessageCard',
      summary: payload.subject?.trim() || this.firstLine(payload.body),
      text: payload.body,
      themeColor: teamsConfig.themeColor,
      title,
    };
  }

  public async send(
    payload: NotificationSendPayload,
    config?: Record<string, unknown>,
  ): Promise<NotificationSendResult> {
    const teamsConfig = this.parseConfig(config);
    const webhookUrl = this.resolveWebhookUrl(payload.recipient, teamsConfig);

    if (!webhookUrl) {
      throw new Error('Teams webhook recipient is invalid.');
    }

    const result = await this.transport.post(
      webhookUrl,
      this.buildMessagePayload(payload, config),
    );

    return {
      providerMessageId: result.messageId,
    };
  }

  public async validateConfig(config?: Record<string, unknown>): Promise<boolean> {
    const teamsConfig = this.parseConfig(config);

    if (teamsConfig.fallbackWebhookUrl !== undefined) {
      return this.isWebhookUrl(teamsConfig.fallbackWebhookUrl);
    }

    return true;
  }

  private firstLine(body: string): string {
    return body.split(/\r?\n/, 1)[0] ?? body;
  }

  private isWebhookUrl(value?: string): boolean {
    return Boolean(value && value.startsWith('https://'));
  }

  private parseConfig(config?: Record<string, unknown>): TeamsChannelConfig {
    if (!config) {
      return {};
    }

    return {
      fallbackWebhookUrl:
        typeof config.fallbackWebhookUrl === 'string' ? config.fallbackWebhookUrl : undefined,
      themeColor: typeof config.themeColor === 'string' ? config.themeColor : undefined,
      titlePrefix: typeof config.titlePrefix === 'string' ? config.titlePrefix : undefined,
    };
  }

  private resolveWebhookUrl(recipient: string, config: TeamsChannelConfig): string | undefined {
    if (this.isWebhookUrl(recipient)) {
      return recipient;
    }

    if (this.isWebhookUrl(config.fallbackWebhookUrl)) {
      return config.fallbackWebhookUrl;
    }

    return undefined;
  }
}
