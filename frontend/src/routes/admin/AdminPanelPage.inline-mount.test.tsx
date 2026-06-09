import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * V2 SoT PR 12 — Admin Settings DS canvas conformance (page-admin-setup.jsx).
 *
 * Each tab inline-mounts the relevant sub-page's *AdminContent helper.
 * Source-string assertions pin the structural contract:
 *   1. *AdminContent helpers are imported from their sub-page modules.
 *   2. They are rendered inside the tab shell.
 *   3. Each tab body carries a stable data-testid (platform / roles /
 *      integrations / dicts / monitor).
 *   4. The shell is driven by ?tab=<AdminTabKey>.
 */

const adminPanelSource = readFileSync(
  join(__dirname, 'AdminPanelPage.tsx'),
  'utf8',
);

describe('AdminPanelPage — inline admin mounts (V2 SoT PR 12)', () => {
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

  it('imports RolePermissionAdminContent + BusinessAuditAdminContent for Roles & RBAC', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*RolePermissionAdminContent\s*\}\s*from\s*['"]\.\/RolePermissionAdminPage['"]/,
    );
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*BusinessAuditAdminContent\s*\}\s*from\s*['"]\.\/BusinessAuditPage['"]/,
    );
  });

  it('imports OrganizationConfigAdminContent for Dictionaries', () => {
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

  it('tags each tab body with a stable data-testid (DS canvas tab keys)', () => {
    expect(adminPanelSource).toContain('data-testid="admin-tab-platform"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-roles"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-integrations"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-dicts"');
    expect(adminPanelSource).toContain('data-testid="admin-tab-monitor"');
  });

  it('drives the tab shell via ?tab=… URL param', () => {
    expect(adminPanelSource).toMatch(/searchParams\.get\(\s*['"]tab['"]\s*\)/);
    expect(adminPanelSource).toMatch(/next\.set\(\s*['"]tab['"]\s*,/);
  });

  it('mounts the AdminRightRail (DS canvas right rail)', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*AdminRightRail\s*\}\s*from\s*['"]\.\/AdminRightRail['"]/,
    );
    expect(adminPanelSource).toMatch(/<AdminRightRail\s*\/>/);
  });
});
