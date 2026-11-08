/**
 * SoT PR 14b — Shared "assignment-shape view" over the canonical
 * `ProjectPosition` aggregate.
 *
 * Dashboard query services historically read from
 * `InMemoryProjectAssignmentRepository.findAll()` (a thin wrapper over the
 * legacy `prisma.projectAssignment` table) and reasoned about each row via
 * the `ProjectAssignment` domain entity's `isActiveAt(asOf)`, `personId`,
 * `projectId`, `validFrom`, `validTo`, `assignmentId`, `status.value`,
 * `requestedAt`, and `allocationPercent.value` accessors.
 *
 * Post-PR-14, the canonical staffing aggregate is `ProjectPosition`. Both
 * tables are still live (the Sprint-5 contract migration that drops the
 * legacy `ProjectAssignment` / `StaffingRequest` tables ships as a separate
 * PR after canonical readers are in place). This helper exposes a uniform
 * minimal shape — `PositionAssignmentView` — so the dashboard services can
 * source from `ProjectPosition` while keeping the rest of their logic
 * unchanged. The shape mirrors the assignment-domain getters that those
 * services actually use; no new fields are introduced.
 *
 * The mapping rules below match the canonical fillStatus → AssignmentStatus
 * pairing used by the lean migration backfill (S2-5):
 *   - `fillStatus`             ↔ `status.value`
 *   - `activePersonId`         ↔ `personId`    (nullable — DRAFT/OPEN/CANCELLED have none)
 *   - `projectId`              ↔ `projectId`
 *   - `activeValidFrom`        ↔ `validFrom`   (falls back to `startDate` for DRAFT/OPEN)
 *   - `activeValidTo`          ↔ `validTo`
 *   - `id`                     ↔ `assignmentId.value`
 *   - `activeAllocationPercent` ↔ `allocationPercent.value`
 *                              (falls back to `requiredAllocationPercent` when not booked)
 *   - `createdAt`              ↔ `requestedAt` (audit timestamp — both columns share semantics)
 *
 * Rows with `activePersonId === null` are EXCLUDED from the result: the
 * dashboard surfaces that consume this view care about "active fills"
 * (people currently slotted on a project). Unfilled demand is sourced from
 * other paths (positions with fillStatus OPEN/PROPOSED).
 */
import { ProjectPositionFillStatus } from '@prisma/client';

import type { PrismaService } from './prisma.service';
import { ACTIVE_FILL_STATUSES } from './bench-query';

export interface PositionAssignmentView {
  /** The owning ProjectPosition id (lean equivalent of legacy ProjectAssignment.id). */
  id: string;
  /** Active fill person — guaranteed non-null in the view. */
  personId: string;
  /** Project the position lives on. */
  projectId: string;
  /** Start of the active fill window. */
  validFrom: Date;
  /** End of the active fill window. NULL means open-ended. */
  validTo: Date | null;
  /** Canonical fillStatus, kept as the source-of-truth string. */
  status: ProjectPositionFillStatus;
  /** Percent allocation on the active fill (0–100). */
  allocationPercent: number;
  /** When the position row was first created (proxy for requestedAt). */
  requestedAt: Date;
  /**
   * Returns true when the position is in an active-fill state AND the
   * given target date falls within the fill window. Matches the legacy
   * `ProjectAssignment.isActiveAt` predicate one-for-one.
   */
  isActiveAt(targetDate: Date): boolean;
}

const ACTIVE_FILL_SET: ReadonlySet<ProjectPositionFillStatus> = new Set(ACTIVE_FILL_STATUSES);

/**
 * Loads ALL position fills (including history) in the canonical view shape.
 * Includes both currently-active and previously-active fills so callers can
 * still reason about historical assignments (e.g. weekly trend, future
 * pipeline, recently-changed). Rows with no `activePersonId` are omitted.
 */
export async function loadAllPositionAssignmentViews(
  prisma: PrismaService,
): Promise<PositionAssignmentView[]> {
  const rows = await prisma.projectPosition.findMany({
    where: { activePersonId: { not: null } },
    select: {
      id: true,
      projectId: true,
      activePersonId: true,
      activeValidFrom: true,
      activeValidTo: true,
      fillStatus: true,
      activeAllocationPercent: true,
      requiredAllocationPercent: true,
      startDate: true,
      createdAt: true,
    },
  });
  return rows.map((row) => buildView(row));
}

interface PositionRow {
  id: string;
  projectId: string;
  activePersonId: string | null;
  activeValidFrom: Date | null;
  activeValidTo: Date | null;
  fillStatus: ProjectPositionFillStatus;
  activeAllocationPercent: { toNumber(): number } | number | null;
  requiredAllocationPercent: { toNumber(): number } | number;
  startDate: Date;
  createdAt: Date;
}

function buildView(row: PositionRow): PositionAssignmentView {
  const allocation = row.activeAllocationPercent ?? row.requiredAllocationPercent;
  const allocationNumber =
    typeof allocation === 'number' ? allocation : Number(allocation.toNumber());
  const validFrom = row.activeValidFrom ?? row.startDate;
  return {
    id: row.id,
    personId: row.activePersonId as string,
    projectId: row.projectId,
    validFrom,
    validTo: row.activeValidTo,
    status: row.fillStatus,
    allocationPercent: allocationNumber,
    requestedAt: row.createdAt,
    isActiveAt(target: Date): boolean {
      if (!ACTIVE_FILL_SET.has(row.fillStatus)) return false;
      if (target < validFrom) return false;
      if (row.activeValidTo !== null && target > row.activeValidTo) return false;
      return true;
    },
  };
}
