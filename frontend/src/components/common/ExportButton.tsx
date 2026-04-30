import { useRef, useState, useEffect } from 'react';

import { exportToXlsx } from '@/lib/export';
import { Button } from '@/components/ds';

export interface ExportColumn<T> {
  key: string;
  label: string;
  accessor?: (row: T) => unknown;
}

interface Props<T> {
  data: T[];
  columns: Array<ExportColumn<T>>;
  filename: string;
  label?: string;
}

function escapeCsv(value: unknown): string {
  const s = String(value ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function buildCsv<T>(data: T[], columns: Array<ExportColumn<T>>): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const rows = data.map((row) =>
    columns
      .map((c) => escapeCsv(c.accessor ? c.accessor(row) : (row as Record<string, unknown>)[c.key]))
      .join(','),
  );
  return [header, ...rows].join('\n');
}

function buildRows<T>(data: T[], columns: Array<ExportColumn<T>>): Array<Record<string, unknown>> {
  return data.map((row) => {
    const out: Record<string, unknown> = {};
    for (const c of columns) {
      out[c.label] = c.accessor ? c.accessor(row) : (row as Record<string, unknown>)[c.key];
    }
    return out;
  });
}

/**
 * Reusable export button that writes XLSX or CSV of the provided rows.
 * Pages pass their CURRENT filtered + column-visible rows — this component
 * does not re-fetch.
 */
export function ExportButton<T>({ data, columns, filename, label = 'Export' }: Props<T>): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function downloadXlsx(): Promise<void> {
    await exportToXlsx(buildRows(data, columns), filename);
    setOpen(false);
  }

  function downloadCsv(): void {
    const csv = buildCsv(data, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <Button aria-expanded={open} aria-haspopup="menu" variant="secondary" size="sm" disabled={data.length === 0} onClick={() => setOpen((v) => !v)} type="button">
        {label} {'\u25BE'}
      </Button>
      {open && data.length > 0 ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 20,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            boxShadow: 'var(--shadow-dropdown)',
            minWidth: 140,
            padding: 'var(--space-1) 0',
          }}
        >
          <Button
            onClick={() => void downloadXlsx()}
            role="menuitem"
            variant="link"
            size="sm"
            style={{ display: 'block', padding: 'var(--space-2) var(--space-3)', textAlign: 'left', width: '100%', color: 'var(--color-text)' }}
            type="button"
          >
            Download XLSX
          </Button>
          <Button
            onClick={downloadCsv}
            role="menuitem"
            variant="link"
            size="sm"
            style={{ display: 'block', padding: 'var(--space-2) var(--space-3)', textAlign: 'left', width: '100%', color: 'var(--color-text)' }}
            type="button"
          >
            Download CSV
          </Button>
        </div>
      ) : null}
    </div>
  );
}
