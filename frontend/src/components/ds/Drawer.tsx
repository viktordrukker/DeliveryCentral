import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { allocateZIndex, getPortalRoot, lockBodyScroll } from './portal-stack';
import { useFocusTrap } from './use-focus-trap';

export type DrawerSide = 'right' | 'left';
export type DrawerWidth = 'sm' | 'md' | 'lg';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  width?: DrawerWidth;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  testId?: string;
  children?: ReactNode;
}

/**
 * Slide-in side panel. On `sm` (≤640px) the drawer collapses to full-width
 * regardless of `side` — handled in ds.css.
 *
 * Composition: same primitives as Modal (portal / focus trap / scroll lock /
 * stacking), different geometry. Used for: detail drawers, configurators,
 * filter sheets when triggered from the body.
 */
export function Drawer({
  open,
  onClose,
  ariaLabel,
  title,
  description,
  footer,
  side = 'right',
  width = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  testId,
  children,
}: DrawerProps): JSX.Element | null {
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
      className="ds-drawer-backdrop"
      style={{ zIndex }}
      onClick={onBackdropClick}
      data-testid={testId ? `${testId}-backdrop` : undefined}
    >
      <div
        ref={panelRef}
        className={`ds-drawer ds-drawer--${side} ds-drawer--${width}`}
        role="dialog"
        aria-modal="true"
        aria-label={!title ? ariaLabel : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        data-testid={testId}
      >
        {(title || description) && (
          <header className="ds-drawer__header">
            {title && <h2 id={titleId} className="ds-drawer__title">{title}</h2>}
            {description && <p id={descriptionId} className="ds-drawer__description">{description}</p>}
          </header>
        )}
        <div className="ds-drawer__body">{children}</div>
        {footer && <footer className="ds-drawer__footer">{footer}</footer>}
      </div>
    </div>,
    portalRoot,
  );
}
