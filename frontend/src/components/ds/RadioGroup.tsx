import { ReactNode, useId } from 'react';

import { Radio } from './Radio';

interface RadioOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
  hint?: ReactNode;
}

interface RadioGroupProps {
  legend?: ReactNode;
  /** Required name for proper grouping (browsers use this to dedupe). */
  name?: string;
  options: RadioOption[];
  value: string;
  onValueChange: (next: string) => void;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
  className?: string;
}

/**
 * Phase DS-3-2 — group of radios representing a single-select. Uses
 * `<fieldset>` + `<legend>` for semantics; consumer-supplied `name` overrides
 * the auto-generated one.
 */
export function RadioGroup({
  legend,
  name: nameProp,
  options,
  value,
  onValueChange,
  orientation = 'vertical',
  disabled = false,
  className,
}: RadioGroupProps): JSX.Element {
  const reactId = useId();
  const name = nameProp ?? `rg-${reactId}`;

  const merged = ['ds-radio-group', `ds-radio-group--${orientation}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset className={merged} disabled={disabled}>
      {legend && <legend className="ds-radio-group__legend">{legend}</legend>}
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onValueChange(option.value)}
          disabled={disabled || option.disabled}
          label={
            <span>
              {option.label}
              {option.hint && (
                <span className="ds-radio-group__hint"> · {option.hint}</span>
              )}
            </span>
          }
        />
      ))}
    </fieldset>
  );
}
