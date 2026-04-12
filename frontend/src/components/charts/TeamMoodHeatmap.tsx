import { useNavigate } from 'react-router-dom';

import { MoodHeatmapResponse } from '@/lib/api/pulse';

const MOOD_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#84cc16',
  5: '#22c55e',
};
const EMPTY_COLOR = '#e5e7eb';

function getMoodColor(mood: number | null): string {
  if (mood === null) return EMPTY_COLOR;
  return MOOD_COLORS[mood] ?? EMPTY_COLOR;
}

interface TeamMoodHeatmapProps {
  data: MoodHeatmapResponse;
}

export function TeamMoodHeatmap({ data }: TeamMoodHeatmapProps): JSX.Element {
  const navigate = useNavigate();

  if (data.people.length === 0) {
    return (
      <div className="heatmap-empty" data-testid="mood-heatmap-empty">
        No data available for the selected filters.
      </div>
    );
  }

  const { people, weeks, teamAverages } = data;

  return (
    <div className="mood-heatmap" data-testid="mood-heatmap">
      <div
        className="mood-heatmap__grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)`,
          gap: '2px',
        }}
      >
        {/* Header row */}
        <div className="mood-heatmap__header-cell" />
        {weeks.map((w) => (
          <div
            className="mood-heatmap__header-cell"
            key={w}
            style={{
              color: 'var(--color-text)',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 2px',
              textAlign: 'center',
              writingMode: 'horizontal-tb',
            }}
          >
            {w.slice(5)}
          </div>
        ))}

        {/* Person rows */}
        {people.map((person) => (
          <>
            <div
              className="mood-heatmap__person-name"
              key={`name-${person.id}`}
              style={{
                alignItems: 'center',
                color: 'var(--color-text)',
                display: 'flex',
                fontSize: '13px',
                overflow: 'hidden',
                padding: '2px 4px',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {person.displayName}
            </div>
            {person.weeklyMoods.map((wm) => (
              <div
                aria-label={`${person.displayName}: ${wm.mood !== null ? `mood ${wm.mood}` : 'no data'} on ${wm.weekStart}`}
                className="mood-heatmap__cell"
                data-testid={`cell-${person.id}-${wm.weekStart}`}
                key={`${person.id}-${wm.weekStart}`}
                onClick={() => { navigate(`/people/${person.id}?tab=360`); }}
                role="button"
                style={{
                  alignItems: 'center',
                  background: getMoodColor(wm.mood),
                  borderRadius: '3px',
                  color: wm.mood !== null ? '#fff' : '#aaa',
                  cursor: 'pointer',
                  display: 'flex',
                  fontSize: '12px',
                  fontWeight: 600,
                  height: '32px',
                  justifyContent: 'center',
                }}
                tabIndex={0}
                title={`${person.displayName} — Week ${wm.weekStart}: ${wm.mood ?? 'no data'}`}
              >
                {wm.mood !== null ? wm.mood : '—'}
              </div>
            ))}
          </>
        ))}

        {/* Team averages row */}
        <div
          className="mood-heatmap__avg-label"
          style={{ fontWeight: 700, fontSize: '13px', padding: '4px', color: 'var(--color-text)' }}
        >
          Team Avg
        </div>
        {teamAverages.map((ta) => (
          <div
            className="mood-heatmap__avg-cell"
            data-testid={`avg-${ta.weekStart}`}
            key={ta.weekStart}
            style={{
              alignItems: 'center',
              background: getMoodColor(ta.average !== null ? Math.round(ta.average) : null),
              borderRadius: '3px',
              color: ta.average !== null ? '#fff' : '#aaa',
              display: 'flex',
              fontSize: '12px',
              fontWeight: 700,
              height: '32px',
              justifyContent: 'center',
            }}
          >
            {ta.average !== null ? ta.average.toFixed(1) : '—'}
          </div>
        ))}
      </div>
    </div>
  );
}
