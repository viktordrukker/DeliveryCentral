import { useCallback, useEffect, useState } from 'react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
}

interface UseContextMenuResult {
  close: () => void;
  isOpen: boolean;
  items: ContextMenuItem[];
  position: ContextMenuPosition;
  onContextMenu: (
    event: React.MouseEvent,
    menuItems: ContextMenuItem[],
  ) => void;
}

/**
 * Hook for showing a right-click context menu.
 *
 * Usage:
 *   const { onContextMenu, isOpen, position, items, close } = useContextMenu();
 *
 *   On the chart container:
 *     <div onContextMenu={(e) => onContextMenu(e, [
 *       { label: 'Copy value', onClick: () => ... },
 *       { label: 'View details', onClick: () => navigate(...) },
 *     ])}>
 *
 *   At the bottom of the component:
 *     {isOpen ? <ContextMenu items={items} onClose={close} position={position} /> : null}
 */
export function useContextMenu(): UseContextMenuResult {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [items, setItems] = useState<ContextMenuItem[]>([]);

  const close = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const onContextMenu = useCallback(
    (event: React.MouseEvent, menuItems: ContextMenuItem[]): void => {
      event.preventDefault();
      setPosition({ x: event.clientX, y: event.clientY });
      setItems(menuItems);
      setIsOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(): void {
      setIsOpen(false);
    }

    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return { close, isOpen, items, onContextMenu, position };
}
