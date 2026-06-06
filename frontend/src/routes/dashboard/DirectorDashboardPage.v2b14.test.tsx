/**
 * V2-B.14 / W3-09 — Director Dashboard PageHeader grammar.
 *
 * Source-string assertion: PageHeader (breadcrumb + title) renders
 * unconditionally (W3-09 dropped the dsRefresh wrapper now that dsRefresh is
 * the canonical path on v2-staging). Full-render coverage stays in
 * DirectorDashboardPage.test.tsx.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-B.14 / W3-09 — DirectorDashboardPage PageHeader', () => {
  const src = readFileSync('src/routes/dashboard/DirectorDashboardPage.tsx', 'utf-8');

  it('renders PageHeader unconditionally with a Home → Director breadcrumb', () => {
    expect(src).toMatch(/title="Director Dashboard"/);
    expect(src).toMatch(/breadcrumbs=\{\[\{ href: '\/', label: 'Home' \}, \{ label: 'Director' \}\]\}/);
  });

  it('no longer wraps PageHeader in an isFeatureEnabled(\'dsRefresh\') gate', () => {
    expect(src).not.toMatch(/isFeatureEnabled\('dsRefresh'\) \? \(\s*<PageHeader/);
  });
});
