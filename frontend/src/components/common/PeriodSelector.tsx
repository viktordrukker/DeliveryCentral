import { useState } from 'react';

import { Button, Input } from '@/components/ds';

type Period = 'today' | 'this-week' | 'this-month' | 'last-month' | 'custom';

interface PeriodSelectorProps {
  label?: string;
  onAsOfChange: (isoString: string) => void;
  value: string;
}

function periodToAsOf(period: Period): string {
  const now = new Date();
  switch (period) {
    case 'today':
      return now.toISOString();
    case 'this-week': {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case 'this-month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.toISOString();
    }
    case 'last-month': {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.toISOString();
    }
    default:
      return now.toISOString();
  }
}

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'this-week', label: 'This Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'custom', label: 'Custom ▾' },
];

/**
 * Phase DS-3-3 — public API unchanged. The ad-hoc inline-styled buttons are
 * replaced with DS <Button> atoms (variant flips primary↔secondary based on
 * the active period). Custom datetime-local input now uses the DS <Input>.
 */
export function PeriodSelector({ label = 'Period', onAsOfChange, value }: PeriodSelectorProps): JSX.Element {
  const [activePeriod, setActivePeriod] = useState<Period>('today');
  const [showCustom, setShowCustom] = useState(false);

  function handlePeriodClick(period: Period): void {
    setActivePeriod(period);
    if (period === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onAsOfChange(periodToAsOf(period));
    }
  }

  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        {PERIODS.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={activePeriod === p.id ? 'primary' : 'secondary'}
            onClick={() => handlePeriodClick(p.id)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {showCustom ? (
        <Input
          type="datetime-local"
          onChange={(e) => onAsOfChange(`${e.target.value}:00.000Z`)}
          style={{ marginTop: '4px', maxWidth: '220px' }}
          value={value.slice(0, 16)}
        />
      ) : null}
    </div>
  );
}
