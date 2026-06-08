/**
 * W4-05 — Manage Positions drawer.
 *
 * Source-string assertions verifying the Plan-tab "Manage positions"
 * header action now opens an inline Drawer instead of navigating to
 * the standalone `/projects/:id/positions` list, and that the list
 * has been extracted into a reusable component reused by both the
 * page and the drawer.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('W4-05 — Manage Positions drawer wiring', () => {
  const src = readFileSync('src/routes/projects/ProjectDetailPage.tsx', 'utf-8');

  it('imports the ManagePositionsDrawer component', () => {
    expect(src).toMatch(/import \{ ManagePositionsDrawer \} from '@\/components\/projects\/ManagePositionsDrawer'/);
  });

  it('tracks drawer open state via useState', () => {
    expect(src).toMatch(/const \[managePositionsOpen, setManagePositionsOpen\] = useState\(false\)/);
  });

  it('Manage positions header action toggles the drawer (no Link navigation)', () => {
    // Button instead of <Link>; testId for E2E coverage.
    expect(src).toMatch(/data-testid="manage-positions-open"/);
    expect(src).toMatch(/onClick={\(\) => setManagePositionsOpen\(true\)}>Manage positions</);
    // No Link to the standalone list from the header anymore.
    expect(src).not.toMatch(/<Button as={Link}[^>]*to={`\/projects\/\$\{id\}\/positions`}>Manage positions/);
  });

  it('mounts the drawer with the project id and an onClose handler', () => {
    expect(src).toMatch(/<ManagePositionsDrawer[\s\S]*?open={managePositionsOpen}[\s\S]*?projectId={id}[\s\S]*?onClose={\(\) => setManagePositionsOpen\(false\)}/);
  });
});

describe('W4-05 — ProjectPositionsList extracted', () => {
  const src = readFileSync('src/components/projects/ProjectPositionsList.tsx', 'utf-8');

  it('exports ProjectPositionsList as a reusable component', () => {
    expect(src).toMatch(/export function ProjectPositionsList\(/);
  });

  it('loads positions via the project-positions API', () => {
    expect(src).toMatch(/listProjectPositions\(\{ projectId, take: 100 \}\)/);
  });

  it('notifies the host of the loaded total via onTotalChange', () => {
    expect(src).toMatch(/onTotalChange\?\.\(response\.total\)/);
  });

  it('renders the DS Table primitive (no raw <table>)', () => {
    expect(src).toMatch(/<Table</);
    expect(src).not.toMatch(/<table\b/);
  });
});

describe('W4-05 — ManagePositionsDrawer host', () => {
  const src = readFileSync('src/components/projects/ManagePositionsDrawer.tsx', 'utf-8');

  it('renders the shared DS Drawer with the positions list inside', () => {
    expect(src).toMatch(/import \{ Button, Drawer \} from '@\/components\/ds'/);
    expect(src).toMatch(/<ProjectPositionsList projectId={projectId}/);
  });

  it('returns null when closed so hooks tear down cleanly (CLAUDE.md pitfall 15)', () => {
    expect(src).toMatch(/if \(!open \|\| !projectId\) return null/);
  });
});

describe('W4-05 — PositionsListPage uses the extracted component', () => {
  const src = readFileSync('src/routes/projects/PositionsListPage.tsx', 'utf-8');

  it('delegates rendering to ProjectPositionsList', () => {
    expect(src).toMatch(/import \{ ProjectPositionsList \} from '@\/components\/projects\/ProjectPositionsList'/);
    expect(src).toMatch(/<ProjectPositionsList projectId={projectId}/);
  });

  it('no longer owns the table or columns inline', () => {
    expect(src).not.toMatch(/buildPositionsColumns/);
    expect(src).not.toMatch(/<Table</);
  });
});
