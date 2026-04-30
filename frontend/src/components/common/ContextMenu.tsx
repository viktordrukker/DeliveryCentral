import { ContextMenuItem, ContextMenuPosition } from '@/lib/hooks/useContextMenu';
import { Button } from '@/components/ds';

interface ContextMenuProps {
  items: ContextMenuItem[];
  onClose: () => void;
  position: ContextMenuPosition;
}

export function ContextMenu({ items, onClose, position }: ContextMenuProps): JSX.Element {
  // Adjust position to avoid overflowing viewport
  const adjustedX = Math.min(position.x, window.innerWidth - 180);
  const adjustedY = Math.min(position.y, window.innerHeight - items.length * 36 - 16);

  return (
    <div
      aria-label="Context menu"
      role="menu"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        left: adjustedX,
        minWidth: '160px',
        padding: '4px 0',
        position: 'fixed',
        top: adjustedY,
        zIndex: 1000,
      }}
    >
      {items.map((item) => (
        <Button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          role="menuitem"
          variant="link"
          size="sm"
          style={{
            display: 'block',
            fontSize: '13px',
            padding: '8px 16px',
            textAlign: 'left',
            width: '100%',
            borderRadius: 0,
            color: 'var(--color-text)',
          }}
          type="button"
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
