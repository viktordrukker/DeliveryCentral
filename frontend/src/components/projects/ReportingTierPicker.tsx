import type { PulseReportTier } from '@/lib/api/pulse-report';

interface ReportingTierPickerProps {
  value: PulseReportTier;
  onChange: (next: PulseReportTier) => void;
  labels?: { A: string; B: string };
  compact?: boolean;
}

export function ReportingTierPicker({
  value,
  onChange,
  labels = { A: 'General', B: 'Quadrant' },
  compact,
}: ReportingTierPickerProps): JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label="Reporting tier"
      style={{ display: 'inline-flex', gap: 2 }}
    >
      {(['A', 'B'] as const).map((tier) => {
        const active = value === tier;
        return (
          <button
            aria-checked={active}
            aria-label={`Tier ${tier}: ${labels[tier]}`}
            className={active ? 'button--project-detail button--primary' : 'button--project-detail'}
            key={tier}
            onClick={() => onChange(tier)}
            role="radio"
            style={compact ? { padding: '2px 8px', fontSize: 10 } : undefined}
            type="button"
          >
            {tier} · {labels[tier]}
          </button>
        );
      })}
    </div>
  );
}
