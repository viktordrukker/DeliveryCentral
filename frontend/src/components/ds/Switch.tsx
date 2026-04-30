import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: ReactNode;
}

/**
 * Toggle switch (checkbox semantically). Use `aria-label` when no visible
 * label is supplied, e.g. inline in a settings row.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, label, disabled, ...rest },
  ref,
) {
  const wrapperClass = ['ds-switch', disabled && 'ds-switch--disabled', className]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClass}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className="ds-switch__input"
        disabled={disabled}
        {...rest}
      />
      <span className="ds-switch__track" aria-hidden>
        <span className="ds-switch__thumb" />
      </span>
      {label != null && <span className="ds-switch__label">{label}</span>}
    </label>
  );
});
