import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, DatePicker } from '@/components/ds';

const S_INPUT: React.CSSProperties = {
  width: '100%', fontSize: 10, padding: '3px 5px', border: '1px solid var(--color-border)',
  borderRadius: 3, background: 'var(--color-surface)', color: 'var(--color-text)',
  outline: 'none', boxSizing: 'border-box',
};
const S_WRAP: React.CSSProperties = { padding: '2px 0', position: 'relative' };
const S_DROPDOWN: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, zIndex: 100, minWidth: 160, width: 'max-content',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 4, boxShadow: 'var(--shadow-dropdown)', maxHeight: 240, overflowY: 'auto',
  padding: '0',
};
const S_OPT: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', fontSize: 10, cursor: 'pointer',
};
const S_SEARCH: React.CSSProperties = {
  width: '100%', fontSize: 10, padding: '5px 8px', border: 'none',
  borderBottom: '1px solid var(--color-border)', outline: 'none',
  background: 'var(--color-surface-alt)', color: 'var(--color-text)',
  boxSizing: 'border-box', position: 'sticky', top: 0, zIndex: 1,
};

/* ── Text filter with autocomplete ── */

interface TextFilterProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  uniqueValues?: string[];
}

export function TextFilter({ value, onChange, placeholder, uniqueValues }: TextFilterProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    if (!uniqueValues) return [];
    if (!value) return uniqueValues.slice(0, 20);
    const lower = value.toLowerCase();
    return uniqueValues.filter((v) => v.toLowerCase().includes(lower)).slice(0, 20);
  }, [uniqueValues, value]);

  return (
    <div style={S_WRAP} ref={wrapRef}>
      <input
        style={S_INPUT}
        type="search"
        placeholder={placeholder ?? 'Search...'}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div style={S_DROPDOWN}>
          {value && (
            <div style={{ ...S_OPT, color: 'var(--color-accent)', fontWeight: 600, borderBottom: '1px solid var(--color-border)' }} onClick={() => { onChange(''); setOpen(false); }}>
              Clear
            </div>
          )}
          {filtered.map((v) => (
            <div key={v} style={{ ...S_OPT, background: value === v ? 'var(--color-accent-bg)' : undefined }} onClick={() => { onChange(v); setOpen(false); }}>
              {v}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Multi-select with search input (Excel-style autofilter) ── */

interface MultiSelectFilterProps { options: string[]; selected: string[]; onChange: (selected: string[]) => void }

export function MultiSelectFilter({ options, selected, onChange }: MultiSelectFilterProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent): void {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const toggle = useCallback((opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }, [selected, onChange]);

  const filtered = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lower));
  }, [options, search]);

  const label = selected.length === 0 ? 'All' : selected.length <= 2 ? selected.join(', ') : `${selected.length} sel.`;

  return (
    <div style={S_WRAP} ref={wrapRef}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        style={{ ...S_INPUT, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        onClick={() => setOpen((v) => !v)}
      >
        {label} ▾
      </Button>
      {open && (
        <div style={S_DROPDOWN}>
          {/* Search input at top */}
          <input
            ref={searchRef}
            style={S_SEARCH}
            type="search"
            placeholder="Type to filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, padding: '4px 8px', borderBottom: '1px solid var(--color-border)' }}>
            {selected.length > 0 && (
              <span style={{ fontSize: 9, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => onChange([])}>
                Clear
              </span>
            )}
            {filtered.length > 0 && filtered.length <= 20 && selected.length < filtered.length && (
              <span style={{ fontSize: 9, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto' }} onClick={() => onChange([...new Set([...selected, ...filtered])])}>
                Select all
              </span>
            )}
          </div>
          {/* Options */}
          {filtered.length === 0 ? (
            <div style={{ padding: '8px', fontSize: 10, color: 'var(--color-text-subtle)', textAlign: 'center' }}>No matches</div>
          ) : (
            filtered.map((opt) => (
              <label key={opt} style={{ ...S_OPT, background: selected.includes(opt) ? 'var(--color-accent-bg)' : undefined }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} style={{ accentColor: 'var(--color-accent)' }} />
                {opt}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Date filter ── */

interface DateFilterProps { value: string; onChange: (v: string) => void }

export function DateFilter({ value, onChange }: DateFilterProps): JSX.Element {
  // Native calendar indicator is CSS-hidden in narrow filter cells (see
  // `.inline-filter-clip input[type="date"]::-webkit-calendar-picker-indicator`
  // in `ds.css`). Click anywhere on the input to open the picker — uses
  // `HTMLInputElement.showPicker()` which is supported in Chromium 99+ /
  // Firefox 101+ / Safari 16+. Older browsers degrade to "click and type".
  return (
    <div style={S_WRAP} className="inline-filter-clip">
      <DatePicker
        style={{ ...S_INPUT, fontSize: 9 }}
        value={value}
        onValueChange={(value) => onChange(value)}
        onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
      />
    </div>
  );
}

/* ── Numeric filter with operator ── */

interface NumericFilterProps { value: string; onChange: (v: string) => void; placeholder?: string }

export function NumericFilter({ value, onChange, placeholder }: NumericFilterProps): JSX.Element {
  return (
    <div style={S_WRAP} className="inline-filter-clip">
      <input style={{ ...S_INPUT, fontFamily: 'monospace' }} type="text" placeholder={placeholder ?? '80 or >=80'} value={value} onChange={(e) => onChange(e.target.value)} title="Type a number for exact match, or use < > <= >= (e.g. >=80)" />
    </div>
  );
}

/* ── No filter ── */

export function NoFilter(): JSX.Element {
  return <div style={{ ...S_WRAP, height: 22 }} className="inline-filter-clip" />;
}

/* ── Numeric filter parser ── */

export function parseNumericFilter(raw: string): ((val: number) => boolean) | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const num = parseFloat(trimmed);
    return (v) => v === num;
  }
  const match = trimmed.match(/^([<>]=?|=)\s*(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const op = match[1];
  const num = parseFloat(match[2]);
  switch (op) {
    case '>': return (v) => v > num;
    case '>=': return (v) => v >= num;
    case '<': return (v) => v < num;
    case '<=': return (v) => v <= num;
    case '=': return (v) => v === num;
    default: return null;
  }
}
