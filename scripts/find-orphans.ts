#!/usr/bin/env ts-node
/**
 * DM-3 orphan finder.
 *
 * Runs one SELECT per (child table, FK column, parent table) combination and
 * reports any child rows whose FK value does not resolve to an existing parent.
 *
 * Usage:
 *   docker compose exec backend sh -c \
 *     "npx ts-node --transpile-only --project tsconfig.json scripts/find-orphans.ts"
 *
 * Exit code:
 *   0 — zero orphans across all checks
 *   1 — at least one orphan detected; grep the output for "ORPHAN" rows.
 *
 * Output:
 *   One line per check: "ok <child>.<column>" or "ORPHAN <child>.<column> count=<n> sample=<id>".
 *
 * What this script does NOT do:
 *   - No deletion. Cleanup is a separate, auditable operation run under change control.
 *   - No writes of any kind. Reads only.
 *   - Not a replacement for FK constraints. After DM-3 validates the constraints
 *     the DB itself makes orphan creation impossible; this script remains useful
 *     for the pre-validate pass and for the TEXT→UUID columns still awaiting DM-2.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

type OrphanCheck = {
  label: string;
  childTable: string;
  childColumn: string;
  parentTable: string;
  parentColumn: string;
  allowNull: boolean;
  blockedOnDm2?: string;
  /**
   * Parent column's SQL type. Default: uuid. Set to 'text' when the parent
   * is still a TEXT PK (pre-DM-2-contract tables like `skills.id`); the
   * cast helper will then skip the ::uuid cast and join directly.
   */
  parentColumnType?: 'text' | 'uuid';
};

