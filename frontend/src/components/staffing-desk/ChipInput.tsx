import { useCallback, useRef, useState } from 'react';

/**
 * Multi-select chip input — type values, press Enter or comma to add as chips.
 * Shows as tags/badges that can be removed individually.
 */

interface Props {
  label: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions?: string[];
}

const S_WRAPPER: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
  padding: '2px 4px', border: '1px solid var(--color-border)',
  borderRadius: 4, background: 'var(--color-surface)', minHeight: 28,
  cursor: 'text', position: 'relative',
};
const S_CHIP: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 2,
  padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 500,
  background: 'var(--color-accent-bg)', color: 'var(--color-accent)',
  border: '1px solid var(--color-accent)',
};
const S_REMOVE: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
  color: 'var(--color-accent)', padding: 0, lineHeight: 1,
};
const S_INPUT: React.CSSProperties = {
  border: 'none', outline: 'none', background: 'none', fontSize: 11,
  flex: 1, minWidth: 60, padding: '2px 0',
  color: 'var(--color-text)',
};
const S_DROPDOWN: React.CSSProperties = {
  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 4, boxShadow: 'var(--shadow-dropdown)', zIndex: 50,
  maxHeight: 120, overflowY: 'auto',
};
const S_OPTION: React.CSSProperties = {
  padding: '4px 8px', fontSize: 11, cursor: 'pointer',
};

export function ChipInput({ label, placeholder, values, onChange, suggestions }: Props): JSX.Element {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addValue = useCallback((val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput('');
  }, [values, onChange]);

  const removeValue = useCallback((val: string) => {
    onChange(values.filter((v) => v !== val));
  }, [values, onChange]);

  const filteredSuggestions = suggestions?.filter(
    (s) => !values.includes(s) && s.toLowerCase().includes(input.toLowerCase()),
  ) ?? [];

  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <div style={S_WRAPPER} onClick={() => inputRef.current?.focus()}>
        {values.map((v) => (
          <span key={v} style={S_CHIP}>
            {v}
            <button style={S_REMOVE} onClick={(e) => { e.stopPropagation(); removeValue(v); }} type="button">&times;</button>
          </span>
        ))}
        <input
          ref={inputRef}
          style={S_INPUT}
          placeholder={values.length === 0 ? (placeholder ?? 'Type and press Enter') : ''}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
              e.preventDefault();
              addValue(input);
            }
            if (e.key === 'Backspace' && !input && values.length > 0) {
              removeValue(values[values.length - 1]);
            }
            if (e.key === 'Tab' && filteredSuggestions.length > 0 && input) {
              e.preventDefault();
              addValue(filteredSuggestions[0]);
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        />
        {showSuggestions && filteredSuggestions.length > 0 && input.length > 0 && (
          <div style={S_DROPDOWN}>
            {filteredSuggestions.slice(0, 8).map((s) => (
              <div
                key={s}
                style={S_OPTION}
                onMouseDown={(e) => { e.preventDefault(); addValue(s); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-alt)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
