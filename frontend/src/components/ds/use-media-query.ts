import { useEffect, useState } from 'react';

/**
 * Phase DS-4-4 — token-driven media-query hook (no MUI dependency).
 *
 * Returns whether the given CSS media query currently matches. Updates on
 * resize via the standard `MediaQueryList.change` event listener.
 *
 * SSR-safe: returns `false` during SSR (when `window` is unavailable) and
 * resolves the real value on first client render.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent): void => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
