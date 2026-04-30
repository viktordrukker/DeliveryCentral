import {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { allocateZIndex, getPortalRoot, lockBodyScroll } from './portal-stack';
import { useFocusTrap } from './use-focus-trap';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Required for screen readers. Not rendered visibly unless `title` is set. */
  ariaLabel?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Action row pinned to the bottom (typically Confirm + Cancel buttons). */
  footer?: ReactNode;
  size?: ModalSize;
  /** Click outside the panel closes the modal. Default: true. */
  closeOnBackdropClick?: boolean;
  /** Pressing Escape closes the modal. Default: true. */
  closeOnEscape?: boolean;
  /** Append an `data-testid` for tests. */
  testId?: string;
  /** Optional override of the className on the modal panel. */
  className?: string;
  children?: ReactNode;
}

/**
 * Generic modal shell. Every overlay-shaped DS surface composes this.
 *
 * Behaviors handled internally:
 *   - portal mount outside the React tree
 *   - backdrop overlay
 *   - body scroll lock (counter-based; safe under nested modals)
 *   - z-index stacking
 *   - focus trap + restore-on-close
 *   - Escape / backdrop click close
 *   - aria-modal / role=dialog with auto labelledby/describedby
 *   - mobile: below the `sm` breakpoint the panel becomes full-screen
 *     (handled in ds.css; no JS branching needed)
 */
export function Modal({
  open,
  onClose,
  ariaLabel,
  title,
  description,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  testId,
  className,
  children,
}: ModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [zIndex, setZIndex] = useState<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const portalRoot = useMemo(() => (open ? getPortalRoot() : null), [open]);

  // Allocate z-index on every open so a re-opened modal stacks above any
  // currently-open modals (e.g. nested confirm dialogs).
  useEffect(() => {
    if (!open) {
      setZIndex(null);
      return undefined;
    }
    setZIndex(allocateZIndex());
    return undefined;
  }, [open]);

  // Body scroll lock — paired with cleanup so a surface unmounted without
  // toggling `open` first still releases the lock.
  useEffect(() => {
    if (!open) return undefined;
    return lockBodyScroll();
  }, [open]);

  // Escape close.
  useEffect(() => {
    if (!open || !closeOnEscape) return undefined;
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeOnEscape, onClose]);

  useFocusTrap(panelRef, open);

  if (!open || !portalRoot || zIndex == null) return null;

  function onBackdropClick(event: React.MouseEvent<HTMLDivElement>): void {
    if (!closeOnBackdropClick) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function onPanelKeyDown(_event: KeyboardEvent<HTMLDivElement>): void {
    // Reserved for future panel-level shortcuts; tab cycling handled in useFocusTrap.
  }

  const labelledBy = title ? titleId : undefined;
  const describedBy = description ? descriptionId : undefined;

  const panelClass = ['ds-modal', `ds-modal--${size}`, className].filter(Boolean).join(' ');

  return createPortal(
    <div
      className="ds-modal-backdrop"
      style={{ zIndex }}
      onClick={onBackdropClick}
      data-testid={testId ? `${testId}-backdrop` : undefined}
    >
      <div
        ref={panelRef}
        className={panelClass}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onKeyDown={onPanelKeyDown}
        tabIndex={-1}
        data-testid={testId}
      >
        {(title || description) && (
          <header className="ds-modal__header">
            {title && (
              <h2 id={titleId} className="ds-modal__title">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="ds-modal__description">
                {description}
              </p>
            )}
          </header>
        )}
        <div className="ds-modal__body">{children}</div>
        {footer && <footer className="ds-modal__footer">{footer}</footer>}
      </div>
    </div>,
    portalRoot,
  );
}
