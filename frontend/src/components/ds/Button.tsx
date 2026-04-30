import {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
  Ref,
  forwardRef,
} from 'react';

import { Spinner } from './Spinner';

/** Ref type derived from the polymorphic element. */
type PolymorphicRef<E extends ElementType> = ComponentPropsWithRef<E>['ref'];

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface CommonButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /**
   * Disabled state. On `as="button"` (default) maps to native `disabled`.
   * On `as="a"` / `as={Link}` (no native disabled) the component sets
   * `aria-disabled="true"` and the consumer should `e.preventDefault()`
   * inside `onClick` when appropriate.
   */
  disabled?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

type PolymorphicButtonProps<E extends ElementType> = CommonButtonProps & {
  as?: E;
  ref?: PolymorphicRef<E>;
} & Omit<ComponentPropsWithoutRef<E>, keyof CommonButtonProps | 'as' | 'ref'>;

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Polymorphic primary action button.
 *
 * - `as="button"` (default) renders a native button.
 * - `as="a"` renders an anchor — pass `href`.
 * - `as={Link}` renders a react-router Link — pass `to`.
 *
 * Variants: primary | secondary | ghost | danger | link.
 * Sizes: xs | sm | md (default) | lg. Touch target ≥44px below md.
 */
export const Button = forwardRef(function Button<E extends ElementType = 'button'>(
  props: PolymorphicButtonProps<E>,
  ref: Ref<Element>,
): JSX.Element {
  const {
    as,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    ...rest
  } = props as PolymorphicButtonProps<ElementType>;

  const Component = (as ?? 'button') as ElementType;
  const isNativeButton = Component === 'button';

  const merged = classNames(
    'ds-button',
    `ds-button--${variant}`,
    `ds-button--${size}`,
    className,
  );

  return (
    <Component
      ref={ref}
      className={merged}
      type={isNativeButton ? (rest as { type?: string }).type ?? 'button' : undefined}
      disabled={isNativeButton ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      aria-disabled={!isNativeButton && (disabled || loading) ? true : undefined}
      data-loading={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size="xs" className="ds-button__spinner" aria-hidden /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </Component>
  );
}) as <E extends ElementType = 'button'>(props: PolymorphicButtonProps<E>) => JSX.Element;
