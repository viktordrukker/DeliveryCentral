/**
 * V2-B.14 — Director Dashboard PageHeader grammar.
 *
 * Source-string assertion: the dsRefresh-gated PageHeader (breadcrumb + title)
 * is added without duplicating the existing heatmap period control. Full-render
 * coverage stays in DirectorDashboardPage.test.tsx.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-B.14 — DirectorDashboardPage PageHeader', () => {
  const src = readFileSync('src/routes/dashboard/DirectorDashboardPage.tsx', 'utf-8');

  it('renders a dsRefresh-gated PageHeader with a Home → Director breadcrumb', () => {
    expect(src).toMatch(/isFeatureEnabled\('dsRefresh'\) \? \(\s*<PageHeader/);
    expect(src).toMatch(/title="Director Dashboard"/);
    expect(src).toMatch(/breadcrumbs=\{\[\{ href: '\/', label: 'Home' \}, \{ label: 'Director' \}\]\}/);
  });
});
