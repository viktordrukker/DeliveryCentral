import { useCallback, useRef, useState } from 'react';

import type { ColumnPreset } from '@/lib/hooks/useColumnVisibility';
import { Button, IconButton } from '@/components/ds';

interface ColumnDef {
  key: string;
  label: string;
  category: string;
}

interface Props {
  allColumns: ColumnDef[];
  columnOrder: string[];
  deletePreset: (name: string) => void;
  isVisible: (key: string) => boolean;
  loadPreset: (preset: ColumnPreset) => void;
  moveColumn: (key: string, direction: 'up' | 'down') => void;
  onClose: () => void;
  open: boolean;
  presets: ColumnPreset[];
  reset: () => void;
  savePreset: (name: string) => void;
  toggleColumn: (key: string) => void;
}

const OVERLAY: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 110, display: 'flex', justifyContent: 'flex-end' };
const BACKDROP: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)' };
const PANEL: React.CSSProperties = {
  position: 'relative', width: 320, maxWidth: '90vw', height: '100%',
  background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column',
};
const S_ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
  padding: '6px var(--space-3)', borderBottom: '1px solid var(--color-border)',
  fontSize: 12, cursor: 'grab', userSelect: 'none',
};
const S_DRAG_HANDLE: React.CSSProperties = {
  cursor: 'grab', color: 'var(--color-text-subtle)', fontSize: 14, lineHeight: 1,
};
const S_SECTION: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-border)',
};

export function ColumnConfigurator({ allColumns, columnOrder, deletePreset, isVisible, loadPreset, moveColumn, onClose, open, presets, reset, savePreset, toggleColumn }: Props): JSX.Element | null {
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const dragStartIdx = useRef(-1);

  const colMap = new Map(allColumns.map((c) => [c.key, c]));
  const orderedCols = columnOrder.map((key) => colMap.get(key)).filter(Boolean) as ColumnDef[];
  const visibleCount = orderedCols.filter((c) => isVisible(c.key)).length;

  const handleDragStart = useCallback((key: string, idx: number) => {
    setDragKey(key);
    dragStartIdx.current = idx;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    setOverKey(key);
  }, []);

  const handleDrop = useCallback((targetKey: string) => {
    if (!dragKey || dragKey === targetKey) { setDragKey(null); setOverKey(null); return; }
    const fromIdx = columnOrder.indexOf(dragKey);
    const toIdx = columnOrder.indexOf(targetKey);
    if (fromIdx < 0 || toIdx < 0) { setDragKey(null); setOverKey(null); return; }
    const direction = toIdx > fromIdx ? 'down' : 'up';
    const steps = Math.abs(toIdx - fromIdx);
    for (let i = 0; i < steps; i++) moveColumn(dragKey, direction);
    setDragKey(null);
    setOverKey(null);
  }, [dragKey, columnOrder, moveColumn]);

  const handleSave = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    savePreset(name);
    setPresetName('');
  }, [presetName, savePreset]);

  if (!open) return null;

  return (
    <div style={OVERLAY} role="dialog" aria-label="Configure columns">
      <div style={BACKDROP} onClick={onClose} />
      <div style={PANEL}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-3) var(--space-3)', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Columns</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{visibleCount}/{orderedCols.length} shown</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <Button variant="secondary" size="sm" onClick={reset} type="button" style={{ fontSize: 10 }}>Reset</Button>
            <Button variant="secondary" size="sm" onClick={onClose} type="button">&times;</Button>
          </div>
        </div>

        {/* Presets */}
        <div style={S_SECTION}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Presets</div>
          {presets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--space-1)' }}>
              {presets.map((p) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 11 }}>
                  <span
                    style={{ flex: 1, cursor: 'pointer', color: 'var(--color-accent)', fontWeight: 500 }}
                    onClick={() => loadPreset(p)}
                  >
                    {p.name}
                  </span>
                  <IconButton
                    aria-label={`Delete preset ${p.name}`}
                    size="sm"
                    onClick={() => deletePreset(p.name)}
                    style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}
                  >
                    ×
                  </IconButton>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <input
              style={{ flex: 1, fontSize: 10, padding: '3px 6px', border: '1px solid var(--color-border)', borderRadius: 3, background: 'var(--color-surface)', color: 'var(--color-text)', outline: 'none' }}
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <Button variant="primary" size="sm" onClick={handleSave} type="button" style={{ fontSize: 10, padding: '3px 8px' }}>Save</Button>
          </div>
        </div>

        {/* Column list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {orderedCols.map((col, idx) => {
            const isDragging = dragKey === col.key;
            const isOver = overKey === col.key && dragKey !== col.key;
            return (
              <div
                key={col.key}
                draggable
                onDragStart={() => handleDragStart(col.key, idx)}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={() => handleDrop(col.key)}
                onDragEnd={() => { setDragKey(null); setOverKey(null); }}
                style={{
                  ...S_ROW,
                  opacity: isDragging ? 0.4 : 1,
                  background: isOver ? 'var(--color-accent-bg)' : isVisible(col.key) ? undefined : 'var(--color-surface-alt)',
                  borderTop: isOver ? '2px solid var(--color-accent)' : undefined,
                }}
              >
                <span style={S_DRAG_HANDLE} title="Drag to reorder">&#x2630;</span>
                <input
                  type="checkbox"
                  checked={isVisible(col.key)}
                  onChange={() => toggleColumn(col.key)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: 'var(--color-accent)' }}
                />
                <div style={{ flex: 1, opacity: isVisible(col.key) ? 1 : 0.5 }}>
                  <div style={{ fontWeight: 500 }}>{col.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>{col.category}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
