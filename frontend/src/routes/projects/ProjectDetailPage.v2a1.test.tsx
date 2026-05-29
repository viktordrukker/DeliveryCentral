/**
 * V2-A.1 — Project Detail 3-tab consolidation.
 *
 * Source-string assertions verifying the dsRefresh-gated tab grammar.
 * Pulse / Plan / Money replaces the legacy 7-tab list when dsRefresh is on;
 * legacy ?tab=… URLs deep-link to one of the three canonical tabs via
 * LEGACY_TAB_REDIRECTS_V2.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-A.1 — ProjectDetailPage 3-tab consolidation', () => {
  const src = readFileSync('src/routes/projects/ProjectDetailPage.tsx', 'utf-8');

  it('exposes the canonical Pulse / Plan / Money tab list when dsRefresh is on', () => {
    expect(src).toMatch(/const V2_TABS\s*=\s*\[/);
    expect(src).toMatch(/{ id: 'pulse', label: 'Pulse' }/);
    expect(src).toMatch(/{ id: 'plan', label: 'Plan' }/);
    expect(src).toMatch(/{ id: 'money', label: 'Money' }/);
  });

  it('switches the rendered TABS to V2_TABS when dsRefreshEnabled', () => {
    expect(src).toMatch(/const TABS = dsRefreshEnabled \? V2_TABS : BASE_TABS/);
  });

  it('redirects each legacy tab ID to one of the 3 canonical tabs', () => {
    expect(src).toMatch(/const LEGACY_TAB_REDIRECTS_V2[\s\S]*?radiator:\s*'pulse'/);
    expect(src).toMatch(/milestones:\s*'plan'/);
    expect(src).toMatch(/risks:\s*'plan'/);
    expect(src).toMatch(/'change-requests':\s*'plan'/);
    expect(src).toMatch(/team:\s*'plan'/);
    expect(src).toMatch(/budget:\s*'money'/);
    expect(src).toMatch(/lifecycle:\s*'plan'/);
  });

  it('renders PlanTab for activeTab=plan when dsRefresh is on', () => {
    expect(src).toMatch(/dsRefreshEnabled && activeTab === 'plan' \?[\s\S]*?<PlanTab/);
  });

  it('renders MoneyTab for activeTab=money when dsRefresh is on (V2-A.4 promoted)', () => {
    expect(src).toMatch(/dsRefreshEnabled && activeTab === 'money' \? <MoneyTab/);
  });

  it('keeps the legacy 7-tab grammar reachable when dsRefresh is off', () => {
    expect(src).toMatch(/!dsRefreshEnabled && activeTab === 'radiator'/);
    expect(src).toMatch(/!dsRefreshEnabled && activeTab === 'milestones'/);
    expect(src).toMatch(/!dsRefreshEnabled && activeTab === 'lifecycle'/);
  });

  it('renders dsRefresh-gated title badges (code + RAG + status) and passes them to DetailLayout (V2-A.6)', () => {
    // Gated so the legacy header stays pixel-identical when dsRefresh is off.
    expect(src).toMatch(/const titleBadges\s*=\s*\n?\s*dsRefreshEnabled && project \?/);
    expect(src).toMatch(/label={project\.projectCode}/);
    expect(src).toMatch(/label={`RAG \${computedRag\.overallRag}`}/);
    expect(src).toMatch(/<StatusBadge status={project\.status} variant="chip" \/>/);
    expect(src).toMatch(/badges={titleBadges}/);
  });
});

describe('V2-A.1 — PlanTab aggregator', () => {
  const src = readFileSync('src/routes/projects/tabs/PlanTab.tsx', 'utf-8');

  it('stacks Milestones / Risks / ChangeRequests / Team as sections', () => {
    expect(src).toMatch(/<MilestonesTab/);
    expect(src).toMatch(/<RisksIssuesTab/);
    expect(src).toMatch(/<ChangeRequestsTab/);
    expect(src).toMatch(/<TeamVendorsTab/);
  });

  it('exposes a plan-tab testId for downstream selectors', () => {
    expect(src).toMatch(/data-testid="plan-tab"/);
  });

  it('B5: renders a Plan KPI strip from staffing-summary + milestones', () => {
    expect(src).toMatch(/data-testid="plan-kpi-strip"/);
    // sourced from the legacy role-plan staffing summary (lean positions shelved)
    expect(src).toMatch(/fetchStaffingSummary\(projectId\)/);
    expect(src).toMatch(/fetchMilestones\(projectId\)/);
    // filled-rate donut + roles/gap/milestone tiles
    expect(src).toMatch(/<Donut/);
    expect(src).toMatch(/Roles planned/);
    expect(src).toMatch(/Open gap/);
    expect(src).toMatch(/Milestones hit/);
  });
});
