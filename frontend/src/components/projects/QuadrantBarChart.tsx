import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { usePulseHover } from '@/features/project-pulse/hover-context';
import {
  DEFAULT_RAG_CUTOFFS,
  bandColor,
  bandForScore,
  bandLabel,
  formatScore,
  type RagCutoffs,
} from '@/features/project-pulse/rag-bands';
import { activeAxesFor, type ProjectShape } from '@/features/project-pulse/shape-defaults';
import type { RadiatorSnapshotDto, SubDimensionScore } from '@/lib/api/project-radiator';

import { AXIS_LABELS, AXIS_ORDER } from './ProjectRadiator';

interface QuadrantBarChartProps {
  snapshot: RadiatorSnapshotDto;
  onAxisClick?: (subKey: string) => void;
  shape?: ProjectShape | null;
  cutoffs?: RagCutoffs;
  height?: number;
}

interface BarDatum {
  key: string;
  label: string;
  quadrant: 'scope' | 'schedule' | 'budget' | 'people';
  score: number;
  hasData: boolean;
  fill: string;
  bandName: string;
  explanation: string;
}

export function QuadrantBarChart({
  snapshot,
  onAxisClick,
  shape = null,
  cutoffs = DEFAULT_RAG_CUTOFFS,
  height = 420,
}: QuadrantBarChartProps): JSX.Element {
  const pulseHover = usePulseHover();

  const data = useMemo<BarDatum[]>(() => {
    const active = shape ? new Set(activeAxesFor(shape)) : null;
    const byKey = new Map<string, SubDimensionScore>();
    const quadrantByKey = new Map<string, BarDatum['quadrant']>();
    for (const q of snapshot.quadrants) {
      for (const s of q.subs) {
        byKey.set(s.key, s);
        quadrantByKey.set(s.key, q.key);
      }
    }
    return AXIS_ORDER.filter((k) => (active ? active.has(k) : true)).map((k) => {
      const s = byKey.get(k);
      const score = s?.effectiveScore ?? null;
      const band = bandForScore(score, cutoffs);
      return {
        key: k,
        label: AXIS_LABELS[k] ?? k,
        quadrant: quadrantByKey.get(k) ?? 'scope',
        score: score ?? 0,
        hasData: score !== null,
        fill: bandColor(band),
        bandName: bandLabel(band),
        explanation: s?.explanation ?? '',
      };
    });
  }, [snapshot, shape, cutoffs]);

  return (
    <div data-testid="quadrant-bar-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 24, left: 10, bottom: 10 }}
        >
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 3" horizontal={false} />
          <XAxis
            domain={[0, 4]}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }}
            ticks={[0, 1, 2, 3, 4]}
            type="number"
          />
          <YAxis
            dataKey="label"
            interval={0}
            tick={((rawProps: unknown) => {
              const props = rawProps as {
                x?: number | string;
                y?: number | string;
                payload?: { value?: string; index?: number };
              };
              const idx = props.payload?.index ?? 0;
              const datum = data[idx];
              if (!datum || props.x === undefined || props.y === undefined) return <g />;
              const isHovered =
                pulseHover.hoverTarget?.kind === 'axis' && pulseHover.hoverTarget.axisKey === datum.key;
              return (
                <text
                  fill={isHovered ? 'var(--color-accent)' : 'var(--color-text)'}
                  fontSize={11}
                  fontWeight={isHovered ? 700 : 400}
                  onClick={() => onAxisClick?.(datum.key)}
                  onMouseEnter={() =>
                    pulseHover.setHoverTarget({ kind: 'axis', axisKey: datum.key })
                  }
                  onMouseLeave={() => pulseHover.setHoverTarget(null)}
                  style={{ cursor: onAxisClick ? 'pointer' : 'default' }}
                  textAnchor="end"
                  x={Number(props.x) - 4}
                  y={Number(props.y) + 4}
                >
                  {props.payload?.value}
                </text>
              );
            }) as unknown as never}
            type="category"
            width={130}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value, _name, props) => {
              const d = props.payload as BarDatum | undefined;
              if (!d) return [formatScore(value as number), 'Score'];
              return [`${formatScore(d.score)} · ${d.bandName}`, 'Score'];
            }}
            labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
          />
          <Bar
            dataKey="score"
            isAnimationActive={false}
            onClick={(payload: unknown) => {
              const d = payload as BarDatum | undefined;
              if (d?.key) onAxisClick?.(d.key);
            }}
            radius={[0, 4, 4, 0]}
          >
            {data.map((d) => (
              <Cell
                cursor={onAxisClick ? 'pointer' : 'default'}
                fill={d.fill}
                key={d.key}
                onMouseEnter={() => pulseHover.setHoverTarget({ kind: 'axis', axisKey: d.key })}
                onMouseLeave={() => pulseHover.setHoverTarget(null)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
