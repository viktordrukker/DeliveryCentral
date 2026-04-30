import { ReactNode, RefObject, useEffect, useRef } from 'react';

import { Popover, type PopoverPlacement } from './Popover';

export interface MenuItem {
  /** Stable key for React reconciliation. */
  key: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Render with destructive styling. */
  danger?: boolean;
  /** Optional leading icon. */
  icon?: ReactNode;
}

interface MenuPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement>;
  items: MenuItem[];
  placement?: PopoverPlacement;
  testId?: string;
  /** Optional ARIA label for the menu (defaults to "Actions"). */
  ariaLabel?: string;
}

/**
 * Action menu — Popover containing a vertical list of items. Arrow up/down
 * cycles focus; Enter/Space activates; Escape closes.
 */
export function MenuPopover({
  open,
  onClose,
  anchorRef,
  items,
  placement = 'bottom-start',
  testId,
  ariaLabel = 'Actions',
}: MenuPopoverProps): JSX.Element {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const list = listRef.current;
    if (!list) return undefined;
    function onKey(event: KeyboardEvent): void {
      const focusable = list ? Array.from(list.querySelectorAll<HTMLButtonElement>('button:not([disabled])')) : [];
      if (focusable.length === 0) return;
      const current = document.activeElement as HTMLElement | null;
      const idx = current ? focusable.indexOf(current as HTMLButtonElement) : -1;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = focusable[(idx + 1 + focusable.length) % focusable.length];
        next?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
        prev?.focus();
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusable[0]?.focus();
      } else if (event.key === 'End') {
        event.preventDefault();
        focusable[focusable.length - 1]?.focus();
      }
    }
    list.addEventListener('keydown', onKey);
    // Initial focus on the first non-disabled item.
    const first = list.querySelector<HTMLButtonElement>('button:not([disabled])');
    first?.focus();
    return () => list.removeEventListener('keydown', onKey);
  }, [open]);

  function handleSelect(item: MenuItem): void {
    if (item.disabled) return;
    item.onSelect();
    onClose();
  }

  return (
    <Popover open={open} onClose={onClose} anchorRef={anchorRef} placement={placement} testId={testId}>
      <ul ref={listRef} className="ds-menu" role="menu" aria-label={ariaLabel}>
        {items.map((item) => (
          <li key={item.key} role="none">
            <button
              type="button"
              role="menuitem"
              className={['ds-menu__item', item.danger && 'ds-menu__item--danger'].filter(Boolean).join(' ')}
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
            >
              {item.icon && <span className="ds-menu__icon" aria-hidden>{item.icon}</span>}
              <span className="ds-menu__label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
