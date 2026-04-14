import { useCallback, useEffect, useRef, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { useAuth } from '@/app/auth-context';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState } from '@/components/common/LoadingState';
import { fetchAssignments, AssignmentDirectoryItem } from '@/lib/api/assignments';
import { checkAllocationConflict } from '@/lib/api/staffing-requests';

// Generate 12 weeks starting from the current Monday
function getMondayStr(d: Date): string {
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function generate12Weeks(): string[] {
  const weeks: string[] = [];
  const monday = getMondayStr(new Date());
  for (let i = 0; i < 12; i++) {
    weeks.push(addDaysStr(monday, i * 7));
  }
  return weeks;
}

function assignmentCoversWeek(assignment: AssignmentDirectoryItem, weekStart: string): boolean {
  const weekEnd = addDaysStr(weekStart, 6);
  const from = assignment.startDate ?? '0000-01-01';
  const to = assignment.endDate ?? '9999-12-31';
  return from <= weekEnd && to >= weekStart;
}

// Draggable assignment bar
function AssignmentBar({ assignment, week, conflict }: {
  assignment: AssignmentDirectoryItem;
  conflict: boolean;
  week: string;
}): JSX.Element {
  const id = `${assignment.id}-${week}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, data: { assignment, week } });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        background: conflict ? 'var(--color-danger-bg)' : (isDragging ? 'var(--color-info-bg)' : 'var(--color-accent-bg)'),
        border: `1px solid ${conflict ? 'var(--color-status-danger)' : 'var(--color-accent)'}`,
        borderRadius: '4px',
        cursor: 'grab',
        fontSize: '0.75rem',
        fontWeight: 500,
        marginBottom: '2px',
        opacity: isDragging ? 0.5 : 1,
        overflow: 'hidden',
        padding: '2px 6px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={`${assignment.project.displayName} — ${assignment.allocationPercent}%`}
    >
      {assignment.project.displayName} ({assignment.allocationPercent}%)
    </div>
  );
}

// Droppable cell
function BoardCell({ personId, week, children, isSelected, cellRef, onKeyDown }: {
  cellRef?: React.Ref<HTMLTableCellElement>;
  children: React.ReactNode;
  isSelected?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  personId: string;
  week: string;
}): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({ id: `${personId}-${week}`, data: { personId, week } });
  return (
    <td
      ref={(node) => {
        setNodeRef(node);
        if (typeof cellRef === 'function') cellRef(node);
        else if (cellRef && 'current' in cellRef) (cellRef as React.MutableRefObject<HTMLTableCellElement | null>).current = node;
      }}
      onKeyDown={onKeyDown}
      role="gridcell"
      style={{
        background: isOver ? 'var(--color-info-bg)' : undefined,
        border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
        minWidth: '80px',
        outline: 'none',
        padding: '4px',
        verticalAlign: 'top',
        transition: 'background 0.1s',
      }}
      tabIndex={0}
    >
      {children}
    </td>
  );
}

export function StaffingBoardPage(): JSX.Element {
  const { principal } = useAuth();
  const weeks = generate12Weeks();
  const [assignments, setAssignments] = useState<AssignmentDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement | null>>(new Map());

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchAssignments({ status: 'APPROVED', pageSize: 200 }),
      fetchAssignments({ status: 'ACTIVE', pageSize: 200 }),
    ])
      .then(([approvedRes, activeRes]) => {
        const seen = new Set<string>();
        const merged: AssignmentDirectoryItem[] = [];
        for (const item of [...approvedRes.items, ...activeRes.items]) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
        setAssignments(merged);
      })
      .catch(() => setError('Failed to load assignments.'))
      .finally(() => setIsLoading(false));
  }, []);

  // Group by person
  const personIds = [...new Set(assignments.map((a) => a.person.id))];
  const personNames = new Map(assignments.map((a) => [a.person.id, a.person.displayName]));
  const assignmentsByPerson = new Map<string, AssignmentDirectoryItem[]>();
  for (const pid of personIds) {
    assignmentsByPerson.set(pid, assignments.filter((a) => a.person.id === pid));
  }

  const focusCell = useCallback((row: number, col: number) => {
    const key = `${row}-${col}`;
    const el = cellRefs.current.get(key);
    if (el) el.focus();
  }, []);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      const maxRow = personIds.length - 1;
      const maxCol = weeks.length - 1;

      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedCell(null);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
          setSelectedCell(null); // deselect
        } else {
          setSelectedCell({ row, col });
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        let nextRow = row;
        let nextCol = col;
        if (e.key === 'ArrowUp') nextRow = Math.max(0, row - 1);
        if (e.key === 'ArrowDown') nextRow = Math.min(maxRow, row + 1);
        if (e.key === 'ArrowLeft') nextCol = Math.max(0, col - 1);
        if (e.key === 'ArrowRight') nextCol = Math.min(maxCol, col + 1);

        if (nextRow !== row || nextCol !== col) {
          focusCell(nextRow, nextCol);
        }
      }
    },
    [personIds.length, weeks.length, selectedCell, focusCell],
  );

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    setActiveId(null);
    setConflictMessage(null);
    const { active, over } = event;
    if (!over || !active.data.current) return;

    const assignment = active.data.current.assignment as AssignmentDirectoryItem;
    const targetWeek = over.data.current?.week as string | undefined;
    const targetPersonId = over.data.current?.personId as string | undefined;

    if (!targetWeek || !targetPersonId || !assignment) return;
    if (targetPersonId === assignment.person.id) return; // same person, no-op

    // Check conflict
    try {
      const weekEnd = addDaysStr(targetWeek, 6);
      const result = await checkAllocationConflict({
        allocation: assignment.allocationPercent,
        excludeAssignmentId: assignment.id,
        from: targetWeek,
        personId: targetPersonId,
        to: weekEnd,
      });

      if (result.hasConflict) {
        setConflictMessage(
          `Cannot move assignment: ${targetPersonId} would be at ${result.totalAllocationPercent}% (over 100%).`,
        );
        return;
      }

      // In real scenario, call PATCH /assignments/:id with updated personId
      // For now, we'll just re-fetch
      setConflictMessage(`Move would succeed (${result.totalAllocationPercent}% total). In production, this calls PATCH /assignments/${assignment.id}.`);
    } catch {
      setConflictMessage('Conflict check failed.');
    }
  }

  const draggedAssignment = activeId
    ? assignments.find((a) => activeId.startsWith(a.id))
    : null;

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Supply & Demand"
        subtitle="Drag assignments between people to re-staff. Conflict detection prevents overallocation."
        title="Staffing Board"
      />

      {conflictMessage ? (
        <div
          style={{
            background: conflictMessage.includes('succeed') ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${conflictMessage.includes('succeed') ? 'var(--color-status-active)' : 'var(--color-status-danger)'}`,
            borderRadius: '6px',
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
          }}
        >
          {conflictMessage}
        </div>
      ) : null}

      {error ? <ErrorState description={error} /> : null}
      {isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}

      {!isLoading && !error ? (
        <div style={{ overflowX: 'auto' }}>
          <DndContext
            onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
            onDragEnd={(e) => void handleDragEnd(e)}
          >
            <p
              style={{
                border: 0,
                clip: 'rect(0 0 0 0)',
                height: '1px',
                margin: '-1px',
                overflow: 'hidden',
                padding: 0,
                position: 'absolute',
                width: '1px',
              }}
            >
              Use arrow keys to navigate, Enter to select, arrow keys to move, Escape to cancel
            </p>
            <table role="grid" style={{ borderCollapse: 'collapse', fontSize: '0.8rem', tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid var(--color-border)', minWidth: '120px', padding: '6px', textAlign: 'left' }}>
                    Person
                  </th>
                  {weeks.map((week) => (
                    <th
                      key={week}
                      style={{ border: '1px solid var(--color-border)', fontSize: '0.7rem', minWidth: '80px', padding: '4px', textAlign: 'center' }}
                    >
                      {week.slice(5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {personIds.map((personId, rowIndex) => {
                  const personAssignments = assignmentsByPerson.get(personId) ?? [];
                  return (
                    <tr key={personId}>
                      <td
                        style={{
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                          fontWeight: 500,
                          padding: '6px',
                          position: 'sticky',
                          left: 0,
                          background: 'var(--color-surface, white)',
                          zIndex: 1,
                        }}
                      >
                        {personNames.get(personId) ?? personId}
                      </td>
                      {weeks.map((week, colIndex) => {
                        const weekAssignments = personAssignments.filter((a) =>
                          assignmentCoversWeek(a, week),
                        );
                        const totalAlloc = weekAssignments.reduce((s, a) => s + a.allocationPercent, 0);
                        const hasConflict = totalAlloc > 100;
                        const isSel = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                        return (
                          <BoardCell
                            key={week}
                            cellRef={(el: HTMLTableCellElement | null) => {
                              cellRefs.current.set(`${rowIndex}-${colIndex}`, el);
                            }}
                            isSelected={isSel}
                            onKeyDown={(e: React.KeyboardEvent) => handleCellKeyDown(e, rowIndex, colIndex)}
                            personId={personId}
                            week={week}
                          >
                            {weekAssignments.map((a) => (
                              <AssignmentBar
                                key={a.id}
                                assignment={a}
                                conflict={hasConflict}
                                week={week}
                              />
                            ))}
                          </BoardCell>
                        );
                      })}
                    </tr>
                  );
                })}
                {personIds.length === 0 ? (
                  <tr>
                    <td colSpan={weeks.length + 1} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No approved assignments found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <DragOverlay>
              {draggedAssignment ? (
                <div
                  style={{
                    background: 'var(--color-info-bg)',
                    border: '1px solid var(--color-accent)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    padding: '2px 6px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                >
                  {draggedAssignment.project.displayName}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      ) : null}
    </PageContainer>
  );
}
