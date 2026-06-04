import { Link } from 'react-router-dom';

import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Button } from '@/components/ds';
import type { ProjectHealthDto } from '@/lib/api/project-health';
import type { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { PROJECT_STATUS_LABELS, humanizeEnum } from '@/lib/labels';

interface ProjectDirectoryInspectorProps {
  row: ProjectDirectoryItem;
  health?: ProjectHealthDto | null;
  onClose: () => void;
  /** Prev/next stepper across the visible directory page. UX Law 4 — keep
   * the action surface next to the row the user is reading. */
  position?: { index: number; total: number; onPrev?: () => void; onNext?: () => void };
}

const S_PANEL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 16,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-card)',
};
const S_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
};
const S_IDENTITY: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
  flex: 1,
};
const S_META_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
  paddingTop: 8,
  borderTop: '1px solid var(--color-border)',
};
const S_META_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
};
const S_META_VALUE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
};

/**
 * SCOPED-MIN-1 — right-pane inspector for the Projects directory list-detail
 * layout. Mirrors the PersonDirectoryInspector pattern (V2 §4 item 6):
 * identity header, key meta (status / priority / client / engagement /
 * assignments / health), stepper, and "Open project" CTA.
 *
 * Mounts inside the directory surface alongside the DataView master list
 * when dsRefresh is on. Other paths retain the legacy navigate-on-click
 * behavior to keep this change scoped.
 */
export function ProjectDirectoryInspector({
  row,
  health,
  onClose,
  position,
}: ProjectDirectoryInspectorProps): JSX.Element {
  const subtitleParts = [row.projectCode, row.clientName].filter(Boolean) as string[];
  const priorityTone: StatusTone =
    row.priority === 'CRITICAL'
      ? 'danger'
      : row.priority === 'HIGH'
        ? 'warning'
        : row.priority === 'LOW'
          ? 'neutral'
          : 'info';

  return (
    <aside
      style={S_PANEL}
      aria-label="Project directory inspector"
      data-testid="project-directory-inspector"
    >
      <div style={S_HEADER}>
        <div style={S_IDENTITY}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{row.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {subtitleParts.length > 0 ? subtitleParts.join(' · ') : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {position ? (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
              data-testid="project-directory-inspector-stepper"
            >
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={!position.onPrev}
                onClick={position.onPrev}
                aria-label="Previous project"
              >
                {'‹'}
              </Button>
              <span
                className="compact muted"
                style={{ fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'center' }}
              >
                {position.index + 1} / {position.total}
              </span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={!position.onNext}
                onClick={position.onNext}
                aria-label="Next project"
              >
                {'›'}
              </Button>
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            type="button"
            aria-label="Close inspector"
          >
            {'×'}
          </Button>
        </div>
      </div>

      <div style={S_META_ROW}>
        <div>
          <div style={S_META_LABEL}>Status</div>
          <div style={S_META_VALUE}>
            <StatusBadge
              label={humanizeEnum(row.status, PROJECT_STATUS_LABELS)}
              status={row.status}
              variant="dot"
            />
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Priority</div>
          <div style={S_META_VALUE}>
            {row.priority ? (
              <StatusBadge label={row.priority} tone={priorityTone} variant="dot" />
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>{'—'}</span>
            )}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Engagement</div>
          <div style={S_META_VALUE}>
            {row.engagementModel ?? (
              <span style={{ color: 'var(--color-text-muted)' }}>{'—'}</span>
            )}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Assignments</div>
          <div style={{ ...S_META_VALUE, fontVariantNumeric: 'tabular-nums' }}>
            {row.assignmentCount}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Client</div>
          <div style={S_META_VALUE}>
            {row.clientName ?? (
              <span style={{ color: 'var(--color-text-muted)' }}>{'—'}</span>
            )}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Health</div>
          <div style={S_META_VALUE}>
            {health ? (
              <ProjectHealthBadge grade={health.grade} score={health.score} size="sm" />
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>{'—'}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button as={Link} variant="primary" size="sm" to={`/projects/${row.id}`}>
          Open project
        </Button>
      </div>
    </aside>
  );
}
