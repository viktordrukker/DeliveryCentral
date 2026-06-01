import { Link } from 'react-router-dom';

import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar, Button } from '@/components/ds';
import type { PersonDirectoryItem } from '@/lib/api/person-directory';

interface PersonDirectoryInspectorProps {
  row: PersonDirectoryItem;
  onClose: () => void;
  /** V2 §4 item 6 — prev/next stepper across the visible directory page. */
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
  alignItems: 'center',
  gap: 12,
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
const S_SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
  marginBottom: 6,
};

/**
 * V2 §4 item 6 — right-pane inspector for the People directory list-detail
 * layout. Mirrors the BenchInspector pattern: identity header, key meta
 * (role/grade/office/line manager/active assignments), and CTA row.
 *
 * Mounts inside the directory surface alongside the DataView master list
 * when dsRefresh is on and the layout is flat-list. Other layouts (grid,
 * grouped list) keep the legacy navigate-on-click behavior to keep this
 * change scoped.
 */
export function PersonDirectoryInspector({
  row,
  onClose,
  position,
}: PersonDirectoryInspectorProps): JSX.Element {
  const subtitleParts = [row.role, row.grade, row.currentOrgUnit?.name].filter(Boolean);

  return (
    <aside
      style={S_PANEL}
      aria-label="Person directory inspector"
      data-testid="person-directory-inspector"
    >
      <div style={S_HEADER}>
        <div style={S_IDENTITY}>
          <Avatar name={row.displayName} size="md" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{row.displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {subtitleParts.length > 0 ? subtitleParts.join(' · ') : '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {position ? (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
              data-testid="person-directory-inspector-stepper"
            >
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={!position.onPrev}
                onClick={position.onPrev}
                aria-label="Previous person"
              >
                ‹
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
                aria-label="Next person"
              >
                ›
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
            ×
          </Button>
        </div>
      </div>

      <div style={S_META_ROW}>
        <div>
          <div style={S_META_LABEL}>Status</div>
          <div style={S_META_VALUE}>
            <StatusBadge
              tone={row.lifecycleStatus === 'ACTIVE' ? 'active' : 'neutral'}
              label={row.lifecycleStatus}
              variant="chip"
              size="small"
            />
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Active assignments</div>
          <div style={{ ...S_META_VALUE, fontVariantNumeric: 'tabular-nums' }}>
            {row.currentAssignmentCount}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Line manager</div>
          <div style={S_META_VALUE}>
            {row.currentLineManager?.displayName ?? (
              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
            )}
          </div>
        </div>
        <div>
          <div style={S_META_LABEL}>Email</div>
          <div
            style={{
              ...S_META_VALUE,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.primaryEmail ?? undefined}
          >
            {row.primaryEmail ?? <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
          </div>
        </div>
      </div>

      {row.dottedLineManagers.length > 0 ? (
        <div data-testid="person-directory-inspector-dotted">
          <div style={S_SECTION_LABEL}>Dotted-line ({row.dottedLineManagers.length})</div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {row.dottedLineManagers.map((m) => (
              <li
                key={m.id}
                style={{
                  fontSize: 12,
                  padding: '4px 0',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                {m.displayName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button as={Link} variant="primary" size="sm" to={`/people/${row.id}`}>
          Open profile
        </Button>
      </div>
    </aside>
  );
}
