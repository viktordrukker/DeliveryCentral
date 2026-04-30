import type { PulseReportTier } from '@/lib/api/pulse-report';
import { Button } from '@/components/ds';

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
          <Button
            key={tier}
            variant={active ? 'primary' : 'secondary'}
            size={compact ? 'xs' : 'sm'}
            aria-checked={active}
            aria-label={`Tier ${tier}: ${labels[tier]}`}
            role="radio"
            onClick={() => onChange(tier)}
          >
            {tier} · {labels[tier]}
          </Button>
        );
      })}
    </div>
  );
}
