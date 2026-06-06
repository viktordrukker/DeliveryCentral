/**
 * V2 Scope §4 item 15 — /reports umbrella DS Tabs + dsRefresh gate.
 *
 * Source-string assertions verifying that the umbrella shell:
 *   1. Imports the DS Tabs atom from `@/components/ds`.
 *   2. Gates the DS Tabs render on `isFeatureEnabled('dsRefresh')`.
 *   3. Drives the DS Tabs from the same TABS array (one entry per known
 *      section: exceptions, time, capitalisation, export, utilization,
 *      builder, evidence) and the same `?section=` URL param.
 *   4. Leaves the dsRefresh=OFF path with PageHeader.tabs unchanged.
 *
 * Source-string assertions (rather than runtime renders) are used here so
 * the dsRefresh-OFF behaviour does not require a flag override at test
 * time — the runtime shell behaviour is already covered by
 * `ReportsPage.test.tsx`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2 Scope §4 item 15 — ReportsPage DS Tabs + dsRefresh gate', () => {
  const src = readFileSync('src/routes/reports/ReportsPage.tsx', 'utf-8');

  it('imports the DS Tabs atom from @/components/ds', () => {
    expect(src).toMatch(/import \{ Tabs \} from '@\/components\/ds';/);
  });

  it('imports isFeatureEnabled for the dsRefresh gate', () => {
    expect(src).toMatch(/import \{ isFeatureEnabled \} from '@\/lib\/feature-flags';/);
  });

  it('computes a dsRefreshEnabled flag from the dsRefresh feature flag', () => {
    expect(src).toMatch(/const dsRefreshEnabled = isFeatureEnabled\('dsRefresh'\);/);
  });

  it('renders the DS Tabs atom under the dsRefreshEnabled branch', () => {
    expect(src).toMatch(/dsRefreshEnabled \? \(\s*<Tabs/);
  });

  it('passes the role-filtered tabs (one entry per known section visible to the user) to DS Tabs', () => {
    // W1-26 — tabs are filtered by role before being passed to DS Tabs. The
    // canonical TABS array still enumerates all 7 sections; `visibleTabs` is
    // the role-filtered slice driven from the auth principal.
    expect(src).toMatch(/<Tabs[\s\S]*?tabs=\{visibleTabs\.map\(\(t\) => \(\{ id: t\.id, label: t\.label \}\)\)\}/);
  });

  it('drives the DS Tabs active tab from the URL-derived activeTab', () => {
    expect(src).toMatch(/<Tabs[\s\S]*?value=\{activeTab\}/);
  });

  it('wires DS Tabs onValueChange to the existing onTabChange handler that updates ?section=', () => {
    expect(src).toMatch(/<Tabs[\s\S]*?onValueChange=\{onTabChange\}/);
    // onTabChange is the single source of truth that writes the URL param.
    expect(src).toMatch(/next\.set\('section', id\)/);
  });

  it('keeps a non-dsRefresh PageHeader branch with the legacy tabs prop wiring', () => {
    // The OFF branch still uses PageHeader's built-in TabBar — also fed from
    // the role-filtered `visibleTabs` slice (W1-26).
    expect(src).toMatch(/tabs=\{visibleTabs\.map\(\(t\) => \(\{ id: t\.id, label: t\.label \}\)\)\}/);
    expect(src).toMatch(/activeTab=\{activeTab\}/);
    expect(src).toMatch(/onTabChange=\{onTabChange\}/);
  });

  it('enumerates the seven known sections in the TABS array', () => {
    // Each section id appears as a TABS entry — no invented sections.
    expect(src).toMatch(/id: 'exceptions'/);
    expect(src).toMatch(/id: 'time'/);
    expect(src).toMatch(/id: 'capitalisation'/);
    expect(src).toMatch(/id: 'export'/);
    expect(src).toMatch(/id: 'utilization'/);
    expect(src).toMatch(/id: 'builder'/);
    expect(src).toMatch(/id: 'evidence'/);
  });

  it('exposes a testId on the DS Tabs strip for FE-side targeting', () => {
    expect(src).toMatch(/<Tabs[\s\S]*?testId="reports-ds-tabs"/);
  });
});
