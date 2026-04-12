import { Injectable } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';

@Injectable()
export class NotificationRetryPolicy {
  public constructor(private readonly appConfig: AppConfig) {}

  public get maxAttempts(): number {
    return this.appConfig.notificationsDeliveryMaxAttempts;
  }

  public get retryDelayMs(): number {
    return this.appConfig.notificationsDeliveryRetryDelayMs;
  }

  public calculateNextAttempt(attemptedAt: Date): Date {
    return new Date(attemptedAt.getTime() + this.retryDelayMs);
  }
}
