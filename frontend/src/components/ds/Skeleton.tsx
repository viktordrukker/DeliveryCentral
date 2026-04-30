import { CSSProperties, HTMLAttributes } from 'react';

export type SkeletonShape = 'text' | 'rectangle' | 'circle';

interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  shape?: SkeletonShape;
  width?: number | string;
  height?: number | string;
  /** Used by reading software when the placeholder is the *only* on-screen marker. */
  label?: string;
}

/**
 * Shimmer placeholder. For full-page skeletons see `LoadingState` (existing primitive).
 * Respects `prefers-reduced-motion`.
 */
export function Skeleton({
  shape = 'rectangle',
  width,
  height,
  label,
  className,
  style,
  ...rest
}: SkeletonProps): JSX.Element {
  const merged = ['ds-skeleton', shape === 'circle' && 'ds-skeleton--circle', shape === 'text' && 'ds-skeleton--text', className]
    .filter(Boolean)
    .join(' ');

  const resolvedStyle: CSSProperties = {
    ...style,
    width: width ?? style?.width,
    height: height ?? style?.height,
  };

  return (
    <span
      className={merged}
      style={resolvedStyle}
      role="status"
      aria-label={label ?? 'Loading'}
      aria-busy="true"
      {...rest}
    />
  );
}
