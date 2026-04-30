import { InputHTMLAttributes, forwardRef } from 'react';

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string;
  onValueChange: (next: string) => void;
  invalid?: boolean;
  /** Optional ISO `YYYY-MM-DD` lower bound. */
  min?: string;
  /** Optional ISO `YYYY-MM-DD` upper bound. */
  max?: string;
}

/**
 * Phase DS-3-2 — date input. Wraps native `<input type="date">` with
 * design-token styling, `value`/`onValueChange` controlled API, and an
 * `invalid` prop that maps to `aria-invalid`.
 *
 * Replacement target for ~21 raw `<input type="date">` callsites the
 * inventory found (DS-3-4 sweep).
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { value, onValueChange, invalid, className, min, max, ...rest },
  ref,
) {
  const merged = ['ds-input', invalid && 'ds-input--invalid', className].filter(Boolean).join(' ');
  return (
    <input
      ref={ref}
      type="date"
      className={merged}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      aria-invalid={invalid || undefined}
      min={min}
      max={max}
      {...rest}
    />
  );
});
