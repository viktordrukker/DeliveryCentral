import { execSync } from 'node:child_process';

import { signPlatformJwt } from '../../src/modules/identity-access/application/platform-jwt';

type CheckStatus = 'fail' | 'pass' | 'warn';

type DrillName =
  | 'integration-sync-failure'
  | 'notification-degradation'
  | 'database-visibility'
  | 'assignment-conflict'
  | 'project-closure-override'
  | 'exception-queue-review';

interface DrillDefinition {
  description: string;
  endpoints: string[];
  exerciseCommand?: string;
  name: DrillName;
  relatedRoutes: string[];
}

interface DrillObservation {
  detail: string;
  name: string;
  status: CheckStatus;
}

interface ParsedArgs {
  drill: DrillName | 'all';
  exercise: boolean;
}

const drillDefinitions: Record<DrillName, DrillDefinition> = {
  'assignment-conflict': {
    description:
      'Review assignment approval, rejection, end, and optimistic-concurrency conflict visibility.',
    endpoints: ['/assignments?status=APPROVED', '/exceptions?limit=10', '/audit/business?limit=10'],
    exerciseCommand:
      'npm test -- --runInBand test/assignments/assignment-approval.spec.ts test/assignments/assignment-end.spec.ts',
    name: 'assignment-conflict',
    relatedRoutes: ['/assignments', '/exceptions', '/admin/audit'],
  },
  'database-visibility': {
    description:
      'Review health, readiness, and diagnostics visibility for database reachability and schema sanity.',
    endpoints: ['/health', '/readiness', '/diagnostics'],
    name: 'database-visibility',
    relatedRoutes: ['/admin/monitoring'],
  },
  'exception-queue-review': {
    description:
      'Review exception queue visibility and detail coverage for anomaly handling.',
    endpoints: ['/exceptions?limit=10', '/audit/business?limit=10'],
    exerciseCommand: 'npm test -- --runInBand test/exceptions/exceptions.spec.ts',
    name: 'exception-queue-review',
    relatedRoutes: ['/exceptions', '/admin/audit', '/admin/monitoring'],
  },
  'integration-sync-failure': {
    description:
      'Review degraded integration visibility through diagnostics, sync history, and reconciliation surfaces.',
    endpoints: [
      '/diagnostics',
      '/integrations/history',
      '/integrations/m365/directory/reconciliation',
      '/integrations/radius/reconciliation',
      '/exceptions?limit=10',
    ],
    exerciseCommand:
      'npm test -- --runInBand test/integration/api-negative/integrations-negative.integration.spec.ts',
    name: 'integration-sync-failure',
    relatedRoutes: ['/admin/integrations', '/exceptions', '/admin/monitoring'],
  },
  'notification-degradation': {
    description:
      'Review notification failure, retry, and operator-facing delivery outcome visibility.',
    endpoints: ['/diagnostics', '/notifications/outcomes', '/audit/business?limit=10'],
    exerciseCommand: 'npm test -- --runInBand test/notifications/notifications.spec.ts',
    name: 'notification-degradation',
    relatedRoutes: ['/admin/notifications', '/admin/monitoring', '/admin/audit'],
  },
  'project-closure-override': {
    description:
      'Review blocked project closure, override auditability, and exception visibility.',
    endpoints: ['/projects', '/exceptions?limit=10', '/audit/business?limit=10'],
    exerciseCommand: 'npm test -- --runInBand test/project-registry/project-closure.spec.ts',
    name: 'project-closure-override',
    relatedRoutes: ['/projects', '/exceptions', '/admin/audit'],
  },
};

const args = parseArgs(process.argv.slice(2));
const port = process.env.PORT ?? process.env.BACKEND_PORT ?? '3000';
const apiPrefix = (process.env.API_PREFIX ?? 'api').replace(/^\/+|\/+$/g, '');
const baseUrl =
  process.env.SELF_CHECK_BASE_URL ?? `http://127.0.0.1:${port}/${apiPrefix}`;
const authIssuer = process.env.AUTH_ISSUER ?? 'deliverycentral-local';
const authAudience = process.env.AUTH_AUDIENCE ?? 'deliverycentral-api';
const authSecret = process.env.AUTH_JWT_SECRET ?? 'deliverycentral-local-dev-secret';
const operatorPersonId =
  process.env.SELF_CHECK_PERSON_ID ??
  process.env.AUTH_DEV_BOOTSTRAP_PERSON_ID ??
  '11111111-1111-1111-1111-111111111004';

void main();

