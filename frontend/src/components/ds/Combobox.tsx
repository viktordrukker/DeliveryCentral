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

export interface ComboboxOption<TValue extends string = string> {
  value: TValue;
  label: string;
  hint?: ReactNode;
  disabled?: boolean;
}

interface ComboboxProps<TValue extends string = string> {
  options: ComboboxOption<TValue>[];
  value: TValue | null;
  onValueChange: (next: TValue | null) => void;
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
 * Single-select with typeahead filtering. Trigger and search input are the
 * same field — ARIA 1.2 combobox pattern. Click or focus to open; type to
 * filter the option list rendered in a `<Popover>`.
 *
 * Async / paginated data fetching is out of scope — pass an in-memory
 * `options` list. Server-driven completion (e.g. PersonSelect over 500 people)
 * keeps its bespoke component until we settle on a query-hook contract.
 */
export function Combobox<TValue extends string = string>({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  filter = DEFAULT_FILTER,
  invalid,
  disabled = false,
  className,
  emptyLabel = 'No matches',
}: ComboboxProps<TValue>): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleOptions = useMemo(
    () => options.filter((o) => filter(query, o)),
    [options, query, filter],
  );

  const selectedLabel = useMemo(() => {
    const match = options.find((o) => o.value === value);
    return match?.label ?? '';
  }, [options, value]);

  // Reset filter when closing.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  // When opening, pre-select the active row to the currently-selected value
  // (or first row otherwise) so Enter immediately commits a sensible default.
  useEffect(() => {
    if (!open) return;
    const idx = visibleOptions.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    // Only on transition to open; visibleOptions changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clamp active index whenever the visible list changes.
  useEffect(() => {
    if (visibleOptions.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex >= visibleOptions.length) {
      setActiveIndex(visibleOptions.length - 1);
    }
  }, [visibleOptions.length, activeIndex]);

  function commit(option: ComboboxOption<TValue>): void {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    inputRef.current?.blur();
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
      if (!open) return; // let the form handle it
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
    } else if (event.key === 'Backspace' && open && query === '' && value != null) {
      event.preventDefault();
      onValueChange(null);
    }
  }

  // The visible text in the input. When closed, show the selected option's
  // label so the field acts as a read-out of the chosen value. When open, show
  // the live query so the user sees what they typed.
  const displayValue = open ? query : selectedLabel;

  const wrapperClass = [
    'ds-combobox__trigger',
    invalid && 'ds-combobox__trigger--invalid',
    disabled && 'ds-combobox__trigger--disabled',
    open && 'ds-combobox__trigger--open',
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
          className="ds-combobox__input"
          placeholder={placeholder}
          value={displayValue}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(e) => {
            if (!open) setOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <span aria-hidden className="ds-combobox__chevron">▾</span>
      </div>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={wrapperRef}
        placement="bottom-start"
        className="ds-combobox__popover"
      >
        <ul id={listboxId} className="ds-combobox__list" role="listbox">
          {visibleOptions.length === 0 && (
            <li className="ds-combobox__empty" role="presentation">{emptyLabel}</li>
          )}
          {visibleOptions.map((option, idx) => {
            const isActive = idx === activeIndex;
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                id={`${listboxId}-${idx}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                className={[
                  'ds-combobox__option',
                  isActive && 'ds-combobox__option--active',
                  isSelected && 'ds-combobox__option--selected',
                  option.disabled && 'ds-combobox__option--disabled',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => setActiveIndex(idx)}
                // Mouse-down (not click) so the input doesn't blur first and
                // close the popover before the click registers.
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(option);
                }}
              >
                <span className="ds-combobox__option-label">{option.label}</span>
                {option.hint && <span className="ds-combobox__option-hint">{option.hint}</span>}
              </li>
            );
          })}
        </ul>
      </Popover>
    </>
  );
}
