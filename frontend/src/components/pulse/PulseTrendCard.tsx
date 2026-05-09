import { SectionCard } from '@/components/common/SectionCard';
import { Sparkline } from '@/components/charts/Sparkline';
import { usePulseTeamTrend } from '@/features/pulse/usePulseTeamTrend';

interface PulseTrendCardProps {
  weeks?: number;
}

// HD-7 — Pulse trend tile. Renders on RM/PM/Director/HR dashboards (J7).
// Audience: anyone with reports. The server resolves scope from the
// caller's reporting tree, so all this card needs is a `weeks` knob.
export function PulseTrendCard({ weeks = 4 }: PulseTrendCardProps): JSX.Element {
  const { data, isLoading, error } = usePulseTeamTrend(weeks);

  if (isLoading) {
    return (
      <SectionCard title="Team pulse trend">
        <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Loading…</div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard title="Team pulse trend">
        <div style={{ color: 'var(--color-status-danger)', fontSize: 12 }}>{error}</div>
      </SectionCard>
    );
  }

  if (!data || data.scopePersonCount === 0) {
    return (
      <SectionCard title="Team pulse trend">
        <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          No reports in your scope.
        </div>
      </SectionCard>
    );
  }

  const moodSeries = data.weeks
    .map((w) => w.avgMood)
    .filter((v): v is number => v !== null);

  const totalResponses = data.weeks.reduce((s, w) => s + w.responseCount, 0);
  const totalStruggling = data.weeks.reduce((s, w) => s + w.strugglingCount, 0);
  const latestWeek = data.weeks[data.weeks.length - 1];
  const latestAvg = latestWeek?.avgMood;

  // Threshold colour: ≥4 green, ≥3 amber, <3 red. Tuned to align with
  // the existing dashboard tone language. Null = neutral.
  const tone = (() => {
    if (latestAvg === null || latestAvg === undefined) return 'var(--color-status-neutral)';
    if (latestAvg >= 4) return 'var(--color-status-active)';
    if (latestAvg >= 3) return 'var(--color-status-warning)';
    return 'var(--color-status-danger)';
  })();

  return (
    <SectionCard title="Team pulse trend">
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: 16,
          padding: '8px 0',
        }}
      >
        <div
          style={{
            borderLeft: `3px solid ${tone}`,
            paddingLeft: 12,
            minWidth: 110,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
              lineHeight: 1.1,
            }}
          >
            {latestAvg !== null && latestAvg !== undefined ? latestAvg.toFixed(1) : '—'}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            avg mood / 5 (this week)
          </div>
        </div>

        {moodSeries.length >= 2 && (
          <div>
            <Sparkline
              color="var(--color-chart-1)"
              data={moodSeries}
              height={36}
              width={120}
            />
          </div>
        )}

        <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <div>
            <strong style={{ color: 'var(--color-text)' }}>{data.scopePersonCount}</strong>{' '}
            people in scope · last {weeks} week{weeks === 1 ? '' : 's'}
          </div>
          <div>
            {totalResponses} response{totalResponses === 1 ? '' : 's'},{' '}
            {totalStruggling > 0 ? (
              <span style={{ color: 'var(--color-status-danger)', fontWeight: 500 }}>
                {totalStruggling} struggling
              </span>
            ) : (
              '0 struggling'
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
