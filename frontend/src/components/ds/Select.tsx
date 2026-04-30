import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Native `<select>` styled to match design tokens. For searchable / async
 * pickers, use `<Combobox>` (DS-3).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  const merged = ['ds-select', invalid && 'ds-select--invalid', className]
    .filter(Boolean)
    .join(' ');

  return (
    <select
      ref={ref}
      className={merged}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
});
