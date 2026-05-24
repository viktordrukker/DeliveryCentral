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

// ds-trunk-10 — per-person digest + quiet-hours settings.

export type DigestScheduleApi = 'IMMEDIATE' | 'DAILY_9AM' | 'WEEKLY_MON_9AM';

export interface NotificationDigest {
  digestSchedule: DigestScheduleApi;
  /** 'HH:MM' 24h, or null when no quiet-hours window is configured. */
  quietHoursStart: string | null;
  /** 'HH:MM' 24h, or null. Must be paired with quietHoursStart. */
  quietHoursEnd: string | null;
  quietHoursEmailOnly: boolean;
}

export type UpdateNotificationDigestPayload = Partial<NotificationDigest>;

export async function fetchMyNotificationDigest(): Promise<NotificationDigest> {
  return httpGet<NotificationDigest>('/me/notification-digest');
}

export async function updateMyNotificationDigest(
  payload: UpdateNotificationDigestPayload,
): Promise<NotificationDigest> {
  return httpPatch<NotificationDigest, UpdateNotificationDigestPayload>(
    '/me/notification-digest',
    payload,
  );
}
