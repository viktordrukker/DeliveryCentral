import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, label, disabled, ...rest },
  ref,
) {
  const wrapperClass = ['ds-radio', disabled && 'ds-radio--disabled', className]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={wrapperClass}>
      <input
        ref={ref}
        type="radio"
        className="ds-radio__input"
        disabled={disabled}
        {...rest}
      />
      <span className="ds-radio__box" aria-hidden>
        <span className="ds-radio__dot" />
      </span>
      {label != null && <span className="ds-radio__label">{label}</span>}
    </label>
  );
});
