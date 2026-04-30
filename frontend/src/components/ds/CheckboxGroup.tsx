import { ReactNode, useId } from 'react';

import { Checkbox } from './Checkbox';

interface CheckboxOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  hint?: ReactNode;
}

interface CheckboxGroupProps {
  legend?: ReactNode;
  options: CheckboxOption[];
  value: string[];
  onValueChange: (next: string[]) => void;
  /** Visual orientation of the option list. Default: 'vertical'. */
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
  className?: string;
}

/**
 * Phase DS-3-2 — group of checkboxes representing a multi-select. Internally
 * uses `<fieldset>` + `<legend>` for proper semantics; the legend can be
 * visually styled like a label via `<FormField>` if needed.
 */
export function CheckboxGroup({
  legend,
  options,
  value,
  onValueChange,
  orientation = 'vertical',
  disabled = false,
  className,
}: CheckboxGroupProps): JSX.Element {
  const id = useId();
  function toggle(optionValue: string): void {
    if (disabled) return;
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(next);
  }

  const merged = ['ds-checkbox-group', `ds-checkbox-group--${orientation}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset className={merged} disabled={disabled}>
      {legend && <legend className="ds-checkbox-group__legend">{legend}</legend>}
      {options.map((option) => (
        <Checkbox
          key={option.value}
          name={`${id}-${option.value}`}
          value={option.value}
          checked={value.includes(option.value)}
          onChange={() => toggle(option.value)}
          disabled={disabled || option.disabled}
          label={
            <span>
              {option.label}
              {option.hint && (
                <span className="ds-checkbox-group__hint"> · {option.hint}</span>
              )}
            </span>
          }
        />
      ))}
    </fieldset>
  );
}
