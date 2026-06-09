/**
 * V2 Scope §4 item 7 — PersonProfilePanel TabBar.
 *
 * Source-string assertions verifying the dsRefresh-gated 5-tab grammar
 * (Identity / Assignments / Skills / Leave / Activity) backed by a URL
 * `?tab=…` parameter. The legacy flat-canvas path is preserved when the
 * flag is OFF. The panel is complex enough that a full render-mount
 * matrix is brittle — string-level assertions keep the verification
 * fast and stable.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2 §4.7 — PersonProfilePanel 5-tab grammar', () => {
  const src = readFileSync('src/components/people/PersonProfilePanel.tsx', 'utf-8');

  it('exposes the canonical Identity / Positions / Skills / Leave / Activity tab list', () => {
    expect(src).toMatch(/const V2_TABS\s*:\s*TabItem\[\]\s*=\s*\[/);
    expect(src).toMatch(/{ id: 'identity', label: 'Identity' }/);
    expect(src).toMatch(/{ id: 'assignments', label: 'Positions' }/);
    expect(src).toMatch(/{ id: 'skills', label: 'Skills' }/);
    expect(src).toMatch(/{ id: 'leave', label: 'Leave' }/);
    expect(src).toMatch(/{ id: 'activity', label: 'Activity' }/);
  });

  it('gates the TabBar branch behind isFeatureEnabled("dsRefresh")', () => {
    expect(src).toMatch(/isFeatureEnabled\('dsRefresh'\)/);
    expect(src).toMatch(/if \(dsRefreshEnabled\) \{/);
  });

  it('reads tab state from the URL via useSearchParams (default = identity)', () => {
    expect(src).toMatch(/useSearchParams/);
    expect(src).toMatch(/searchParams\.get\('tab'\)[\s\S]*?\?\?\s*'identity'/);
  });

  it('writes the active tab back to the URL on change', () => {
    expect(src).toMatch(/function setTab\(tab: V2TabId\)/);
    expect(src).toMatch(/next\.set\('tab', tab\)/);
  });

  it('renders the DS Tabs atom with the V2_TABS list and the activeTab as value', () => {
    expect(src).toMatch(/<Tabs[\s\S]*?tabs=\{V2_TABS\}/);
    expect(src).toMatch(/value=\{activeTab\}/);
    expect(src).toMatch(/onValueChange=\{\(id\) => setTab\(id as V2TabId\)\}/);
  });

  it('gates each tab pane behind activeTab === <id>', () => {
    expect(src).toMatch(/activeTab === 'identity' \?/);
    expect(src).toMatch(/activeTab === 'assignments' \? assignmentsCard/);
    expect(src).toMatch(/activeTab === 'skills' \? skillsCard/);
    expect(src).toMatch(/activeTab === 'leave' \? leaveCard/);
    expect(src).toMatch(/activeTab === 'activity' \? activityCard/);
  });

  it('keeps the legacy flat-canvas layout reachable when dsRefresh is OFF', () => {
    // Legacy path (final return) stacks all sections without tabs.
    expect(src).toMatch(/return \(\s*\n\s*<div data-testid="person-profile-panel"[\s\S]*?\{identityCard\}[\s\S]*?\{kpiStrip\}[\s\S]*?\{assignmentsCard\}/);
  });
});
