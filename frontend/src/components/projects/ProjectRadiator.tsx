import { useMemo, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

import { usePulseHover } from '@/features/project-pulse/hover-context';
import { activeAxesFor, type ProjectShape } from '@/features/project-pulse/shape-defaults';
import type { RadiatorSnapshotDto } from '@/lib/api/project-radiator';

interface ProjectRadiatorProps {
  snapshot: RadiatorSnapshotDto;
  onAxisClick?: (subDimensionKey: string) => void;
  size?: number;
  shape?: ProjectShape | null;
}

export const AXIS_LABELS: Record<string, string> = {
  requirementsStability: 'Req Stability',
  scopeCreep: 'Scope Creep',
  deliverableAcceptance: 'Deliverable Acc.',
  changeRequestBurden: 'CR Burden',
  milestoneAdherence: 'Milestone',
  timelineDeviation: 'Timeline Dev.',
  criticalPathHealth: 'Critical Path',
  velocityTrend: 'Velocity',
  costPerformanceIndex: 'CPI',
  spendRate: 'Spend Rate',
  forecastAccuracy: 'Forecast Acc.',
  capexCompliance: 'CAPEX Compl.',
  staffingFillRate: 'Staffing Fill',
  teamMood: 'Team Mood',
  overAllocationRate: 'Over-Alloc',
  keyPersonRisk: 'Key-Person Risk',
};

export const AXIS_ORDER: string[] = [
  'requirementsStability', 'scopeCreep', 'deliverableAcceptance', 'changeRequestBurden',
  'milestoneAdherence', 'timelineDeviation', 'criticalPathHealth', 'velocityTrend',
  'costPerformanceIndex', 'spendRate', 'forecastAccuracy', 'capexCompliance',
  'staffingFillRate', 'teamMood', 'overAllocationRate', 'keyPersonRisk',
];

interface ChartDatum {
  key: string;
  label: string;
  score: number;
  hasData: boolean;
  hasOverride: boolean;
}

function radarColorForOverall(overall: number): string {
  if (overall >= 76) return 'var(--color-status-active)';
  if (overall >= 51) return 'var(--color-status-warning)';
  if (overall >= 26) return 'var(--color-status-danger)';
  return 'var(--color-status-critical)';
}

interface RechartsTickProps {
  payload?: { value?: string | number; index?: number };
  x?: number | string;
  y?: number | string;
  textAnchor?: string;
}

type SvgTextAnchor = 'inherit' | 'end' | 'start' | 'middle' | undefined;

function normalizeAnchor(anchor: string | undefined): SvgTextAnchor {
  if (anchor === 'end' || anchor === 'start' || anchor === 'middle' || anchor === 'inherit') {
    return anchor;
  }
  return undefined;
}

function renderAxisTick(
  axisOrder: string[],
  onAxisClick: ((key: string) => void) | undefined,
  onAxisHover: ((key: string | null) => void) | undefined,
  hoveredKey: string | null,
  isAxisActive: (axisKey: string) => boolean,
) {
  return function CustomTick(props: RechartsTickProps): JSX.Element {
    const { payload, x, y, textAnchor } = props;
    const idx = payload?.index ?? 0;
    const subKey = axisOrder[idx] ?? '';
    const labelText = AXIS_LABELS[subKey] ?? subKey;
    const isHovered = hoveredKey === subKey;
    const isActive = isAxisActive(subKey);
    return (
      <text
        aria-label={`${labelText} dimension`}
        onClick={() => onAxisClick?.(subKey)}
        onMouseEnter={() => onAxisHover?.(subKey)}
        onMouseLeave={() => onAxisHover?.(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onAxisClick?.(subKey);
          }
        }}
        role="button"
        style={{
          cursor: onAxisClick ? 'pointer' : 'default',
          fontSize: 11,
          fill: isHovered ? 'var(--color-accent)' : 'var(--color-text)',
          fontWeight: isHovered ? 700 : 400,
          textDecoration: isHovered ? 'underline' : 'none',
          opacity: isActive ? 1 : 0.35,
          transition: 'fill 120ms ease, font-weight 120ms ease, opacity 120ms ease',
        }}
        tabIndex={0}
        textAnchor={normalizeAnchor(textAnchor)}
        x={x}
        y={y}
      >
        {labelText}
      </text>
    );
  };
}

export function ProjectRadiator({ snapshot, onAxisClick, size = 500, shape = null }: ProjectRadiatorProps): JSX.Element {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const pulseHover = usePulseHover();
  const handleHoverChange = (key: string | null): void => {
    setHoveredKey(key);
    pulseHover.setHoverTarget(key ? { kind: 'axis', axisKey: key } : null);
  };

  // Shape-aware axis order — SMALL renders 4 axes, STANDARD 8, others full 16.
  const axisOrder = useMemo<string[]>(() => {
    if (!shape) return AXIS_ORDER;
    const active = activeAxesFor(shape);
    // Preserve canonical order so PolarAngleAxis layout stays predictable.
    return AXIS_ORDER.filter((k) => active.includes(k));
  }, [shape]);

  const chartData = useMemo<ChartDatum[]>(() => {
    const allSubs = snapshot.quadrants.flatMap((q) => q.subs);
    const byKey = new Map(allSubs.map((s) => [s.key, s]));
    return axisOrder.map((k) => {
      const s = byKey.get(k);
      const score = s?.effectiveScore;
      return {
        key: k,
        label: AXIS_LABELS[k] ?? k,
        // Plot null scores as 0 so the polygon still closes; drill-down reveals "no data".
        score: score ?? 0,
        hasData: score !== null && score !== undefined,
        hasOverride: s?.overrideScore !== null && s?.overrideScore !== undefined,
      };
    });
  }, [snapshot, axisOrder]);

  const radarColor = radarColorForOverall(snapshot.overallScore);
  const ariaLabel =
    `Project radiator: ${axisOrder.length}-axis radar chart. Overall score ${snapshot.overallScore}/100, band ${snapshot.overallBand}`;

  return (
    <div
      aria-label={ariaLabel}
      data-testid="project-radiator"
      role="img"
      style={{ position: 'relative', width: '100%', height: size }}
    >
      {/* Colour-banded background rings */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Chart area is roughly inscribed in a circle centered at 50,50 with radius ~40 (leaving room for labels) */}
        <circle cx={50} cy={50} r={40} fill="var(--color-status-active)" opacity={0.08} />
        <circle cx={50} cy={50} r={30} fill="var(--color-status-warning)" opacity={0.08} />
        <circle cx={50} cy={50} r={20} fill="var(--color-status-warning)" opacity={0.08} />
        <circle cx={50} cy={50} r={10} fill="var(--color-status-danger)" opacity={0.1} />
        <circle cx={50} cy={50} r={4} fill="var(--color-status-critical)" opacity={0.15} />
      </svg>

      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="label"
            tick={renderAxisTick(axisOrder, onAxisClick, handleHoverChange, hoveredKey, pulseHover.isAxisActive) as unknown as never}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 4]}
            tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
            tickCount={5}
          />
          <Radar
            dataKey="score"
            dot={{ r: 3 }}
            fill={radarColor}
            fillOpacity={0.35}
            isAnimationActive={false}
            name="Score"
            stroke={radarColor}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
