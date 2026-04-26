import { httpGet, httpPatch } from './http-client';

export interface NotificationPreference {
  channelKey: string;
  enabled: boolean;
}

export async function fetchMyNotificationPrefs(): Promise<NotificationPreference[]> {
  return httpGet<NotificationPreference[]>('/me/notification-prefs');
}

export async function updateMyNotificationPrefs(
  preferences: NotificationPreference[],
): Promise<NotificationPreference[]> {
  return httpPatch<NotificationPreference[], { preferences: NotificationPreference[] }>(
    '/me/notification-prefs',
    { preferences },
  );
}
