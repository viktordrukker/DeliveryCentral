import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { fetchMoodHeatmap, MoodHeatmapResponse } from '@/lib/api/pulse';

const MOOD_EMOJI: Record<number, string> = {
  1: '😣',
  2: '😟',
  3: '😐',
  4: '😊',
  5: '😄',
};

const MOOD_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
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

  return (
    <div className="table-wrapper" data-testid="direct-reports-mood-table">
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Current Mood</th>
            <th>Last 4 Weeks</th>
            <th>Alert</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link to={`/people/${row.id}?tab=360`}>{row.displayName}</Link>
              </td>
              <td>
                {row.currentMood !== null
                  ? `${MOOD_EMOJI[row.currentMood] ?? ''} ${row.currentMood}/5`
                  : '—'}
              </td>
              <td>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  {row.recentMoods.map((mood, i) => (
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
              </td>
              <td>
                {row.alertActive ? (
                  <span style={{ color: 'var(--color-status-danger)', fontWeight: 600 }}>
                    &#9888; Low mood
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-status-active)' }}>OK</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
