import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Drawer } from '@/components/ds';
import {
  fetchPositionForensics,
  type PositionForensics,
  type PositionForensicsEvent,
  type ProjectPositionFillStatus,
} from '@/lib/api/project-positions';
import { formatDateTime } from '@/lib/format-date';

interface Props {
  positionId: string | null;
  positionRole?: string;
  onClose: () => void;
}

const STATUS_TONE: Record<ProjectPositionFillStatus, StatusTone> = {
  DRAFT: 'neutral',
  OPEN: 'info',
  PROPOSED: 'pending',
  BOOKED: 'pending',
  ONBOARDING: 'pending',
  ASSIGNED: 'active',
  ON_HOLD: 'warning',
  RELEASED: 'neutral',
};

const SECTION: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
  marginBottom: 'var(--space-2)',
  marginTop: 'var(--space-3)',
};

const DL: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '120px 1fr',
  gap: '3px var(--space-2)',
  fontSize: 12,
  marginBottom: 'var(--space-2)',
};

const DT: React.CSSProperties = { color: 'var(--color-text-muted)', fontWeight: 500 };

const TIMELINE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  position: 'relative',
  paddingLeft: 'var(--space-4)',
};

const TIMELINE_ITEM: React.CSSProperties = {
  position: 'relative',
  paddingBottom: 'var(--space-3)',
  paddingLeft: 'var(--space-3)',
  borderLeft: '2px solid var(--color-border)',
  marginLeft: 'var(--space-1)',
};

const TIMELINE_DOT: React.CSSProperties = {
  position: 'absolute',
  left: -6,
  top: 4,
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: 'var(--color-surface)',
  border: '2px solid var(--color-border-strong)',
};

const TIMELINE_DOT_LONG: React.CSSProperties = {
  ...TIMELINE_DOT,
  borderColor: 'var(--color-status-danger)',
  background: 'var(--color-status-danger)',
};

function formatDwell(ms: number | null): string {
  if (ms === null) return '—';
  const ONE_DAY = 86_400_000;
  const ONE_HOUR = 3_600_000;
  const ONE_MINUTE = 60_000;
  if (ms >= ONE_DAY) {
    const days = ms / ONE_DAY;
    return days >= 10 ? `${Math.round(days)}d` : `${days.toFixed(1)}d`;
  }
  if (ms >= ONE_HOUR) {
    return `${Math.round(ms / ONE_HOUR)}h`;
  }
  if (ms >= ONE_MINUTE) {
    return `${Math.round(ms / ONE_MINUTE)}m`;
  }
  return '<1m';
}

interface InnerProps {
  positionId: string;
  positionRole?: string;
  onClose: () => void;
}

function PositionForensicsDrawerInner({ positionId, positionRole, onClose }: InnerProps): JSX.Element {
  const [data, setData] = useState<PositionForensics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchPositionForensics(positionId)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load forensics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [positionId]);

  return (
    <Drawer
      open
      onClose={onClose}
      side="right"
      width="md"
      ariaLabel="Position lifecycle forensics"
      testId="position-forensics-drawer"
      title={
        <div>
          <div
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              letterSpacing: '0.05em',
              marginBottom: 2,
            }}
          >
            Position lifecycle
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{positionRole ?? data?.role ?? 'Position'}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>
            Why did this position take that long?
          </div>
        </div>
      }
    >
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState description={error} /> : null}
      {data ? (
        <>
          <div style={SECTION}>Summary</div>
          <dl style={DL}>
            <dt style={DT}>Current status</dt>
            <dd>
              <StatusBadge tone={STATUS_TONE[data.currentStatus]} label={data.currentStatus} variant="chip" />
            </dd>
            <dt style={DT}>Events</dt>
            <dd style={{ fontVariantNumeric: 'tabular-nums' }}>{data.events.length}</dd>
            <dt style={DT}>As of</dt>
            <dd>{formatDateTime(data.asOf)}</dd>
          </dl>

          <div style={SECTION}>Timeline</div>
          {data.events.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              No fill-history events recorded for this position yet.
            </div>
          ) : (
            <ol style={TIMELINE} data-testid="position-forensics-timeline">
              {data.events.map((event) => (
                <li
                  key={event.id}
                  style={TIMELINE_ITEM}
                  data-testid={`position-forensics-event-${event.id}`}
                >
                  <span style={event.longDwell ? TIMELINE_DOT_LONG : TIMELINE_DOT} aria-hidden="true" />
                  <TimelineEvent event={event} />
                </li>
              ))}
            </ol>
          )}
        </>
      ) : null}
    </Drawer>
  );
}

function TimelineEvent({ event }: { event: PositionForensicsEvent }): JSX.Element {
  const dwellLabel = formatDwell(event.dwellMs);
  const dwellStyle: React.CSSProperties = event.longDwell
    ? {
        color: 'var(--color-status-danger)',
        fontWeight: 600,
      }
    : { color: 'var(--color-text-muted)' };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <span>{event.changeType.replace(/_/g, ' ')}</span>
        {event.previousStatus && event.newStatus ? (
          <>
            <StatusBadge
              tone={STATUS_TONE[event.previousStatus] ?? 'neutral'}
              label={event.previousStatus}
              variant="text"
            />
            <span style={{ color: 'var(--color-text-subtle)' }}>→</span>
            <StatusBadge
              tone={STATUS_TONE[event.newStatus] ?? 'neutral'}
              label={event.newStatus}
              variant="text"
            />
          </>
        ) : event.newStatus ? (
          <StatusBadge
            tone={STATUS_TONE[event.newStatus] ?? 'neutral'}
            label={event.newStatus}
            variant="text"
          />
        ) : null}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
        {formatDateTime(event.occurredAt)}
        {event.newStatus ? (
          <>
            {' · '}
            <span style={dwellStyle} data-testid={`position-forensics-dwell-${event.id}`}>
              {dwellLabel}
              {event.longDwell ? ' (long)' : ''}
            </span>
          </>
        ) : null}
      </div>
      {event.changeReason ? (
        <div style={{ fontSize: 11, color: 'var(--color-text)', marginTop: 4 }}>
          {event.changeReason}
        </div>
      ) : null}
      {event.changedByPersonId ? (
        <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', marginTop: 2 }}>
          by {event.changedByPersonId}
        </div>
      ) : null}
    </div>
  );
}

/**
 * LEAN-P4b-2 — position-state forensics drawer.
 *
 * Opens from the project positions list. Renders the full
 * `ProjectPositionFillHistory` timeline with per-event dwell-time and a red
 * dot for thresholds exceeded (OPEN > 7d / PROPOSED > 3d). Lets a PM answer
 * "why did this position take N days?".
 *
 * Hooks (useEffect / useState / useAuth) are wrapped inside an inner
 * component that only mounts when `positionId` is set, so closing the drawer
 * tears the hooks down cleanly.
 */
export function PositionForensicsDrawer({ positionId, positionRole, onClose }: Props): JSX.Element | null {
  if (!positionId) return null;
  return (
    <PositionForensicsDrawerInner
      positionId={positionId}
      positionRole={positionRole}
      onClose={onClose}
    />
  );
}
