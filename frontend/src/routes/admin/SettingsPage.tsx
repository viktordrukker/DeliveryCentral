import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AdminTabbedShell } from '@/components/admin/AdminTabbedShell';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SetupResetSection } from './SetupResetSection';
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
  type: 'text' | 'number' | 'boolean' | 'select' | 'password';
  options?: string[];
  optionLabels?: string[];
  min?: number;
  max?: number;
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
      { key: 'fiscalYearStart', label: 'Fiscal Year Start (month)', type: 'number', min: 1, max: 12 },
      { key: 'dateFormat', label: 'Date Format', type: 'text' },
      { key: 'currency', label: 'Currency', type: 'text' },
    ],
  },
  {
    id: 'timesheets',
    title: 'Timesheets',
    fields: [
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      { key: 'standardHoursPerWeek', label: 'Standard Hours / Week', type: 'number', min: 0, max: 168 },
      { key: 'maxHoursPerDay', label: 'Max Hours / Day', type: 'number', min: 0, max: 24 },
      { key: 'weekStartDay', label: 'Week Start Day', type: 'select', options: ['0', '1'], optionLabels: ['Sunday', 'Monday'] },
      { key: 'autoPopulate', label: 'Auto-Populate', type: 'boolean' },
      { key: 'approvalRequired', label: 'Approval Required', type: 'boolean' },
      { key: 'lockAfterDays', label: 'Lock After Days', type: 'number', min: 1, max: 365 },
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
      { key: 'alertThreshold', label: 'Alert Threshold (mood 1-5)', type: 'number', min: 1, max: 5 },
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
      { key: 'sessionTimeoutMinutes', label: 'Session Timeout (minutes)', type: 'number', min: 1, max: 10080 },
      { key: 'maxLoginAttempts', label: 'Max Login Attempts', type: 'number', min: 1, max: 100 },
      { key: 'passwordMinLength', label: 'Password Min Length', type: 'number', min: 6, max: 128 },
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
      { key: 'clientSecret', label: 'Client Secret', type: 'password' },
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
      { key: 'maxHoursPerDay', label: 'Max hours per day (work-day length cap)', type: 'number', min: 0, max: 24 },
      { key: 'maxHoursPerWeek', label: 'Max hours per week (work-week length cap)', type: 'number', min: 0, max: 168 },
      { key: 'standardHoursPerDay', label: 'Standard hours per day', type: 'number', min: 0, max: 24 },
    ],
  },
];

/**
 * Inline-mountable platform settings admin content. Renders the settings
 * sections without PageContainer/PageHeader chrome so AdminPanelPage can
 * mount it inside the General tab under dsRefresh. Standalone SettingsPage
 * still wraps this with its own chrome.
 */
