/**
 * SoT PR 17g — V2-done criterion #1 cleanup. The "More admin surfaces"
 * AdminDeepLinkCards SectionCards introduced in V2 SoT PR 12 / W2-03 were
 * removed because the DS canvas at DS/page-admin-setup.jsx has no such
 * section. Each admin route remains deep-linkable individually via the
 * sidebar / URL; this test locks in the absence of the deep-link block on
 * every tab.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AdminPanelPage — AdminDeepLinkCards removed per DS canvas', () => {
  const src = readFileSync('src/routes/admin/AdminPanelPage.tsx', 'utf-8');

  it('does NOT render the "More admin surfaces" SectionCard wrapper', () => {
    expect(src).not.toMatch(/More admin surfaces/);
  });

  it('does NOT define an AdminDeepLinkCards component', () => {
    expect(src).not.toMatch(/AdminDeepLinkCards/);
  });

  it('does NOT define DEEP_LINKS arrays', () => {
    expect(src).not.toMatch(/PLATFORM_DEEP_LINKS/);
    expect(src).not.toMatch(/INTEGRATIONS_DEEP_LINKS/);
    expect(src).not.toMatch(/ROLES_DEEP_LINKS/);
    expect(src).not.toMatch(/DICTS_DEEP_LINKS/);
    expect(src).not.toMatch(/MONITOR_DEEP_LINKS/);
  });

  it('does NOT carry the admin-deep-links testId anchor block', () => {
    expect(src).not.toMatch(/data-testid="admin-deep-links"/);
  });
});
