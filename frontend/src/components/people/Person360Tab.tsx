import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { HoursLoggedChart } from '@/components/charts/HoursLoggedChart';
import { MoodTrendChart } from '@/components/charts/MoodTrendChart';
import { WorkloadTrendChart } from '@/components/charts/WorkloadTrendChart';
import { fetchPerson360, PersonThreeSixtyDto } from '@/lib/api/pulse';

const MOOD_LABELS: Record<number, string> = {
  1: '😣 Struggling',
  2: '😟 Stressed',
  3: '😐 Neutral',
  4: '😊 Good',
  5: '😄 Great',
};

interface Person360TabProps {
  personId: string;
}

export function Person360Tab({ personId }: Person360TabProps): JSX.Element {
  const [data, setData] = useState<PersonThreeSixtyDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    fetchPerson360(personId, 12)
      .then((d) => setData(d))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load 360 data.');
      })
      .finally(() => setIsLoading(false));
  }, [personId]);

  if (isLoading) return <LoadingState label="Loading 360 view..." />;
  if (error) return <ErrorState description={error} />;
  if (!data) return <ErrorState description="No data available." />;

  return (
    <div data-testid="person-360-tab">
      {data.alertActive && (
        <div
          className="alert-badge alert-badge--danger"
          data-testid="low-mood-alert"
          role="alert"
          style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#dc2626',
            fontWeight: 600,
            marginBottom: '16px',
            padding: '10px 16px',
          }}
        >
          &#9888; Low mood alert (2+ weeks)
        </div>
      )}

      <div className="details-summary-grid">
        <div className="section-card">
          <div className="metric-card">
            <div className="metric-card__value metric-card__value--compact">
              {data.currentMood !== null
                ? MOOD_LABELS[data.currentMood] ?? String(data.currentMood)
                : 'No data'}
            </div>
            <div className="metric-card__label">Current Mood</div>
          </div>
        </div>
        <div className="section-card">
          <div className="metric-card">
            <div className="metric-card__value metric-card__value--compact">
              {data.currentAllocation}%
            </div>
            <div className="metric-card__label">Current Allocation</div>
          </div>
        </div>
      </div>

      <SectionCard title="Mood Trend (12 Weeks)">
        <MoodTrendChart data={data.moodTrend} />
      </SectionCard>

      <SectionCard title="Workload Trend (12 Weeks)">
        <WorkloadTrendChart data={data.workloadTrend} />
      </SectionCard>

      <SectionCard title="Hours Logged (12 Weeks)">
        <HoursLoggedChart data={data.hoursTrend} />
      </SectionCard>
    </div>
  );
}
