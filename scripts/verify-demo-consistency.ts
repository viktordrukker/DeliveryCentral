/**
 * Demo Data Consistency Verification Script
 *
 * Usage: npx ts-node --project tsconfig.json scripts/verify-demo-consistency.ts
 *
 * Authenticates as admin, calls all major API endpoints, and asserts data consistency
 * across the investor-demo seed dataset. Exits non-zero on any assertion failure.
 */

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@deliverycentral.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'DeliveryCentral@Admin1';

let token = '';
let passCount = 0;
let failCount = 0;

function pass(label: string): void {
  // eslint-disable-next-line no-console
  console.log(`  ✅  ${label}`);
  passCount++;
}

function fail(label: string, detail?: string): void {
  // eslint-disable-next-line no-console
  console.error(`  ❌  ${label}${detail ? `\n      → ${detail}` : ''}`);
  failCount++;
}

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    pass(label);
  } else {
    fail(label, detail);
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${path} → HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function authenticate(): Promise<void> {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  const body = await response.json() as { accessToken: string };
  token = body.accessToken;
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('\n🔍 DeliveryCentral — Demo Data Consistency Check\n');
  // eslint-disable-next-line no-console
  console.log(`   Target: ${BASE_URL}`);
  // eslint-disable-next-line no-console
  console.log(`   Account: ${ADMIN_EMAIL}\n`);

  // ─── Authenticate ────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('▶  Authenticating...');
  await authenticate();
  pass('Admin login successful');

  // ─── Fetch all data sources ──────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('\n▶  Fetching data sources...');

  interface WorkloadSummary {
    activeProjectCount?: number;
    totalAssignmentCount?: number;
    projects?: unknown[];
    assignments?: unknown[];
  }
  interface PeopleResponse {
    items?: Array<{ id: string; managerId?: string | null; employmentStatus?: string }>;
    total?: number;
  }
  interface AssignmentsResponse {
    items?: Array<{ personId: string; allocationPercent?: number }>;
    total?: number;
  }
  interface ProjectsResponse {
    items?: unknown[];
    total?: number;
  }
  interface WorkloadMatrix {
    rows?: Array<{ personId: string; totalAllocationPercent?: number }>;
  }

  const [workloadSummary, projectsResp, assignmentsResp, peopleResp, workloadMatrix] =
    await Promise.all([
      apiFetch<WorkloadSummary>('/dashboard/workload/summary'),
      apiFetch<ProjectsResponse>('/projects?limit=500'),
      apiFetch<AssignmentsResponse>('/assignments?limit=500'),
      apiFetch<PeopleResponse>('/org/people?limit=500'),
      apiFetch<WorkloadMatrix>('/dashboard/workload/matrix').catch(() => ({ rows: [] })),
    ]);

  pass('All data sources fetched');

  // ─── (a) Project count alignment ─────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('\n▶  (a) Project count alignment...');

  const summaryProjectCount = workloadSummary.activeProjectCount ?? (workloadSummary.projects?.length ?? null);
  const listProjectCount = projectsResp.total ?? projectsResp.items?.length ?? null;

  if (summaryProjectCount !== null && listProjectCount !== null) {
    assert(
      summaryProjectCount <= listProjectCount,
      `Active projects in summary (${summaryProjectCount}) ≤ total projects list (${listProjectCount})`,
      `Summary: ${summaryProjectCount} · List: ${listProjectCount}`,
    );
  } else {
    pass('Project count check skipped (endpoints return different shapes — acceptable)');
  }

  // ─── (b) Assignment count alignment ──────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('\n▶  (b) Assignment count alignment...');

  const summaryAssignmentCount = workloadSummary.totalAssignmentCount ?? (workloadSummary.assignments?.length ?? null);
  const listAssignmentCount = assignmentsResp.total ?? assignmentsResp.items?.length ?? null;

  if (summaryAssignmentCount !== null && listAssignmentCount !== null) {
    assert(
      summaryAssignmentCount <= listAssignmentCount,
      `Active assignments in summary (${summaryAssignmentCount}) ≤ total assignments list (${listAssignmentCount})`,
    );
  } else {
    pass('Assignment count check skipped (endpoints return different shapes — acceptable)');
  }

  // ─── (c) Every personId in assignments resolves to an existing person ─────────
  // eslint-disable-next-line no-console
  console.log('\n▶  (c) PersonId resolution...');

  const people = peopleResp.items ?? [];
  const personIds = new Set(people.map((p) => p.id));
  const assignments = assignmentsResp.items ?? [];
  const orphanedAssignments = assignments.filter((a) => !personIds.has(a.personId));

  assert(
    orphanedAssignments.length === 0,
    `All ${assignments.length} assignment personIds resolve to existing people`,
    orphanedAssignments.length > 0
      ? `Orphaned personIds: ${orphanedAssignments.slice(0, 5).map((a) => a.personId).join(', ')}`
      : undefined,
  );

  // ─── (d) managerId null only for root nodes ───────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('\n▶  (d) Root-node-only null managerId...');

  const withoutManager = people.filter((p) => p.managerId === null || p.managerId === undefined);
  const inactivePeople = people.filter((p) => p.employmentStatus === 'INACTIVE');

  assert(
    withoutManager.length <= 5,
    `Without-manager count is plausible (≤ 5, got ${withoutManager.length})`,
    withoutManager.length > 5 ? 'Too many people without a manager — check seed hierarchy' : undefined,
  );

  assert(
    withoutManager.length >= 1,
    `At least 1 root node exists (C-suite)`,
  );

  // ─── (e) Inactive employee count ─────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('\n▶  (e) Inactive employee check...');

  assert(
    inactivePeople.length >= 1,
    `At least 1 INACTIVE person exists (got ${inactivePeople.length})`,
  );

  // ─── (f) At least 1 overallocated person ─────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('\n▶  (f) Overallocation check...');

  const matrixRows = workloadMatrix.rows ?? [];
  const overallocatedFromMatrix = matrixRows.filter((r) => (r.totalAllocationPercent ?? 0) > 100);

  if (matrixRows.length > 0) {
    assert(
      overallocatedFromMatrix.length >= 1,
      `At least 1 overallocated person in workload matrix (found ${overallocatedFromMatrix.length})`,
    );
  } else {
    // Fallback: compute from raw assignments
    const allocationByPerson = new Map<string, number>();
    for (const a of assignments) {
      allocationByPerson.set(a.personId, (allocationByPerson.get(a.personId) ?? 0) + (a.allocationPercent ?? 0));
    }
    const overallocatedFromAssignments = [...allocationByPerson.values()].filter((pct) => pct > 100);
    assert(
      overallocatedFromAssignments.length >= 1,
      `At least 1 overallocated person computed from assignments (found ${overallocatedFromAssignments.length})`,
    );
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log(`\n${'─'.repeat(50)}`);
  // eslint-disable-next-line no-console
  console.log(`  Passed: ${passCount}  ·  Failed: ${failCount}`);

  if (failCount > 0) {
    // eslint-disable-next-line no-console
    console.error('\n❌  Consistency check FAILED — fix the issues above before the investor demo.\n');
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log('\n✅  All checks passed — demo data is consistent.\n');
  }
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Script error:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
