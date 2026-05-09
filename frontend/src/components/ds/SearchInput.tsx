import { ChangeEvent, InputHTMLAttributes, forwardRef, useEffect, useRef, useState } from 'react';

import { IconButton } from './IconButton';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
  onValueChange: (next: string) => void;
  /** Debounce in ms before `onValueChange` fires. Defaults to 0 (immediate).
   *  When > 0, the displayed text updates instantly but the callback is
   *  delayed; clearing via the inline clear button always fires immediately. */
  debounceMs?: number;
}

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3 3" />
  </svg>
);

const ClearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" aria-hidden>
    <path d="M3 3l6 6M9 3l-6 6" />
  </svg>
);

/**
 * Phase DS-3-2 — search input with leading icon and inline clear button.
 * Style-wise it matches `<Input>`; semantically it's `type="search"` with
 * a value/onValueChange controlled API.
 *
 * HD-9 Chunk 3 — `debounceMs` honored internally. When set, the displayed
 * text updates immediately (no input lag) but the parent's onValueChange
 * fires after `debounceMs` of inactivity. The inline clear button bypasses
 * the debounce so users get instant clears.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onValueChange, placeholder = 'Search…', className, debounceMs = 0, disabled, ...rest },
  ref,
) {
  // Local displayed value lets the input re-render immediately even while
  // we delay the parent callback. Sync it whenever the parent's `value`
  // changes externally (e.g., the parent cleared the search via its own
  // state, or hydrated from URL params).
  const [displayed, setDisplayed] = useState<string>(value);
  useEffect(() => {
    setDisplayed(value);
  }, [value]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel any pending debounce timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const next = event.target.value;
    setDisplayed(next);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!debounceMs) {
      onValueChange(next);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onValueChange(next);
    }, debounceMs);
  }

  function handleClear(): void {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setDisplayed('');
    onValueChange('');
  }

  return (
    <div className={['ds-search-input', className].filter(Boolean).join(' ')}>
      <span className="ds-search-input__icon" aria-hidden>
        <SearchIcon />
      </span>
      <input
        ref={ref}
        type="search"
        className="ds-search-input__field"
        value={displayed}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        {...rest}
      />
      {displayed && !disabled && (
        <IconButton
          aria-label="Clear search"
          size="xs"
          onClick={handleClear}
          className="ds-search-input__clear"
        >
          <ClearIcon />
        </IconButton>
      )}
    </div>
  );
});
