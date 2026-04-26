import { useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Manages filter state via URL search params so filters persist across navigation.
 *
 * @param defaults - Default values for each filter key. Keys not present in URL return their default.
 * @returns [currentFilters, setFilters, resetFilters]
 */
export function useFilterParams<T extends Record<string, string>>(
  defaults: T,
): [T, (updates: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  // Lock defaults to first-render reference so callers can pass inline object literals
  // without causing filters/setFilters to get a new identity every render.
  const defaultsRef = useRef(defaults);

  const currentFilters = useMemo(() => {
    const result = { ...defaultsRef.current };
    for (const key of Object.keys(defaultsRef.current)) {
      const val = searchParams.get(key);
      if (val !== null) {
        (result as Record<string, string>)[key] = val;
      }
    }
    return result;
  }, [searchParams]);

  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === '' || value === (defaultsRef.current as Record<string, string>)[key]) {
              next.delete(key);
            } else {
              next.set(key, value as string);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return [currentFilters, setFilters, resetFilters];
}
