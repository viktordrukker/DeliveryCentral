import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Table, type Column } from '@/components/ds';
import { fetchMoodHeatmap, MoodHeatmapResponse } from '@/lib/api/pulse';

const MOOD_EMOJI: Record<number, string> = {
  1: '😣',
  2: '😟',
  3: '😐',
  4: '😊',
  5: '😄',
};

const MOOD_COLORS: Record<number, string> = {
  1: 'var(--color-status-danger)',
  2: 'var(--color-chart-8)',
  3: 'var(--color-chart-3)',
  4: 'var(--color-chart-2)',
  5: 'var(--color-status-active)',
};

interface DirectReportsMoodTableProps {
  managerId?: string;
}

interface Row {
  id: string;
  displayName: string;
  currentMood: number | null;
  currentAllocation: number;
  alertActive: boolean;
  recentMoods: Array<number | null>;
}

export function DirectReportsMoodTable({ managerId }: DirectReportsMoodTableProps): JSX.Element {
  const [data, setData] = useState<MoodHeatmapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchMoodHeatmap({ managerId })
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [managerId]);

  if (isLoading) return <LoadingState label="Loading direct reports..." />;
  if (!data || data.people.length === 0) {
    return (
      <EmptyState
        action={{ href: '/notifications/new?type=pulse-reminder', label: 'Remind team to submit' }}
        description="Team mood data appears once your direct reports submit their weekly pulse check."
        title="No mood data yet"
      />
    );
  }

  const lastWeek = data.weeks[data.weeks.length - 1];

  const rows: Row[] = data.people.map((person) => {
    const lastMoodEntry = person.weeklyMoods.find((wm) => wm.weekStart === lastWeek);
    const currentMood = lastMoodEntry?.mood ?? null;

    // Alert: mood <= 2 for 2+ consecutive recent weeks
    let alertActive = false;
    let consecutiveLow = 0;
    for (let i = person.weeklyMoods.length - 1; i >= 0; i--) {
      const m = person.weeklyMoods[i].mood;
      if (m !== null && m <= 2) {
        consecutiveLow++;
        if (consecutiveLow >= 2) {
          alertActive = true;
          break;
        }
      } else {
        break;
      }
    }

    const recentMoods = person.weeklyMoods.slice(-4).map((wm) => wm.mood);

    return {
      id: person.id,
      displayName: person.displayName,
      currentMood,
      currentAllocation: 0, // allocation not in heatmap data
      alertActive,
      recentMoods,
    };
  });

  const columns: Column<Row>[] = [
    { key: 'name', title: 'Name', getValue: (r) => r.displayName, render: (r) => <Link to={`/people/${r.id}?tab=360`}>{r.displayName}</Link> },
    { key: 'currentMood', title: 'Current Mood', getValue: (r) => r.currentMood ?? -1, render: (r) => (
      r.currentMood !== null ? `${MOOD_EMOJI[r.currentMood] ?? ''} ${r.currentMood}/5` : '—'
    ) },
    { key: 'recentMoods', title: 'Last 4 Weeks', render: (r) => (
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
        {r.recentMoods.map((mood, i) => (
          <div
            key={i}
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '3px',
              background: mood !== null ? MOOD_COLORS[mood] : 'var(--color-border)',
            }}
            title={mood !== null ? `Mood: ${mood}/5` : 'No data'}
          />
        ))}
      </div>
    ) },
    { key: 'alert', title: 'Alert', getValue: (r) => r.alertActive ? 1 : 0, render: (r) => (
      r.alertActive ? (
        <span style={{ color: 'var(--color-status-danger)', fontWeight: 600 }}>⚠ Low mood</span>
      ) : (
        <span style={{ color: 'var(--color-status-active)' }}>OK</span>
      )
    ) },
  ];

  return (
    <div data-testid="direct-reports-mood-table">
      <Table
        variant="compact"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.id}
      />
    </div>
  );
}
