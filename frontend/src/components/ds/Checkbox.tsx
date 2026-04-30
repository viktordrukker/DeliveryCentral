import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, disabled, ...rest },
  ref,
) {
  const wrapperClass = [
    'ds-checkbox',
    disabled && 'ds-checkbox--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClass}>
      <input
        ref={ref}
        type="checkbox"
        className="ds-checkbox__input"
        disabled={disabled}
        {...rest}
      />
      <span className="ds-checkbox__box" aria-hidden>
        <svg
          className="ds-checkbox__check"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="2,6 5,9 10,3" />
        </svg>
      </span>
      {label != null && <span className="ds-checkbox__label">{label}</span>}
    </label>
  );
});
