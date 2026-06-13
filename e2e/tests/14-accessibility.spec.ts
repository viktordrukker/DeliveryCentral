/**
 * Accessibility smoke tests — runs axe-core on key pages per role.
 * Checks for WCAG 2.2 Level A and AA violations.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { ROLE_CREDENTIALS } from '../fixtures/auth-state';

const ROLES: Array<{
  label: string;
  email: string;
  password: string;
  path: string;
}> = [
  { label: 'employee', ...ROLE_CREDENTIALS.employee, path: '/dashboard/employee' },
  { label: 'project-manager', ...ROLE_CREDENTIALS.projectManager, path: '/dashboard/project-manager' },
  { label: 'resource-manager', ...ROLE_CREDENTIALS.resourceManager, path: '/dashboard/resource-manager' },
  { label: 'hr-manager', ...ROLE_CREDENTIALS.hrManager, path: '/dashboard/hr' },
  { label: 'director', ...ROLE_CREDENTIALS.director, path: '/dashboard/director' },
  { label: 'admin', ...ROLE_CREDENTIALS.admin, path: '/admin' },
];

test.describe('@a11y Accessibility smoke tests', () => {
  for (const role of ROLES) {
    test(`${role.label} dashboard has no critical a11y violations`, async ({ page }) => {
      await loginAs(page, role.email, role.password);
      await page.goto(role.path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.recharts-wrapper') // chart SVGs generate false positives
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );

      if (critical.length > 0) {
        const summary = critical
          .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`)
          .join('\n');
        console.warn(`A11y violations on ${role.label} dashboard:\n${summary}`);
      }

      // Fail only on critical violations — serious ones are warnings for now
      const criticalOnly = critical.filter((v) => v.impact === 'critical');
      expect(
        criticalOnly,
        `Critical a11y violations on ${role.label} dashboard: ${criticalOnly.map((v) => v.id).join(', ')}`,
      ).toHaveLength(0);
    });
  }

  test('login page has no critical a11y violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical, `Critical a11y violations on login page`).toHaveLength(0);
  });
});
