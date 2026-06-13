import { expect, test, type Page } from '@playwright/test';

import {
  PLAYWRIGHT_API_BASE,
  ROLE_CREDENTIALS,
  TOKEN_STORAGE_KEY,
  type AuthRole,
} from '../fixtures/auth-state';

/**
 * PR-19 — position lifecycle journey, exercised THROUGH THE UI against the
 * seeded it-company dataset. This is the single true end-to-end spec that
 * locks the Wave 1-6 flow so it can never silently break again.
 *
 * Canonical journey (test 1):
 *   RM logs in → /staffing-desk → "+ New Position" → CreatePositionDrawer
 *   (project / role / allocation / dates) → creates OPEN → position detail
 *   → Propose a bench person (OPEN → PROPOSED) → an approver (DM) opens
 *   /approvals → the proposal shows candidate name + allocation + dates
 *   (the issue-674 enrichment) → Approve → PROPOSED → BOOKED.
 *
 * Atomic path (test 2):
 *   the direct create-and-book surface lands one position straight in BOOKED
 *   with a two-row fill-history ledger (PROPOSED + BOOKED).
 *
 * Runnable both locally (Playwright `webServer` boots backend + frontend) and
 * against a live deployment via `V2_STAGING_BASE_URL` +
 * `PLAYWRIGHT_SKIP_WEB_SERVER=1`. Tagged `@smoke @critical` so the re-enabled
 * e2e-smoke merge gate (issue 682 / `--grep @smoke`) picks it up.
 *
 * The spec is self-contained: each test logs in via the auth API and seeds the
 * token into localStorage with `page.addInitScript` (the same mechanism as
 * auth.setup.ts), so it never depends on prior storage-state fixtures.
 */

const API_BASE = PLAYWRIGHT_API_BASE;

// A unique marker appended to the role title so the freshly-created position is
// trivially findable in the candidate slate / approvals queue without colliding
// with the 100+ seeded position proposals.
function uniqueRunId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ApiContext {
  token: string;
  personId: string;
}

async function apiLogin(page: Page, role: AuthRole): Promise<ApiContext> {
  const credentials = ROLE_CREDENTIALS[role];
  const response = await page.request.post(`${API_BASE}/auth/login`, { data: credentials });
  expect(response.ok(), `Login should succeed for ${role}: ${response.status()}`).toBeTruthy();
  const body = (await response.json()) as { accessToken?: string };
  if (!body.accessToken) throw new Error(`No access token for ${role}`);
  // Decode the person_id from the JWT payload so we can address seed people
  // (project pick / candidate pick) without a hardcoded UUID.
  const payload = JSON.parse(
    Buffer.from(body.accessToken.split('.')[1] ?? '', 'base64').toString('utf8'),
  ) as { person_id?: string };
  return { token: body.accessToken, personId: payload.person_id ?? '' };
}

// Seed the auth token into the page so the SPA boots authenticated. Mirrors
// auth.setup.ts — addInitScript runs before any app code on every navigation.
// Also pre-seed the first-run product-tour "seen" flags so the "Welcome to
// DeliveryCentral" tour dialog never overlays the page (it intercepts pointer
// events otherwise). The flags are best-effort: any tour key the build reads is
// covered, and a runtime dismissal (`dismissTour`) backs it up.
async function authenticate(page: Page, token: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
      // Belt-and-braces: stamp the common tour-completion keys so the guided
      // tour does not auto-open. Unknown keys are harmless.
      for (const tourKey of [
        'deliverycentral.tourCompleted',
        'deliverycentral.productTour.completed',
        'deliverycentral.onboardingTour.dismissed',
        'tour.completed',
        'productTour.seen',
      ]) {
        localStorage.setItem(tourKey, 'true');
      }
    },
    { key: TOKEN_STORAGE_KEY, value: token },
  );
}

// Assert the position fill status shown on the position-detail "Current fill"
// card. Prefers the `position-fill-status` testid added in this PR (carries a
// machine-readable `data-status`); falls back to the StatusBadge chip text
// inside the `position-current-fill` section — both the section testid and the
// chip are in the deployed build, so this also works against a live staging
// build that predates the new testid.
async function expectFillStatus(page: Page, status: 'OPEN' | 'PROPOSED' | 'BOOKED'): Promise<void> {
  const tagged = page.getByTestId('position-fill-status');
  if (await tagged.count().then((n) => n > 0).catch(() => false)) {
    await expect(tagged).toHaveAttribute('data-status', status, { timeout: 20_000 });
    return;
  }
  const chip = page
    .getByTestId('position-current-fill')
    .locator('.status-badge--chip')
    .first();
  await expect(chip).toHaveText(status, { timeout: 20_000 });
}

