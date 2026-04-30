import { useState } from 'react';

import { Button } from '@/components/ds';

import { type RagCutoffs } from '@/features/project-pulse/rag-bands';
import { type ProjectShape } from '@/features/project-pulse/shape-defaults';
import type { RadiatorSnapshotDto } from '@/lib/api/project-radiator';

import { ProjectRadiator } from './ProjectRadiator';
import { QuadrantBarChart } from './QuadrantBarChart';
import { ScoreHeatmap } from './ScoreHeatmap';

type ChartView = 'radar' | 'bars' | 'heatmap';

interface RadiatorChartTabsProps {
  snapshot: RadiatorSnapshotDto;
  onAxisClick?: (subKey: string) => void;
  shape?: ProjectShape | null;
  cutoffs?: RagCutoffs;
  size?: number;
}

const TABS: Array<{ id: ChartView; label: string }> = [
  { id: 'radar', label: 'Radar' },
  { id: 'bars', label: 'Bars' },
  { id: 'heatmap', label: 'Heatmap' },
];

export function RadiatorChartTabs({
  snapshot,
  onAxisClick,
  shape = null,
  cutoffs,
  size = 500,
}: RadiatorChartTabsProps): JSX.Element {
  const [view, setView] = useState<ChartView>('radar');

  return (
    <div data-testid="radiator-chart-tabs">
      <div
        role="tablist"
        aria-label="Chart view"
        style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-2)' }}
      >
        {TABS.map((t) => {
          const active = view === t.id;
          return (
            <Button
              aria-pressed={active}
              aria-selected={active}
              variant={active ? 'primary' : 'secondary'}
              size="sm"
              key={t.id}
              onClick={() => setView(t.id)}
              role="tab"
              type="button"
            >
              {t.label}
            </Button>
          );
        })}
      </div>

      {view === 'radar' ? (
        <ProjectRadiator onAxisClick={onAxisClick} shape={shape} size={size} snapshot={snapshot} />
      ) : view === 'bars' ? (
        <QuadrantBarChart
          cutoffs={cutoffs}
          height={size - 60}
          onAxisClick={onAxisClick}
          shape={shape}
          snapshot={snapshot}
        />
      ) : (
        <ScoreHeatmap
          cutoffs={cutoffs}
          onAxisClick={onAxisClick}
          shape={shape}
          snapshot={snapshot}
        />
      )}
    </div>
  );
}
