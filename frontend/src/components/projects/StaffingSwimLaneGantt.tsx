import { useMemo } from 'react';
import type { AssignmentDirectoryItem } from '@/lib/api/assignments';

interface StaffingSwimLaneGanttProps {
  assignments: AssignmentDirectoryItem[];
}

const ROLE_COLORS: Record<string, string> = {
  default: 'var(--color-chart-1)',
  'delivery lead': 'var(--color-status-active)',
  engineer: 'var(--color-chart-2)',
  'lead engineer': 'var(--color-status-warning)',
  'product owner': 'var(--color-chart-4)',
  'project manager': 'var(--color-chart-5)',
  'program manager': 'var(--color-chart-6)',
  'qa engineer': 'var(--color-chart-3)',
  designer: 'var(--color-chart-7)',
  analyst: 'var(--color-chart-8)',
};

function roleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] ?? ROLE_COLORS['default'];
}

interface GanttRow {
  id: string;
  name: string;
  role: string;
  allocation: number;
  startDate: Date;
  endDate: Date;
  status: string;
}

export function StaffingSwimLaneGantt({ assignments }: StaffingSwimLaneGanttProps): JSX.Element {
  const { groups, timeRange } = useMemo(() => {
    const now = new Date();
    const rows: GanttRow[] = assignments
      .filter((a) => a.startDate)
      .map((a) => ({
        id: a.id,
        name: a.person.displayName,
        role: a.staffingRole,
        allocation: a.allocationPercent,
        startDate: new Date(a.startDate),
        endDate: a.endDate ? new Date(a.endDate) : new Date(now.getTime() + 90 * 86400000),
        status: a.approvalState,
      }));

    // Group by role
    const grouped: Record<string, GanttRow[]> = {};
    for (const row of rows) {
      const key = row.role || 'Unspecified';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    // Sort groups and rows within each group
    const sortedGroups = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([role, members]) => ({
        role,
        members: members.sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
      }));

    // Calculate time range
    const allDates = rows.flatMap((r) => [r.startDate.getTime(), r.endDate.getTime()]);
    const minTime = allDates.length > 0 ? Math.min(...allDates) : now.getTime();
    const maxTime = allDates.length > 0 ? Math.max(...allDates) : now.getTime() + 180 * 86400000;

    return {
      groups: sortedGroups,
      timeRange: { min: minTime, max: maxTime, span: Math.max(1, maxTime - minTime) },
    };
  }, [assignments]);

  if (groups.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No assignments with date ranges to visualize.
      </div>
    );
  }

  const totalRows = groups.reduce((sum, g) => sum + g.members.length, 0);
  const ROW_HEIGHT = 32;
  const LABEL_WIDTH = 180;
  const CHART_WIDTH = 500;
  const GROUP_HEADER_HEIGHT = 24;

  // Calculate month markers
  const startDate = new Date(timeRange.min);
  const endDate = new Date(timeRange.max);
  const months: Array<{ label: string; x: number }> = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cursor <= endDate) {
    const x = ((cursor.getTime() - timeRange.min) / timeRange.span) * CHART_WIDTH;
    months.push({ label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), x });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // Today marker
  const todayX = ((Date.now() - timeRange.min) / timeRange.span) * CHART_WIDTH;

  const svgHeight = groups.length * GROUP_HEADER_HEIGHT + totalRows * ROW_HEIGHT + 30;

  let yOffset = 20;

  return (
    <div style={{ overflowX: 'auto' }} data-testid="staffing-swim-lane-gantt">
      <svg
        width={LABEL_WIDTH + CHART_WIDTH + 20}
        height={svgHeight}
        style={{ minWidth: LABEL_WIDTH + CHART_WIDTH + 20, display: 'block' }}
      >
        {/* Month markers */}
        {months.map((m) => (
          <g key={m.label}>
            <line
              x1={LABEL_WIDTH + m.x}
              y1={10}
              x2={LABEL_WIDTH + m.x}
              y2={svgHeight}
              stroke="var(--color-border)"
              strokeDasharray="2,4"
              strokeWidth={0.5}
            />
            <text x={LABEL_WIDTH + m.x + 3} y={12} fontSize={9} fill="var(--color-text-subtle)">
              {m.label}
            </text>
          </g>
        ))}

        {/* Today line */}
        {todayX >= 0 && todayX <= CHART_WIDTH ? (
          <line
            x1={LABEL_WIDTH + todayX}
            y1={10}
            x2={LABEL_WIDTH + todayX}
            y2={svgHeight}
            stroke="var(--color-status-danger)"
            strokeWidth={1}
            strokeDasharray="4,2"
          />
        ) : null}

        {groups.map((group) => {
          const groupY = yOffset;
          yOffset += GROUP_HEADER_HEIGHT;

          const memberElements = group.members.map((row) => {
            const y = yOffset;
            yOffset += ROW_HEIGHT;
            const barX = ((row.startDate.getTime() - timeRange.min) / timeRange.span) * CHART_WIDTH;
            const barW = Math.max(6, ((row.endDate.getTime() - row.startDate.getTime()) / timeRange.span) * CHART_WIDTH);

            return (
              <g key={row.id}>
                <text
                  x={LABEL_WIDTH - 8}
                  y={y + ROW_HEIGHT / 2 + 1}
                  fontSize={11}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="var(--color-text)"
                >
                  {row.name.length > 20 ? `${row.name.slice(0, 18)}…` : row.name}
                </text>
                <rect
                  x={LABEL_WIDTH + barX}
                  y={y + 4}
                  width={barW}
                  height={ROW_HEIGHT - 8}
                  rx={4}
                  fill={roleColor(group.role)}
                  opacity={row.status === 'ENDED' || row.status === 'REVOKED' ? 0.4 : 0.85}
                >
                  <title>{`${row.name} — ${row.role} — ${row.allocation}% — ${row.startDate.toLocaleDateString()} to ${row.endDate.toLocaleDateString()}`}</title>
                </rect>
                {barW > 40 ? (
                  <text
                    x={LABEL_WIDTH + barX + 6}
                    y={y + ROW_HEIGHT / 2 + 1}
                    fontSize={9}
                    dominantBaseline="middle"
                    fill="var(--color-surface)"
                    fontWeight={600}
                  >
                    {row.allocation}%
                  </text>
                ) : null}
              </g>
            );
          });

          return (
            <g key={group.role}>
              {/* Role group header */}
              <rect
                x={0}
                y={groupY}
                width={LABEL_WIDTH + CHART_WIDTH + 20}
                height={GROUP_HEADER_HEIGHT}
                fill="var(--color-surface-alt)"
                opacity={0.6}
              />
              <circle
                cx={12}
                cy={groupY + GROUP_HEADER_HEIGHT / 2}
                r={4}
                fill={roleColor(group.role)}
              />
              <text
                x={22}
                y={groupY + GROUP_HEADER_HEIGHT / 2 + 1}
                fontSize={11}
                fontWeight={600}
                dominantBaseline="middle"
                fill="var(--color-text)"
              >
                {group.role} ({group.members.length})
              </text>
              {memberElements}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
