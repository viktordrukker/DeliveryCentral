// JTBD Walker — captures baseline screenshots + walker-results.json for the
// 8-role × 5-JTBD matrix plus bank-IT lap. Re-run of Phase 4 walker; no
// long-form script existed prior, so this is the first commit of the tooling.
//
// Usage:
//   docker compose ps                    # confirm backend + frontend healthy
//   node scripts/jtbd-walker.cjs         # writes to docs/planning/jtbd-screenshots/baseline-2026-05-10/
//
// Env:
//   FRONTEND_URL    (default http://localhost:5173)
//   BACKEND_URL     (default http://localhost:3000)
//   OUT_DIR         (default docs/planning/jtbd-screenshots/baseline-2026-05-10)

const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/drukker/DeliveryCentral/node_modules/playwright');

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';
const OUT_DIR = process.env.OUT_DIR ||
  path.resolve('/home/drukker/DeliveryCentral/docs/planning/jtbd-screenshots/baseline-2026-05-10');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const ACCOUNTS = {
  admin:            { email: 'admin@deliverycentral.local', password: 'DeliveryCentral@Admin1' },
  director:         { email: 'noah.bennett@itco.local',     password: 'DirectorPass1!' },
  hr_manager:       { email: 'diana.walsh@itco.local',      password: 'HrManagerPass1!' },
  resource_manager: { email: 'sophia.kim@itco.local',       password: 'ResourceMgrPass1!' },
  project_manager:  { email: 'lucas.reed@itco.local',       password: 'ProjectMgrPass1!' },
  delivery_manager: { email: 'carlos.vega@itco.local',      password: 'DeliveryMgrPass1!' },
  employee:         { email: 'ethan.brooks@itco.local',     password: 'EmployeePass1!' },
  dual_role:        { email: 'emma.garcia@itco.local',      password: 'DualRolePass1!' },
};

