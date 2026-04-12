import { httpGet, httpPost } from './http-client';

export interface InAppNotification {
  id: string;
  recipientPersonId: string;
  eventType: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function fetchInbox(params?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<InAppNotification[]> {
  const query = new URLSearchParams();
  if (params?.unreadOnly) query.set('unreadOnly', 'true');
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  const suffix = query.toString();
  return httpGet<InAppNotification[]>(`/notifications/inbox${suffix ? `?${suffix}` : ''}`);
}

export async function markNotificationRead(id: string): Promise<void> {
  await httpPost<unknown, Record<string, never>>(`/notifications/inbox/${id}/read`, {});
}

export async function markAllRead(): Promise<void> {
  await httpPost<unknown, Record<string, never>>('/notifications/inbox/read-all', {});
}
