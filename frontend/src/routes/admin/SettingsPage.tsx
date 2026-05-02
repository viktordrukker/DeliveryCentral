import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SetupResetSection } from './SetupResetSection';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  type PlatformSettingsResponse,
  fetchPlatformSettings,
  updatePlatformSetting,
} from '@/lib/api/platform-settings';
import { Button } from '@/components/ds';

type SettingValue = string | number | boolean | string[] | null;

interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
  optionLabels?: string[];
}

interface SectionDef {
  id: keyof PlatformSettingsResponse;
  title: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: 'general',
    title: 'General',
    fields: [
      { key: 'platformName', label: 'Platform Name', type: 'text' },
      { key: 'timezone', label: 'Timezone', type: 'text' },
      { key: 'fiscalYearStart', label: 'Fiscal Year Start (month)', type: 'number' },
      { key: 'dateFormat', label: 'Date Format', type: 'text' },
      { key: 'currency', label: 'Currency', type: 'text' },
    ],
  },
  {
    id: 'timesheets',
    title: 'Timesheets',
    fields: [
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      { key: 'standardHoursPerWeek', label: 'Standard Hours / Week', type: 'number' },
      { key: 'maxHoursPerDay', label: 'Max Hours / Day', type: 'number' },
      { key: 'weekStartDay', label: 'Week Start Day', type: 'select', options: ['0', '1'], optionLabels: ['Sunday', 'Monday'] },
      { key: 'autoPopulate', label: 'Auto-Populate', type: 'boolean' },
      { key: 'approvalRequired', label: 'Approval Required', type: 'boolean' },
      { key: 'lockAfterDays', label: 'Lock After Days', type: 'number' },
    ],
  },
  {
    id: 'capitalisation',
    title: 'Capitalisation',
    fields: [
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      {
        key: 'defaultClassification',
        label: 'Default Classification',
        type: 'select',
        options: ['OPEX', 'CAPEX'],
      },
      { key: 'reconciliationAlerts', label: 'Reconciliation Alerts', type: 'boolean' },
    ],
  },
  {
    id: 'pulse',
    title: 'Pulse',
    fields: [
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'select',
        options: ['daily', 'weekly', 'fortnightly', 'monthly'],
      },
      { key: 'anonymousMode', label: 'Anonymous Mode', type: 'boolean' },
      { key: 'alertThreshold', label: 'Alert Threshold (mood 1-5)', type: 'number' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    fields: [
      { key: 'emailEnabled', label: 'Email Enabled', type: 'boolean' },
      { key: 'inAppEnabled', label: 'In-App Enabled', type: 'boolean' },
      {
        key: 'digestFrequency',
        label: 'Digest Frequency',
        type: 'select',
        options: ['realtime', 'daily', 'weekly'],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    fields: [
      { key: 'sessionTimeoutMinutes', label: 'Session Timeout (minutes)', type: 'number' },
      { key: 'maxLoginAttempts', label: 'Max Login Attempts', type: 'number' },
      { key: 'passwordMinLength', label: 'Password Min Length', type: 'number' },
      { key: 'mfaEnabled', label: 'MFA Enabled', type: 'boolean' },
    ],
  },
  {
    id: 'sso',
    title: 'SSO / OIDC Integration',
    fields: [
      { key: 'enabled', label: 'SSO Enabled', type: 'boolean' },
      { key: 'providerName', label: 'Provider Name (e.g. Azure AD, Okta)', type: 'text' },
      { key: 'issuerUrl', label: 'Issuer URL', type: 'text' },
      { key: 'clientId', label: 'Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', type: 'text' },
      { key: 'scopes', label: 'Scopes (space-separated)', type: 'text' },
      { key: 'callbackUrl', label: 'Callback URL', type: 'text' },
      { key: 'autoProvisionUsers', label: 'Auto-Provision New Users', type: 'boolean' },
      { key: 'defaultRole', label: 'Default Role for Provisioned Users', type: 'select', options: ['employee', 'project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director'] },
    ],
  },
  {
    id: 'onboarding',
    title: 'Onboarding & Guidance',
    fields: [
      { key: 'tourEnabled', label: 'Guided Tour Enabled', type: 'boolean' },
      { key: 'tooltipsEnabled', label: 'Contextual Tooltips Enabled', type: 'boolean' },
      { key: 'showOnFirstLogin', label: 'Show Tour on First Login', type: 'boolean' },
      { key: 'welcomeMessage', label: 'Welcome Message', type: 'text' },
    ],
  },
  {
    id: 'evidenceManagement',
    title: 'Evidence Management',
    fields: [
      { key: 'enabled', label: 'Module Enabled', type: 'boolean' },
      { key: 'allowManualEntry', label: 'Allow Manual Entry', type: 'boolean' },
      { key: 'showDiagnosticsInCoreDashboards', label: 'Show Diagnostics In Core Dashboards', type: 'boolean' },
      { key: 'allowedSources', label: 'Allowed Sources (comma-separated)', type: 'text' },
      { key: 'retentionDays', label: 'Retention Days (blank = keep)', type: 'text' },
    ],
  },
  {
    id: 'timeEntry',
    title: 'Time Entry — submission rules & validation',
    fields: [
      { key: 'allowSubmitInAdvance', label: 'Allow submit in advance (before week ends)', type: 'boolean' },
      { key: 'allowFutureDateEntry', label: 'Allow logging hours on future dates', type: 'boolean' },
      { key: 'maxHoursPerDay', label: 'Max hours per day (work-day length cap)', type: 'number' },
      { key: 'maxHoursPerWeek', label: 'Max hours per week (work-week length cap)', type: 'number' },
      { key: 'standardHoursPerDay', label: 'Standard hours per day', type: 'number' },
    ],
  },
];

export function SettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<PlatformSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPlatformSettings();
      setSettings(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer testId="settings-page" viewport>
      <PageHeader
        eyebrow="Administration"
        subtitle="Configure platform-wide behaviour for timesheets, capitalisation, pulse, notifications, and security."
        title="Platform Settings"
      />

      {isLoading ? <LoadingState label="Loading settings..." variant="skeleton" skeletonType="page" /> : null}
      {loadError ? <ErrorState description={loadError} /> : null}

      {!isLoading && !loadError && settings ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SetupResetSection />
          {SECTIONS.map((section) => (
            <SettingsSection
              key={section.id}
              onSave={(key, value) => {
                setSettings((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    [section.id]: {
                      ...(prev[section.id] as unknown as Record<string, SettingValue>),
                      [key]: value,
                    },
                  };
                });
              }}
              section={section}
              values={settings[section.id] as unknown as Record<string, SettingValue>}
            />
          ))}
        </div>
      ) : null}
    </PageContainer>
  );
}

