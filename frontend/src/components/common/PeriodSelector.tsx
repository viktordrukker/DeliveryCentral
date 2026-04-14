import { useState } from 'react';

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
          <button
            key={p.id}
            onClick={() => handlePeriodClick(p.id)}
            style={{
              background: activePeriod === p.id ? 'var(--color-accent)' : 'var(--color-surface-alt)',
              border: '1px solid',
              borderColor: activePeriod === p.id ? 'var(--color-accent)' : 'var(--color-border)',
              borderRadius: '4px',
              color: activePeriod === p.id ? 'var(--color-surface)' : 'var(--color-text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: activePeriod === p.id ? 600 : 400,
              padding: '3px 8px',
              whiteSpace: 'nowrap',
            }}
            type="button"
          >
            {p.label}
          </button>
        ))}
      </div>
      {showCustom ? (
        <input
          className="field__control"
          onChange={(e) => onAsOfChange(`${e.target.value}:00.000Z`)}
          style={{ marginTop: '4px', maxWidth: '220px' }}
          type="datetime-local"
          value={value.slice(0, 16)}
        />
      ) : null}
    </div>
  );
}
