import { FormEvent, useEffect, useState } from 'react';

import { setDarkMode } from '@/app/App';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useAuth } from '@/app/auth-context';
import { changePassword } from '@/lib/api/admin';
import {
  fetchMyNotificationPrefs,
  fetchNotificationChannels,
  updateMyNotificationPrefs,
  type NotificationChannelInfo,
  type NotificationPreference,
} from '@/lib/api/notification-prefs';
import { readStoredColorModePreference } from '@/styles/design-tokens';
import {
  COMMON_TIMEZONES,
  SUPPORTED_LOCALES,
  getUserLocale,
  getUserTimezone,
  setUserLocale,
  setUserTimezone,
} from '@/lib/user-prefs';
import { Button } from '@/components/ds';

// HD-8 / F2a — channels come from the platform via
// GET /notifications/channels. The legacy localStorage shape is still
// honored as a one-time migration source for users who set prefs in the
// browser-only era; once migrated, server prefs are authoritative.
const LEGACY_NOTIF_PREFS_KEY = 'dc:notif_prefs';

interface LegacyPrefs {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  teamsEnabled?: boolean;
}

function readLegacyLocalStorage(): LegacyPrefs | null {
  try {
    const raw = localStorage.getItem(LEGACY_NOTIF_PREFS_KEY);
    return raw ? (JSON.parse(raw) as LegacyPrefs) : null;
  } catch {
    return null;
  }
}

function legacyValueFor(channelKey: string, legacy: LegacyPrefs): boolean | undefined {
  if (channelKey === 'email') return legacy.emailEnabled;
  if (channelKey === 'in_app') return legacy.inAppEnabled;
  if (channelKey === 'teams') return legacy.teamsEnabled;
  return undefined;
}

function buildPrefMap(records: NotificationPreference[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const r of records) out[r.channelKey] = r.enabled;
  return out;
}

// Default to ON for known-everyday channels (email + in_app) if no row
// exists yet; OFF for everything else (e.g. teams, slack, sms) so users
// opt-in to noisier surfaces.
function defaultEnabledFor(channelKey: string): boolean {
  return channelKey === 'email' || channelKey === 'in_app';
}

