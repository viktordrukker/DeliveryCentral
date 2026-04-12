import { useEffect, useRef, useState } from 'react';

export interface ChartCsvData {
  headers: string[];
  rows: Array<Record<string, unknown>>;
}

interface ChartExportMenuProps {
  csvData: ChartCsvData;
  title: string;
}

function toCsv({ headers, rows }: ChartCsvData): string {
  const escape = (v: unknown): string => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\n');
}

export function ChartExportMenu({ csvData, title }: ChartExportMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent): void => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function downloadCsv(): void {
    const csv = toCsv(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function copyToClipboard(): void {
    const csv = toCsv(csvData);
    void navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setOpen(false);
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        aria-haspopup="menu"
        aria-label="Chart export options"
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: '1px solid #d1d5db',
          borderRadius: 4,
          color: '#6b7280',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px 8px',
        }}
        title="Export options"
        type="button"
      >
        ⋯
      </button>
      {copied ? (
        <span style={{ color: '#16a34a', fontSize: '12px', marginLeft: 6 }}>Copied!</span>
      ) : null}
      {open ? (
        <div
          role="menu"
          style={{
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: 160,
            position: 'absolute',
            right: 0,
            top: '100%',
            zIndex: 50,
          }}
        >
          <button
            onClick={downloadCsv}
            role="menuitem"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'block', fontSize: '13px', padding: '8px 12px', textAlign: 'left', width: '100%' }}
            type="button"
          >
            Download CSV
          </button>
          <button
            onClick={copyToClipboard}
            role="menuitem"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'block', fontSize: '13px', padding: '8px 12px', textAlign: 'left', width: '100%' }}
            type="button"
          >
            Copy data to clipboard
          </button>
        </div>
      ) : null}
    </div>
  );
}
