import { httpGet, httpPost } from './http-client';

export interface NotificationTemplate {
  bodyTemplate: string;
  channelKey: string;
  displayName: string;
  eventName: string;
  subjectTemplate?: string;
  templateKey: string;
}

export interface NotificationOutcome {
  attemptedAt: string;
  attemptNumber: number;
  channelKey: string;
  errorSummary?: string;
  eventName: string;
  notificationRequestId: string;
  status: 'FAILED_TERMINAL' | 'PENDING' | 'RETRYING' | 'SUCCEEDED';
  targetSummary: string;
  templateDisplayName: string;
  templateKey: string;
}

export interface NotificationTestSendRequest {
  channelKey: string;
  payload: Record<string, unknown>;
  recipient: string;
  templateKey: string;
}

export interface NotificationTestSendResponse {
  deliveryId: string;
  notificationRequestId: string;
  status: 'FAILED' | 'SUCCEEDED';
}

export interface NotificationQueueItem {
  attemptCount: number;
  channelId: string;
  deliveredAt?: string | null;
  eventName: string;
  failureReason?: string | null;
  id: string;
  latestRenderedBody?: string | null;
  maxAttempts: number;
  nextAttemptAt?: string | null;
  payload: Record<string, unknown>;
  recipient: string;
  requestedAt: string;
  status: 'FAILED_TERMINAL' | 'QUEUED' | 'RETRYING' | 'SENT';
  templateId: string;
}

export interface NotificationQueueResponse {
  items: NotificationQueueItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export async function fetchNotificationQueue(query: {
  page?: number;
  pageSize?: number;
  status?: string;
} = {}): Promise<NotificationQueueResponse> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  const suffix = params.toString();
  return httpGet<NotificationQueueResponse>(`/notifications/queue${suffix ? `?${suffix}` : ''}`);
}

export async function fetchNotificationTemplates(): Promise<NotificationTemplate[]> {
  return httpGet<NotificationTemplate[]>('/notifications/templates');
}

export async function fetchNotificationOutcomes(): Promise<NotificationOutcome[]> {
  return httpGet<NotificationOutcome[]>('/notifications/outcomes');
}

export async function sendNotificationTest(
  request: NotificationTestSendRequest,
): Promise<NotificationTestSendResponse> {
  return httpPost<NotificationTestSendResponse, NotificationTestSendRequest>(
    '/notifications/test-send',
    request,
  );
}

export async function requeueNotification(id: string): Promise<{ status: string }> {
  return httpPost<{ status: string }, Record<string, never>>(
    `/notifications/queue/${id}/requeue`,
    {},
  );
}
