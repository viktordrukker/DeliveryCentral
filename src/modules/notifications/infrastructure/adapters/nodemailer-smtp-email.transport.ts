import { Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

import { AppConfig } from '@src/shared/config/app-config';
import { NotificationDeliveryFailure } from '@src/modules/notifications/application/notification-channel-adapter';

import { EmailTransport, EmailTransportMessage, EmailTransportResult } from './email.transport';

@Injectable()
export class NodemailerSmtpEmailTransport implements EmailTransport {
  private readonly transporter: Transporter;

  public constructor(private readonly appConfig: AppConfig) {
    this.transporter = nodemailer.createTransport({
      auth: this.appConfig.notificationsSmtpUsername
        ? {
            pass: this.appConfig.notificationsSmtpPassword,
            user: this.appConfig.notificationsSmtpUsername,
          }
        : undefined,
      host: this.appConfig.notificationsSmtpHost,
      port: this.appConfig.notificationsSmtpPort,
      secure: this.appConfig.notificationsSmtpSecure,
    });
  }

  public isConfigured(): boolean {
    return Boolean(
      this.appConfig.notificationsSmtpHost &&
        this.appConfig.notificationsSmtpPort > 0 &&
        this.appConfig.notificationsEmailFromAddress,
    );
  }

  public async send(message: EmailTransportMessage): Promise<EmailTransportResult> {
    if (!this.isConfigured()) {
      throw new NotificationDeliveryFailure(
        'SMTP email transport is not configured.',
        false,
        'SMTP_NOT_CONFIGURED',
      );
    }

    try {
      const result = await this.transporter.sendMail({
        from: message.from,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
        to: message.to,
      });

      return {
        messageId: result.messageId,
      };
    } catch (error) {
      throw this.toDeliveryFailure(error);
    }
  }

  private toDeliveryFailure(error: unknown): NotificationDeliveryFailure {
    const smtpError = error as {
      code?: string;
      message?: string;
      responseCode?: number;
    };

    const code = smtpError.code;
    const responseCode = smtpError.responseCode;
    const retryable =
      (typeof responseCode === 'number' && responseCode >= 400 && responseCode < 500) ||
      code === 'ECONNECTION' ||
      code === 'ECONNRESET' ||
      code === 'ESOCKET' ||
      code === 'ETIMEDOUT';

    if (code === 'EAUTH' || code === 'EENVELOPE') {
      return new NotificationDeliveryFailure('SMTP email delivery failed.', false, code);
    }

    if (typeof responseCode === 'number' && responseCode >= 500) {
      return new NotificationDeliveryFailure('SMTP email delivery failed.', false, `SMTP_${responseCode}`);
    }

    return new NotificationDeliveryFailure(
      retryable ? 'SMTP email delivery temporarily failed.' : 'SMTP email delivery failed.',
      retryable,
      code ?? (typeof responseCode === 'number' ? `SMTP_${responseCode}` : 'SMTP_SEND_FAILED'),
    );
  }
}
