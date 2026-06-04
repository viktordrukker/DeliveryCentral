#!/usr/bin/env ts-node
/**
 * LEAN-P2-9 — soak monitor.
 *
 * Pulls the daily parity snapshot from the admin endpoint
 * `GET /api/admin/lean-migration/parity` (or, with `--direct`, from a
 * live Prisma client) and writes the result to
 * `docs/planning/lean-migration-soak-log/YYYY-MM-DD.json`.
 *
 * This script is a passive observer. It does NOT flip `dsRefresh` or
 * `workspaceMe` defaults, deploy anything, or alter app state. The C0
 * cutover (the flag flip) lives elsewhere — see
 * `docs/planning/lean-migration-c0-exit-checklist.md`.
 *
 * Usage:
 *   # Read via the live admin endpoint (recommended for staging soak).
 *   API_BASE=https://deliverit-test-v2.agentic.uz \
 *     ADMIN_BEARER=<token> \
 *     npx ts-node --transpile-only \
 *     --project tsconfig.json scripts/lean-migration-soak-monitor.ts
 *
 *   # Read directly from the DB (CI / cron contexts).
 *   docker compose exec backend \
 *     sh -c "npx ts-node --transpile-only \
 *       --project tsconfig.json scripts/lean-migration-soak-monitor.ts --direct"
 *
 * Exit code:
 *   0 — snapshot captured and written
 *   1 — fetch failed / divergence above threshold
 *   2 — unhandled runtime error
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

interface SoakSnapshot {
  capturedAt: string;
  projectPositionCount: number;
  projectAssignmentCount: number;
  staffingRequestCount: number;
  positionsLinkedToAssignment: number;
  positionsLinkedToStaffingRequest: number;
  positionsWithOrphanedAssignmentLink: number;
  positionsWithOrphanedStaffingRequestLink: number;
  assignmentsWithoutPosition: number;
  staffingRequestsWithoutPosition: number;
  divergenceCount: number;
}

const SOAK_LOG_DIR = resolve(
  __dirname,
  '..',
  'docs',
  'planning',
  'lean-migration-soak-log',
);

function todayStamp(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function fetchViaApi(apiBase: string, bearer: string): Promise<SoakSnapshot> {
  const url = `${apiBase.replace(/\/$/, '')}/api/admin/lean-migration/parity`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) {
    throw new Error(`Parity endpoint returned HTTP ${res.status} from ${url}`);
  }
  return (await res.json()) as SoakSnapshot;
}

async function fetchDirect(): Promise<SoakSnapshot> {
  // Lazy-import Prisma + service so the API-only path does not require
  // a live DATABASE_URL. We use a raw PrismaClient here (not PrismaService)
  // because the service expects DI-provided AppConfig + PublicIdService —
  // both irrelevant to the read-only count queries we run here.
  const { PrismaClient } = await import('@prisma/client');
  const { LeanMigrationParityService } = await import(
    '../src/modules/admin/application/lean-migration-parity.service'
  );
  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    // The service only reads via `count()` + `$queryRawUnsafe`, both
    // present on PrismaClient; the structural type matches at runtime.
    const svc = new LeanMigrationParityService(
      prisma as unknown as ConstructorParameters<typeof LeanMigrationParityService>[0],
    );
    return await svc.snapshot();
  } finally {
    await prisma.$disconnect();
  }
}

export function writeSnapshot(snapshot: SoakSnapshot, stamp: string = todayStamp()): string {
  mkdirSync(SOAK_LOG_DIR, { recursive: true });
  const path = resolve(SOAK_LOG_DIR, `${stamp}.json`);
  writeFileSync(path, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf-8');
  return path;
}

export function summarizeSnapshot(snapshot: SoakSnapshot): string {
  const lines = [
    `Lean migration soak snapshot @ ${snapshot.capturedAt}`,
    `  ProjectPosition:      ${snapshot.projectPositionCount}`,
    `  ProjectAssignment:    ${snapshot.projectAssignmentCount}`,
    `  StaffingRequest:      ${snapshot.staffingRequestCount}`,
    `  linked-to-assignment:    ${snapshot.positionsLinkedToAssignment}`,
    `  linked-to-staffingreq:   ${snapshot.positionsLinkedToStaffingRequest}`,
    `  orphan assignment link:  ${snapshot.positionsWithOrphanedAssignmentLink}`,
    `  orphan staffing link:    ${snapshot.positionsWithOrphanedStaffingRequestLink}`,
    `  assignments w/o pos:     ${snapshot.assignmentsWithoutPosition}`,
    `  staffingreq w/o pos:     ${snapshot.staffingRequestsWithoutPosition}`,
    `  divergence (sum):        ${snapshot.divergenceCount}`,
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const direct = process.argv.includes('--direct');
  const apiBase = process.env.API_BASE ?? '';
  const bearer = process.env.ADMIN_BEARER ?? '';

  let snapshot: SoakSnapshot;
  if (direct) {
    snapshot = await fetchDirect();
  } else {
    if (!apiBase || !bearer) {
      throw new Error(
        'Set API_BASE + ADMIN_BEARER, or pass --direct to read from Prisma in-process.',
      );
    }
    snapshot = await fetchViaApi(apiBase, bearer);
  }

  const path = writeSnapshot(snapshot);
  console.log(summarizeSnapshot(snapshot));
  console.log(`\nWrote ${path}`);

  // Non-zero exit if any divergence — caller can decide whether to alert.
  if (snapshot.divergenceCount > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.stack : e);
    process.exit(2);
  });
}
