import { SHAPE_LABELS, V2_WIRED_SHAPES, type ProjectShape } from '@/features/project-pulse/shape-defaults';

interface ShapeBadgeProps {
  shape: ProjectShape | null | undefined;
}

export function ShapeBadge({ shape }: ShapeBadgeProps): JSX.Element | null {
  if (!shape) return null;
  const isWired = V2_WIRED_SHAPES.includes(shape);
  return (
    <span
      aria-label={`Project shape: ${SHAPE_LABELS[shape]}`}
      data-testid="shape-badge"
      style={{
        alignItems: 'center',
        background: isWired ? 'var(--color-accent-soft)' : 'var(--color-surface-alt)',
        border: `1px solid ${isWired ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-control)',
        color: isWired ? 'var(--color-accent)' : 'var(--color-text-muted)',
        display: 'inline-flex',
        fontSize: 10,
        fontWeight: 600,
        gap: 4,
        letterSpacing: '0.04em',
        padding: '2px 8px',
        textTransform: 'uppercase',
      }}
      title={isWired ? undefined : 'Awaiting PIMS module integration'}
    >
      {SHAPE_LABELS[shape]}
      {!isWired ? <span aria-hidden="true">⏳</span> : null}
    </span>
  );
}
