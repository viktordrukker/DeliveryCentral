import { Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';

export interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  eventTypes: string[];
  createdByPersonId: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookDeliveryAttempt {
  subscriptionId: string;
  eventType: string;
  statusCode: number | null;
  success: boolean;
  attemptedAt: string;
  error?: string;
}

@Injectable()
export class InMemoryWebhookService {
  private readonly logger = new Logger(InMemoryWebhookService.name);
  private readonly subscriptions = new Map<string, WebhookSubscription>();
  private readonly deliveryLog: WebhookDeliveryAttempt[] = [];

  public create(
    url: string,
    secret: string,
    eventTypes: string[],
    createdByPersonId: string,
  ): WebhookSubscription {
    const sub: WebhookSubscription = {
      id: randomUUID(),
      url,
      secret,
      eventTypes,
      createdByPersonId,
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.subscriptions.set(sub.id, sub);
    return sub;
  }

  public list(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public getById(id: string): WebhookSubscription | undefined {
    return this.subscriptions.get(id);
  }

  public delete(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  public getDeliveryLog(subscriptionId?: string): WebhookDeliveryAttempt[] {
    const log = [...this.deliveryLog].reverse();
    if (subscriptionId) {
      return log.filter((a) => a.subscriptionId === subscriptionId).slice(0, 10);
    }
    return log.slice(0, 10);
  }

  public async dispatch(eventType: string, payload: unknown): Promise<void> {
    const matching = Array.from(this.subscriptions.values()).filter(
      (s) => s.active && (s.eventTypes.length === 0 || s.eventTypes.includes(eventType)),
    );

    await Promise.allSettled(
      matching.map(async (sub) => {
        await this.deliverToSubscription(sub, eventType, payload);
      }),
    );
  }

  public async testDelivery(subscriptionId: string): Promise<WebhookDeliveryAttempt> {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) {
      throw new Error('Subscription not found.');
    }
    return this.deliverToSubscription(sub, 'test.ping', { message: 'DeliveryCentral webhook test delivery' });
  }

  private async deliverToSubscription(
    sub: WebhookSubscription,
    eventType: string,
    payload: unknown,
  ): Promise<WebhookDeliveryAttempt> {
    const body = JSON.stringify({ eventType, payload, timestamp: new Date().toISOString() });
    if (!sub.secret || sub.secret.length < 16) {
      throw new Error(`Webhook subscription ${sub.id} has an invalid secret (must be at least 16 characters).`);
    }
    const signature = createHmac('sha256', sub.secret).update(body).digest('hex');

    const attempt: WebhookDeliveryAttempt = {
      subscriptionId: sub.id,
      eventType,
      statusCode: null,
      success: false,
      attemptedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Delivery-Signature': `sha256=${signature}`,
          'X-Event-Type': eventType,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      attempt.statusCode = response.status;
      attempt.success = response.ok;
    } catch (err) {
      attempt.error = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Webhook delivery failed for ${sub.url}: ${attempt.error}`);
    }

    this.deliveryLog.push(attempt);
    if (this.deliveryLog.length > 500) {
      this.deliveryLog.splice(0, this.deliveryLog.length - 500);
    }

    return attempt;
  }
}
