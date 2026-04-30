import { useEffect, useMemo, useState } from 'react';

import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { Button, FormField, Input } from '@/components/ds';
import {
  fetchPlatformSettingsByPrefix,
  updatePlatformSetting,
  type PlatformSettingRow,
} from '@/lib/api/platform-settings';

interface FieldDef {
  key: string;
  label: string;
  helper: string;
  /** "int" | "intArray" — coerces input value to the right shape on save. */
  kind: 'int' | 'intArray';
  /** Lower bound for "int". */
  min?: number;
  /** Upper bound for "int". */
  max?: number;
  /** Used in placeholder + reset-to-default when no DB row exists. */
  defaultDisplay: string;
}

interface SectionDef {
  title: string;
  description: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Time targets',
    description:
      'Stage SLA budgets and overall time-to-fill target. Each stage SLA is in business days; the time-to-fill target is the median goal from request creation to ASSIGNED.',
    fields: [
      { key: 'assignment.timeToFillTargetDays', label: 'Time-to-fill target (days)', helper: 'Median target from request creation to ASSIGNED.', kind: 'int', min: 1, max: 180, defaultDisplay: '30' },
      { key: 'assignment.sla.proposalDays', label: 'PROPOSAL stage SLA (business days)', helper: 'Time RM has to submit a proposal slate after a request lands.', kind: 'int', min: 1, max: 30, defaultDisplay: '2' },
      { key: 'assignment.sla.reviewDays', label: 'REVIEW stage SLA (business days)', helper: 'Time PM/DM has to acknowledge the slate.', kind: 'int', min: 1, max: 14, defaultDisplay: '1' },
      { key: 'assignment.sla.approvalDays', label: 'APPROVAL stage SLA (business days)', helper: 'Time to land a pick or rejection (incl. Director sign-off if required).', kind: 'int', min: 1, max: 30, defaultDisplay: '2' },
      { key: 'assignment.sla.rmFinalizeDays', label: 'RM_FINALIZE stage SLA (business days)', helper: 'Time RM has to finalize paperwork.', kind: 'int', min: 1, max: 14, defaultDisplay: '1' },
    ],
  },
  {
    title: 'Director-approval thresholds',
    description:
      'Either threshold tripping requires a Director sign-off. Set a threshold to a high value (or its bound) to effectively disable it.',
    fields: [
      { key: 'assignment.directorApproval.allocationPercentMin', label: 'Allocation threshold (%)', helper: 'Assignments at or above this allocation require Director approval.', kind: 'int', min: 0, max: 100, defaultDisplay: '80' },
      { key: 'assignment.directorApproval.durationMonthsMin', label: 'Duration threshold (months)', helper: 'Assignments lasting at least this long require Director approval.', kind: 'int', min: 0, max: 60, defaultDisplay: '12' },
    ],
  },
  {
    title: 'Pre-breach + post-breach reminders',
    description:
      'Comma-separated percentages of the SLA budget. Pre-breach percents must be 1–99 ascending; post-breach are 100–500 ascending and off by default.',
    fields: [
      { key: 'assignment.sla.warningPercents', label: 'Pre-breach percentages', helper: 'Comma-separated. Default: 50, 75.', kind: 'intArray', defaultDisplay: '50, 75' },
      { key: 'assignment.sla.postBreachPercents', label: 'Post-breach percentages', helper: 'Comma-separated. Default: empty (off).', kind: 'intArray', defaultDisplay: '(empty)' },
    ],
  },
  {
    title: 'Queue display + slate sizes',
    description: 'How the approval queue and proposal slates render to reviewers.',
    fields: [
      { key: 'assignment.approvalQueue.defaultWindowDays', label: 'Default queue window (days)', helper: 'Older rows are hidden by default.', kind: 'int', min: 1, max: 365, defaultDisplay: '30' },
      { key: 'assignment.slate.minCandidates', label: 'Minimum slate candidates', helper: 'RM cannot submit a slate smaller than this.', kind: 'int', min: 1, max: 10, defaultDisplay: '1' },
      { key: 'assignment.slate.maxCandidates', label: 'Maximum slate candidates', helper: 'RM cannot submit a slate larger than this.', kind: 'int', min: 1, max: 10, defaultDisplay: '5' },
    ],
  },
  {
    title: 'SLOs',
    description:
      'Latency targets surfaced on dashboards. Same value drives the runtime SLO check and the dashboard reference line.',
    fields: [
      { key: 'assignment.slo.approvalP50Hours', label: 'Approval p50 SLO (hours)', helper: 'Median time-to-decision target.', kind: 'int', min: 1, max: 720, defaultDisplay: '24' },
      { key: 'assignment.slo.approvalP95Hours', label: 'Approval p95 SLO (hours)', helper: '95th-percentile time-to-decision target.', kind: 'int', min: 1, max: 720, defaultDisplay: '72' },
      { key: 'assignment.slo.breachRateMaxPercent', label: 'Breach rate ceiling (%)', helper: 'Acceptable percentage of breaches before the SLO is considered violated.', kind: 'int', min: 0, max: 100, defaultDisplay: '5' },
    ],
  },
  {
    title: 'Matching weights',
    description:
      'Per-factor weights used by the staffing-suggestion scorer. Weights need not sum to 100 — the scorer normalizes internally.',
    fields: [
      { key: 'assignment.matching.weights.skill', label: 'Skill', helper: 'Weight for skill match.', kind: 'int', min: 0, max: 100, defaultDisplay: '25' },
      { key: 'assignment.matching.weights.proficiency', label: 'Proficiency', helper: 'Weight for proficiency level.', kind: 'int', min: 0, max: 100, defaultDisplay: '15' },
      { key: 'assignment.matching.weights.importance', label: 'Importance', helper: 'Weight for skill importance on the role.', kind: 'int', min: 0, max: 100, defaultDisplay: '15' },
      { key: 'assignment.matching.weights.availability', label: 'Availability', helper: 'Weight for free-capacity.', kind: 'int', min: 0, max: 100, defaultDisplay: '15' },
      { key: 'assignment.matching.weights.recency', label: 'Recency', helper: 'Weight for last-used skill recency.', kind: 'int', min: 0, max: 100, defaultDisplay: '5' },
      { key: 'assignment.matching.weights.grade', label: 'Grade', helper: 'Weight for grade-band fit.', kind: 'int', min: 0, max: 100, defaultDisplay: '10' },
      { key: 'assignment.matching.weights.domain', label: 'Domain', helper: 'Weight for prior projects in the same domain.', kind: 'int', min: 0, max: 100, defaultDisplay: '5' },
      { key: 'assignment.matching.weights.language', label: 'Language', helper: 'Weight for language overlap.', kind: 'int', min: 0, max: 100, defaultDisplay: '3' },
      { key: 'assignment.matching.weights.tz', label: 'Time-zone overlap', helper: 'Weight for working-hour overlap with the project.', kind: 'int', min: 0, max: 100, defaultDisplay: '2' },
      { key: 'assignment.matching.weights.cert', label: 'Certifications', helper: 'Weight for required certifications.', kind: 'int', min: 0, max: 100, defaultDisplay: '5' },
    ],
  },
  {
    title: 'Sweep cadence + nudge cooldown',
    description: 'Operational rates for the SLA sweep cron and reviewer nudges.',
    fields: [
      { key: 'assignment.sla.sweepIntervalMinutes', label: 'SLA sweep interval (minutes)', helper: 'How often the cron checks for breaches.', kind: 'int', min: 1, max: 1440, defaultDisplay: '15' },
      { key: 'assignment.nudge.cooldownHours', label: 'Nudge cooldown (hours)', helper: 'Minimum delay between nudges to the same recipient.', kind: 'int', min: 1, max: 168, defaultDisplay: '24' },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

function valueToString(value: unknown, kind: FieldDef['kind']): string {
  if (value === null || value === undefined) return '';
  if (kind === 'intArray') {
    if (Array.isArray(value)) return value.join(', ');
    return '';
  }
  return String(value);
}

function stringToValue(input: string, field: FieldDef): unknown {
  const trimmed = input.trim();
  if (field.kind === 'int') {
    if (!trimmed) return null;
    return Number(trimmed);
  }
  if (!trimmed) return [];
  return trimmed
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((t) => Number(t))
    .filter((n) => Number.isFinite(n));
}

interface FieldRowProps {
  field: FieldDef;
  row?: PlatformSettingRow;
  saving: boolean;
  status?: 'saved' | 'error';
  errorMessage?: string;
  onSave: (value: unknown) => Promise<void>;
}

function FieldRow({ field, row, saving, status, errorMessage, onSave }: FieldRowProps): JSX.Element {
  const [draft, setDraft] = useState<string>(() => valueToString(row?.value, field.kind));

  useEffect(() => {
    setDraft(valueToString(row?.value, field.kind));
  }, [row?.value, field.kind]);

  const isDefault = row?.isDefault === true;

  return (
    <FormField
      label={field.label}
      hint={
        <span>
          {field.helper}
          {' '}
          <span style={{ color: 'var(--color-text-subtle)' }}>
            {isDefault ? `(default: ${field.defaultDisplay})` : `(default: ${field.defaultDisplay})`}
          </span>
        </span>
      }
      error={status === 'error' ? errorMessage : undefined}
    >
      <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Input
            type={field.kind === 'int' ? 'number' : 'text'}
            value={draft}
            min={field.min}
            max={field.max}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={field.defaultDisplay}
            disabled={saving}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => {
            void onSave(stringToValue(draft, field));
          }}
        >
          Save
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={saving || isDefault}
          onClick={() => {
            void onSave(stringToValue(field.defaultDisplay, field));
          }}
        >
          Reset
        </Button>
        {status === 'saved' && (
          <span style={{ fontSize: 11, color: 'var(--color-status-active)' }}>Saved</span>
        )}
      </div>
    </FormField>
  );
}

export function AssignmentWorkflowSettings(): JSX.Element {
  const [rows, setRows] = useState<PlatformSettingRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set());
  const [statuses, setStatuses] = useState<Record<string, { status: 'saved' | 'error'; message?: string }>>({});

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void fetchPlatformSettingsByPrefix('assignment.')
      .then((result) => {
        if (active) {
          setRows(result.filter((r) => ALL_KEYS.includes(r.key)));
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load workflow settings.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const rowByKey = useMemo(() => {
    const map = new Map<string, PlatformSettingRow>();
    for (const r of rows) map.set(r.key, r);
    return map;
  }, [rows]);

  async function handleSave(key: string, value: unknown): Promise<void> {
    setSavingKeys((s) => new Set(s).add(key));
    setStatuses((m) => ({ ...m, [key]: { status: 'saved' as const } }));
    try {
      await updatePlatformSetting(key, value);
      setRows((current) => {
        const idx = current.findIndex((r) => r.key === key);
        if (idx < 0) return [...current, { key, value, isDefault: false }];
        const next = current.slice();
        next[idx] = { ...next[idx], value, isDefault: false };
        return next;
      });
      setStatuses((m) => ({ ...m, [key]: { status: 'saved' } }));
      setTimeout(() => {
        setStatuses((m) => {
          if (m[key]?.status !== 'saved') return m;
          const next = { ...m };
          delete next[key];
          return next;
        });
      }, 2500);
    } catch (err) {
      setStatuses((m) => ({
        ...m,
        [key]: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Save failed.',
        },
      }));
    } finally {
      setSavingKeys((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  }

  if (isLoading) {
    return <div style={{ padding: 'var(--space-3)' }}>Loading…</div>;
  }
  if (loadError) {
    return (
      <div role="alert" style={{ padding: 'var(--space-3)', color: 'var(--color-status-danger)' }}>
        {loadError}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
        Every metric in the assignment workflow (SLAs, Director-approval thresholds, slate
        bounds, SLOs, matching weights, sweep cadence) is admin-tunable here. Changes take effect
        on the next operation; matching-weight updates apply on the next scoring run.
      </div>
      {SECTIONS.map((section) => (
        <AdminSectionCard key={section.title} title={section.title} description={section.description}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {section.fields.map((field) => (
              <FieldRow
                key={field.key}
                field={field}
                row={rowByKey.get(field.key)}
                saving={savingKeys.has(field.key)}
                status={statuses[field.key]?.status}
                errorMessage={statuses[field.key]?.message}
                onSave={(value) => handleSave(field.key, value)}
              />
            ))}
          </div>
        </AdminSectionCard>
      ))}
    </div>
  );
}
