import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { RagSnapshotDto, RagRating } from '@/lib/api/project-rag';

type Dimension = 'scope' | 'schedule' | 'budget' | 'business';

interface HealthTrendChartProps {
  snapshots: RagSnapshotDto[];
  dimensions?: Dimension[];
}

const RAG_NUMERIC: Record<RagRating, number> = { GREEN: 3, AMBER: 2, RED: 1 };

const DIMENSION_CONFIG: Record<Dimension, { label: string; color: string }> = {
  scope: { label: 'Scope', color: 'var(--color-chart-1)' },
  schedule: { label: 'Schedule', color: 'var(--color-chart-2)' },
  budget: { label: 'Budget', color: 'var(--color-chart-3)' },
  business: { label: 'Business', color: 'var(--color-chart-4)' },
};

const Y_TICKS = [1, 2, 3];
const Y_LABELS: Record<number, string> = { 1: 'Red', 2: 'Amber', 3: 'Green' };

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function resolveRag(snapshot: RagSnapshotDto, dim: Dimension): number {
  let rag: RagRating | null = null;
  if (dim === 'scope') rag = snapshot.scopeRag ?? snapshot.staffingRag;
  else if (dim === 'schedule') rag = snapshot.scheduleRag;
  else if (dim === 'budget') rag = snapshot.budgetRag;
  else if (dim === 'business') rag = snapshot.businessRag ?? snapshot.clientRag;
  return rag ? RAG_NUMERIC[rag] : 0;
}

interface ChartRow {
  week: string;
  scope: number;
  schedule: number;
  budget: number;
  business: number;
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }): JSX.Element | null {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      padding: 'var(--space-2)',
      fontSize: 12,
      boxShadow: 'var(--shadow-dropdown)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)', color: 'var(--color-text)' }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--color-text-muted)' }}>
            {DIMENSION_CONFIG[entry.dataKey as Dimension]?.label}: {Y_LABELS[entry.value] ?? '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HealthTrendChart({ snapshots, dimensions }: HealthTrendChartProps): JSX.Element {
  const allDims: Dimension[] = dimensions ?? ['scope', 'schedule', 'budget', 'business'];
  const [visible, setVisible] = useState<Set<Dimension>>(() => new Set(allDims));

  if (snapshots.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No health snapshots recorded yet.
      </div>
    );
  }

  const data: ChartRow[] = snapshots.map((s) => ({
    week: formatWeek(s.weekStarting),
    scope: resolveRag(s, 'scope'),
    schedule: resolveRag(s, 'schedule'),
    budget: resolveRag(s, 'budget'),
    business: resolveRag(s, 'business'),
  }));

  const toggleDim = (dim: Dimension) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) next.delete(dim);
      else next.add(dim);
      return next;
    });
  };

  return (
    <div data-testid="health-trend-chart">
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        {allDims.map((dim) => (
          <label key={dim} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 12, cursor: 'pointer', color: 'var(--color-text)' }}>
            <input
              type="checkbox"
              checked={visible.has(dim)}
              onChange={() => toggleDim(dim)}
              style={{ accentColor: DIMENSION_CONFIG[dim].color }}
            />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: DIMENSION_CONFIG[dim].color, flexShrink: 0 }} />
            {DIMENSION_CONFIG[dim].label}
          </label>
        ))}
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
            <YAxis
              domain={[0.5, 3.5]}
              ticks={Y_TICKS}
              tickFormatter={(v: number) => Y_LABELS[v] ?? ''}
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {allDims.map((dim) =>
              visible.has(dim) ? (
                <Area
                  key={dim}
                  type="monotone"
                  dataKey={dim}
                  stroke={DIMENSION_CONFIG[dim].color}
                  fill={DIMENSION_CONFIG[dim].color}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ) : null,
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
