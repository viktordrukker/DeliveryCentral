import { useId } from 'react';

import { DatePicker } from './DatePicker';

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (next: string) => void;
  onToChange: (next: string) => void;
  fromLabel?: string;
  toLabel?: string;
  /** Compact inline layout. Default: false (stacked). */
  inline?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Phase DS-3-2 — start/end date pair. Validation is light: enforces
 * `from ≤ to` by setting `min` on the second picker. Anything stricter
 * (preset ranges, holidays, business days) belongs in the consumer.
 */
export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = 'From',
  toLabel = 'To',
  inline = false,
  invalid,
  disabled,
  className,
}: DateRangePickerProps): JSX.Element {
  const id = useId();
  const merged = ['ds-date-range', inline && 'ds-date-range--inline', className].filter(Boolean).join(' ');
  return (
    <div className={merged}>
      <label className="ds-date-range__field" htmlFor={`${id}-from`}>
        <span className="ds-date-range__label">{fromLabel}</span>
        <DatePicker
          id={`${id}-from`}
          value={from}
          onValueChange={onFromChange}
          max={to || undefined}
          invalid={invalid}
          disabled={disabled}
        />
      </label>
      <label className="ds-date-range__field" htmlFor={`${id}-to`}>
        <span className="ds-date-range__label">{toLabel}</span>
        <DatePicker
          id={`${id}-to`}
          value={to}
          onValueChange={onToChange}
          min={from || undefined}
          invalid={invalid}
          disabled={disabled}
        />
      </label>
    </div>
  );
}
