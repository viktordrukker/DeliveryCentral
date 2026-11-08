import { useState } from 'react';

import { ProjectPositionsList } from '@/components/projects/ProjectPositionsList';
import { Button, Drawer } from '@/components/ds';

interface Props {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

/**
 * W4-05 — Drawer host for the Project Positions list, mounted from
 * the Project Detail "Manage positions" header action.
 *
 * Replaces the previous full-page navigation to `/projects/:id/positions`
 * with an in-place side drawer so the PM stays in their current context
 * (UX Law 3 — no context loss after actions).
 *
 * The hook-bearing list is wrapped in an inner component that only mounts
 * when the drawer is open, matching the pattern used by
 * `PositionForensicsDrawer` (CLAUDE.md pitfall 15).
 */
function ManagePositionsDrawerInner({ projectId, onClose }: { projectId: string; onClose: () => void }): JSX.Element {
  const [total, setTotal] = useState<number | null>(null);

  return (
    <Drawer
      open
      onClose={onClose}
      side="right"
      width="lg"
      ariaLabel="Manage project positions"
      testId="manage-positions-drawer"
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
            Project
          </div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>
            Positions{total !== null ? ` (${total})` : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 400 }}>
            Read-only list of project positions and their fill status.
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <ProjectPositionsList projectId={projectId} onTotalChange={setTotal} />
    </Drawer>
  );
}

export function ManagePositionsDrawer({ open, projectId, onClose }: Props): JSX.Element | null {
  if (!open || !projectId) return null;
  return <ManagePositionsDrawerInner projectId={projectId} onClose={onClose} />;
}
