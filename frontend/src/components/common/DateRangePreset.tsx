import { useState } from 'react';
import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  format,
} from 'date-fns';

interface DateRange {
  from: string; // ISO date yyyy-MM-dd
  to: string;
}

interface DateRangePresetProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Compact mode for toolbar embedding */
  compact?: boolean;
}

const today = (): string => format(new Date(), 'yyyy-MM-dd');

const PRESETS: Array<{ label: string; range: () => DateRange }> = [
  { label: '7d', range: () => ({ from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today() }) },
  { label: '30d', range: () => ({ from: format(subDays(new Date(), 29), 'yyyy-MM-dd'), to: today() }) },
  { label: 'This month', range: () => ({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Last month', range: () => ({ from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') }) },
  { label: 'This quarter', range: () => ({ from: format(startOfQuarter(new Date()), 'yyyy-MM-dd'), to: format(endOfQuarter(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Last quarter', range: () => ({ from: format(startOfQuarter(subQuarters(new Date(), 1)), 'yyyy-MM-dd'), to: format(endOfQuarter(subQuarters(new Date(), 1)), 'yyyy-MM-dd') }) },
  { label: 'YTD', range: () => ({ from: format(startOfYear(new Date()), 'yyyy-MM-dd'), to: today() }) },
];

export function DateRangePreset({ value, onChange, compact }: DateRangePresetProps): JSX.Element {
  const [showCustom, setShowCustom] = useState(false);
  const hasValue = value.from || value.to;

  // Find which preset matches current value (if any)
  const activePreset = PRESETS.findIndex((p) => {
    const r = p.range();
    return r.from === value.from && r.to === value.to;
  });

  function applyPreset(idx: number): void {
    const r = PRESETS[idx].range();
    onChange(r);
    setShowCustom(false);
  }

  function clear(): void {
    onChange({ from: '', to: '' });
    setShowCustom(false);
  }

  return (
    <div className={`date-range-preset ${compact ? 'date-range-preset--compact' : ''}`}>
      <div className="date-range-preset__presets">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            type="button"
            className={`date-range-preset__btn ${activePreset === i ? 'date-range-preset__btn--active' : ''}`}
            onClick={() => applyPreset(i)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`date-range-preset__btn ${showCustom ? 'date-range-preset__btn--active' : ''}`}
          onClick={() => setShowCustom((v) => !v)}
        >
          Custom
        </button>
        {hasValue && (
          <button type="button" className="date-range-preset__btn date-range-preset__btn--clear" onClick={clear}>
            Clear
          </button>
        )}
      </div>

      {showCustom && (
        <div className="date-range-preset__custom">
          <label className="date-range-preset__field">
            <span>From</span>
            <input
              type="date"
              min="1970-01-01"
              max={value.to || undefined}
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </label>
          <label className="date-range-preset__field">
            <span>To</span>
            <input
              type="date"
              min={value.from || '1970-01-01'}
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
