import { execSync } from 'node:child_process';

import { signPlatformJwt } from '../../src/modules/identity-access/application/platform-jwt';

type CheckStatus = 'fail' | 'pass' | 'warn';

interface CheckResult {
  detail: string;
  name: string;
  status: CheckStatus;
}

interface ParsedArgs {
  includeTestBaseline: boolean;
  strict: boolean;
}

const args = parseArgs(process.argv.slice(2));
const port = process.env.PORT ?? process.env.BACKEND_PORT ?? '3000';
const apiPrefix = (process.env.API_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '');
const baseUrl =
  process.env.SELF_CHECK_BASE_URL ?? `http://127.0.0.1:${port}/${apiPrefix}`;
const authIssuer = process.env.AUTH_ISSUER ?? 'deliverycentral-local';
const authAudience = process.env.AUTH_AUDIENCE ?? 'deliverycentral-api';
const authSecret = process.env.AUTH_JWT_SECRET ?? 'deliverycentral-local-dev-secret';
const selfCheckPersonId =
  process.env.SELF_CHECK_PERSON_ID ??
  process.env.AUTH_DEV_BOOTSTRAP_PERSON_ID ??
  '11111111-1111-1111-1111-111111111004';

void main();

async function main(): Promise<void> {
  const token = signPlatformJwt(
    {
      person_id: selfCheckPersonId,
      roles: ['admin', 'director', 'hr_manager', 'project_manager', 'resource_manager'],
      sub: selfCheckPersonId,
    },
    {
      audience: authAudience,
      issuer: authIssuer,
      secret: authSecret,
    },
  );

  const results: CheckResult[] = [];

  const health = await getJson('/health');
  results.push({
    detail: `status=${health.payload?.status ?? 'unknown'} service=${health.payload?.service ?? 'unknown'}`,
    name: 'Health endpoint',
    status: health.ok && health.payload?.status === 'ok' ? 'pass' : 'fail',
  });

  const readiness = await getJson('/readiness');
  results.push({
    detail: readiness.ok
      ? `status=${readiness.payload?.status ?? 'unknown'} checks=${readiness.payload?.checks?.length ?? 0}`
      : readiness.detail,
    name: 'Readiness endpoint',
    status: !readiness.ok ? 'fail' : readiness.payload?.status === 'ready' ? 'pass' : 'warn',
  });

  const diagnostics = await getJson('/diagnostics');
  results.push({
    detail: diagnostics.ok
      ? `database=${diagnostics.payload?.database?.connected ? 'connected' : 'down'} migrations=${diagnostics.payload?.migrations?.status ?? 'unknown'}`
      : diagnostics.detail,
    name: 'Diagnostics endpoint',
    status: diagnostics.ok ? 'pass' : 'fail',
  });

  if (diagnostics.ok) {
    results.push({
      detail: diagnostics.payload.database.connected
        ? `latencyMs=${diagnostics.payload.database.latencyMs ?? 'n/a'} schemaHealthy=${diagnostics.payload.database.schemaHealthy}`
        : diagnostics.payload.database.error ?? 'Database diagnostics unavailable.',
      name: 'Persistence durability path',
      status:
        diagnostics.payload.database.connected && diagnostics.payload.database.schemaHealthy
          ? 'pass'
          : 'fail',
    });

    results.push({
      detail:
        diagnostics.payload.migrations.status === 'ready'
          ? `applied=${diagnostics.payload.migrations.appliedCount}/${diagnostics.payload.migrations.availableLocalCount}`
          : diagnostics.payload.migrations.error ??
            `pendingLocal=${diagnostics.payload.migrations.pendingLocalCount}`,
      name: 'Migrations applied',
      status: diagnostics.payload.migrations.status === 'ready' ? 'pass' : 'fail',
    });

    results.push({
      detail:
        diagnostics.payload.integrations.overallStatus === 'ready'
          ? `configured=${diagnostics.payload.integrations.configuredCount} degraded=${diagnostics.payload.integrations.degradedCount}`
          : `configured=${diagnostics.payload.integrations.configuredCount} degraded=${diagnostics.payload.integrations.degradedCount}`,
      name: 'Integration health',
      status:
        diagnostics.payload.integrations.overallStatus === 'ready' ? 'pass' : 'warn',
    });

    results.push({
      detail: diagnostics.payload.notifications.summary,
      name: 'Notification readiness',
      status: diagnostics.payload.notifications.ready ? 'pass' : 'warn',
    });

    results.push({
      detail: `auditRecords=${diagnostics.payload.auditVisibility.totalBusinessAuditRecords} lastAt=${diagnostics.payload.auditVisibility.lastBusinessAuditAt ?? 'none'}`,
      name: 'Audit visibility',
      status:
        diagnostics.payload.auditVisibility.totalBusinessAuditRecords > 0 ? 'pass' : 'warn',
    });
  }

  results.push(...buildAuthChecks());

  const endpointChecks = await Promise.all([
    authGetJson('/org/people?page=1&pageSize=10', token, 'Employee directory'),
    authGetJson('/projects', token, 'Project registry'),
    authGetJson('/assignments?status=APPROVED', token, 'Assignments list'),
    authGetJson(`/dashboard/employee/11111111-1111-1111-1111-111111111008?asOf=2026-04-04T00:00:00.000Z`, token, 'Employee dashboard'),
    authGetJson('/exceptions?limit=5', token, 'Exception queue'),
    authGetJson('/audit/business?limit=5', token, 'Business audit API'),
    authGetJson('/notifications/outcomes', token, 'Notification outcomes API'),
  ]);
  results.push(...endpointChecks);

  if (args.includeTestBaseline) {
    results.push(runBaselineTestCommand());
  } else {
    results.push({
      detail: 'Skipped. Re-run with --include-test-baseline to execute the curated backend baseline suite.',
      name: 'Test baseline health',
      status: 'warn',
    });
  }

  printResults(results);

  const failedChecks = results.filter((result) => result.status === 'fail');
  const warnedChecks = results.filter((result) => result.status === 'warn');

  if (failedChecks.length > 0) {
    throw new Error(
      `Platform self-check failed: ${failedChecks.map((result) => result.name).join(', ')}.`,
    );
  }

  if (args.strict && warnedChecks.length > 0) {
    throw new Error(
      `Platform self-check strict mode rejected warnings: ${warnedChecks
        .map((result) => result.name)
        .join(', ')}.`,
    );
  }
}

