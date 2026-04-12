import { PropsWithChildren } from 'react';

interface ViewportTableProps {
  actions?: React.ReactNode;
  filterRow?: React.ReactNode;
  title?: string;
}

/**
 * Flex column layout that locks the table body to viewport height.
 * - Optional fixed header row with title and action buttons
 * - Optional fixed filter row
 * - Scrollable body area — the table scrolls, the page does not
 */
export function ViewportTable({
  actions,
  children,
  filterRow,
  title,
}: PropsWithChildren<ViewportTableProps>): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      {(title != null || actions != null) && (
        <div
          style={{
            alignItems: 'center',
            display: 'flex',
            flexShrink: 0,
            gap: '8px',
            justifyContent: 'space-between',
            minHeight: 'var(--page-header-height, 48px)',
            padding: '8px 0',
          }}
        >
          {title != null && (
            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{title}</h2>
          )}
          {actions != null && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
        </div>
      )}

      {filterRow != null && (
        <div style={{ flexShrink: 0, paddingBottom: '8px' }}>{filterRow}</div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
