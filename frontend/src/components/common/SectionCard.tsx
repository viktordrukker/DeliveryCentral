import { type ReactNode, PropsWithChildren, useState } from 'react';

import { ChartCsvData, ChartExportMenu } from './ChartExportMenu';
import { IconButton } from '@/components/ds';

interface SectionCardProps {
  chartExport?: ChartCsvData;
  collapsible?: boolean;
  compact?: boolean;
  defaultCollapsed?: boolean;
  id?: string;
  title?: ReactNode;
}

export function SectionCard({
  chartExport,
  children,
  collapsible = false,
  compact = false,
  defaultCollapsed = false,
  id,
  title,
}: PropsWithChildren<SectionCardProps>): JSX.Element {
  const titleStr = typeof title === 'string' ? title : '';
  const storageKey = collapsible && titleStr ? `section-card-collapsed:${titleStr}` : null;
  const [collapsed, setCollapsed] = useState(() => {
    if (!storageKey) return defaultCollapsed;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) return stored === 'true';
    return defaultCollapsed;
  });

  function toggleCollapse(): void {
    const next = !collapsed;
    setCollapsed(next);
    if (storageKey) localStorage.setItem(storageKey, String(next));
  }

  return (
    <section className={`section-card${compact ? ' section-card--compact' : ''}`} id={id}>
      {title ? (
        <div style={{ alignItems: 'center', display: 'flex', gap: '8px', justifyContent: 'space-between', marginBottom: compact ? '6px' : undefined }}>
          <h3 className="section-card__title" style={{ margin: 0 }}>{title}</h3>
          <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
            {chartExport ? (
              <ChartExportMenu csvData={chartExport} title={titleStr} />
            ) : null}
            {collapsible ? (
              <IconButton
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expand section' : 'Collapse section'}
                onClick={toggleCollapse}
                size="sm"
                style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}
              >
                {collapsed ? '▸' : '▾'}
              </IconButton>
            ) : null}
          </div>
        </div>
      ) : null}
      {!collapsed ? children : null}
    </section>
  );
}