interface SettingsSectionProps {
  section: SectionDef;
  values: Record<string, SettingValue>;
  onSave: (key: string, value: SettingValue) => void;
}

function SettingsSection({ section, values, onSave }: SettingsSectionProps): JSX.Element {
  const [localValues, setLocalValues] = useState<Record<string, SettingValue>>(values);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});

  async function handleSave(field: FieldDef): Promise<void> {
    let value: SettingValue | string[] | null = localValues[field.key];
    if (section.id === 'evidenceManagement') {
      if (field.key === 'allowedSources' && typeof value === 'string') {
        value = value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
      if (field.key === 'retentionDays' && typeof value === 'string') {
        value = value.trim() === '' ? null : Number(value);
      }
    }
    setSaving((s) => ({ ...s, [field.key]: true }));
    setErrors((e) => ({ ...e, [field.key]: '' }));
    setSuccesses((s) => ({ ...s, [field.key]: false }));

    try {
      await updatePlatformSetting(`${section.id}.${field.key}`, value);
      onSave(field.key, value as SettingValue);
      toast.success('Setting saved.');
      setSuccesses((s) => ({ ...s, [field.key]: true }));
      setTimeout(() => setSuccesses((s) => ({ ...s, [field.key]: false })), 2000);
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [field.key]: err instanceof Error ? err.message : 'Failed to save.',
      }));
    } finally {
      setSaving((s) => ({ ...s, [field.key]: false }));
    }
  }

  return (
    <SectionCard title={section.title}>
      <div
        data-testid={`settings-section-${section.id}`}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {section.fields.map((field) => (
          <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ minWidth: '220px', fontWeight: 500, fontSize: '14px' }}>
              {field.label}
            </label>

            {field.type === 'boolean' ? (
              <input
                checked={Boolean(localValues[field.key])}
                data-testid={`setting-${section.id}-${field.key}`}
                onChange={(e) =>
                  setLocalValues((v) => ({ ...v, [field.key]: e.target.checked }))
                }
                style={{ width: '18px', height: '18px' }}
                type="checkbox"
              />
            ) : field.type === 'select' ? (
              <select
                className="input"
                data-testid={`setting-${section.id}-${field.key}`}
                onChange={(e) => {
                  const raw = e.target.value;
                  const parsed = raw !== '' && !isNaN(Number(raw)) ? Number(raw) : raw;
                  setLocalValues((v) => ({ ...v, [field.key]: parsed }));
                }}
                style={{ maxWidth: '200px' }}
                value={String(localValues[field.key] ?? '')}
              >
                {field.options?.map((opt, idx) => (
                  <option key={opt} value={opt}>{field.optionLabels?.[idx] ?? opt}</option>
                ))}
              </select>
            ) : field.type === 'number' ? (
              <input
                className="input"
                data-testid={`setting-${section.id}-${field.key}`}
                onChange={(e) =>
                  setLocalValues((v) => ({ ...v, [field.key]: Number(e.target.value) }))
                }
                style={{ maxWidth: '120px' }}
                type="number"
                value={Number(localValues[field.key] ?? 0)}
              />
            ) : (
              <input
                className="input"
                data-testid={`setting-${section.id}-${field.key}`}
                onChange={(e) =>
                  setLocalValues((v) => ({ ...v, [field.key]: e.target.value }))
                }
                style={{ maxWidth: '280px' }}
                type="text"
                value={Array.isArray(localValues[field.key]) ? (localValues[field.key] as string[]).join(', ') : String(localValues[field.key] ?? '')}
              />
            )}

            <Button variant="secondary" data-testid={`save-${section.id}-${field.key}`} disabled={saving[field.key] === true} onClick={() => { void handleSave(field); }} style={{ fontSize: '13px', padding: '4px 12px' }} type="button">
              {saving[field.key] === true ? 'Saving…' : 'Save'}
            </Button>

            {errors[field.key] ? (
              <span style={{ color: 'var(--color-status-danger)', fontSize: '12px' }}>{errors[field.key]}</span>
            ) : null}
            {successes[field.key] ? (
              <span style={{ color: 'var(--color-status-active)', fontSize: '12px' }}>Saved</span>
            ) : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
