import { useCallback, useEffect, useRef, useState } from 'react';

import { jqlToFilters, type JqlFilters } from '@/features/staffing-desk/jql-to-filters';
import { filtersToJql } from '@/features/staffing-desk/jql-from-filters';
import { JqlParseError, parseJql } from '@/features/staffing-desk/jql-parser';
import { Button } from '@/components/ds';

interface Props {
  filters: Record<string, string>;
  onApplyFilters: (filters: Partial<JqlFilters>) => void;
  visible: boolean;
}

const FIELD_SUGGESTIONS = [
  'kind', 'person', 'project', 'status', 'priority', 'role',
  'allocation', 'skills', 'startDate', 'endDate',
];
const VALUE_SUGGESTIONS: Record<string, string[]> = {
  kind: ['assignment', 'request'],
  status: ['DRAFT', 'REQUESTED', 'OPEN', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'ENDED', 'FULFILLED', 'REJECTED', 'CANCELLED'],
  priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
};
const OP_SUGGESTIONS = ['=', '!=', '~', 'IN', '>', '<', '>=', '<='];

export function JqlQueryBar({ filters, onApplyFilters, visible }: Props): JSX.Element | null {
  const [jql, setJql] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastAppliedRef = useRef('');

  // Sync visual filters → JQL string
  useEffect(() => {
    const generated = filtersToJql(filters);
    if (generated !== lastAppliedRef.current) {
      setJql(generated);
    }
  }, [filters]);

  // Focus on show
  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 50);
  }, [visible]);

  const apply = useCallback(() => {
    setError(null);
    if (!jql.trim()) {
      lastAppliedRef.current = '';
      onApplyFilters({ kind: '', person: '', project: '', status: '', priority: '', role: '', allocMin: '', allocMax: '', poolId: '', orgUnitId: '', skills: '', from: '', to: '' });
      return;
    }
    try {
      parseJql(jql);
      const parsed = jqlToFilters(jql);
      lastAppliedRef.current = jql;
      onApplyFilters(parsed);
    } catch (err) {
      setError(err instanceof JqlParseError ? err.message : 'Invalid query');
    }
  }, [jql, onApplyFilters]);

  // Context-aware suggestions based on cursor position
  const updateSuggestions = useCallback((value: string) => {
    const parts = value.trimEnd().split(/\s+/);
    const lastPart = parts[parts.length - 1] ?? '';
    const prevPart = parts[parts.length - 2] ?? '';

    // After a field name → suggest operators
    if (FIELD_SUGGESTIONS.includes(prevPart) && !lastPart) {
      setSuggestions(OP_SUGGESTIONS);
    }
    // After an operator → suggest values for the field
    else if (parts.length >= 3 && OP_SUGGESTIONS.includes(prevPart)) {
      const field = parts[parts.length - 3];
      setSuggestions(VALUE_SUGGESTIONS[field] ?? []);
    }
    // After AND/OR or at start → suggest fields
    else if (!lastPart || lastPart === 'AND' || lastPart === 'OR') {
      setSuggestions(FIELD_SUGGESTIONS);
    }
    // Typing a field name → filter suggestions
    else if (!prevPart || prevPart === 'AND' || prevPart === 'OR') {
      setSuggestions(FIELD_SUGGESTIONS.filter((f) => f.toLowerCase().startsWith(lastPart.toLowerCase())));
    }
    // Typing a value → filter value suggestions
    else {
      const fieldIdx = parts.findIndex((p) => FIELD_SUGGESTIONS.includes(p));
      if (fieldIdx >= 0) {
        const field = parts[fieldIdx];
        const vals = VALUE_SUGGESTIONS[field] ?? [];
        setSuggestions(vals.filter((v) => v.toLowerCase().startsWith(lastPart.toLowerCase())));
      } else {
        setSuggestions([]);
      }
    }
  }, []);

  const applySuggestion = useCallback((suggestion: string) => {
    const parts = jql.trimEnd().split(/\s+/);
    const lastPart = parts[parts.length - 1] ?? '';

    // If user was typing something, replace the last part
    if (lastPart && !['AND', 'OR'].includes(lastPart.toUpperCase()) &&
        !OP_SUGGESTIONS.includes(lastPart) && !FIELD_SUGGESTIONS.includes(lastPart)) {
      parts[parts.length - 1] = suggestion;
    } else {
      parts.push(suggestion);
    }
    const newJql = parts.join(' ') + ' ';
    setJql(newJql);
    setSuggestions([]);
    inputRef.current?.focus();
  }, [jql]);

  if (!visible) return null;

  return (
    <div style={{
      padding: 'var(--space-1) var(--space-2)',
      background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
      borderRadius: 6, marginBottom: 'var(--space-2)', position: 'relative',
    }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-subtle)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Query</span>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            className="field__control"
            style={{
              fontSize: 11, fontFamily: 'monospace', padding: '4px 8px',
              border: error ? '1px solid var(--color-status-danger)' : undefined,
            }}
            placeholder='person ~ "alice" AND status = APPROVED'
            value={jql}
            onChange={(e) => { setJql(e.target.value); setError(null); updateSuggestions(e.target.value); setShowSuggestions(true); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { apply(); setShowSuggestions(false); }
              if (e.key === 'Tab' && suggestions.length > 0) { e.preventDefault(); applySuggestion(suggestions[0]); }
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            onFocus={() => { updateSuggestions(jql); setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 4, boxShadow: 'var(--shadow-dropdown)', zIndex: 50,
              maxHeight: 120, overflowY: 'auto',
            }}>
              {suggestions.slice(0, 8).map((s) => (
                <div
                  key={s}
                  style={{ padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}
                  onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-alt)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={() => { apply(); setShowSuggestions(false); }} type="button" style={{ fontSize: 10, padding: '3px 10px' }}>
          Apply
        </Button>
      </div>
      {error && (
        <div style={{ fontSize: 10, color: 'var(--color-status-danger)', marginTop: 2, paddingLeft: 40 }}>
          {error}
        </div>
      )}
      <div style={{ fontSize: 9, color: 'var(--color-text-subtle)', marginTop: 2, paddingLeft: 40 }}>
        Syntax: field = value AND field ~ "text" | Fields: kind, person, project, status, priority, role, allocation, skills | Tab to autocomplete
      </div>
    </div>
  );
}
