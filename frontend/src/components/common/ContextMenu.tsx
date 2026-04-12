import { ContextMenuItem, ContextMenuPosition } from '@/lib/hooks/useContextMenu';

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
        background: '#fff',
        border: '1px solid #e2e8f0',
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
        <button
          key={item.label}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          role="menuitem"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'block',
            fontSize: '13px',
            padding: '8px 16px',
            textAlign: 'left',
            width: '100%',
          }}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
