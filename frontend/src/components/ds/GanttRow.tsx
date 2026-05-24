import { CSSProperties, ReactNode } from 'react';

export type GanttRowTone = 'accent' | 'active' | 'warning' | 'danger' | 'info' | 'muted';

export interface GanttRowProps {
  /** Row label (left column). */
  label: ReactNode;
  /** Segment start on the 0..`total` scale. */
  start: number;
  /** Segment end on the 0..`total` scale. */
  end: number;
  /** Scale endpoint. Default 100. */
  total?: number;
  /** Tone of the segment bar. */
  tone?: GanttRowTone;
  /** Optional marker pin position on the same 0..`total` scale (e.g. "today"). */
  marker?: number;
  /** Dimmed rendering for past / archived rows. */
  dim?: boolean;
  /** Width of the label column. Default 160px. */
  labelWidth?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}

const TONE_COLOR: Record<GanttRowTone, string> = {
  accent: 'var(--color-accent)',
  active: 'var(--color-status-active)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-danger)',
  info: 'var(--color-status-info)',
  muted: 'var(--color-text-subtle)',
};

/**
 * Single Gantt-style row with a labelled timeline bar and optional marker pin.
 * Composes into a swimlane Gantt by stacking rows; each row is a single bar
 * positioned on a shared 0..`total` axis.
 *
 * Reference: DS/chrome.jsx:261-276.
 */
export function GanttRow({
  label,
  start,
  end,
  total = 100,
  tone = 'accent',
  marker,
  dim = false,
  labelWidth = 160,
  className,
  style,
  ariaLabel,
}: GanttRowProps): JSX.Element {
  const safeTotal = total > 0 ? total : 1;
  const clampedStart = Math.max(0, Math.min(safeTotal, start));
  const clampedEnd = Math.max(clampedStart, Math.min(safeTotal, end));
  const leftPct = (clampedStart / safeTotal) * 100;
  const widthPct = ((clampedEnd - clampedStart) / safeTotal) * 100;
  const color = TONE_COLOR[tone];
  const a11y =
    ariaLabel ??
    `${typeof label === 'string' ? label : 'segment'} from ${start} to ${end} of ${total}`;

  return (
    <div
      className={['ds-gantt-row', className].filter(Boolean).join(' ')}
      role="img"
      aria-label={a11y}
      style={{
        display: 'grid',
        gridTemplateColumns: `${labelWidth}px 1fr`,
        gap: 12,
        alignItems: 'center',
        padding: '6px 0',
        ...style,
      }}
    >
      <span
        className="ds-gantt-row__label"
        style={{
          fontSize: 13,
          color: dim ? 'var(--color-text-muted)' : 'var(--color-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div
        className="ds-gantt-row__track"
        style={{
          position: 'relative',
          height: 18,
          background: 'var(--color-surface-alt)',
          borderRadius: 4,
        }}
      >
        <div
          className="ds-gantt-row__bar"
          style={{
            position: 'absolute',
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            top: 3,
            bottom: 3,
            background: color,
            borderRadius: 3,
            opacity: dim ? 0.5 : 1,
          }}
        />
        {marker != null && (
          <div
            className="ds-gantt-row__marker"
            style={{
              position: 'absolute',
              left: `${(Math.max(0, Math.min(safeTotal, marker)) / safeTotal) * 100}%`,
              top: -2,
              bottom: -2,
              width: 2,
              background: 'var(--color-status-warning)',
              borderRadius: 1,
            }}
            aria-label={`Marker at ${marker}`}
          />
        )}
      </div>
    </div>
  );
}
