import { FormEvent, useEffect, useState } from 'react';

import { setDarkMode } from '@/app/App';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useAuth } from '@/app/auth-context';
import { changePassword } from '@/lib/api/admin';
import { readStoredColorModePreference } from '@/styles/design-tokens';

const NOTIF_PREFS_KEY = 'dc:notif_prefs';

interface NotifPrefs {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  teamsEnabled: boolean;
}

function loadPrefs(): NotifPrefs {
  try {
    const stored = localStorage.getItem(NOTIF_PREFS_KEY);
    if (stored) return JSON.parse(stored) as NotifPrefs;
  } catch { /* ignore */ }
  return { emailEnabled: true, inAppEnabled: true, teamsEnabled: false };
}

export function AccountSettingsPage(): JSX.Element {
  const { principal } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(loadPrefs);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [isDark, setIsDark] = useState(() => readStoredColorModePreference() === 'dark');

  useEffect(() => {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(notifPrefs));
  }, [notifPrefs]);

  function handlePrefsChange(key: keyof NotifPrefs, value: boolean): void {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }));
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
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
        <div className="form-stack">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              checked={notifPrefs.emailEnabled}
              onChange={(e) => handlePrefsChange('emailEnabled', e.target.checked)}
              type="checkbox"
            />
            <span>Email notifications</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              checked={notifPrefs.inAppEnabled}
              onChange={(e) => handlePrefsChange('inAppEnabled', e.target.checked)}
              type="checkbox"
            />
            <span>In-app notifications</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
              checked={notifPrefs.teamsEnabled}
              onChange={(e) => handlePrefsChange('teamsEnabled', e.target.checked)}
              type="checkbox"
            />
            <span>Microsoft Teams notifications</span>
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
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </SectionCard>
    </PageContainer>
  );
}
