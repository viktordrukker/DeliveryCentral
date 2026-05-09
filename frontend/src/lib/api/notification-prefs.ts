import { httpGet, httpPatch } from './http-client';

export interface NotificationPreference {
  channelKey: string;
  enabled: boolean;
}

// HD-8 / F2a — dynamic channel discovery, replacing the hard-coded
// list of email/in_app/teams that the prefs page used to ship.
export interface NotificationChannelInfo {
  channelKey: string;
  displayName: string;
  kind: string;
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

export async function fetchNotificationChannels(): Promise<NotificationChannelInfo[]> {
  return httpGet<NotificationChannelInfo[]>('/notifications/channels');
}
