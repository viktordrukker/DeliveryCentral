import { type ReactNode, PropsWithChildren, useState } from 'react';

import { ChartCsvData, ChartExportMenu } from './ChartExportMenu';

interface SectionCardProps {
  chartExport?: ChartCsvData;
  collapsible?: boolean;
  id?: string;
  title?: ReactNode;
}

export function SectionCard({
  chartExport,
  children,
  collapsible = false,
  id,
  title,
}: PropsWithChildren<SectionCardProps>): JSX.Element {
  const titleStr = typeof title === 'string' ? title : '';
  const storageKey = collapsible && titleStr ? `section-card-collapsed:${titleStr}` : null;
  const [collapsed, setCollapsed] = useState(() => {
    if (!storageKey) return false;
    return localStorage.getItem(storageKey) === 'true';
  });

  function toggleCollapse(): void {
    const next = !collapsed;
    setCollapsed(next);
    if (storageKey) localStorage.setItem(storageKey, String(next));
  }

  return (
    <section className="section-card" id={id}>
      {title ? (
        <div style={{ alignItems: 'center', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <h3 className="section-card__title" style={{ margin: 0 }}>{title}</h3>
          <div style={{ alignItems: 'center', display: 'flex', gap: '4px' }}>
            {chartExport ? (
              <ChartExportMenu csvData={chartExport} title={titleStr} />
            ) : null}
            {collapsible ? (
              <button
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Expand section' : 'Collapse section'}
                onClick={toggleCollapse}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '14px', padding: '2px 6px' }}
                type="button"
              >
                {collapsed ? '▸' : '▾'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {!collapsed ? children : null}
    </section>
  );
}
