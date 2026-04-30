import {
  CSSProperties,
  ReactNode,
  RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { allocateZIndex, getPortalRoot } from './portal-stack';

export type PopoverPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right' | 'left';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** Element to anchor against. Required. */
  anchorRef: RefObject<HTMLElement>;
  placement?: PopoverPlacement;
  /** Click outside the popover closes it. Default: true. */
  closeOnOutsideClick?: boolean;
  /** Pressing Escape closes the popover. Default: true. */
  closeOnEscape?: boolean;
  testId?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Anchored floating panel. Unlike Modal/Drawer/Sheet, the Popover does NOT
 * lock body scroll — it's expected to be lightweight (action menus, hover
 * cards, inline pickers).
 *
 * Positioning is computed in a layout effect using the anchor's bounding
 * rect. Re-runs on `open`, on window resize, and on scroll of any ancestor
 * (via the `scroll` capture listener). For complex floating UI (collision
 * avoidance, virtual elements) reach for floating-ui in a future pass.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  placement = 'bottom-start',
  closeOnOutsideClick = true,
  closeOnEscape = true,
  testId,
  className,
  children,
}: PopoverProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [zIndex, setZIndex] = useState<number | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const portalRoot = useMemo(() => (open ? getPortalRoot() : null), [open]);

  useEffect(() => {
    if (!open) {
      setZIndex(null);
      setPosition(null);
      return undefined;
    }
    setZIndex(allocateZIndex());
    return undefined;
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    function recompute(): void {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const a = anchor.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      let top = 0;
      let left = 0;
      switch (placement) {
        case 'bottom-start':
          top = a.bottom + 4;
          left = a.left;
          break;
        case 'bottom-end':
          top = a.bottom + 4;
          left = a.right - p.width;
          break;
        case 'top-start':
          top = a.top - p.height - 4;
          left = a.left;
          break;
        case 'top-end':
          top = a.top - p.height - 4;
          left = a.right - p.width;
          break;
        case 'right':
          top = a.top;
          left = a.right + 4;
          break;
        case 'left':
          top = a.top;
          left = a.left - p.width - 4;
          break;
      }
      // Clamp to viewport
      const maxLeft = window.innerWidth - p.width - 4;
      const maxTop = window.innerHeight - p.height - 4;
      left = Math.max(4, Math.min(left, maxLeft));
      top = Math.max(4, Math.min(top, maxTop));
      setPosition({ top, left });
    }

    recompute();
    const onResize = (): void => recompute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
    // `zIndex` participates here because the panel is rendered behind the
    // `zIndex == null` gate below; the very first layout-effect pass after
    // `open` flips to true sees `panelRef.current === null` and bails. We
    // must re-run after zIndex resolves and the panel actually mounts —
    // otherwise the popover sticks at the off-screen sentinel until a
    // resize/scroll forces another recompute (e.g. opening DevTools).
  }, [open, placement, anchorRef, zIndex]);

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

  useEffect(() => {
    if (!open || !closeOnOutsideClick) return undefined;
    function onPointerDown(event: PointerEvent): void {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    }
    // Defer attach so the click that opened the popover doesn't close it.
    const t = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, closeOnOutsideClick, anchorRef, onClose]);

  if (!open || !portalRoot || zIndex == null) return null;

  const style: CSSProperties = {
    zIndex,
    top: position?.top ?? -9999,
    left: position?.left ?? -9999,
    visibility: position ? 'visible' : 'hidden',
  };

  return createPortal(
    <div
      ref={panelRef}
      className={['ds-popover', className].filter(Boolean).join(' ')}
      role="dialog"
      style={style}
      data-testid={testId}
    >
      {children}
    </div>,
    portalRoot,
  );
}
