import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  const merged = ['ds-textarea', invalid && 'ds-textarea--invalid', className]
    .filter(Boolean)
    .join(' ');

  return (
    <textarea
      ref={ref}
      className={merged}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});
