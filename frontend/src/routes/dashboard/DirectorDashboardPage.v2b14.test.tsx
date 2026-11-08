/**
 * SoT PR 4 — Director Dashboard PageHeader grammar.
 *
 * Source-string assertion: PageHeader uses the DS-canvas title
 * "Portfolio · this week" with a 3-level breadcrumb Home → Dashboards →
 * Director (was Home → Director with title "Director Dashboard" pre-PR-4).
 * Full-render coverage stays in DirectorDashboardPage.test.tsx.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SoT PR 4 — DirectorDashboardPage PageHeader', () => {
  const src = readFileSync('src/routes/dashboard/DirectorDashboardPage.tsx', 'utf-8');

  it('renders PageHeader with DS-canvas title "Portfolio · this week"', () => {
    expect(src).toMatch(/title="Portfolio · this week"/);
  });

  it('uses 3-level breadcrumb Home → Dashboards → Director', () => {
    expect(src).toMatch(/breadcrumbs=\{\[[\s\S]*'Home'[\s\S]*'Dashboards'[\s\S]*'Director'[\s\S]*\]\}/);
  });

  it('no longer wraps PageHeader in an isFeatureEnabled(\'dsRefresh\') gate', () => {
    expect(src).not.toMatch(/isFeatureEnabled\('dsRefresh'\) \? \(\s*<PageHeader/);
  });
});