function buildAuthChecks(): CheckResult[] {
  const results: CheckResult[] = [];
  const hasIssuer = authIssuer.trim().length > 0;
  const hasAudience = authAudience.trim().length > 0;
  const hasSecret = authSecret.trim().length > 0;
  const usingDefaultSecret = authSecret === 'deliverycentral-local-dev-secret';
  const allowTestHeaders = process.env.AUTH_ALLOW_TEST_HEADERS === 'true';
  const bootstrapEnabled = process.env.AUTH_DEV_BOOTSTRAP_ENABLED === 'true';

  results.push({
    detail: hasIssuer && hasAudience && hasSecret ? 'Issuer, audience, and signing secret are present.' : 'AUTH_ISSUER, AUTH_AUDIENCE, or AUTH_JWT_SECRET is missing.',
    name: 'Auth configured',
    status: hasIssuer && hasAudience && hasSecret ? 'pass' : 'fail',
  });

  results.push({
    detail: allowTestHeaders
      ? 'AUTH_ALLOW_TEST_HEADERS=true'
      : 'Header bypass disabled.',
    name: 'Header auth bypass',
    status: allowTestHeaders ? 'warn' : 'pass',
  });

  results.push({
    detail: bootstrapEnabled
      ? 'AUTH_DEV_BOOTSTRAP_ENABLED=true'
      : 'Development bootstrap identity disabled.',
    name: 'Dev bootstrap identity',
    status: bootstrapEnabled ? 'warn' : 'pass',
  });

  results.push({
    detail: usingDefaultSecret
      ? 'Using local default JWT secret.'
      : 'JWT signing secret is not the local default.',
    name: 'JWT secret hardening',
    status: usingDefaultSecret ? 'warn' : 'pass',
  });

  return results;
}

function runBaselineTestCommand(): CheckResult {
  const command =
    'npm test -- --runInBand test/performance/bank-scale-profile.performance.spec.ts';

  try {
    execSync(command, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    return {
      detail: 'Curated backend baseline suite passed.',
      name: 'Test baseline health',
      status: 'pass',
    };
  } catch (error) {
    const detail =
      error instanceof Error && 'stdout' in error
        ? String((error as any).stdout ?? '').trim() || error.message
        : 'Baseline test command failed.';

    return {
      detail,
      name: 'Test baseline health',
      status: 'fail',
    };
  }
}

async function authGetJson(path: string, token: string, name: string): Promise<CheckResult> {
  const result = await getJson(path, token);

  return {
    detail: result.ok ? summarizePayload(result.payload) : result.detail,
    name,
    status: result.ok ? 'pass' : 'fail',
  };
}

async function getJson(
  path: string,
  token?: string,
): Promise<{ detail: string; ok: boolean; payload: any }> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
    const payload = await parseResponse(response);

    if (!response.ok) {
      return {
        detail: `HTTP ${response.status}: ${payload?.message ?? 'request failed'}`,
        ok: false,
        payload,
      };
    }

    return {
      detail: 'ok',
      ok: true,
      payload,
    };
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : 'Request failed.',
      ok: false,
      payload: null,
    };
  }
}

async function parseResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

function summarizePayload(payload: any): string {
  if (payload === null || payload === undefined) {
    return 'No payload.';
  }

  if (Array.isArray(payload)) {
    return `items=${payload.length}`;
  }

  if (Array.isArray(payload.items)) {
    return `items=${payload.items.length}`;
  }

  if (payload.summary) {
    return `summary=${JSON.stringify(payload.summary)}`;
  }

  if (payload.status) {
    return `status=${payload.status}`;
  }

  return 'Payload received.';
}

function printResults(results: CheckResult[]): void {
  console.table(
    results.map((result) => ({
      Check: result.name,
      Detail: result.detail,
      Status: result.status,
    })),
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        baseUrl,
        checks: results,
        generatedAt: new Date().toISOString(),
        strict: args.strict,
      },
      null,
      2,
    )}\n`,
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  const values = new Set(argv.filter((value) => value.startsWith('--')));

  return {
    includeTestBaseline:
      values.has('--include-test-baseline') ||
      process.env.SELF_CHECK_INCLUDE_TEST_BASELINE === 'true',
    strict: values.has('--strict') || process.env.SELF_CHECK_STRICT === 'true',
  };
}
