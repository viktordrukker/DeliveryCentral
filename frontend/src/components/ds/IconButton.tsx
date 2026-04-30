import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — describes the action for screen readers. */
  'aria-label': string;
  size?: IconButtonSize;
  children: ReactNode;
}

/**
 * Square icon-only button. Touch target ≥44px below md.
 * `aria-label` is required since the visible content is iconographic.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'md', className, children, type, ...rest },
  ref,
) {
  const merged = ['ds-icon-button', `ds-icon-button--${size}`, className].filter(Boolean).join(' ');
  return (
    <button ref={ref} className={merged} type={type ?? 'button'} {...rest}>
      {children}
    </button>
  );
});
