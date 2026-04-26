import { useEffect, useRef, type RefObject } from 'react';

/**
 * Fires `onOutside` when the user presses down outside `ref`. Only attaches the
 * listener while `enabled` is true, and detaches cleanly on unmount / toggle.
 *
 * Pattern used by every custom dropdown in the app so only one popover stays
 * open at a time: each dropdown's own opener calls `onOutside` to close itself,
 * and clicking another dropdown's opener satisfies the outside-check and
 * dismisses the previous one.
 */
export function useOutsideClick<T extends HTMLElement>(
  enabled: boolean,
  onOutside: () => void,
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent): void => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current && !ref.current.contains(target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [enabled, onOutside]);

  return ref;
}
