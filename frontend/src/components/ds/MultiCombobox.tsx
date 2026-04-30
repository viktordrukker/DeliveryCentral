import {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Popover } from './Popover';
import type { ComboboxOption } from './Combobox';

interface MultiComboboxProps<TValue extends string = string> {
  options: ComboboxOption<TValue>[];
  /** Currently selected values. */
  value: TValue[];
  onValueChange: (next: TValue[]) => void;
  placeholder?: string;
  /** Visible-label-only filter. Override for richer matching (e.g. fuzzy). */
  filter?: (query: string, option: ComboboxOption<TValue>) => boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  /** Empty-list message. Default: "No matches". */
  emptyLabel?: string;
}

const DEFAULT_FILTER = <V extends string>(q: string, o: ComboboxOption<V>): boolean => {
  if (!q) return true;
  return o.label.toLowerCase().includes(q.toLowerCase());
};

/**
 * Multi-select tag picker. Same trigger/search pattern as `<Combobox>` but the
 * field hosts removable chips for each selected value, so the control reads as
 * one cohesive input instead of an input plus an external chip list.
 *
 * - Chips render inline at the start of the field.
 * - The real `<input>` shares the field; type to filter the option list.
 * - Backspace on an empty query removes the last chip.
 * - Selecting an option appends it; the input clears so the user can keep
 *   typing without re-opening the popover.
 */
export function MultiCombobox<TValue extends string = string>({
  options,
  value,
  onValueChange,
  placeholder = 'Add…',
  filter = DEFAULT_FILTER,
  invalid,
  disabled = false,
  className,
  emptyLabel = 'No matches',
}: MultiComboboxProps<TValue>): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedSet = useMemo(() => new Set<string>(value), [value]);

  const visibleOptions = useMemo(
    () => options.filter((o) => !selectedSet.has(o.value) && filter(query, o)),
    [options, selectedSet, query, filter],
  );

  // Map values back to labels for the chips (preserves user-selected order).
  const selectedOptions = useMemo(() => {
    const byValue = new Map(options.map((o) => [o.value, o] as const));
    return value
      .map((v) => byValue.get(v))
      .filter((o): o is ComboboxOption<TValue> => Boolean(o));
  }, [options, value]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (visibleOptions.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex >= visibleOptions.length) {
      setActiveIndex(visibleOptions.length - 1);
    }
  }, [visibleOptions.length, activeIndex]);

  function commit(option: ComboboxOption<TValue>): void {
    if (option.disabled) return;
    if (selectedSet.has(option.value)) return;
    onValueChange([...value, option.value]);
    // Keep popover open and clear the query so the user can keep adding.
    setQuery('');
    inputRef.current?.focus();
  }

  function removeAt(index: number): void {
    const next = value.slice();
    next.splice(index, 1);
    onValueChange(next);
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, visibleOptions.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      const target = visibleOptions[activeIndex];
      if (target) commit(target);
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    } else if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(visibleOptions.length - 1);
    } else if (event.key === 'Backspace' && query === '' && value.length > 0) {
      event.preventDefault();
      removeAt(value.length - 1);
    }
  }

  const wrapperClass = [
    'ds-multi-combobox__trigger',
    invalid && 'ds-multi-combobox__trigger--invalid',
    disabled && 'ds-multi-combobox__trigger--disabled',
    open && 'ds-multi-combobox__trigger--open',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div
        ref={wrapperRef}
        className={wrapperClass}
        onClick={() => {
          if (disabled) return;
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selectedOptions.map((opt, idx) => (
          <ChipPill
            key={opt.value}
            label={opt.label}
            onRemove={(e) => {
              e.stopPropagation();
              if (disabled) return;
              removeAt(idx);
            }}
          />
        ))}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            open && visibleOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
          }
          aria-invalid={invalid || undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          className="ds-multi-combobox__input"
          placeholder={value.length === 0 ? placeholder : ''}
          value={query}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(e) => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <span aria-hidden className="ds-multi-combobox__chevron">▾</span>
      </div>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={wrapperRef}
        placement="bottom-start"
        className="ds-multi-combobox__popover"
      >
        <ul id={listboxId} className="ds-multi-combobox__list" role="listbox">
          {visibleOptions.length === 0 && (
            <li className="ds-multi-combobox__empty" role="presentation">{emptyLabel}</li>
          )}
          {visibleOptions.map((option, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li
                key={option.value}
                id={`${listboxId}-${idx}`}
                role="option"
                aria-selected={false}
                aria-disabled={option.disabled || undefined}
                className={[
                  'ds-multi-combobox__option',
                  isActive && 'ds-multi-combobox__option--active',
                  option.disabled && 'ds-multi-combobox__option--disabled',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(option);
                }}
              >
                <span className="ds-multi-combobox__option-label">{option.label}</span>
                {option.hint && <span className="ds-multi-combobox__option-hint">{option.hint}</span>}
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}

interface ChipPillProps {
  label: string;
  onRemove: (e: React.MouseEvent | React.KeyboardEvent) => void;
}

function ChipPill({ label, onRemove }: ChipPillProps): JSX.Element {
  return (
    <span className="ds-multi-combobox__chip">
      <span className="ds-multi-combobox__chip-label">{label}</span>
      <button
        type="button"
        className="ds-multi-combobox__chip-remove"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRemove(e);
          }
        }}
      >
        ×
      </button>
    </span>
  );
}