export function SettingsAdminContent(): JSX.Element {
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
    <>
      {isLoading ? <LoadingState label="Loading settings..." variant="skeleton" skeletonType="page" /> : null}
      {loadError ? <ErrorState description={loadError} /> : null}

      {!isLoading && !loadError && settings ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SetupResetSection />
          {SECTIONS.map((section) => (
            <SettingsSection
              key={section.id}
              onSectionSaved={(savedValues) => {
                setSettings((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    [section.id]: {
                      ...(prev[section.id] as unknown as Record<string, SettingValue>),
                      ...savedValues,
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
    </>
  );
}

export function SettingsPage(): JSX.Element {
  return (
    <AdminTabbedShell
      eyebrow="Administration"
      subtitle="Configure platform-wide behaviour for timesheets, capitalisation, pulse, notifications, and security."
      testId="settings-page"
      title="Platform Settings"
    >
      <SettingsAdminContent />
    </AdminTabbedShell>
  );
}

interface SettingsSectionProps {
  section: SectionDef;
  values: Record<string, SettingValue>;
  onSectionSaved: (savedValues: Record<string, SettingValue>) => void;
}

function normaliseForSubmit(
  section: SectionDef,
  field: FieldDef,
  value: SettingValue,
): SettingValue {
  if (section.id === 'evidenceManagement') {
    if (field.key === 'allowedSources' && typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (field.key === 'retentionDays' && typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : Number(trimmed);
    }
  }
  return value;
}

function validateField(field: FieldDef, value: SettingValue): string | null {
  if (field.type === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) {
      return 'Must be a number.';
    }
    if (typeof field.min === 'number' && num < field.min) {
      return `Must be ≥ ${field.min}.`;
    }
    if (typeof field.max === 'number' && num > field.max) {
      return `Must be ≤ ${field.max}.`;
    }
  }
  return null;
}

function valuesEqual(a: SettingValue, b: SettingValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, idx) => item === b[idx]);
  }
  return a === b;
}

function SettingsSection({ section, values, onSectionSaved }: SettingsSectionProps): JSX.Element {
  const [localValues, setLocalValues] = useState<Record<string, SettingValue>>(values);
  const [originalValues, setOriginalValues] = useState<Record<string, SettingValue>>(values);
  const [saving, setSaving] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [sectionSaved, setSectionSaved] = useState(false);

  // Sync when parent reloads settings (e.g. after first fetch).
  useEffect(() => {
    setLocalValues(values);
    setOriginalValues(values);
  }, [values]);

  const fieldErrors = useMemo<Record<string, string>>(() => {
    const errs: Record<string, string> = {};
    for (const field of section.fields) {
      const value = localValues[field.key];
      const err = validateField(field, value);
      if (err) errs[field.key] = err;
    }
    return errs;
  }, [localValues, section.fields]);

  const dirtyFields = useMemo<FieldDef[]>(() => {
    return section.fields.filter((field) =>
      !valuesEqual(localValues[field.key], originalValues[field.key]),
    );
  }, [localValues, originalValues, section.fields]);

  const isDirty = dirtyFields.length > 0;
  const hasErrors = Object.keys(fieldErrors).length > 0;

  async function handleSaveSection(): Promise<void> {
    setSaving(true);
    setSectionError(null);
    setSectionSaved(false);

    const saved: Record<string, SettingValue> = {};
    try {
      for (const field of dirtyFields) {
        const raw = localValues[field.key];
        const normalised = normaliseForSubmit(section, field, raw);
        await updatePlatformSetting(`${section.id}.${field.key}`, normalised);
        saved[field.key] = normalised;
      }
      onSectionSaved(saved);
      setOriginalValues((prev) => ({ ...prev, ...saved }));
      setLocalValues((prev) => ({ ...prev, ...saved }));
      toast.success(`${section.title} settings saved.`);
      setSectionSaved(true);
      setTimeout(() => setSectionSaved(false), 2000);
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  function handleResetSection(): void {
    setLocalValues(originalValues);
    setSectionError(null);
    setSectionSaved(false);
  }

  return (
    <SectionCard title={section.title}>
      <div
        data-testid={`settings-section-${section.id}`}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {section.fields.map((field) => {
          const fieldDirty = !valuesEqual(localValues[field.key], originalValues[field.key]);
          const fieldErr = fieldErrors[field.key];
          return (
            <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ minWidth: '220px', fontWeight: 500, fontSize: '14px' }}>
                {field.label}
                {fieldDirty ? (
                  <span
                    data-testid={`dirty-${section.id}-${field.key}`}
                    style={{ color: 'var(--color-status-warning)', marginLeft: '6px', fontSize: '12px' }}
                    title="Unsaved change"
                  >
                    •
                  </span>
                ) : null}
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
                  max={field.max}
                  min={field.min}
                  onChange={(e) =>
                    setLocalValues((v) => ({ ...v, [field.key]: Number(e.target.value) }))
                  }
                  style={{ maxWidth: '120px' }}
                  type="number"
                  value={Number(localValues[field.key] ?? 0)}
                />
              ) : field.type === 'password' ? (
                <input
                  autoComplete="new-password"
                  className="input"
                  data-testid={`setting-${section.id}-${field.key}`}
                  onChange={(e) =>
                    setLocalValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                  style={{ maxWidth: '280px' }}
                  type="password"
                  value={String(localValues[field.key] ?? '')}
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

              {fieldErr ? (
                <span
                  data-testid={`error-${section.id}-${field.key}`}
                  style={{ color: 'var(--color-status-danger)', fontSize: '12px' }}
                >
                  {fieldErr}
                </span>
              ) : null}
            </div>
          );
        })}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '12px',
          }}
        >
          <Button
            data-testid={`save-section-${section.id}`}
            disabled={!isDirty || hasErrors || saving}
            onClick={() => {
              void handleSaveSection();
            }}
            type="button"
            variant="primary"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            data-testid={`reset-section-${section.id}`}
            disabled={!isDirty || saving}
            onClick={handleResetSection}
            type="button"
            variant="secondary"
          >
            Reset
          </Button>
          {isDirty ? (
            <span
              data-testid={`dirty-indicator-${section.id}`}
              style={{ color: 'var(--color-status-warning)', fontSize: '12px' }}
            >
              {dirtyFields.length} unsaved change{dirtyFields.length === 1 ? '' : 's'}
            </span>
          ) : null}
          {sectionError ? (
            <span
              data-testid={`section-error-${section.id}`}
              style={{ color: 'var(--color-status-danger)', fontSize: '12px' }}
            >
              {sectionError}
            </span>
          ) : null}
          {sectionSaved ? (
            <span
              data-testid={`section-saved-${section.id}`}
              style={{ color: 'var(--color-status-active)', fontSize: '12px' }}
            >
              Saved
            </span>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
