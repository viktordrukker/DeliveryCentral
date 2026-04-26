import type { PulseSignalKpi } from '@/lib/api/project-pulse';

interface PulseSignalStripProps {
  signals: PulseSignalKpi[];
  projectId: string;
}

const SIGNAL_TO_TAB: Record<string, string | null> = {
  velocity: null,
  cpi: 'budget',
  avgMood: null,
  openRisks: 'risks',
  openCases: null,
  teamSize: 'team',
};

function formatValue(kpi: PulseSignalKpi): string {
  if (kpi.value === null) return '—';
  if (kpi.unit === 'h') return `${Math.round(kpi.value)}h`;
  if (kpi.unit === '/5') return `${kpi.value.toFixed(1)}/5`;
  if (kpi.key === 'cpi') return kpi.value.toFixed(2);
  return Math.round(kpi.value).toString();
}

function cpiTone(val: number | null): string {
  if (val === null) return 'var(--color-status-neutral)';
  if (val >= 0.95) return 'var(--color-status-active)';
  if (val >= 0.85) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

function moodTone(val: number | null): string {
  if (val === null) return 'var(--color-status-neutral)';
  if (val >= 4) return 'var(--color-status-active)';
  if (val >= 3) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

function countTone(val: number | null, warn: number, danger: number): string {
  if (val === null) return 'var(--color-status-neutral)';
  if (val >= danger) return 'var(--color-status-danger)';
  if (val >= warn) return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

function stripTone(kpi: PulseSignalKpi): string {
  if (kpi.key === 'cpi') return cpiTone(kpi.value);
  if (kpi.key === 'avgMood') return moodTone(kpi.value);
  if (kpi.key === 'openRisks') return countTone(kpi.value, 3, 6);
  if (kpi.key === 'openCases') return countTone(kpi.value, 2, 5);
  return 'var(--color-accent)';
}

export function PulseSignalStrip({ signals, projectId }: PulseSignalStripProps): JSX.Element {
  return (
    <div
      aria-label="Project pulse signals"
      className="kpi-strip"
      data-testid="pulse-signal-strip"
      role="group"
    >
      {signals.map((kpi) => {
        const tab = SIGNAL_TO_TAB[kpi.key] ?? null;
        const href = tab ? `/projects/${projectId}?tab=${tab}` : null;
        const borderColor = stripTone(kpi);
        const contents = (
          <>
            <span className="kpi-strip__value" style={{ fontSize: 20 }}>
              {formatValue(kpi)}
            </span>
            <span className="kpi-strip__label">{kpi.label}</span>
          </>
        );
        const style = { borderLeft: `3px solid ${borderColor}` };
        return href ? (
          <a
            className="kpi-strip__item"
            href={href}
            key={kpi.key}
            style={style}
            title={kpi.explanation}
          >
            {contents}
          </a>
        ) : (
          <div
            className="kpi-strip__item"
            key={kpi.key}
            style={style}
            title={kpi.explanation}
          >
            {contents}
          </div>
        );
      })}
    </div>
  );
}
