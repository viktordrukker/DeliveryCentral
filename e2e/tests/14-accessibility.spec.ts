/**
 * Accessibility smoke tests — runs axe-core on key pages per role.
 * Checks for WCAG 2.2 Level A and AA violations.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';

const ROLES: Array<{
  label: string;
  email: string;
  password: string;
  path: string;
}> = [
  { label: 'employee', email: 'ethan.brooks@example.com', password: 'EmployeePass1!', path: '/dashboard/employee' },
  { label: 'project-manager', email: 'lucas.reed@example.com', password: 'ProjectMgrPass1!', path: '/dashboard/project-manager' },
  { label: 'resource-manager', email: 'sophia.kim@example.com', password: 'ResourceMgrPass1!', path: '/dashboard/resource-manager' },
  { label: 'hr-manager', email: 'diana.walsh@example.com', password: 'HrManagerPass1!', path: '/dashboard/hr' },
  { label: 'director', email: 'noah.bennett@example.com', password: 'DirectorPass1!', path: '/dashboard/director' },
  { label: 'admin', email: 'admin@deliverycentral.local', password: 'DeliveryCentral@Admin1', path: '/admin' },
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
