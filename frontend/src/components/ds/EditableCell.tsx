import { ReactNode, useCallback, useState } from 'react';

import { DatePicker } from './DatePicker';
import { Input } from './Input';
import { Select } from './Select';
import { Spinner } from './Spinner';
import type { Column } from './Table';

interface Props<TRow, TValue> {
  row: TRow;
  rowIndex: number;
  column: Column<TRow, TValue>;
  /** Pre-rendered display content (the result of `column.render(row, index)`
   *  or `String(column.getValue(row))` from DataView). Shown when the cell is
   *  not in edit mode. */
  displayContent: ReactNode;
}

/**
 * Phase DS-4-5 — click-to-edit cell.
 *
 * Display mode is a transparent button over the rendered cell content with a
 * subtle hover affordance (dashed border + alt surface). Click → editor mounts
 * (auto-focus). Editor variant is `column.edit.kind`-driven and uses the DS
 * atoms (`<Input>`, `<Select>`, `<DatePicker>`) so styling, focus ring, and
 * dark mode match the rest of the app.
 *
 * Commit triggers on Enter or blur. Escape cancels and reverts. Errors from
 * `commit()` keep the editor open with an inline message for retry. The cell
 * stops click propagation so row-level click (drawer / navigation) doesn't
 * fire when the user is editing.
 */
export function EditableCell<TRow, TValue>({
  row,
  column,
  displayContent,
}: Props<TRow, TValue>): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [pendingValue, setPendingValue] = useState<TValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  const edit = column.edit;

  const startEdit = useCallback(() => {
    if (committing || !edit || !column.getValue) return;
    setPendingValue(column.getValue(row) as TValue);
    setError(null);
    setEditing(true);
  }, [committing, edit, column, row]);

  const cancelEdit = useCallback(() => {
    if (committing) return;
    setEditing(false);
    setPendingValue(null);
    setError(null);
  }, [committing]);

  const commitEdit = useCallback(async () => {
    if (!edit || committing) return;
    const next = pendingValue as TValue;
    const validated = edit.validate?.(next, row) ?? null;
    if (validated) {
      setError(validated);
      return;
    }
    setCommitting(true);
    setError(null);
    try {
      await edit.commit(row, next);
      setEditing(false);
      setPendingValue(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      // Stay in edit mode so the user can fix and retry.
    } finally {
      setCommitting(false);
    }
  }, [edit, committing, pendingValue, row]);

  if (!edit) {
    // Defensive — DataView only wraps in EditableCell when column.edit exists.
    return <>{displayContent}</>;
  }

  // Per-row gating — when disabled for this row, render as plain display.
  if (edit.enabledFor && !edit.enabledFor(row)) {
    return <>{displayContent}</>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="ds-editable-cell"
        onClick={(e) => {
          e.stopPropagation();
          startEdit();
        }}
        aria-label={`Edit ${typeof column.title === 'string' ? column.title : 'cell'}`}
      >
        {displayContent ?? <span className="ds-editable-cell__placeholder">—</span>}
      </button>
    );
  }

  return (
    <div
      className="ds-editable-cell--editing"
      onClick={(e) => e.stopPropagation()}
    >
      <Editor
        edit={edit}
        value={pendingValue as TValue}
        onChange={setPendingValue}
        onCommit={commitEdit}
        onCancel={cancelEdit}
        invalid={error !== null}
      />
      {committing && <Spinner size="sm" label="Saving" />}
      {error && (
        <span className="ds-editable-cell__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

interface EditorProps<TRow, TValue> {
  edit: NonNullable<Column<TRow, TValue>['edit']>;
  value: TValue;
  onChange: (next: TValue | null) => void;
  onCommit: () => void;
  onCancel: () => void;
  invalid: boolean;
}

function Editor<TRow, TValue>({
  edit,
  value,
  onChange,
  onCommit,
  onCancel,
  invalid,
}: EditorProps<TRow, TValue>): JSX.Element {
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (edit.kind === 'text') {
    return (
      <Input
        autoFocus
        value={String(value ?? '')}
        invalid={invalid}
        onChange={(e) => onChange(e.target.value as unknown as TValue)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }
  if (edit.kind === 'number') {
    return (
      <Input
        autoFocus
        type="number"
        value={String(value ?? '')}
        invalid={invalid}
        onChange={(e) => {
          const v = e.target.value;
          onChange((v === '' ? null : Number(v)) as unknown as TValue);
        }}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }
  if (edit.kind === 'date') {
    return (
      <DatePicker
        autoFocus
        value={String(value ?? '')}
        invalid={invalid}
        onValueChange={(next) => onChange(next as unknown as TValue)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      />
    );
  }
  if (edit.kind === 'select') {
    return (
      <Select
        autoFocus
        value={String(value ?? '')}
        invalid={invalid}
        onChange={(e) => onChange(e.target.value as unknown as TValue)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
      >
        {edit.options?.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }
  if (edit.kind === 'custom' && edit.renderEditor) {
    return <>{edit.renderEditor({ value, onChange: (next) => onChange(next), onCommit, onCancel })}</>;
  }
  return <></>;
}