// Dismiss the first-run guided tour if it is showing. The dialog overlays a
// modal backdrop that intercepts pointer events, so any page interaction must
// clear it first. Safe to call when no tour is present.
async function dismissTour(page: Page): Promise<void> {
  const skip = page.getByRole('button', { name: /skip tour/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await expect(page.getByRole('dialog', { name: /welcome to deliverycentral/i }))
      .toBeHidden()
      .catch(() => undefined);
  }
}

// Pick an active project from the seeded directory (first non-closed project).
async function pickActiveProject(
  page: Page,
  token: string,
): Promise<{ id: string; label: string }> {
  const res = await page.request.get(`${API_BASE}/projects?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `Projects directory should load: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as {
    items?: Array<{ id: string; projectCode: string; name: string; status: string }>;
  };
  const items = body.items ?? [];
  const active = items.find(
    (p) => !['CLOSED', 'ARCHIVED', 'CANCELLED', 'COMPLETED'].includes(p.status.toUpperCase()),
  );
  if (!active) throw new Error('No active project found in the seeded directory.');
  return { id: active.id, label: `${active.projectCode} — ${active.name}` };
}

// Pick a bench person to book/propose (first non-superadmin bench member).
async function pickBenchPerson(
  page: Page,
  token: string,
): Promise<{ id: string; name: string }> {
  const res = await page.request.get(`${API_BASE}/people/bench?pageSize=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `Bench list should load: ${res.status()}`).toBeTruthy();
  const people = (await res.json()) as Array<{ personId: string; name: string }>;
  const candidate = people.find((p) => p.name !== 'System Administrator') ?? people[0];
  if (!candidate) throw new Error('No bench person found in the seeded dataset.');
  return { id: candidate.personId, name: candidate.name };
}

test.describe('@smoke @critical Position lifecycle journey (PR-19)', () => {
  // Serial: each test mutates shared seed state by creating positions; keeping
  // them serial avoids cross-test interference on the shared deployment.
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test('RM creates OPEN → proposes → DM approves → BOOKED (through the UI)', async ({ page }) => {
    const runId = uniqueRunId();
    const role = `E2E Backend Engineer ${runId}`;

    // ── 1. Resource Manager logs in and lands on the Staffing Desk ──────────
    const rm = await apiLogin(page, 'resourceManager');
    await authenticate(page, rm.token);
    const project = await pickActiveProject(page, rm.token);

    await page.goto('/staffing-desk');
    await expect(page.getByTestId('staffing-desk-page')).toBeVisible({ timeout: 30_000 });
    await dismissTour(page);

    // ── 2. Open the CreatePositionDrawer via the "+ New Position" CTA ───────
    await page.getByTestId('create-position-open').click();
    const drawer = page.getByTestId('create-position-drawer');
    await expect(drawer).toBeVisible();

    // Fill the form. FormField wires htmlFor/id so getByLabel targets the
    // native control (Select / Input / date input) directly.
    await drawer.getByLabel('Project', { exact: false }).selectOption({ label: project.label });
    // The role <select> carries only canonical option labels, so switch it to
    // "Other (specify below)…" and type the unique marker — this makes the
    // freshly-created position trivially findable in the approvals queue.
    await drawer.getByLabel('Role', { exact: false }).selectOption('__custom');
    await drawer.getByPlaceholder('Custom role title').fill(role);
    await drawer.getByLabel('Allocation %', { exact: false }).fill('40');
    await drawer.getByLabel('Start date', { exact: false }).fill('2026-09-01');
    await drawer.getByLabel('End date', { exact: false }).fill('2026-12-31');

    // ── 3. Submit — capture the created position id from the API response ───
    const createResponse = page.waitForResponse(
      (r) =>
        r.url().includes('/project-positions') &&
        !r.url().includes('/candidates') &&
        !r.url().includes('/transition') &&
        r.request().method() === 'POST' &&
        r.ok(),
    );
    await drawer.getByRole('button', { name: 'Create position' }).click();
    const created = (await (await createResponse).json()) as {
      id: string;
      publicId: string | null;
      projectId: string;
    };
    const positionId = created.publicId ?? created.id;
    expect(positionId, 'created position should expose an id').toBeTruthy();

    // The drawer auto-transitions DRAFT → OPEN when "open immediately" is set
    // (the default), then closes and refetches. Confirm via the API contract.
    await expect
      .poll(
        async () => {
          const res = await page.request.get(`${API_BASE}/project-positions/${positionId}`, {
            headers: { Authorization: `Bearer ${rm.token}` },
          });
          return res.ok() ? ((await res.json()) as { fillStatus: string }).fillStatus : 'ERR';
        },
        { timeout: 20_000, message: 'position should reach OPEN after create' },
      )
      .toBe('OPEN');

    // ── 4. Open the position detail page and assert OPEN ────────────────────
    await page.goto(`/projects/${created.projectId}/positions/${positionId}`);
    await expect(page.getByTestId('project-position-detail-page')).toBeVisible({ timeout: 30_000 });
    await dismissTour(page);
    await expectFillStatus(page, 'OPEN');

    // ── 5. Propose the first ranked candidate (OPEN → PROPOSED) ─────────────
    // The candidate "Propose" buttons live in the "Other candidates considered"
    // section; target them by accessible name (deployed build has no per-row
    // testid). The PROPOSED → BOOKED confirm dialog reuses the "Propose" label,
    // so scope to buttons that are NOT inside a dialog.
    const proposeBtn = page
      .getByRole('button', { name: 'Propose', exact: true })
      .first();
    await expect(proposeBtn, 'candidate slate should offer at least one Propose action').toBeVisible({
      timeout: 20_000,
    });

    await proposeBtn.click();
    const proposeDialog = page.getByRole('dialog');
    await expect(proposeDialog).toContainText('Propose candidate?');
    // The confirm message reads: Propose <Name> for "<role>" at <n>% allocation?
    // Extract the clean candidate name from it so we can find the proposal in
    // the approvals queue later (the table cell prefixes avatar initials).
    const message = (await proposeDialog.locator('.ds-confirm-dialog__message').innerText()).trim();
    const candidateName = (message.match(/Propose\s+(.+?)\s+for\s+"/) ?? [])[1]?.trim() ?? '';
    expect(candidateName.length, 'confirm message should expose a candidate name').toBeGreaterThan(0);
    await proposeDialog.getByRole('button', { name: 'Propose', exact: true }).click();

    // After the transition the page reloads — the fill status flips to PROPOSED.
    await expectFillStatus(page, 'PROPOSED');

    // ── 6. Delivery Manager logs in and opens the Approvals queue ───────────
    const dmContext = await page.context().newPage();
    const dm = await apiLogin(dmContext, 'deliveryManager');
    await authenticate(dmContext, dm.token);

    // The unified approval id equals the position id; deep-link straight to it.
    await dmContext.goto(`/approvals?source=position-proposal&focus=${encodeURIComponent(created.id)}`);
    await expect(dmContext.getByTestId('approvals-page')).toBeVisible({ timeout: 30_000 });
    await dismissTour(dmContext);

    // The focus deep-link auto-opens the inspector for our proposal. If the
    // queue is large the list may need a click fallback by candidate name.
    let inspector = dmContext.getByTestId('approval-inspector');
    if (!(await inspector.isVisible().catch(() => false))) {
      await dmContext
        .getByTestId('approvals-list')
        .getByText(candidateName, { exact: false })
        .first()
        .click();
      inspector = dmContext.getByTestId('approval-inspector');
    }
    await expect(inspector).toBeVisible({ timeout: 20_000 });

    // ── 7. Assert the issue-674 enrichment: candidate name + allocation +
    //       dates are all visible on one screen (UX Law 7). ─────────────────
    const enrichment = dmContext.getByTestId('approval-inspector-position-detail');
    await expect(enrichment).toBeVisible();
    await expect(enrichment).toContainText(candidateName);
    await expect(enrichment).toContainText('40%');
    await expect(enrichment).toContainText('2026-09-01');
    await expect(enrichment).toContainText('2026-12-31');

    // ── 8. Approve — PROPOSED → BOOKED ──────────────────────────────────────
    await inspector.getByRole('textbox').first().fill('Approved via PR-19 lifecycle journey.');
    await inspector.getByRole('button', { name: 'Approve', exact: true }).click();

    // The decided row leaves the DM queue (toast + refetch). Confirm BOOKED on
    // the position detail page the RM is still viewing.
    await page.reload();
    await dismissTour(page);
    await expectFillStatus(page, 'BOOKED');

    await dmContext.close();
  });

  test('Atomic create-and-book lands one position in BOOKED with a fill-history ledger', async ({
    page,
  }) => {
    const runId = uniqueRunId();
    const rm = await apiLogin(page, 'resourceManager');
    await authenticate(page, rm.token);
    const project = await pickActiveProject(page, rm.token);
    const person = await pickBenchPerson(page, rm.token);

    // The direct-book surface (CreateAssignmentModal) routes through the atomic
    // POST /project-positions/create-and-book. We drive that exact endpoint —
    // the contract Wave 1-6 introduced — then assert the resulting position
    // through the position-detail UI: a single BOOKED position carrying a
    // two-row fill-history ledger (OPEN→PROPOSED, PROPOSED→BOOKED).
    const bookRes = await page.request.post(`${API_BASE}/project-positions/create-and-book`, {
      headers: { Authorization: `Bearer ${rm.token}` },
      data: {
        projectId: project.id,
        personId: person.id,
        role: `E2E Create-and-Book ${runId}`,
        allocationPercent: 20,
        startDate: '2026-09-01',
        endDate: '2026-11-30',
        note: 'PR-19 atomic create-and-book',
        // RM is an OVERALLOCATION_OVERRIDE role — bypass the Σ-allocation guard
        // so the booking is deterministic regardless of the bench person's
        // current load on the shared deployment.
        allowOverallocation: true,
      },
    });
    expect(bookRes.ok(), `create-and-book should succeed: ${bookRes.status()}`).toBeTruthy();
    const booked = (await bookRes.json()) as {
      id: string;
      publicId: string | null;
      projectId: string;
      fillStatus: string;
      activePersonId: string | null;
    };
    expect(booked.fillStatus, 'position should land BOOKED').toBe('BOOKED');
    expect(booked.activePersonId, 'booked person should be set').toBe(person.id);

    const positionId = booked.publicId ?? booked.id;

    // Assert the fill-history ledger has the two expected rows.
    const historyRes = await page.request.get(
      `${API_BASE}/project-positions/${positionId}/history`,
      { headers: { Authorization: `Bearer ${rm.token}` } },
    );
    expect(historyRes.ok(), `history should load: ${historyRes.status()}`).toBeTruthy();
    const history = (await historyRes.json()) as {
      history: Array<{ changeType: string; previousStatus: string; newStatus: string }>;
    };
    const transitions = history.history.map((h) => `${h.previousStatus}->${h.newStatus}`);
    expect(transitions, 'ledger should record OPEN→PROPOSED→BOOKED').toEqual(
      expect.arrayContaining(['OPEN->PROPOSED', 'PROPOSED->BOOKED']),
    );

    // Assert through the UI: the position detail page renders the booked
    // position. The "Position lifecycle" WorkflowStages reflect the same
    // ledger story the API verified above — PROPOSED is marked done and
    // BOOKED is the current stage — proving the OPEN→PROPOSED→BOOKED path
    // landed. (The "Fill history" timeline reads
    // `/project-positions/:id/history` which the API ledger check above already
    // covers authoritatively.)
    await page.goto(`/projects/${booked.projectId}/positions/${positionId}`);
    await expect(page.getByTestId('project-position-detail-page')).toBeVisible({ timeout: 30_000 });
    await dismissTour(page);
    await expectFillStatus(page, 'BOOKED');

    // Lifecycle stages render straight from the position state — robust evidence
    // the position progressed through PROPOSED into BOOKED.
    const lifecycle = page
      .locator('[aria-label="Position lifecycle stages"]')
      .first();
    await expect(lifecycle).toBeVisible({ timeout: 20_000 });
    await expect(
      page.locator('[aria-label="Stage 3: PROPOSED (done)"]'),
      'PROPOSED stage should be marked done',
    ).toBeVisible();
    await expect(
      page.locator('[aria-label="Stage 4: BOOKED (current)"]'),
      'BOOKED stage should be the current stage',
    ).toBeVisible();
  });
});
