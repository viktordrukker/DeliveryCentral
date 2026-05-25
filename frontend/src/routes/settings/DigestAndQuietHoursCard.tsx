import { FormEvent, useEffect, useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { Button } from '@/components/ds';
import {
  type DigestScheduleApi,
  type NotificationDigest,
  fetchMyNotificationDigest,
  updateMyNotificationDigest,
} from '@/lib/api/notification-prefs';

const SCHEDULE_OPTIONS: { value: DigestScheduleApi; label: string; hint: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate', hint: 'Send notifications as they happen.' },
  { value: 'DAILY_9AM', label: 'Daily at 9 AM', hint: 'Batch the previous 24 hours into one digest.' },
  { value: 'WEEKLY_MON_9AM', label: 'Weekly · Mon 9 AM', hint: 'One digest at the start of each week.' },
];

/**
 * /me?tab=settings — Digest schedule + Quiet hours sections.
 *
 * Two SectionCards rendered into AccountSettingsPage. State is persisted via
 * GET / PATCH /me/notification-digest (ds-trunk-10 endpoint).
 *
 * Note: the dispatcher honoring these values (batched digest delivery,
 * deferred email when in quiet-hours window) is a follow-up — see the
 * comment in PersonNotificationDigest model.
 */
export function DigestAndQuietHoursCard(): JSX.Element {
  const [digest, setDigest] = useState<NotificationDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMyNotificationDigest()
      .then((d) => {
        if (active) {
          setDigest(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setError(e instanceof Error ? e.message : 'Failed to load digest settings');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const setField = <K extends keyof NotificationDigest>(key: K, value: NotificationDigest[K]): void => {
    if (!digest) return;
    setDigest({ ...digest, [key]: value });
    setSaved(false);
  };

  const onSave = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!digest) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await updateMyNotificationDigest({
        digestSchedule: digest.digestSchedule,
        quietHoursStart: digest.quietHoursStart,
        quietHoursEnd: digest.quietHoursEnd,
        quietHoursEmailOnly: digest.quietHoursEmailOnly,
      });
      setDigest(next);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save digest settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SectionCard title="Digest schedule">
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>Loading…</p>
      </SectionCard>
    );
  }
  if (!digest) {
    return (
      <SectionCard title="Digest schedule">
        <p style={{ color: 'var(--color-status-danger)', fontSize: 13, margin: 0 }}>
          {error ?? 'Failed to load digest settings.'}
        </p>
      </SectionCard>
    );
  }

  const quietHoursOn = digest.quietHoursStart !== null && digest.quietHoursEnd !== null;

  return (
    <form onSubmit={onSave} className="form-stack" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <SectionCard title="Digest schedule">
        <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-text-muted)', fontSize: 13 }}>
          When should we deliver your notifications?
        </p>
        <div className="form-stack">
          {SCHEDULE_OPTIONS.map((opt) => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="digest-schedule"
                value={opt.value}
                checked={digest.digestSchedule === opt.value}
                onChange={() => setField('digestSchedule', opt.value)}
                style={{ marginTop: 3 }}
              />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'var(--color-text)' }}>{opt.label}</span>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}>{opt.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Quiet hours">
        <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-text-muted)', fontSize: 13 }}>
          Suppress notifications during this window. Leave blank to receive at all times.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', maxWidth: 420 }}>
          <label className="field">
            <span className="field__label">From</span>
            <input
              type="time"
              className="field__control"
              value={digest.quietHoursStart ?? ''}
              onChange={(ev) => setField('quietHoursStart', ev.target.value || null)}
            />
          </label>
          <label className="field">
            <span className="field__label">To</span>
            <input
              type="time"
              className="field__control"
              value={digest.quietHoursEnd ?? ''}
              onChange={(ev) => setField('quietHoursEnd', ev.target.value || null)}
            />
          </label>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'var(--space-3)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={digest.quietHoursEmailOnly}
            onChange={(ev) => setField('quietHoursEmailOnly', ev.target.checked)}
            disabled={!quietHoursOn}
          />
          <span style={{ color: quietHoursOn ? 'var(--color-text)' : 'var(--color-text-subtle)' }}>
            Apply to email only (in-app notifications still arrive)
          </span>
        </label>
      </SectionCard>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <Button type="submit" variant="primary" disabled={saving} loading={saving}>
          {saving ? 'Saving…' : 'Save digest settings'}
        </Button>
        {saved && <span style={{ color: 'var(--color-status-active)', fontSize: 13 }}>Saved.</span>}
        {error && <span role="alert" style={{ color: 'var(--color-status-danger)', fontSize: 13 }}>{error}</span>}
      </div>
    </form>
  );
}
