import { PropsWithChildren } from 'react';

interface DashboardGridProps {
  className?: string;
}

interface DashboardGridItemProps {
  /** How many grid columns this item should span (default: 1) */
  span?: number;
}

/**
 * Adaptive CSS Grid for dashboard pages.
 * Uses container queries to adapt column count to available space:
 * - ≤ 550px: 2-column compact
 * - 551–900px: 3-column
 * - 901–1300px: 3-column spacious
 * - > 1300px: 4-column
 */
export function DashboardGrid({ children, className }: PropsWithChildren<DashboardGridProps>): JSX.Element {
  return (
    <div className={`dashboard-page-grid${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}

/** Wrapper for a single grid cell with optional column span */
export function DashboardGridItem({ children, span = 1 }: PropsWithChildren<DashboardGridItemProps>): JSX.Element {
  return (
    <div style={span > 1 ? { gridColumn: `span ${span}` } : undefined}>
      {children}
    </div>
  );
}
