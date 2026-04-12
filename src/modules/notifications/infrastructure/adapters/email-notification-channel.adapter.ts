import {
  NotificationChannelAdapter,
  NotificationDeliveryFailure,
  NotificationSendPayload,
  NotificationSendResult,
} from '../../application/notification-channel-adapter';
import { EmailTransport, EmailTransportMessage } from './email.transport';

interface EmailChannelConfig {
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
}

interface EmailChannelDefaults {
  fromAddress?: string;
  fromName?: string;
  replyTo?: string;
}

export class EmailNotificationChannelAdapter implements NotificationChannelAdapter {
  public readonly channelKey = 'email';

  public constructor(
    private readonly transport: EmailTransport,
    private readonly defaults: EmailChannelDefaults = {},
  ) {}

  public buildMessagePayload(
    payload: NotificationSendPayload,
    config?: Record<string, unknown>,
  ): EmailTransportMessage {
    const emailConfig = this.parseConfig(config);
    const fromAddress = emailConfig.fromAddress ?? this.defaults.fromAddress;

    if (!fromAddress) {
      throw new NotificationDeliveryFailure('Email sender is not configured.', false, 'EMAIL_FROM_MISSING');
    }

    return {
      from: this.formatMailbox(fromAddress, emailConfig.fromName ?? this.defaults.fromName),
      replyTo: emailConfig.replyTo ?? this.defaults.replyTo,
      subject: payload.subject?.trim() || 'Notification',
      text: payload.body,
      to: payload.recipient,
    };
  }

  public async send(
    payload: NotificationSendPayload,
    config?: Record<string, unknown>,
  ): Promise<NotificationSendResult> {
    if (!this.isEmailAddress(payload.recipient)) {
      throw new NotificationDeliveryFailure('Email recipient is invalid.', false, 'EMAIL_RECIPIENT_INVALID');
    }

    const result = await this.transport.send(this.buildMessagePayload(payload, config));

    return {
      providerMessageId: result.messageId,
    };
  }

  public async validateConfig(config?: Record<string, unknown>): Promise<boolean> {
    const emailConfig = this.parseConfig(config);
    const fromAddress = emailConfig.fromAddress ?? this.defaults.fromAddress;

    return Boolean(this.transport.isConfigured() && this.isEmailAddress(fromAddress));
  }

  private formatMailbox(address: string, name?: string): string {
    if (!name?.trim()) {
      return address;
    }

    const safeName = name.replace(/"/g, '').trim();
    return `${safeName} <${address}>`;
  }

  private isEmailAddress(value?: string): boolean {
    return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  }

  private parseConfig(config?: Record<string, unknown>): EmailChannelConfig {
    if (!config) {
      return {};
    }

    return {
      fromAddress: typeof config.fromAddress === 'string' ? config.fromAddress : undefined,
      fromName: typeof config.fromName === 'string' ? config.fromName : undefined,
      replyTo: typeof config.replyTo === 'string' ? config.replyTo : undefined,
    };
  }
}
