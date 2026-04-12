export interface NotificationDispatchResult {
  deliveryId: string;
  notificationRequestId: string;
  status: 'FAILED' | 'SUCCEEDED';
}

export class NotificationDeliveryFailure extends Error {
  public constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export interface NotificationSendPayload {
  recipient: string;
  subject?: string;
  body: string;
}

export interface NotificationSendResult {
  providerMessageId?: string;
}

export interface NotificationChannelAdapter {
  readonly channelKey: string;
  send(
    payload: NotificationSendPayload,
    config?: Record<string, unknown>,
  ): Promise<NotificationSendResult>;
  validateConfig(config?: Record<string, unknown>): Promise<boolean>;
}
