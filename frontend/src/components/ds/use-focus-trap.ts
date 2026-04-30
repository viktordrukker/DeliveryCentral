/**
 * Lightweight focus trap. On open: snapshot the previously-focused element,
 * move focus into the surface; on close: restore focus.
 *
 * Tab + Shift+Tab cycle inside the surface. Avoids pulling in
 * focus-trap-react / react-focus-lock as deps.
 */
import { RefObject, useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return undefined;
    const container = ref.current;
    if (!container) return undefined;

    const previouslyFocused = (typeof document !== 'undefined' && document.activeElement) as HTMLElement | null;

    function focusFirst(): void {
      if (!container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      const target =
        focusables.find((el) => el.dataset.autofocus === 'true') ??
        focusables[0] ??
        container;
      target.focus();
    }
    // Defer to next tick so any inner content has mounted.
    const t = window.setTimeout(focusFirst, 0);

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Tab' || !container) return;
      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    container.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(t);
      container.removeEventListener('keydown', onKeyDown);
      // Restore focus to the trigger that opened the surface.
      previouslyFocused?.focus?.();
    };
  }, [active, ref]);
}
