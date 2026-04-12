import { httpDelete, httpGet, httpPost } from './http-client';

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

export async function fetchWebhooks(): Promise<WebhookSubscription[]> {
  return httpGet<WebhookSubscription[]>('/admin/webhooks');
}

export async function createWebhook(data: {
  url: string;
  secret: string;
  eventTypes: string[];
  createdByPersonId: string;
}): Promise<WebhookSubscription> {
  return httpPost<WebhookSubscription, typeof data>('/admin/webhooks', data);
}

export async function deleteWebhook(id: string): Promise<{ success: boolean }> {
  return httpDelete<{ success: boolean }>(`/admin/webhooks/${id}`);
}

export async function testWebhookDelivery(id: string): Promise<WebhookDeliveryAttempt> {
  return httpPost<WebhookDeliveryAttempt, Record<string, never>>(`/admin/webhooks/${id}/test`, {});
}

export async function fetchWebhookDeliveries(id: string): Promise<WebhookDeliveryAttempt[]> {
  return httpGet<WebhookDeliveryAttempt[]>(`/admin/webhooks/${id}/deliveries`);
}
