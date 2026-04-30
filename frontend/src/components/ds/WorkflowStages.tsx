import { CSSProperties, ReactNode } from 'react';

export type WorkflowStageStatus =
  | 'upcoming'
  | 'current'
  | 'done'
  | 'blocked'
  | 'skipped';

export interface WorkflowStage {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  status: WorkflowStageStatus;
  /** Optional: ISO timestamp when this stage transitioned. Renders below the label. */
  timestamp?: string;
  /** Optional: human-readable actor (display name) responsible for this transition. */
  actor?: string;
}

export interface WorkflowStagesProps {
  stages: readonly WorkflowStage[];
  orientation?: 'horizontal' | 'vertical';
  /** Compact rendering — smaller text, denser spacing. */
  compact?: boolean;
  ariaLabel?: string;
}

const STATUS_TONE: Record<WorkflowStageStatus, { bg: string; ring: string; text: string }> = {
  upcoming: {
    bg: 'var(--color-surface-alt)',
    ring: 'var(--color-border)',
    text: 'var(--color-text-muted)',
  },
  current: {
    bg: 'var(--color-accent)',
    ring: 'var(--color-accent)',
    text: '#fff',
  },
  done: {
    bg: 'var(--color-status-active)',
    ring: 'var(--color-status-active)',
    text: '#fff',
  },
  blocked: {
    bg: 'var(--color-status-danger)',
    ring: 'var(--color-status-danger)',
    text: '#fff',
  },
  skipped: {
    bg: 'var(--color-surface-alt)',
    ring: 'var(--color-border)',
    text: 'var(--color-text-subtle)',
  },
};

const STATUS_ICON: Record<WorkflowStageStatus, string> = {
  upcoming: '○',
  current: '●',
  done: '✓',
  blocked: '!',
  skipped: '–',
};

/**
 * Visual stepper for multi-stage workflows. Used by the Assignment Workflow
 * Overhaul (Phase WO-4) to surface stage progress on detail surfaces and
 * dashboards. Pattern derives from PatternFly progress-stepper / MUI Stepper.
 *
 * Renders horizontally by default; auto-stacks vertically below `sm`. Pass
 * `orientation="vertical"` to force vertical even at desktop widths.
 */
export function WorkflowStages({
  stages,
  orientation = 'horizontal',
  compact = false,
  ariaLabel = 'Workflow stages',
}: WorkflowStagesProps): JSX.Element {
  const isVertical = orientation === 'vertical';
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    flexWrap: isVertical ? 'nowrap' : 'wrap',
    gap: compact ? 'var(--space-1)' : 'var(--space-2)',
    // `flex-start` (not `center`) for horizontal: with `center`, stages whose
    // label has no timestamp end up vertically centred against the tallest
    // sibling, so their dot sits a few px lower than the dots of stages
    // that do show a timestamp. The connector line is positioned relative
    // to each li's own top, so it then points at different heights and the
    // row visibly breaks. Top-aligning every li keeps every dot at the
    // same y; shorter labels just leave empty space below.
    alignItems: isVertical ? 'stretch' : 'flex-start',
    width: '100%',
  };

  return (
    <ol
      aria-label={ariaLabel}
      style={{
        ...containerStyle,
        listStyle: 'none',
        padding: 0,
        margin: 0,
      }}
      className={`ds-workflow-stages ds-workflow-stages--${orientation}${compact ? ' ds-workflow-stages--compact' : ''}`}
    >
      {stages.map((stage, index) => (
        <Stage
          key={stage.key}
          stage={stage}
          isLast={index === stages.length - 1}
          orientation={orientation}
          compact={compact}
          index={index + 1}
        />
      ))}
    </ol>
  );
}

interface StageProps {
  stage: WorkflowStage;
  isLast: boolean;
  orientation: 'horizontal' | 'vertical';
  compact: boolean;
  index: number;
}

function Stage({ stage, isLast, orientation, compact, index }: StageProps): JSX.Element {
  const tone = STATUS_TONE[stage.status];
  const icon = stage.icon ?? STATUS_ICON[stage.status];
  const dotSize = compact ? 22 : 28;
  const labelFontSize = compact ? 11 : 13;
  const descFontSize = compact ? 10 : 11;
  const isVertical = orientation === 'vertical';

  return (
    <li
      aria-current={stage.status === 'current' ? 'step' : undefined}
      data-stage-status={stage.status}
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'row' : 'column',
        alignItems: isVertical ? 'flex-start' : 'center',
        gap: 'var(--space-1)',
        flex: isVertical ? '0 0 auto' : '1 1 0',
        minWidth: isVertical ? undefined : 0,
        position: 'relative',
      }}
    >
      <div
        aria-label={`Stage ${index}: ${stage.label} (${stage.status})`}
        style={{
          width: dotSize,
          height: dotSize,
          minWidth: dotSize,
          borderRadius: '50%',
          background: tone.bg,
          color: tone.text,
          boxShadow: `0 0 0 2px ${tone.ring}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {typeof icon === 'string' ? icon : icon}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          textAlign: isVertical ? 'left' : 'center',
          minWidth: 0,
          flex: isVertical ? '1 1 auto' : undefined,
        }}
      >
        <span
          style={{
            fontSize: labelFontSize,
            fontWeight: stage.status === 'current' ? 600 : 500,
            color: stage.status === 'upcoming' || stage.status === 'skipped'
              ? 'var(--color-text-muted)'
              : 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {stage.label}
        </span>
        {stage.description && (
          <span
            style={{
              fontSize: descFontSize,
              color: 'var(--color-text-subtle)',
              marginTop: 2,
            }}
          >
            {stage.description}
          </span>
        )}
        {(stage.timestamp || stage.actor) && (
          <span
            style={{
              fontSize: descFontSize,
              color: 'var(--color-text-muted)',
              marginTop: 2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stage.timestamp ? new Date(stage.timestamp).toLocaleString() : null}
            {stage.timestamp && stage.actor ? ' · ' : null}
            {stage.actor ?? null}
          </span>
        )}
      </div>
      {!isLast && !isVertical && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: dotSize / 2,
            left: `calc(50% + ${dotSize / 2 + 4}px)`,
            right: `calc(-50% + ${dotSize / 2 + 4}px)`,
            height: 2,
            background: stage.status === 'done' ? 'var(--color-status-active)' : 'var(--color-border)',
          }}
        />
      )}
    </li>
  );
}
