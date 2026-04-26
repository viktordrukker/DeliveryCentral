import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { TeamMoodHeatmap } from '@/components/charts/TeamMoodHeatmap';
import { DirectReportsMoodTable } from '@/components/people/DirectReportsMoodTable';
import type { MoodHeatmapResponse } from '@/lib/api/pulse';

interface Props {
  heatmapLoading: boolean;
  heatmapData: MoodHeatmapResponse | null;
  heatmapManagerId: string;
  heatmapPoolId: string;
  managerOptions: Array<{ id: string; displayName: string }>;
  poolOptions: Array<{ id: string; name: string }>;
  onHeatmapManagerChange: (value: string) => void;
  onHeatmapPoolChange: (value: string) => void;
  directReportsManagerId: string | undefined;
}

export function HrWellbeingTab({
  heatmapLoading,
  heatmapData,
  heatmapManagerId,
  heatmapPoolId,
  managerOptions,
  poolOptions,
  onHeatmapManagerChange,
  onHeatmapPoolChange,
  directReportsManagerId,
}: Props): JSX.Element {
  return (
    <>
      <SectionCard title="Team Mood Heatmap" collapsible>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <label className="field">
            <span className="field__label">Manager</span>
            <select
              className="field__control"
              data-testid="heatmap-manager-filter"
              onChange={(e) => onHeatmapManagerChange(e.target.value)}
              value={heatmapManagerId}
            >
              <option value="">All managers</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Resource Pool</span>
            <select
              className="field__control"
              data-testid="heatmap-pool-filter"
              onChange={(e) => onHeatmapPoolChange(e.target.value)}
              value={heatmapPoolId}
            >
              <option value="">All pools</option>
              {poolOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>
        {heatmapLoading ? (
          <LoadingState label="Loading mood heatmap..." variant="skeleton" skeletonType="chart" />
        ) : heatmapData ? (
          <TeamMoodHeatmap data={heatmapData} />
        ) : (
          <EmptyState
            action={{ href: '/notifications/new?type=pulse-reminder', label: 'Remind team to submit' }}
            description="Team mood data appears once your direct reports submit their weekly pulse check."
            title="No mood data yet"
          />
        )}
      </SectionCard>

      <SectionCard title="Direct Reports Mood Summary" collapsible>
        <DirectReportsMoodTable managerId={directReportsManagerId} />
      </SectionCard>
    </>
  );
}