// 8 roles × 5 JTBDs from jtbd-validation-matrix.md, plus bank-IT lap routes
// for placeholder/gap detection.
const MATRIX = [
  // admin
  { role: 'admin', route: '/',                         jtbd: 'A1 — default landing' },
  { role: 'admin', route: '/admin/integrations',       jtbd: 'A2 — integration health/sync' },
  { role: 'admin', route: '/admin',                    jtbd: 'A3 — set platform configuration' },
  { role: 'admin', route: '/admin/audit-log',          jtbd: 'A4 — investigate audit log (RED expected)' },
  { role: 'admin', route: '/setup',                    jtbd: 'A5 — re-run setup post-install' },
  // director
  { role: 'director', route: '/dashboard/director',    jtbd: 'D1 — director dashboard' },
  { role: 'director', route: '/dashboard/portfolio-radiator', jtbd: 'D2 — portfolio radiator' },
  { role: 'director', route: '/projects',              jtbd: 'D3 — review delivery health' },
  { role: 'director', route: '/projects',              jtbd: 'D4 — approve change requests' },
  { role: 'director', route: '/exceptions',            jtbd: 'D5 — investigate exceptions' },
  // hr_manager
  { role: 'hr_manager', route: '/people/new',          jtbd: 'H1 — onboard a new employee' },
  { role: 'hr_manager', route: '/leave',               jtbd: 'H2 — approve leave requests' },
  { role: 'hr_manager', route: '/dashboard/hr',        jtbd: 'H3 — review HR dashboard' },
  { role: 'hr_manager', route: '/admin/dictionaries',  jtbd: 'H4 — manage HR dictionaries' },
  { role: 'hr_manager', route: '/people',              jtbd: 'H5 — initiate offboarding' },
  // resource_manager
  { role: 'resource_manager', route: '/dashboard/resource-manager', jtbd: 'R1 — team utilization' },
  { role: 'resource_manager', route: '/staffing-desk', jtbd: 'R2 — plan resource allocation' },
  { role: 'resource_manager', route: '/staffing-requests', jtbd: 'R3 — approve assignments' },
  { role: 'resource_manager', route: '/staffing-desk', jtbd: 'R4 — resolve overallocation' },
  { role: 'resource_manager', route: '/staffing-requests', jtbd: 'R5 — plan staffing slates' },
  // project_manager
  { role: 'project_manager', route: '/projects',       jtbd: 'P1 — plan project phases' },
  { role: 'project_manager', route: '/staffing-requests/new', jtbd: 'P2 — place a person on a project' },
  { role: 'project_manager', route: '/projects',       jtbd: 'P3 — manage risks' },
  { role: 'project_manager', route: '/timesheets/approval', jtbd: 'P4 — approve timesheets' },
  { role: 'project_manager', route: '/projects',       jtbd: 'P5 — close project' },
  // delivery_manager
  { role: 'delivery_manager', route: '/dashboard/delivery-manager', jtbd: 'DM1 — track delivery KPIs' },
  { role: 'delivery_manager', route: '/projects',      jtbd: 'DM2 — approve budget changes' },
  { role: 'delivery_manager', route: '/dashboard/planned-vs-actual', jtbd: 'DM3 — investigate PvA' },
  { role: 'delivery_manager', route: '/cases',         jtbd: 'DM4 — approve case decisions' },
  { role: 'delivery_manager', route: '/admin/period-locks', jtbd: 'DM5 — lock a period' },
  // employee
  { role: 'employee', route: '/my-time',               jtbd: 'E1 — submit timesheet' },
  { role: 'employee', route: '/leave',                 jtbd: 'E2 — request leave' },
  { role: 'employee', route: '/dashboard/employee',    jtbd: 'E3 — see my assignments' },
  { role: 'employee', route: '/work-evidence',         jtbd: 'E4 — log work evidence (RED expected)' },
  { role: 'employee', route: '/people',                jtbd: 'E5 — see my profile' },
  // dual-role
  { role: 'dual_role', route: '/',                     jtbd: 'M1 — switch between roles' },
  { role: 'dual_role', route: '/staffing-desk',        jtbd: 'M2 — approve as RM' },
  { role: 'dual_role', route: '/leave',                jtbd: 'M3 — approve as HR' },
  { role: 'dual_role', route: '/notifications',        jtbd: 'M4 — see unified inbox' },
  { role: 'dual_role', route: '/dashboard',            jtbd: 'M5 — see merged dashboards' },
];

// Bank-IT lap — placeholder probe routes (Cat-1 NEW surfaces). Walked as admin.
const BANK_IT_LAP = [
  { role: 'admin', route: '/admin/sso',                 jtbd: 'BANK-1 — SSO config (Cat-1.1 D-155)' },
  { role: 'admin', route: '/admin/ldap',                jtbd: 'BANK-2 — LDAP config (Cat-1.1 NEW)' },
  { role: 'admin', route: '/admin/jsm',                 jtbd: 'BANK-3 — JSM connector (Cat-1.2 NEW)' },
  { role: 'admin', route: '/admin/feature-flags',       jtbd: 'BANK-4 — Feature flags (Cat-2 NEW)' },
  { role: 'admin', route: '/admin/integrations/registry', jtbd: 'BANK-5 — Integration registry (Cat-1.2 NEW)' },
  { role: 'admin', route: '/admin/roles',               jtbd: 'BANK-6 — Role redefinition (Cat-1.9 D-159)' },
  { role: 'admin', route: '/admin/platform-settings',   jtbd: 'BANK-7 — Platform settings UI (Cat-1.5 NEW)' },
  { role: 'employee', route: '/cases/new',              jtbd: 'BANK-8 — Employee Report Issue (Cat-1.4 NEW)' },
];