export function AccountSettingsPage(): JSX.Element {
  const { principal } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [channels, setChannels] = useState<NotificationChannelInfo[]>([]);
  const [prefMap, setPrefMap] = useState<Record<string, boolean>>({});
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [isDark, setIsDark] = useState(() => readStoredColorModePreference() === 'dark');
  const [userLocale, setUserLocaleState] = useState(() => getUserLocale());
  const [userTimezone, setUserTimezoneState] = useState(() => getUserTimezone());
  const [prefsToast, setPrefsToast] = useState<string | null>(null);

  function handleLocaleChange(locale: string): void {
    setUserLocaleState(locale);
    setUserLocale(locale);
    setPrefsToast('Locale saved.');
    setTimeout(() => setPrefsToast(null), 1500);
  }

  function handleTimezoneChange(tz: string): void {
    setUserTimezoneState(tz);
    setUserTimezone(tz);
    setPrefsToast('Timezone saved.');
    setTimeout(() => setPrefsToast(null), 1500);
  }

  useEffect(() => {
    let active = true;
    Promise.all([fetchMyNotificationPrefs(), fetchNotificationChannels()])
      .then(async ([records, channelList]) => {
        if (!active) return;
        setChannels(channelList);
        const legacy = readLegacyLocalStorage();
        if (records.length === 0 && legacy && channelList.length > 0) {
          // First-time migration: push legacy localStorage prefs to API,
          // then clear. Migrate only channels that the legacy shape
          // recognized; new channels keep their default-enabled value.
          const migrationPayload: NotificationPreference[] = channelList
            .map((c) => {
              const v = legacyValueFor(c.channelKey, legacy);
              return v === undefined
                ? null
                : { channelKey: c.channelKey, enabled: v };
            })
            .filter((p): p is NotificationPreference => p !== null);
          if (migrationPayload.length > 0) {
            const migrated = await updateMyNotificationPrefs(migrationPayload);
            if (!active) return;
            setPrefMap(buildPrefMap(migrated));
          } else {
            setPrefMap({});
          }
          localStorage.removeItem(LEGACY_NOTIF_PREFS_KEY);
        } else {
          setPrefMap(buildPrefMap(records));
        }
      })
      .catch(() => {
        if (active) setPrefMap({});
      })
      .finally(() => {
        if (active) setPrefsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function isEnabled(channelKey: string): boolean {
    if (channelKey in prefMap) return prefMap[channelKey];
    return defaultEnabledFor(channelKey);
  }

  function handlePrefsChange(channelKey: string, value: boolean): void {
    const next = { ...prefMap, [channelKey]: value };
    setPrefMap(next);
    void updateMyNotificationPrefs([{ channelKey, enabled: value }])
      .then(() => {
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2000);
      })
      .catch(() => undefined);
  }

  function validate(): string | null {
    if (!currentPassword) return 'Current password is required.';
    if (!newPassword) return 'New password is required.';
    if (newPassword.length < 8) return 'New password must be at least 8 characters.';
    if (newPassword !== confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer testId="account-settings-page">
      <PageHeader
        eyebrow="Settings"
        subtitle="Manage your account credentials and security preferences."
        title="Account Settings"
      />

      <SectionCard title="Account Information">
        <dl className="details-list">
          <div>
            <dt>Email</dt>
            <dd>{principal?.email ?? 'Not available'}</dd>
          </div>
          <div>
            <dt>Display Name</dt>
            <dd>{principal?.displayName ?? 'Not available'}</dd>
          </div>
          <div>
            <dt>Roles</dt>
            <dd>{principal?.roles.join(', ') ?? 'None'}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Notification Preferences">
        {prefsSaved ? <p className="form-success">Preferences saved.</p> : null}
        {prefsLoaded && channels.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
            No notification channels are configured for this deployment.
          </p>
        ) : null}
        <div className="form-stack">
          {channels.map((channel) => (
            <label
              key={channel.channelKey}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
            >
              <input
                checked={isEnabled(channel.channelKey)}
                onChange={(e) => handlePrefsChange(channel.channelKey, e.target.checked)}
                type="checkbox"
              />
              <span>{channel.displayName}</span>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Locale &amp; Timezone">
        {prefsToast ? <p className="form-success">{prefsToast}</p> : null}
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 0 }}>
          Sets how dates, numbers, and currency are formatted across the app.
          Stored in this browser; native date pickers (e.g. on filter bars)
          continue to follow your operating system locale until v1.1's custom
          date-picker lands.
        </p>
        <div className="form-stack">
          <label className="field">
            <span className="field__label">Locale</span>
            <select
              className="field__control"
              data-testid="user-locale-select"
              onChange={(e) => handleLocaleChange(e.target.value)}
              value={userLocale}
            >
              {SUPPORTED_LOCALES.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Timezone</span>
            <select
              className="field__control"
              data-testid="user-timezone-select"
              onChange={(e) => handleTimezoneChange(e.target.value)}
              value={userTimezone}
            >
              {COMMON_TIMEZONES.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Appearance">
        <label style={{ alignItems: 'center', cursor: 'pointer', display: 'flex', gap: '0.75rem' }}>
          <input
            checked={isDark}
            onChange={(e) => {
              const next = e.target.checked;
              setIsDark(next);
              setDarkMode(next);
            }}
            type="checkbox"
          />
          <span>Dark mode</span>
        </label>
        <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '6px' }}>
          Override follows your system preference when not set. Persisted in browser storage.
        </p>
      </SectionCard>

      <SectionCard title="Change Password">
        {error ? <ErrorState description={error} /> : null}
        {success ? <p className="form-success">{success}</p> : null}
        <form className="form-stack" onSubmit={(e) => void handleSubmit(e)}>
          <label className="field">
            <span className="field__label">Current password</span>
            <input
              autoComplete="current-password"
              className="field__control"
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              value={currentPassword}
            />
          </label>
          <label className="field">
            <span className="field__label">New password</span>
            <input
              autoComplete="new-password"
              className="field__control"
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              value={newPassword}
            />
          </label>
          <label className="field">
            <span className="field__label">Confirm new password</span>
            <input
              autoComplete="new-password"
              className="field__control"
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              value={confirmPassword}
            />
          </label>
          <div className="form-actions">
            <Button variant="primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving…' : 'Change password'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </PageContainer>
  );
}
