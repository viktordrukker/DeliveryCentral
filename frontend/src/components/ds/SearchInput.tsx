import { ChangeEvent, InputHTMLAttributes, forwardRef } from 'react';

import { IconButton } from './IconButton';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
  onValueChange: (next: string) => void;
  /** Optional debounce in ms. Currently passes through immediately; debounce
   *  is consumer-side via `useDebounce` if needed. Reserved for future. */
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
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onValueChange, placeholder = 'Search…', className, debounceMs, disabled, ...rest },
  ref,
) {
  // Suppress the unused-debounceMs warning until we wire actual debouncing.
  void debounceMs;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onValueChange(event.target.value);
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
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        {...rest}
      />
      {value && !disabled && (
        <IconButton
          aria-label="Clear search"
          size="xs"
          onClick={() => onValueChange('')}
          className="ds-search-input__clear"
        >
          <ClearIcon />
        </IconButton>
      )}
    </div>
  );
});
