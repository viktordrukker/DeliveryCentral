import { ComponentPropsWithoutRef, ElementType, ReactNode, forwardRef } from 'react';

export type LinkSize = 'xs' | 'sm' | 'md';

interface CommonLinkProps {
  size?: LinkSize;
  muted?: boolean;
  className?: string;
  children?: ReactNode;
}

type PolymorphicLinkProps<E extends ElementType> = CommonLinkProps & {
  as?: E;
} & Omit<ComponentPropsWithoutRef<E>, keyof CommonLinkProps | 'as'>;

/**
 * Polymorphic link.
 *
 * - `as="a"` (default) renders a native anchor.
 * - `as={Link}` renders a react-router Link — pass `to`.
 *
 * Use `<Button as="a" variant="link">` instead when the affordance is
 * action-y (a click that triggers a side effect rather than navigation).
 */
export const Link = forwardRef(function Link<E extends ElementType = 'a'>(
  props: PolymorphicLinkProps<E>,
  ref: React.Ref<Element>,
): JSX.Element {
  const { as, size = 'md', muted = false, className, children, ...rest } = props as PolymorphicLinkProps<ElementType>;

  const Component = (as ?? 'a') as ElementType;

  const merged = [
    'ds-link',
    `ds-link--${size}`,
    muted && 'ds-link--muted',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component ref={ref} className={merged} {...rest}>
      {children}
    </Component>
  );
}) as <E extends ElementType = 'a'>(props: PolymorphicLinkProps<E>) => JSX.Element;
