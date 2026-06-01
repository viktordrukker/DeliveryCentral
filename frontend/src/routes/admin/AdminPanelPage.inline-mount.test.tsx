import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * V2 Scope §4 item 10 — Admin sections inline mounts.
 *
 * Under dsRefresh, the AdminPanelPage's `dictionaries` section must render
 * the Dictionaries admin content INLINE (via DictionariesAdminContent) rather
 * than deep-linking to /admin/dictionaries.
 *
 * This is a source-string assertion so the test stays stable even as the
 * surrounding tabbed shell evolves — it pins the structural contract:
 *   1. DictionariesAdminContent is imported.
 *   2. The component is mounted under a dsRefresh-gated branch.
 *   3. The inline mount carries a stable data-testid for downstream tests.
 */

const adminPanelSource = readFileSync(
  join(__dirname, 'AdminPanelPage.tsx'),
  'utf8',
);

describe('AdminPanelPage — V2 §4 item 10 inline admin mounts', () => {
  it('imports DictionariesAdminContent from the dictionaries page module', () => {
    expect(adminPanelSource).toMatch(
      /import\s*\{\s*DictionariesAdminContent\s*\}\s*from\s*['"]\.\/DictionariesPage['"]/,
    );
  });

  it('mounts DictionariesAdminContent inline under dsRefresh', () => {
    // The dsRefresh branch must render the inline component, not a deep-link.
    expect(adminPanelSource).toMatch(/if\s*\(\s*dsRefreshEnabled\s*\)/);
    expect(adminPanelSource).toMatch(/<DictionariesAdminContent\s*\/>/);
  });

  it('tags the inline mount with a stable data-testid', () => {
    expect(adminPanelSource).toContain('data-testid="admin-inline-dictionaries"');
  });

  it('threads dsRefreshEnabled into renderSection so it can branch per-section', () => {
    expect(adminPanelSource).toMatch(
      /renderSection\(\s*selectedSection\s*,\s*state\.data\s*,\s*dsRefreshEnabled\s*\)/,
    );
    expect(adminPanelSource).toMatch(
      /function renderSection\([\s\S]*?dsRefreshEnabled:\s*boolean/,
    );
  });

  it('preserves the legacy deep-link path for dsRefresh=OFF', () => {
    // When dsRefresh is OFF, the original "Manage dictionary entries" deep-link
    // must still be present so legacy users aren't stranded.
    expect(adminPanelSource).toContain('Manage dictionary entries');
    expect(adminPanelSource).toContain('to="/admin/dictionaries"');
  });
});
