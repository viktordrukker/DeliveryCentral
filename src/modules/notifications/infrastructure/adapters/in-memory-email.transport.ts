import { NotificationDeliveryFailure } from '../../application/notification-channel-adapter';
import { EmailTransport, EmailTransportMessage, EmailTransportResult } from './email.transport';

export class InMemoryEmailTransport implements EmailTransport {
  private readonly messages: EmailTransportMessage[] = [];

  public isConfigured(): boolean {
    return true;
  }

  public async send(message: EmailTransportMessage): Promise<EmailTransportResult> {
    if (!message.to.includes('@')) {
      throw new NotificationDeliveryFailure('Email recipient is invalid.', false, 'EMAIL_RECIPIENT_INVALID');
    }

    if (message.to === 'fail@example.com') {
      throw new NotificationDeliveryFailure('Email delivery failed.', false, 'EMAIL_TERMINAL');
    }

    if (message.to === 'retry@example.com') {
      throw new NotificationDeliveryFailure('Email delivery temporarily failed.', true, 'EMAIL_RETRYABLE');
    }

    this.messages.push(message);

    return {
      messageId: `email-${this.messages.length}`,
    };
  }

  public getMessages(): EmailTransportMessage[] {
    return [...this.messages];
  }
}
