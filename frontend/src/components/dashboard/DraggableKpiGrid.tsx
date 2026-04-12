import { Children, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface DraggableKpiGridProps {
  /** localStorage key prefix for persisting card order */
  storageKey: string;
}

interface DraggableCardProps {
  children: React.ReactNode;
  id: string;
}

function DraggableCard({ children, id }: DraggableCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

  function setRefs(el: HTMLDivElement | null): void {
    setDragRef(el);
    setDropRef(el);
  }

  return (
    <div
      ref={setRefs}
      style={{
        opacity: isDragging ? 0.4 : 1,
        outline: isOver ? '2px dashed #6366f1' : undefined,
        transition: 'opacity 150ms',
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export function DraggableKpiGrid({
  children,
  storageKey,
}: PropsWithChildren<DraggableKpiGridProps>): JSX.Element {
  const childArray = useMemo(() => Children.toArray(children), [children]);

  const [order, setOrder] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(`kpi-order:${storageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        if (Array.isArray(parsed) && parsed.length === childArray.length) return parsed;
      }
    } catch {
      // ignore
    }
    return childArray.map((_, i) => i);
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeIndex = order.indexOf(Number(active.id));
      const overIndex = order.indexOf(Number(over.id));
      if (activeIndex === -1 || overIndex === -1) return;

      const next = [...order];
      next.splice(activeIndex, 1);
      next.splice(overIndex, 0, Number(active.id));
      setOrder(next);
      try {
        localStorage.setItem(`kpi-order:${storageKey}`, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [order, storageKey],
  );

  const orderedChildren = order.map((idx) => childArray[idx]).filter(Boolean);

  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      <div className="details-summary-grid">
        {orderedChildren.map((child, position) => (
          <DraggableCard id={String(order[position])} key={order[position]}>
            {child}
          </DraggableCard>
        ))}
      </div>
    </DndContext>
  );
}
