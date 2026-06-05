/**
 * V2-B.2 — Workspace shell per-tab live counts.
 *
 * The /me workspace shell renders DS Tabs with inbox/leave/projects counts
 * composed into the tab labels (DS Tabs already accepts ReactNode). Counts
 * come from existing endpoints that the sub-tabs use (duplicate fetch is
 * accepted; the alternative is BE work to extend sidebar-counts).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-B.2 — WorkspaceShellPage tab counts', () => {
  const src = readFileSync('src/routes/me/WorkspaceShellPage.tsx', 'utf-8');

  it('fetches inbox / leave / projects counts in one effect on the shell', () => {
    expect(src).toMatch(/import \{ fetchInbox \} from '@\/lib\/api\/inbox'/);
    expect(src).toMatch(/import \{ fetchMyLeaveRequests \} from '@\/lib\/api\/leaveRequests'/);
    // LEAN-P2 exit-gate: the legacy /assignments client is dropped; projects
    // count is sourced from /project-positions via the canonical client.
    expect(src).toMatch(/import \{ listProjectPositions \} from '@\/lib\/api\/project-positions'/);
    expect(src).toMatch(/Promise\.all\(\[[\s\S]*?fetchInbox[\s\S]*?fetchMyLeaveRequests[\s\S]*?listProjectPositions/);
  });

  it('counts are tracked in state and gated by principal.personId', () => {
    expect(src).toMatch(/setInboxCount/);
    expect(src).toMatch(/setLeaveCount/);
    expect(src).toMatch(/setProjectsCount/);
    expect(src).toMatch(/if \(!principal\?\.personId\) return/);
  });

  it('tab labels compose count badges and feed into <Tabs tabs={labeledTabs}>', () => {
    expect(src).toMatch(/const labeledTabs/);
    expect(src).toMatch(/t\.id === 'inbox' && inboxCount/);
    expect(src).toMatch(/t\.id === 'leave' && leaveCount/);
    expect(src).toMatch(/t\.id === 'projects' && projectsCount/);
    expect(src).toMatch(/tabs=\{labeledTabs\}/);
  });
});
