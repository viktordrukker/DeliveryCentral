/**
 * W4-05 — /projects/:id Manage positions inline drawer.
 *
 * Source-string assertions for the inline-drawer replacement of the
 * previous external `<Link to="/projects/:id/positions">` action.
 * UX Law 4 — action-data adjacency — keeps the PM in the project-detail
 * context instead of navigating away.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('W4-05 — ProjectDetailPage Manage positions drawer', () => {
  const src = readFileSync('src/routes/projects/ProjectDetailPage.tsx', 'utf-8');

  it('imports the shared PositionsPanel and Drawer primitive', () => {
    expect(src).toMatch(/import\s+{[^}]*Drawer[^}]*}\s+from\s+'@\/components\/ds'/);
    expect(src).toMatch(/import\s+{\s*PositionsPanel\s*}\s+from\s+'\.\/PositionsListPage'/);
  });

  it('tracks drawer open state and opens it from the Manage-positions button', () => {
    expect(src).toMatch(/const \[positionsDrawerOpen, setPositionsDrawerOpen\] = useState\(false\)/);
    expect(src).toMatch(/onClick={\(\) => setPositionsDrawerOpen\(true\)}/);
    expect(src).toMatch(/data-testid="manage-positions-open"/);
  });

  it('renders the Drawer with PositionsPanel inline (no external navigation)', () => {
    expect(src).toMatch(/<Drawer[\s\S]*?open={positionsDrawerOpen}[\s\S]*?onClose={\(\) => setPositionsDrawerOpen\(false\)}/);
    expect(src).toMatch(/testId="manage-positions-drawer"/);
    expect(src).toMatch(/<PositionsPanel projectId={id} \/>/);
  });

  it('no longer links the Manage-positions action to /projects/:id/positions', () => {
    expect(src).not.toMatch(/to={`\/projects\/\$\{id\}\/positions`}>Manage positions/);
  });
});

describe('W4-05 — PositionsListPage exposes a reusable PositionsPanel', () => {
  const src = readFileSync('src/routes/projects/PositionsListPage.tsx', 'utf-8');

  it('exports both PositionsPanel and PositionsListPage', () => {
    expect(src).toMatch(/export function PositionsPanel\(/);
    expect(src).toMatch(/export function PositionsListPage\(/);
  });

  it('PositionsListPage delegates to the shared PositionsPanel', () => {
    expect(src).toMatch(/<PositionsPanel projectId={projectId} \/>/);
  });

  it('empty-state action forwards to the create-position route (UX Law 2)', () => {
    expect(src).toMatch(/label: 'Create position'/);
    expect(src).toMatch(/\/staffing-desk\/positions\/new\?projectId=/);
  });
});
