# UX Regression Suite

Specs in this directory are the executable mirror of the per-page UX contracts in [`docs/planning/ux-contracts/`](../../docs/planning/ux-contracts/). They exist for **Phase DS** (design-system standardization) and enforce one rule:

> The visual chrome may change. The user-visible behavior may not.

Every assertion here corresponds to a numbered row in a contract document. If a behavior is in the contract but not in a spec, that row hasn't shipped yet — finish it before merging the migration.

## How this fits the existing harness

The repo's Playwright harness lives at `e2e/` with config at [`playwright.config.ts`](../../playwright.config.ts). It already has:

- Pre-seeded role auth states under [`playwright/.auth/*.json`](../../playwright/.auth/) populated by [`e2e/auth.setup.ts`](../auth.setup.ts)
- Auth fixtures at [`e2e/fixtures/auth.ts`](../fixtures/auth.ts) exposing `loginAsEmployee(page)`, `loginAsAdmin(page)`, etc.
- Phase-2 seed identifiers at [`e2e/fixtures/phase2-identifiers.ts`](../fixtures/phase2-identifiers.ts)

UX-regression specs reuse all of this. They live in `e2e/ux-regression/` simply to keep them separate from the role/scenario E2E suites under `e2e/tests/` — no parallel infrastructure.

## Naming

One spec per route, named after the route component:

```
e2e/ux-regression/DashboardPage.spec.ts          → /dashboard
e2e/ux-regression/ProjectsPage.spec.ts           → /projects
e2e/ux-regression/ProjectDetailPage.spec.ts      → /projects/:id
e2e/ux-regression/StaffingDeskPage.spec.ts       → /staffing-desk
...
```

The spec filename matches the contract filename so reviewers can pair them at a glance.

## Spec structure

Each spec mirrors the eight sections of its contract:

```ts
import { expect, test } from '@playwright/test';
import { loginAs<Role> } from '../fixtures/auth';

test.describe('UX contract — DashboardPage @ux-contract', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs<Role>(page);
    await page.goto('/dashboard');
  });

  test.describe('§2 Click paths', () => {
    test('KPI card "At Risk" navigates to filtered projects list', async ({ page }) => { /* ... */ });
    test('"Create Project" button (PM only) navigates to /projects/new', async ({ page }) => { /* ... */ });
  });

  test.describe('§4 Confirmation prompts', () => {
    test('"Mark resolved" exception action prompts for reason', async ({ page }) => { /* ... */ });
  });

  // ... §5 Toasts, §6 Filters, §7 Empty/Loading/Error, §8 Side effects
});
```

The `@ux-contract` tag in the describe name lets the suite be filtered with `PLAYWRIGHT_GREP=@ux-contract`.

## Running

```bash
# Full UX-regression suite
npx playwright test e2e/ux-regression

# A single page
npx playwright test e2e/ux-regression/DashboardPage.spec.ts

# Watch the run in a browser
npx playwright test e2e/ux-regression/DashboardPage.spec.ts --headed --debug
```

Specs require the seed profile loaded:

```bash
docker compose exec -e SEED_PROFILE=phase2 backend sh -c \
  "npx ts-node --project tsconfig.json prisma/seed.ts"
```

## Authoring a new spec

1. Open the contract (`docs/planning/ux-contracts/<Page>.md`).
2. For each row in §§2–8, add one or more `test()` blocks. Use exact strings from the contract — never paraphrase.
3. Run the spec against the **current** app. It must be green.
4. Commit contract + spec in the same PR.
5. Migrate the page in a subsequent PR (or the same PR). The spec must remain green.

## When a contract changes deliberately

Phase DS sometimes legitimately improves UX (e.g., adding danger styling to a destructive button). When that happens:

1. Update the contract row with the new behavior.
2. Update the matching `test()` block.
3. Call out the change in the migration PR description.
4. Both the unchanged behaviors (most rows) and the deliberately-changed behaviors (a few) must pass.

This is how we tell "we improved the UX" apart from "we silently regressed it."

## Coverage targets

DS-0 ships 20 contracts + specs (the highest-traffic pages). Remaining ~119 routes are authored just-in-time, immediately before each migration PR. By end of DS-5 every migrated route has a green spec.