async function login(page, role) {
  const acct = ACCOUNTS[role];
  if (!acct) throw new Error(`No account for role ${role}`);
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.fill('input[name="email"], input[type="email"]', acct.email);
  await page.fill('input[name="password"], input[type="password"]', acct.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|setup|admin|people|projects|cases|leave|my-time|notifications|workload|teams|exceptions|metadata|staffing)/, { timeout: 12000 }).catch(() => {});
}

async function walkRoute(page, entry) {
  const errors = [];
  const errCollector = (m) => errors.push(m);
  const pageErrorListener = (err) => errCollector(`pageerror: ${err.message.slice(0, 200)}`);
  const consoleListener = (msg) => { if (msg.type() === 'error') errCollector(`console: ${msg.text().slice(0, 200)}`); };
  page.on('pageerror', pageErrorListener);
  page.on('console', consoleListener);

  const result = {
    role: entry.role,
    route: entry.route,
    jtbd: entry.jtbd,
    finalUrl: '',
    title: '',
    h1: '',
    kpiText: '',
    emptyOrError: '',
    screenshot: '',
    durationMs: 0,
    errors: [],
  };

  const t0 = Date.now();
  try {
    await page.goto(`${FRONTEND}${entry.route}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(400); // settle
    result.finalUrl = page.url();
    result.title = await page.title();
    result.h1 = (await page.locator('h1').first().textContent({ timeout: 2000 }).catch(() => '')) || '';
    result.kpiText = ((await page.locator('.kpi-strip, [data-kpi-strip]').first().textContent({ timeout: 2000 }).catch(() => '')) || '').slice(0, 400);
    result.emptyOrError = ((await page.locator('[data-empty-state], [data-error-state], .empty-state, .error-state').first().textContent({ timeout: 1500 }).catch(() => '')) || '').slice(0, 300);

    const safeRoute = entry.route.replace(/\//g, '_').replace(/^_/, '') || 'root';
    const safeJtbd = entry.jtbd.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 50);
    const filename = `${entry.role}__${safeRoute}__${safeJtbd}.png`;
    const screenshotPath = path.join(OUT_DIR, filename);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshot = path.relative(path.resolve('/home/drukker/DeliveryCentral'), screenshotPath);
  } catch (err) {
    result.errors.push(`fatal: ${err.message.slice(0, 200)}`);
  }

  result.durationMs = Date.now() - t0;
  result.errors = result.errors.concat(errors);
  page.off('pageerror', pageErrorListener);
  page.off('console', consoleListener);
  return result;
}

(async () => {
  console.log(`JTBD Walker — frontend=${FRONTEND} backend=${BACKEND} out=${OUT_DIR}`);
  const browser = await chromium.launch({ headless: true });
  const allEntries = [...MATRIX, ...BANK_IT_LAP];
  const results = [];

  // Group entries by role for one login per role
  const byRole = {};
  for (const e of allEntries) {
    if (!byRole[e.role]) byRole[e.role] = [];
    byRole[e.role].push(e);
  }

  let n = 0;
  for (const [role, entries] of Object.entries(byRole)) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    process.stdout.write(`\n[role ${role}] login ... `);
    try {
      await login(page, role);
      console.log('OK');
    } catch (e) {
      console.log(`LOGIN FAIL: ${e.message}`);
      await context.close();
      continue;
    }
    for (const entry of entries) {
      n++;
      process.stdout.write(`  [${n}/${allEntries.length}] ${entry.route} ... `);
      const r = await walkRoute(page, entry);
      results.push(r);
      console.log(r.errors.length ? `ERR ${r.errors.length} ${r.durationMs}ms` : `OK ${r.durationMs}ms`);
    }
    await context.close();
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'walker-results-baseline.json'),
    JSON.stringify(results, null, 2),
  );
  await browser.close();

  const total = results.length;
  const errCount = results.filter((r) => r.errors.length > 0).length;
  console.log(`\nDone. ${total} entries, ${errCount} with errors. Output: ${OUT_DIR}`);
})();
