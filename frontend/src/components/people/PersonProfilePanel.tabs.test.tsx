/**
 * SoT PR 9 — PersonProfilePanel 6-tab grammar.
 *
 * Source-string assertions verifying the dsRefresh-gated 6-tab grammar
 * (Overview / Positions / Skills / Cost rates / Time & leave / Activity)
 * backed by a URL `?tab=…` parameter, plus the 320px right rail (Quick
 * actions / Suggested next positions / Activity timeline) per DS canvas
 * `DS/page-profile.jsx`. The legacy flat-canvas path is preserved when the
 * flag is OFF. The panel is complex enough that a full render-mount matrix
 * is brittle — string-level assertions keep the verification fast + stable.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SoT PR 9 — PersonProfilePanel 6-tab grammar', () => {
  const src = readFileSync('src/components/people/PersonProfilePanel.tsx', 'utf-8');

  it('exposes the canonical Overview / Positions / Skills / Cost rates / Time & leave / Activity tab list', () => {
    expect(src).toMatch(/const V2_TABS\s*:\s*TabItem\[\]\s*=\s*\[/);
    expect(src).toMatch(/{ id: 'overview', label: 'Overview' }/);
    expect(src).toMatch(/{ id: 'positions', label: 'Positions' }/);
    expect(src).toMatch(/{ id: 'skills', label: 'Skills' }/);
    expect(src).toMatch(/{ id: 'cost', label: 'Cost rates' }/);
    expect(src).toMatch(/{ id: 'time', label: 'Time & leave' }/);
    expect(src).toMatch(/{ id: 'activity', label: 'Activity' }/);
  });

  it('gates the TabBar branch behind isFeatureEnabled("dsRefresh")', () => {
    expect(src).toMatch(/isFeatureEnabled\('dsRefresh'\)/);
    expect(src).toMatch(/if \(dsRefreshEnabled\) \{/);
  });

  it('reads tab state from the URL via useSearchParams (default = overview)', () => {
    expect(src).toMatch(/useSearchParams/);
    expect(src).toMatch(/searchParams\.get\('tab'\)[\s\S]*?\?\?\s*'overview'/);
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
    expect(src).toMatch(/activeTab === 'overview' \?/);
    expect(src).toMatch(/activeTab === 'positions' \?/);
    expect(src).toMatch(/activeTab === 'skills' \?/);
    expect(src).toMatch(/activeTab === 'cost' \?/);
    expect(src).toMatch(/activeTab === 'time' \?/);
    expect(src).toMatch(/activeTab === 'activity' \?/);
  });

  it('renders the 320px right rail with Quick actions + Suggested next positions + Activity', () => {
    expect(src).toMatch(/data-testid="person-profile-right-rail"/);
    expect(src).toMatch(/data-testid="person-profile-quick-actions"/);
    expect(src).toMatch(/Suggested next positions/);
    expect(src).toMatch(/gridTemplateColumns:\s*'minmax\(0, 1fr\) 320px'/);
  });

  it('keeps the legacy flat-canvas layout reachable when dsRefresh is OFF', () => {
    // Legacy path (final return) stacks all sections without tabs.
    expect(src).toMatch(/return \(\s*\n\s*<div data-testid="person-profile-panel"[\s\S]*?\{identityCard\}[\s\S]*?\{kpiStrip\}[\s\S]*?\{assignmentsCard\}/);
  });
});
