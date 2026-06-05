import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * V2 Scope §4 item 10 + LEAN-P4d-1 — Admin sections inline mounts.
 *
 * Under dsRefresh, the AdminPanelPage's tabs must inline-mount each
 * sub-page's *AdminContent helper instead of deep-linking. Source-string
 * assertions keep this test stable as the surrounding tabbed shell evolves
 * — it pins the structural contract:
 *   1. *AdminContent helpers are imported from their sub-page modules.
 *   2. They are rendered inside the dsRefresh tab shell.
 *   3. Each tab carries a stable data-testid for downstream tests.
 *   4. Legacy ?section=... deep links and standalone routes still resolve.
 */

const adminPanelSource = readFileSync(
  join(__dirname, 'AdminPanelPage.tsx'),
  'utf8',
);

describe('AdminPanelPage — inline admin mounts (V2 §4 item 10 + LEAN-P4d-1)', () => {
  it('imports DictionariesAdminContent from the dictionaries page module', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*DictionariesAdminContent\s*\}\s*from\s*['"]\.\/DictionariesPage['"]/,
    );
  });

  it('imports SettingsAdminContent from the settings page module', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*SettingsAdminContent\s*\}\s*from\s*['"]\.\/SettingsPage['"]/,
    );
  });

  it('imports IntegrationsAdminContent from the integrations page module', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*IntegrationsAdminContent\s*\}\s*from\s*['"]\.\/IntegrationsAdminPage['"]/,
    );
  });

  it('imports FeatureFlagsAdminContent from the feature-flags page module', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*FeatureFlagsAdminContent\s*\}\s*from\s*['"]\.\/FeatureFlagsAdminPage['"]/,
    );
  });

  it('imports RolePermissionAdminContent + BusinessAuditAdminContent for Governance', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*RolePermissionAdminContent\s*\}\s*from\s*['"]\.\/RolePermissionAdminPage['"]/,
    );
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*BusinessAuditAdminContent\s*\}\s*from\s*['"]\.\/BusinessAuditPage['"]/,
    );
  });

  it('imports OrganizationConfigAdminContent for People Config', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*OrganizationConfigAdminContent\s*\}\s*from\s*['"]\.\/OrganizationConfigPage['"]/,
    );
  });

  it('mounts each AdminContent helper inline (no deep-link replacement)', () => {
    expect(adminPanelSource).toMatch(/<SettingsAdminContent\s*\/>/);
    expect(adminPanelSource).toMatch(/<IntegrationsAdminContent\s*\/>/);
    expect(adminPanelSource).toMatch(/<DictionariesAdminContent\s*\/>/);
    expect(adminPanelSource).toMatch(/<FeatureFlagsAdminContent\s*\/>/);
    expect(adminPanelSource).toMatch(/<RolePermissionAdminContent\s*\/>/);
    expect(adminPanelSource).toMatch(/<BusinessAuditAdminContent\s*\/>/);
    expect(adminPanelSource).toMatch(/<OrganizationConfigAdminContent\s*\/>/);
  });

  it('tags each tab body with a stable data-testid', () => {
    expect(adminPanelSource).toContain('data-testid="admin-tab-general"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-integrations"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-governance"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-people-config"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-feature-flags"');
  });

  it('drives the new tab shell via ?tab=… URL param', () => {
    expect(adminPanelSource).toMatch(/searchParams\.get\(\s*['"]tab['"]\s*\)/);
    expect(adminPanelSource).toMatch(/next\.set\(\s*['"]tab['"]\s*,/);
  });

  it('preserves the legacy ?section=… deep-link path for dsRefresh=OFF', () => {
    // When dsRefresh is OFF, the sidebar shell still uses ?section=...
    expect(adminPanelSource).toMatch(/searchParams\.get\(\s*['"]section['"]\s*\)/);
    expect(adminPanelSource).toContain('Manage dictionary entries');
    expect(adminPanelSource).toContain('to="/admin/dictionaries"');
  });
});