async function main(): Promise<void> {
  const selectedDrills =
    args.drill === 'all' ? Object.values(drillDefinitions) : [drillDefinitions[args.drill]];

  const token = signPlatformJwt(
    {
      person_id: operatorPersonId,
      roles: ['admin', 'director', 'hr_manager', 'project_manager', 'resource_manager'],
      sub: operatorPersonId,
    },
    {
      audience: authAudience,
      issuer: authIssuer,
      secret: authSecret,
    },
  );

  const payload: Array<{
    definition: DrillDefinition;
    exercise?: DrillObservation;
    observations: DrillObservation[];
  }> = [];

  for (const definition of selectedDrills) {
    const observations: DrillObservation[] = [];

    if (args.exercise && definition.exerciseCommand) {
      observations.push(runExercise(definition));
    }

    for (const endpoint of definition.endpoints) {
      observations.push(await observeEndpoint(endpoint, token));
    }

    payload.push({
      definition,
      observations,
    });
  }

  printPayload(payload);

  const failed = payload.flatMap((item) => item.observations).filter((item) => item.status === 'fail');
  if (failed.length > 0) {
    throw new Error(
      `Operator drill reported failures: ${failed.map((item) => item.name).join(', ')}.`,
    );
  }
}

function runExercise(definition: DrillDefinition): DrillObservation {
  if (!definition.exerciseCommand) {
    return {
      detail: 'No exercise command configured for this drill.',
      name: `${definition.name}: exercise`,
      status: 'warn',
    };
  }

  try {
    execSync(definition.exerciseCommand, {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    return {
      detail: `Exercise command passed: ${definition.exerciseCommand}`,
      name: `${definition.name}: exercise`,
      status: 'pass',
    };
  } catch (error) {
    const detail =
      error instanceof Error && 'stdout' in error
        ? String((error as { stdout?: Buffer | string }).stdout ?? '').trim() || error.message
        : 'Exercise command failed.';

    return {
      detail,
      name: `${definition.name}: exercise`,
      status: 'fail',
    };
  }
}

async function observeEndpoint(path: string, token: string): Promise<DrillObservation> {
  const result = await getJson(path, token);

  return {
    detail: result.ok ? summarizePayload(path, result.payload) : result.detail,
    name: path,
    status: result.ok ? classifyObservation(path, result.payload) : 'fail',
  };
}

function classifyObservation(path: string, payload: any): CheckStatus {
  if (path === '/health') {
    return payload?.status === 'ok' ? 'pass' : 'warn';
  }

  if (path === '/readiness') {
    return payload?.status === 'ready' ? 'pass' : 'warn';
  }

  if (path === '/diagnostics') {
    return payload?.database?.connected && payload?.migrations?.status === 'ready' ? 'pass' : 'warn';
  }

  return 'pass';
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

function summarizePayload(path: string, payload: any): string {
  if (path === '/diagnostics') {
    return [
      `database=${payload?.database?.connected ? 'connected' : 'down'}`,
      `migrations=${payload?.migrations?.status ?? 'unknown'}`,
      `integrations=${payload?.integrations?.overallStatus ?? 'unknown'}`,
      `notifications=${payload?.notifications?.ready ? 'ready' : 'degraded'}`,
    ].join(' ');
  }

  if (path === '/readiness') {
    return `status=${payload?.status ?? 'unknown'} checks=${payload?.checks?.length ?? 0}`;
  }

  if (path === '/health') {
    return `status=${payload?.status ?? 'unknown'} service=${payload?.service ?? 'unknown'}`;
  }

  if (Array.isArray(payload)) {
    return `items=${payload.length}`;
  }

  if (Array.isArray(payload?.items)) {
    return `items=${payload.items.length}`;
  }

  if (payload?.summary) {
    return `summary=${JSON.stringify(payload.summary)}`;
  }

  if (payload?.status) {
    return `status=${payload.status}`;
  }

  return 'Payload received.';
}

function printPayload(
  payload: Array<{
    definition: DrillDefinition;
    observations: DrillObservation[];
  }>,
): void {
  const rows = payload.flatMap((item) =>
    item.observations.map((observation) => ({
      Drill: item.definition.name,
      Observation: observation.name,
      Detail: observation.detail,
      Status: observation.status,
      Routes: item.definition.relatedRoutes.join(', '),
    })),
  );

  console.table(rows);
  process.stdout.write(
    `${JSON.stringify(
      {
        baseUrl,
        drills: payload.map((item) => ({
          description: item.definition.description,
          endpoints: item.definition.endpoints,
          exerciseCommand: item.definition.exerciseCommand ?? null,
          name: item.definition.name,
          observations: item.observations,
          relatedRoutes: item.definition.relatedRoutes,
        })),
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
}

function parseArgs(argv: string[]): ParsedArgs {
  let drill: DrillName | 'all' = 'all';
  let exercise = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--exercise') {
      exercise = true;
      continue;
    }

    if (value === '--drill') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('--drill requires a value.');
      }
      if (nextValue !== 'all' && !(nextValue in drillDefinitions)) {
        throw new Error(`Unsupported drill: ${nextValue}`);
      }
      drill = nextValue as DrillName | 'all';
      index += 1;
    }
  }

  return {
    drill,
    exercise,
  };
}
