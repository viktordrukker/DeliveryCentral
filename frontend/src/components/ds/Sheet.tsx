import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { allocateZIndex, getPortalRoot, lockBodyScroll } from './portal-stack';
import { useFocusTrap } from './use-focus-trap';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  testId?: string;
  children?: ReactNode;
}

/**
 * Bottom-anchored panel. Naturally mobile-first; on desktop it caps height
 * and centers horizontally. Use when the surface is sheet-first regardless
 * of viewport (e.g. mobile filter pickers).
 *
 * Note: `Modal` already auto-collapses to a sheet at sm; only reach for
 * `<Sheet>` when sheet semantics are intentional, not a fallback.
 */
export function Sheet({
  open,
  onClose,
  ariaLabel,
  title,
  description,
  footer,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  testId,
  children,
}: SheetProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [zIndex, setZIndex] = useState<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const portalRoot = useMemo(() => (open ? getPortalRoot() : null), [open]);

  useEffect(() => {
    if (!open) {
      setZIndex(null);
      return undefined;
    }
    setZIndex(allocateZIndex());
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    return lockBodyScroll();
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEscape) return undefined;
    function onKey(event: KeyboardEvent): void {
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
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div
      className="ds-sheet-backdrop"
      style={{ zIndex }}
      onClick={onBackdropClick}
      data-testid={testId ? `${testId}-backdrop` : undefined}
    >
      <div
        ref={panelRef}
        className="ds-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-testid={testId}
      >
        {(title || description) && (
          <header className="ds-sheet__header">
            <span className="ds-sheet__handle" aria-hidden />
            {title && <h2 id={titleId} className="ds-sheet__title">{title}</h2>}
            {description && <p id={descriptionId} className="ds-sheet__description">{description}</p>}
          </header>
        )}
        <div className="ds-sheet__body">{children}</div>
        {footer && <footer className="ds-sheet__footer">{footer}</footer>}
      </div>
    </div>,
    portalRoot,
  );
}
