import { bankScaleDatasetSummary } from '../../prisma/seeds/bank-scale-profile';
import { signPlatformJwt } from '../../src/modules/identity-access/application/platform-jwt';

interface PerformanceCheck {
  name: string;
  path: string;
  summarize: (payload: any) => string;
  thresholdMs: number;
}

interface ParsedArgs {
  enforceThresholds: boolean;
  outputJson?: string;
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = process.env.PERF_BASE_URL ?? 'http://127.0.0.1:3000/api';
const issuer = process.env.AUTH_ISSUER ?? 'deliverycentral-local';
const audience = process.env.AUTH_AUDIENCE ?? 'deliverycentral-api';
const secret = process.env.AUTH_JWT_SECRET ?? 'deliverycentral-local-dev-secret';

const token = signPlatformJwt(
  {
    person_id: bankScaleDatasetSummary.benchmarkReferences.hrDashboardPersonId,
    roles: ['admin', 'director', 'hr_manager', 'project_manager', 'resource_manager'],
    sub: bankScaleDatasetSummary.benchmarkReferences.hrDashboardPersonId,
  },
  {
    audience,
    issuer,
    secret,
  },
);

const checks: PerformanceCheck[] = [
  {
    name: 'Org people list',
    path: `/org/people?page=1&pageSize=200`,
    summarize: (payload) => `items=${payload.items?.length ?? 0} total=${payload.total ?? 0}`,
    thresholdMs: 1500,
  },
  {
    name: 'Org people by department',
    path: `/org/people?page=1&pageSize=200&departmentId=${bankScaleDatasetSummary.benchmarkReferences.departmentId}`,
    summarize: (payload) => `items=${payload.items?.length ?? 0} total=${payload.total ?? 0}`,
    thresholdMs: 1500,
  },
  {
    name: 'Project registry list',
    path: `/projects`,
    summarize: (payload) => `projects=${payload.items?.length ?? payload.projects?.length ?? 0}`,
    thresholdMs: 1500,
  },
  {
    name: 'Assignment list',
    path: `/assignments?status=ACTIVE`,
    summarize: (payload) => `items=${payload.items?.length ?? 0}`,
    thresholdMs: 2000,
  },
  {
    name: 'Assignment list by person',
    path: `/assignments?personId=${bankScaleDatasetSummary.benchmarkReferences.employeePersonId}`,
    summarize: (payload) => `items=${payload.items?.length ?? 0}`,
    thresholdMs: 1500,
  },
  {
    name: 'Project detail',
    path: `/projects/${bankScaleDatasetSummary.benchmarkReferences.projectId}`,
    summarize: (payload) => `status=${payload.status ?? 'unknown'} version=${payload.version ?? 'n/a'}`,
    thresholdMs: 1000,
  },
  {
    name: 'Employee dashboard',
    path: `/dashboard/employee/${bankScaleDatasetSummary.benchmarkReferences.employeePersonId}?asOf=2026-04-04T00:00:00.000Z`,
    summarize: (payload) =>
      `currentAssignments=${payload.currentAssignments?.length ?? 0} evidence=${payload.recentWorkEvidenceSummary?.recentEntryCount ?? 0}`,
    thresholdMs: 2000,
  },
  {
    name: 'Project manager dashboard',
    path: `/dashboard/project-manager/${bankScaleDatasetSummary.benchmarkReferences.projectManagerPersonId}?asOf=2026-04-04T00:00:00.000Z`,
    summarize: (payload) => `managedProjects=${payload.managedProjects?.length ?? 0}`,
    thresholdMs: 2500,
  },
  {
    name: 'HR dashboard',
    path: `/dashboard/hr-manager/${bankScaleDatasetSummary.benchmarkReferences.hrDashboardPersonId}?asOf=2026-04-04T00:00:00.000Z`,
    summarize: (payload) => `headcount=${payload.headcountSummary?.totalHeadcount ?? 0}`,
    thresholdMs: 2500,
  },
  {
    name: 'Resource manager dashboard',
    path: `/dashboard/resource-manager/${bankScaleDatasetSummary.benchmarkReferences.resourceManagerPersonId}?asOf=2026-04-04T00:00:00.000Z`,
    summarize: (payload) => `managedTeams=${payload.summary?.managedTeamCount ?? 0}`,
    thresholdMs: 1500,
  },
  {
    name: 'Workload summary',
    path: `/dashboard/workload/summary?asOf=2026-04-04T00:00:00.000Z`,
    summarize: (payload) => `activeProjects=${payload.totalActiveProjects ?? 0}`,
    thresholdMs: 1000,
  },
  {
    name: 'Planned vs actual',
    path: `/dashboard/workload/planned-vs-actual?projectId=${bankScaleDatasetSummary.benchmarkReferences.projectId}&asOf=2026-04-04T00:00:00.000Z`,
    summarize: (payload) =>
      `assignedNoEvidence=${payload.assignedButNoEvidence?.length ?? 0} anomalies=${payload.anomalies?.length ?? 0}`,
    thresholdMs: 2000,
  },
  {
    name: 'Exception queue',
    path: `/exceptions?limit=50&asOf=2026-04-04T00:00:00.000Z`,
    summarize: (payload) => `items=${payload.items?.length ?? 0}`,
    thresholdMs: 2500,
  },
  {
    name: 'Team dashboard',
    path: `/teams/${bankScaleDatasetSummary.benchmarkReferences.teamId}/dashboard`,
    summarize: (payload) => `members=${payload.memberCount ?? payload.summary?.memberCount ?? 0}`,
    thresholdMs: 2000,
  },
];

void main();

async function main(): Promise<void> {
  const results = [];

  for (const check of checks) {
    const startedAt = Date.now();
    const response = await fetch(`${baseUrl}${check.path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const elapsedMs = Date.now() - startedAt;
    const payload = await parseJson(response);

    if (!response.ok) {
      throw new Error(
        `${check.name} failed with ${response.status}. ${payload?.message ?? 'No error payload returned.'}`,
      );
    }

    results.push({
      elapsedMs,
      endpoint: check.path,
      name: check.name,
      sample: check.summarize(payload),
      status: response.status,
      thresholdMs: check.thresholdMs,
      withinThreshold: elapsedMs <= check.thresholdMs,
    });
  }

  console.table(
    results.map((result) => ({
      Endpoint: result.name,
      Ms: result.elapsedMs,
      Sample: result.sample,
      ThresholdMs: result.thresholdMs,
      WithinThreshold: result.withinThreshold ? 'yes' : 'no',
    })),
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    profile: bankScaleDatasetSummary,
    results,
  };

  if (args.outputJson) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(args.outputJson, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }

  if (args.enforceThresholds) {
    const failedChecks = results.filter((result) => !result.withinThreshold);
    if (failedChecks.length > 0) {
      throw new Error(
        `Performance thresholds exceeded for: ${failedChecks.map((result) => result.name).join(', ')}.`,
      );
    }
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        checkedEndpoints: results.length,
        enforceThresholds: args.enforceThresholds,
        profileCounts: bankScaleDatasetSummary.counts,
      },
      null,
      2,
    )}\n`,
  );
}

async function parseJson(response: Response): Promise<any> {
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

function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith('--')) {
      values.set(key, 'true');
      continue;
    }

    values.set(key, next);
    index += 1;
  }

  return {
    enforceThresholds:
      values.get('enforce-thresholds') === 'true' ||
      process.env.PERF_ENFORCE_THRESHOLDS === 'true',
    outputJson: values.get('output-json') ?? process.env.PERF_OUTPUT_JSON,
  };
}
