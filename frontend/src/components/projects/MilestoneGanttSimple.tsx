import { useMemo } from 'react';

import type { MilestoneStatus, ProjectMilestoneDto } from '@/lib/api/project-milestones';

interface MilestoneGanttSimpleProps {
  milestones: ProjectMilestoneDto[];
}

const STATUS_COLOR: Record<MilestoneStatus, string> = {
  PLANNED: 'var(--color-status-neutral)',
  IN_PROGRESS: 'var(--color-status-warning)',
  HIT: 'var(--color-status-active)',
  MISSED: 'var(--color-status-danger)',
};

const ROW_HEIGHT = 28;
const LABEL_WIDTH = 180;
const PADDING_TOP = 28;

function toTime(s: string): number {
  return new Date(s).getTime();
}

function formatShortDate(s: string): string {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function MilestoneGanttSimple({ milestones }: MilestoneGanttSimpleProps): JSX.Element {
  const sorted = useMemo(
    () => [...milestones].sort((a, b) => toTime(a.plannedDate) - toTime(b.plannedDate)),
    [milestones],
  );

  const { minTime, maxTime, weekTicks } = useMemo(() => {
    if (sorted.length === 0) {
      const now = Date.now();
      return { maxTime: now, minTime: now, weekTicks: [] as number[] };
    }
    const all: number[] = [];
    sorted.forEach((m) => {
      all.push(toTime(m.plannedDate));
      if (m.actualDate) all.push(toTime(m.actualDate));
    });
    const minT = Math.min(...all);
    const maxT = Math.max(...all);
    // Add 7-day padding on each side
    const pad = 7 * 24 * 3600 * 1000;
    const min = minT - pad;
    const max = maxT + pad;
    const ticks: number[] = [];
    const weekMs = 7 * 24 * 3600 * 1000;
    for (let t = min; t <= max; t += weekMs) ticks.push(t);
    return { maxTime: max, minTime: min, weekTicks: ticks };
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 'var(--space-3)' }}>
        No milestones yet.
      </div>
    );
  }

  const plotWidth = 720;
  const totalSpan = maxTime - minTime || 1;

  function xForTime(t: number): number {
    return LABEL_WIDTH + ((t - minTime) / totalSpan) * plotWidth;
  }

  const svgWidth = LABEL_WIDTH + plotWidth + 20;
  const svgHeight = PADDING_TOP + sorted.length * ROW_HEIGHT + 16;

  return (
    <div data-testid="milestone-gantt" style={{ overflowX: 'auto' }}>
      <svg aria-label="Milestone Gantt chart" height={svgHeight} width={svgWidth}>
        {/* Week grid */}
        {weekTicks.map((t) => (
          <g key={t}>
            <line
              stroke="var(--color-border)"
              strokeDasharray="2 3"
              x1={xForTime(t)}
              x2={xForTime(t)}
              y1={PADDING_TOP - 8}
              y2={svgHeight - 6}
            />
            <text
              fill="var(--color-text-muted)"
              fontSize={9}
              textAnchor="middle"
              x={xForTime(t)}
              y={PADDING_TOP - 12}
            >
              {formatShortDate(new Date(t).toISOString())}
            </text>
          </g>
        ))}

        {sorted.map((m, idx) => {
          const rowY = PADDING_TOP + idx * ROW_HEIGHT;
          const plannedX = xForTime(toTime(m.plannedDate));
          const actualX = m.actualDate ? xForTime(toTime(m.actualDate)) : null;
          const color = STATUS_COLOR[m.status];
          return (
            <g key={m.id}>
              {/* Label */}
              <text
                fill="var(--color-text)"
                fontSize={12}
                x={4}
                y={rowY + ROW_HEIGHT / 2 + 4}
              >
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
              {/* Planned marker (diamond) */}
              <polygon
                fill={color}
                points={`${plannedX},${rowY + 4} ${plannedX + 6},${rowY + ROW_HEIGHT / 2 + 2} ${plannedX},${rowY + ROW_HEIGHT - 2} ${plannedX - 6},${rowY + ROW_HEIGHT / 2 + 2}`}
                stroke="var(--color-surface)"
                strokeWidth={1}
              >
                <title>{`Planned: ${m.plannedDate.slice(0, 10)}`}</title>
              </polygon>
              {/* Actual marker (circle) when hit */}
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
            </g>
          );
        })}
      </svg>
    </div>
  );
}
