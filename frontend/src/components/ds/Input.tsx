import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  invalid?: boolean;
}

/**
 * Token-driven text input. Use inside `<FormField>` (DS-3) for label / error chrome.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type, ...rest },
  ref,
) {
  const merged = [
    'ds-input',
    invalid && 'ds-input--invalid',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      ref={ref}
      type={type ?? 'text'}
      className={merged}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