const CHECKS: OrphanCheck[] = [
  // ---- UUID↔UUID FKs added in DM-3 migration 20260417_dm3_relation_closure ----
  { label: 'AuditLog.actorId → Person.id',                                     childTable: 'AuditLog',                           childColumn: 'actorId',                 parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'EmployeeActivityEvent.actorId → Person.id',                        childTable: 'EmployeeActivityEvent',              childColumn: 'actorId',                 parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'LocalAccount.personId → Person.id',                                childTable: 'LocalAccount',                       childColumn: 'personId',                parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'M365DirectoryReconciliationRecord.personId → Person.id',           childTable: 'M365DirectoryReconciliationRecord',  childColumn: 'personId',                parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'M365DirectoryReconciliationRecord.resolvedManagerPersonId → Person.id', childTable: 'M365DirectoryReconciliationRecord', childColumn: 'resolvedManagerPersonId', parentTable: 'Person', parentColumn: 'id', allowNull: true },
  { label: 'PersonExternalIdentityLink.resolvedManagerPersonId → Person.id',   childTable: 'PersonExternalIdentityLink',         childColumn: 'resolvedManagerPersonId', parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'overtime_policies.approvalCaseId → CaseRecord.id',                 childTable: 'overtime_policies',                  childColumn: 'approvalCaseId',          parentTable: 'CaseRecord', parentColumn: 'id', allowNull: true },
  { label: 'project_change_requests.requesterPersonId → Person.id',            childTable: 'project_change_requests',            childColumn: 'requesterPersonId',       parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'project_change_requests.decidedByPersonId → Person.id',            childTable: 'project_change_requests',            childColumn: 'decidedByPersonId',       parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'project_radiator_overrides.overriddenByPersonId → Person.id',      childTable: 'project_radiator_overrides',         childColumn: 'overriddenByPersonId',    parentTable: 'Person',     parentColumn: 'id', allowNull: false },
  { label: 'project_rag_snapshots.recordedByPersonId → Person.id',             childTable: 'project_rag_snapshots',              childColumn: 'recordedByPersonId',      parentTable: 'Person',     parentColumn: 'id', allowNull: false },
  { label: 'project_risks.ownerPersonId → Person.id',                          childTable: 'project_risks',                      childColumn: 'ownerPersonId',           parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'project_risks.assigneePersonId → Person.id',                       childTable: 'project_risks',                      childColumn: 'assigneePersonId',        parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'project_risks.relatedCaseId → CaseRecord.id',                      childTable: 'project_risks',                      childColumn: 'relatedCaseId',           parentTable: 'CaseRecord', parentColumn: 'id', allowNull: true },
  { label: 'radiator_threshold_configs.updatedByPersonId → Person.id',         childTable: 'radiator_threshold_configs',         childColumn: 'updatedByPersonId',       parentTable: 'Person',     parentColumn: 'id', allowNull: true },
  { label: 'RadiusReconciliationRecord.personId → Person.id',                  childTable: 'RadiusReconciliationRecord',         childColumn: 'personId',                parentTable: 'Person',     parentColumn: 'id', allowNull: true },

  // ---- TEXT→UUID columns still awaiting DM-2 (reported for orphans, FK not yet installed) ----
  { label: 'timesheet_weeks.personId → Person.id',           childTable: 'timesheet_weeks',           childColumn: 'personId',        parentTable: 'Person',            parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert timesheet_weeks.personId from TEXT to uuid' },
  { label: 'timesheet_weeks.approvedBy → Person.id',         childTable: 'timesheet_weeks',           childColumn: 'approvedBy',      parentTable: 'Person',            parentColumn: 'id', allowNull: true,  blockedOnDm2: 'DM-2 must convert timesheet_weeks.approvedBy from TEXT to uuid' },
  { label: 'timesheet_entries.projectId → Project.id',       childTable: 'timesheet_entries',         childColumn: 'projectId',       parentTable: 'Project',           parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert timesheet_entries.projectId from TEXT to uuid' },
  { label: 'timesheet_entries.assignmentId → Project...',    childTable: 'timesheet_entries',         childColumn: 'assignmentId',    parentTable: 'ProjectAssignment', parentColumn: 'id', allowNull: true,  blockedOnDm2: 'DM-2 must convert timesheet_entries.assignmentId from TEXT to uuid' },
  { label: 'leave_requests.personId → Person.id',            childTable: 'leave_requests',            childColumn: 'personId',        parentTable: 'Person',            parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert leave_requests.personId from TEXT to uuid' },
  { label: 'leave_requests.reviewedBy → Person.id',          childTable: 'leave_requests',            childColumn: 'reviewedBy',      parentTable: 'Person',            parentColumn: 'id', allowNull: true,  blockedOnDm2: 'DM-2 must convert leave_requests.reviewedBy from TEXT to uuid' },
  { label: 'pulse_entries.personId → Person.id',             childTable: 'pulse_entries',             childColumn: 'personId',        parentTable: 'Person',            parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert pulse_entries.personId from TEXT to uuid' },
  { label: 'in_app_notifications.recipientPersonId → ...',   childTable: 'in_app_notifications',      childColumn: 'recipientPersonId', parentTable: 'Person',          parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert in_app_notifications.recipientPersonId from TEXT to uuid' },
  { label: 'period_locks.lockedBy → Person.id',              childTable: 'period_locks',              childColumn: 'lockedBy',        parentTable: 'Person',            parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert period_locks.lockedBy from TEXT to uuid' },
  { label: 'project_budgets.projectId → Project.id',         childTable: 'project_budgets',           childColumn: 'projectId',       parentTable: 'Project',           parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert project_budgets.projectId from TEXT to uuid' },
  { label: 'person_cost_rates.personId → Person.id',         childTable: 'person_cost_rates',         childColumn: 'personId',        parentTable: 'Person',            parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert person_cost_rates.personId from TEXT to uuid' },
  { label: 'person_skills.personId → Person.id',             childTable: 'person_skills',             childColumn: 'personId',        parentTable: 'Person',            parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert person_skills.personId from TEXT to uuid' },
  { label: 'person_skills.skillId → skills.id',              childTable: 'person_skills',             childColumn: 'skillId',         parentTable: 'skills',            parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert person_skills.skillId + skills.id from TEXT to uuid (lockstep)', parentColumnType: 'text' },
  { label: 'staffing_requests.projectId → Project.id',       childTable: 'staffing_requests',         childColumn: 'projectId',       parentTable: 'Project',           parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert staffing_requests.projectId from TEXT to uuid' },
  { label: 'staffing_requests.requestedByPersonId → ...',    childTable: 'staffing_requests',         childColumn: 'requestedByPersonId', parentTable: 'Person',         parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert staffing_requests.requestedByPersonId from TEXT to uuid' },
  { label: 'staffing_request_fulfilments.assignedPersonId',  childTable: 'staffing_request_fulfilments', childColumn: 'assignedPersonId', parentTable: 'Person',         parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert staffing_request_fulfilments.assignedPersonId from TEXT to uuid' },
  { label: 'staffing_request_fulfilments.proposedByPersonId', childTable: 'staffing_request_fulfilments', childColumn: 'proposedByPersonId', parentTable: 'Person',       parentColumn: 'id', allowNull: false, blockedOnDm2: 'DM-2 must convert staffing_request_fulfilments.proposedByPersonId from TEXT to uuid' },
];

type Result = {
  check: OrphanCheck;
  orphanCount: number;
  sampleId: string | null;
  error: string | null;
};

async function runCheck(c: OrphanCheck): Promise<Result> {
  // For TEXT→UUID mismatches the child value has to be cast to uuid so the join
  // can match the uuid parent. For TEXT→TEXT (e.g. person_skills.skillId → skills.id
  // pre-DM-2-contract) the cast is the wrong move — the parent is also TEXT.
  // `parentColumnType === 'text'` lets the check opt into direct comparison.
  const childCastExpr =
    c.blockedOnDm2 && c.parentColumnType !== 'text'
      ? `NULLIF(child."${c.childColumn}", '')::uuid`
      : `child."${c.childColumn}"`;

  const nullPredicate = c.allowNull ? `child."${c.childColumn}" IS NOT NULL AND` : '';
  const sql = `
    SELECT child."${c.childColumn}" AS orphan_value, COUNT(*)::int AS cnt
    FROM "${c.childTable}" child
    LEFT JOIN "${c.parentTable}" parent
      ON parent."${c.parentColumn}" = ${childCastExpr}
    WHERE ${nullPredicate} parent."${c.parentColumn}" IS NULL
    GROUP BY child."${c.childColumn}"
    LIMIT 5;
  `;

  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ orphan_value: string; cnt: number }>>(sql);
    const orphanCount = rows.reduce((acc, r) => acc + r.cnt, 0);
    const sampleId = rows.length > 0 ? rows[0].orphan_value : null;
    return { check: c, orphanCount, sampleId, error: null };
  } catch (e) {
    return { check: c, orphanCount: 0, sampleId: null, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const results: Result[] = [];
  for (const c of CHECKS) {
    results.push(await runCheck(c));
  }

  let orphansFound = 0;
  let errorsEncountered = 0;

  for (const r of results) {
    const blockedTag = r.check.blockedOnDm2 ? ' [BLOCKED_ON_DM2]' : '';
    if (r.error) {
      errorsEncountered++;
      console.error(`ERROR ${r.check.childTable}.${r.check.childColumn}${blockedTag} — ${r.error}`);
      continue;
    }
    if (r.orphanCount === 0) {
      console.log(`ok    ${r.check.childTable}.${r.check.childColumn}${blockedTag}`);
    } else {
      orphansFound += r.orphanCount;
      console.log(`ORPHAN ${r.check.childTable}.${r.check.childColumn}${blockedTag} count=${r.orphanCount} sample=${r.sampleId ?? '<null>'}`);
    }
  }

  console.log(`\nSummary: ${orphansFound} orphan row(s) across ${results.length} check(s); ${errorsEncountered} error(s).`);

  await prisma.$disconnect();
  process.exit(orphansFound > 0 || errorsEncountered > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(2);
});
