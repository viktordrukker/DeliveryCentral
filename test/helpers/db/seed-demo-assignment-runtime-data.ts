import type { PrismaClient } from '@prisma/client';

/**
 * SoT PR 16b — no-op shim. The legacy ProjectAssignment /
 * AssignmentApproval / AssignmentHistory tables were dropped by the
 * LEAN-P3-2 forward-only migration. Assignment-equivalent runtime data
 * (filled positions + approvals + history) is now sourced from
 * `seedDemoProjectRuntimeData` which writes `ProjectPosition` +
 * `ProjectPositionFillHistory` rows on the canonical aggregate.
 *
 * The exported function is retained as a no-op so existing call sites
 * keep compiling until they are migrated to call
 * `seedDemoProjectRuntimeData` directly. New tests should not call
 * this function.
 */
export async function seedDemoAssignmentRuntimeData(
  _prisma: PrismaClient,
): Promise<void> {
  return;
}
