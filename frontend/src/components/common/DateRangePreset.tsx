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
import { Button, DatePicker } from '@/components/ds';

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
          <Button
            key={p.label}
            type="button"
            variant={activePreset === i ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => applyPreset(i)}
          >
            {p.label}
          </Button>
        ))}
        <Button
          type="button"
          variant={showCustom ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowCustom((v) => !v)}
        >
          Custom
        </Button>
        {hasValue && (
          <Button type="button" variant="link" size="sm" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      {showCustom && (
        <div className="date-range-preset__custom">
          <label className="date-range-preset__field">
            <span>From</span>
            <DatePicker
              min="1970-01-01"
              max={value.to || undefined}
              value={value.from}
              onValueChange={(next) => onChange({ ...value, from: next })}
            />
          </label>
          <label className="date-range-preset__field">
            <span>To</span>
            <DatePicker
              min={value.from || '1970-01-01'}
              value={value.to}
              onValueChange={(next) => onChange({ ...value, to: next })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
