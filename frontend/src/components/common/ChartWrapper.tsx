import { ReactNode } from 'react';

interface ChartWrapperProps {
  ariaLabel: string;
  children: ReactNode;
  description?: string;
}

/**
 * Accessibility wrapper for all chart components.
 * Provides role="img" and aria-label per WCAG 1.1.1 / W3C guidance for
 * static data visualizations (as opposed to role="application").
 * Includes a visually-hidden description for screen readers.
 */
export function ChartWrapper({ ariaLabel, children, description }: ChartWrapperProps): JSX.Element {
  return (
    <div
      aria-label={ariaLabel}
      role="img"
      tabIndex={0}
      style={{ outline: 'none' }}
      className="chart-wrapper"
    >
      {description ? (
        <span className="sr-only">{description}</span>
      ) : null}
      {children}
    </div>
  );
}
