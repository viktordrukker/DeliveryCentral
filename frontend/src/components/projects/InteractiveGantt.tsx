import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  type MilestoneStatus,
  type ProjectMilestoneDto,
  updateMilestone,
} from '@/lib/api/project-milestones';

interface InteractiveGanttProps {
  projectId: string;
  milestones: ProjectMilestoneDto[];
  canEdit: boolean;
  onChange?: () => void;
  onOpenEditor?: (milestoneId: string) => void;
}

type ZoomLevel = 'week' | 'month';

const STATUS_COLOR: Record<MilestoneStatus, string> = {
  PLANNED: 'var(--color-status-neutral)',
  IN_PROGRESS: 'var(--color-status-warning)',
  HIT: 'var(--color-status-active)',
  MISSED: 'var(--color-status-danger)',
};

const ROW_HEIGHT = 30;
const LABEL_WIDTH = 180;
const PADDING_TOP = 34;
const MS_DAY = 24 * 3600 * 1000;

function toTime(s: string): number {
  return new Date(s).getTime();
}

function formatShortDate(s: string | number): string {
  const d = typeof s === 'number' ? new Date(s) : new Date(s);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function formatMonth(s: number): string {
  const d = new Date(s);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
}

function isOverdue(m: ProjectMilestoneDto): boolean {
  if (m.status === 'HIT' || m.status === 'MISSED') return false;
  return toTime(m.plannedDate) < Date.now();
}

function addIsoDays(d: Date, days: number): string {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x.toISOString().slice(0, 10);
}

export function InteractiveGantt({
  projectId,
  milestones,
  canEdit,
  onChange,
  onOpenEditor,
}: InteractiveGanttProps): JSX.Element {
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [dragState, setDragState] = useState<{
    id: string;
    originTime: number;
    startClientX: number;
    currentTime: number;
  } | null>(null);

  const sorted = useMemo(
    () => [...milestones].sort((a, b) => toTime(a.plannedDate) - toTime(b.plannedDate)),
    [milestones],
  );

  const { minTime, maxTime, ticks } = useMemo(() => {
    if (sorted.length === 0) {
      const now = Date.now();
      return { maxTime: now, minTime: now, ticks: [] as number[] };
    }
    const all: number[] = [];
    for (const m of sorted) {
      all.push(toTime(m.plannedDate));
      if (m.actualDate) all.push(toTime(m.actualDate));
    }
    all.push(Date.now());
    const minT = Math.min(...all) - 14 * MS_DAY;
    const maxT = Math.max(...all) + 14 * MS_DAY;
    const tickStep = zoom === 'week' ? 7 * MS_DAY : 30 * MS_DAY;
    const ts: number[] = [];
    for (let t = minT; t <= maxT; t += tickStep) ts.push(t);
    return { maxTime: maxT, minTime: minT, ticks: ts };
  }, [sorted, zoom]);

  const plotWidth = zoom === 'week' ? Math.max(720, ticks.length * 40) : Math.max(720, ticks.length * 60);
  const totalSpan = maxTime - minTime || 1;

  const xForTime = (t: number): number => LABEL_WIDTH + ((t - minTime) / totalSpan) * plotWidth;
  const timeForX = (x: number): number => minTime + ((x - LABEL_WIDTH) / plotWidth) * totalSpan;

  const svgWidth = LABEL_WIDTH + plotWidth + 20;
  const svgHeight = PADDING_TOP + Math.max(1, sorted.length) * ROW_HEIGHT + 16;

  const byId = useMemo(() => new Map(sorted.map((m) => [m.id, m])), [sorted]);
  const rowIndexById = useMemo(() => {
    const m = new Map<string, number>();
    sorted.forEach((s, i) => m.set(s.id, i));
    return m;
  }, [sorted]);

  function handlePointerDown(e: React.PointerEvent<SVGGElement>, m: ProjectMilestoneDto): void {
    if (!canEdit) return;
    if (m.status === 'HIT' || m.status === 'MISSED') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      id: m.id,
      originTime: toTime(m.plannedDate),
      startClientX: e.clientX,
      currentTime: toTime(m.plannedDate),
    });
  }

  function handlePointerMove(e: React.PointerEvent<SVGGElement>): void {
    if (!dragState) return;
    const deltaPx = e.clientX - dragState.startClientX;
    const deltaTime = (deltaPx / plotWidth) * totalSpan;
    const nextTime = Math.max(minTime + MS_DAY, Math.min(maxTime - MS_DAY, dragState.originTime + deltaTime));
    // Snap to day
    const d = new Date(nextTime);
    d.setUTCHours(0, 0, 0, 0);
    setDragState({ ...dragState, currentTime: d.getTime() });
  }

  async function handlePointerUp(e: React.PointerEvent<SVGGElement>): Promise<void> {
    if (!dragState) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const snapped = new Date(dragState.currentTime);
    const orig = new Date(dragState.originTime);
    const dayShift = Math.round((snapped.getTime() - orig.getTime()) / MS_DAY);
    const final = dragState;
    setDragState(null);
    if (dayShift === 0) {
      if (onOpenEditor) onOpenEditor(final.id);
      return;
    }
    try {
      await updateMilestone(projectId, final.id, {
        plannedDate: addIsoDays(orig, dayShift),
      });
      toast.success(`Milestone moved ${dayShift > 0 ? '+' : ''}${dayShift} day${Math.abs(dayShift) === 1 ? '' : 's'}`);
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reschedule failed');
    }
  }

  if (sorted.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 'var(--space-3)' }}>
        No milestones yet.
      </div>
    );
  }

  const todayX = xForTime(Date.now());

  return (
    <div data-testid="interactive-gantt">
      <div style={{ alignItems: 'center', display: 'flex', gap: 'var(--space-2)', marginBottom: 6 }}>
        <button
          className={zoom === 'week' ? 'button--project-detail button--primary' : 'button--project-detail'}
          onClick={() => setZoom('week')}
          type="button"
        >
          Week
        </button>
        <button
          className={zoom === 'month' ? 'button--project-detail button--primary' : 'button--project-detail'}
          onClick={() => setZoom('month')}
          type="button"
        >
          Month
        </button>
        {canEdit ? (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            Drag a planned diamond to reschedule · click to edit
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Read-only</span>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg aria-label="Interactive milestone Gantt" height={svgHeight} width={svgWidth}>
          {/* Today line */}
          <line
            stroke="var(--color-accent)"
            strokeDasharray="4 2"
            strokeWidth={1.2}
            x1={todayX}
            x2={todayX}
            y1={PADDING_TOP - 16}
            y2={svgHeight - 4}
          />
          <text fill="var(--color-accent)" fontSize={9} textAnchor="middle" x={todayX} y={PADDING_TOP - 20}>
            today
          </text>

          {/* Ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                stroke="var(--color-border)"
                strokeDasharray="2 3"
                x1={xForTime(t)}
                x2={xForTime(t)}
                y1={PADDING_TOP - 6}
                y2={svgHeight - 6}
              />
              <text
                fill="var(--color-text-muted)"
                fontSize={9}
                textAnchor="middle"
                x={xForTime(t)}
                y={PADDING_TOP - 10}
              >
                {zoom === 'week' ? formatShortDate(t) : formatMonth(t)}
              </text>
            </g>
          ))}

          {/* Dependency arrows: from predecessor's plannedX to successor's plannedX */}
          {sorted.flatMap((m) =>
            (m.dependsOnMilestoneIds ?? []).map((predId) => {
              const pred = byId.get(predId);
              if (!pred) return null;
              const predIdx = rowIndexById.get(predId) ?? 0;
              const succIdx = rowIndexById.get(m.id) ?? 0;
              const x1 = xForTime(toTime(pred.plannedDate));
              const y1 = PADDING_TOP + predIdx * ROW_HEIGHT + ROW_HEIGHT / 2 + 2;
              const x2 = xForTime(toTime(m.plannedDate));
              const y2 = PADDING_TOP + succIdx * ROW_HEIGHT + ROW_HEIGHT / 2 + 2;
              return (
                <g key={`dep-${predId}-${m.id}`}>
                  <path
                    d={`M ${x1} ${y1} L ${x1 + 12} ${y1} L ${x1 + 12} ${y2} L ${x2 - 4} ${y2}`}
                    fill="none"
                    stroke="var(--color-text-subtle)"
                    strokeWidth={1}
                  />
                  <polygon
                    fill="var(--color-text-subtle)"
                    points={`${x2 - 4},${y2 - 3} ${x2 - 4},${y2 + 3} ${x2},${y2}`}
                  />
                </g>
              );
            }),
          )}

          {sorted.map((m, idx) => {
            const rowY = PADDING_TOP + idx * ROW_HEIGHT;
            const plannedTime =
              dragState?.id === m.id ? dragState.currentTime : toTime(m.plannedDate);
            const plannedX = xForTime(plannedTime);
            const actualX = m.actualDate ? xForTime(toTime(m.actualDate)) : null;
            const originalPlannedX = xForTime(toTime(m.plannedDate));
            const color = STATUS_COLOR[m.status];
            const overdue = isOverdue(m);
            const isDragging = dragState?.id === m.id;
            const canDrag = canEdit && m.status !== 'HIT' && m.status !== 'MISSED';

            return (
              <g key={m.id}>
                {/* Label */}
                <text fill="var(--color-text)" fontSize={12} x={4} y={rowY + ROW_HEIGHT / 2 + 4}>
                  {m.name.length > 28 ? `${m.name.slice(0, 26)}…` : m.name}
                </text>
                {/* Row separator */}
                <line
                  stroke="var(--color-border)"
                  x1={LABEL_WIDTH}
                  x2={LABEL_WIDTH + plotWidth}
                  y1={rowY + ROW_HEIGHT - 2}
                  y2={rowY + ROW_HEIGHT - 2}
                />
                {/* Baseline ghost for drag */}
                {isDragging ? (
                  <polygon
                    fill="none"
                    points={`${originalPlannedX},${rowY + 4} ${originalPlannedX + 6},${rowY + ROW_HEIGHT / 2 + 2} ${originalPlannedX},${rowY + ROW_HEIGHT - 2} ${originalPlannedX - 6},${rowY + ROW_HEIGHT / 2 + 2}`}
                    stroke="var(--color-text-subtle)"
                    strokeDasharray="2 2"
                    strokeWidth={1}
                  />
                ) : null}
                {/* Line between planned and actual */}
                {actualX !== null ? (
                  <line
                    stroke={color}
                    strokeWidth={2}
                    x1={plannedX}
                    x2={actualX}
                    y1={rowY + ROW_HEIGHT / 2 + 2}
                    y2={rowY + ROW_HEIGHT / 2 + 2}
                  />
                ) : null}
                {/* Planned diamond (drag target) */}
                <g
                  onPointerDown={(e) => handlePointerDown(e, m)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => void handlePointerUp(e)}
                  style={{ cursor: canDrag ? 'grab' : 'pointer' }}
                >
                  <polygon
                    fill={color}
                    points={`${plannedX},${rowY + 4} ${plannedX + 7},${rowY + ROW_HEIGHT / 2 + 2} ${plannedX},${rowY + ROW_HEIGHT - 2} ${plannedX - 7},${rowY + ROW_HEIGHT / 2 + 2}`}
                    stroke={overdue ? 'var(--color-status-danger)' : 'var(--color-surface)'}
                    strokeWidth={overdue ? 2 : 1}
                  >
                    <title>
                      {m.name}
                      {'\n'}
                      {`Planned: ${m.plannedDate.slice(0, 10)}`}
                      {m.actualDate ? `\nActual: ${m.actualDate.slice(0, 10)}` : ''}
                      {overdue ? '\n(overdue)' : ''}
                    </title>
                  </polygon>
                </g>
                {/* Actual circle */}
                {actualX !== null && m.status === 'HIT' ? (
                  <circle
                    cx={actualX}
                    cy={rowY + ROW_HEIGHT / 2 + 2}
                    fill="var(--color-status-active)"
                    r={5}
                    stroke="var(--color-surface)"
                    strokeWidth={1}
                  >
                    <title>{`Actual: ${m.actualDate?.slice(0, 10)}`}</title>
                  </circle>
                ) : null}
                {/* Progress bar beneath diamond when in progress */}
                {m.status === 'IN_PROGRESS' && (m.progressPct ?? 0) > 0 ? (
                  <rect
                    fill="var(--color-status-warning)"
                    height={3}
                    opacity={0.7}
                    rx={1.5}
                    width={((m.progressPct ?? 0) / 100) * 40}
                    x={plannedX - 20}
                    y={rowY + ROW_HEIGHT - 6}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
