/**
 * Phase DS-2 — shared overlay/portal infrastructure.
 *
 * - Single body-scroll-lock counter shared across every overlay surface
 *   (Modal, Drawer, Sheet, Popover) so opening a modal-from-modal doesn't
 *   prematurely unlock when the inner one closes.
 * - Z-index allocator so stacked overlays paint in open order.
 * - Lazy portal root that lives outside the React tree (avoids z-index
 *   inheritance issues with positioned ancestors).
 */

let scrollLockCount = 0;
let savedBodyOverflow = '';

/** Increment the body-scroll-lock counter. Returns a cleanup that decrements. */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  if (scrollLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = savedBodyOverflow;
    }
  };
}

let zCounter = 1000;
/** Allocate a z-index for a newly opened overlay. */
export function allocateZIndex(): number {
  zCounter += 1;
  return zCounter;
}

const PORTAL_ID = 'ds-portal-root';

/** Idempotent portal root attached to <body>. */
export function getPortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let node = document.getElementById(PORTAL_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = PORTAL_ID;
    document.body.appendChild(node);
  }
  return node;
}
