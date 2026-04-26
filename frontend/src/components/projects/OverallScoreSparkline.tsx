import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { RadiatorHistoryEntry } from '@/lib/api/project-radiator';

interface OverallScoreSparklineProps {
  history: RadiatorHistoryEntry[];
  selectedWeek: 'current' | string;
  onSelectWeek: (week: 'current' | string) => void;
}

interface ChartPoint {
  weekStarting: string;
  label: string;
  score: number;
  band: string;
}

function bandColor(band: string): string {
  if (band === 'GREEN') return 'var(--color-status-active)';
  if (band === 'AMBER') return 'var(--color-status-warning)';
  if (band === 'RED') return 'var(--color-status-danger)';
  return 'var(--color-status-critical)';
}

export function OverallScoreSparkline({ history, selectedWeek, onSelectWeek }: OverallScoreSparklineProps): JSX.Element {
  const data = useMemo<ChartPoint[]>(
    () =>
      history.map((h) => ({
        weekStarting: h.weekStarting,
        label: h.weekStarting.slice(5),
        score: h.overallScore,
        band: h.overallBand,
      })),
    [history],
  );

  if (data.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: 'var(--space-2) 0' }}>
        No check-in history yet — weekly snapshots will appear here.
      </div>
    );
  }

  const active = selectedWeek === 'current' ? data[data.length - 1]?.weekStarting : selectedWeek;

  return (
    <div data-testid="overall-score-sparkline">
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          fontSize: 11,
          gap: 'var(--space-2)',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span style={{ color: 'var(--color-text-muted)' }}>
          Overall score · {data.length} check-in{data.length === 1 ? '' : 's'}
        </span>
        {selectedWeek !== 'current' ? (
          <button
            className="button--project-detail"
            onClick={() => onSelectWeek('current')}
            type="button"
          >
            Return to current
          </button>
        ) : null}
      </div>

      <div style={{ height: 110, width: '100%' }}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                fontSize: 11,
              }}
              formatter={(value) => [`${value}/100`, 'Overall']}
              labelFormatter={(label) => `Week of ${label}`}
            />
            <Line
              activeDot={{ r: 6, onClick: (_, payload: unknown) => {
                const point = (payload as { payload?: ChartPoint })?.payload;
                if (point) onSelectWeek(point.weekStarting);
              } }}
              dataKey="score"
              dot={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
                const { cx, cy, payload } = props;
                if (cx === undefined || cy === undefined || !payload) {
                  return <g />;
                }
                const isActive = payload.weekStarting === active;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    fill={bandColor(payload.band)}
                    r={isActive ? 5 : 3}
                    stroke={isActive ? 'var(--color-accent)' : 'var(--color-surface)'}
                    strokeWidth={isActive ? 2 : 1}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelectWeek(payload.weekStarting)}
                  />
                );
              }}
              isAnimationActive={false}
              stroke="var(--color-accent)"
              strokeWidth={2}
              type="monotone"
            />
            {active ? (
              <ReferenceDot
                fill="transparent"
                r={0}
                stroke="var(--color-accent)"
                x={data.find((d) => d.weekStarting === active)?.label}
                y={data.find((d) => d.weekStarting === active)?.score}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
