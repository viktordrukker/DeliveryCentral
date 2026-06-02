/**
 * LEAN-P0-2 — single import-point for legacy → lean enum mappings.
 *
 * V2 Master Plan Phase 0 / LEAN-P0-2. Documented in
 * `docs/planning/lean-enum-mapping.md`. The audit doc at
 * `docs/planning/lean-data-shape-audit.md` is the source of truth for the
 * mapping table; this module is the executable form.
 *
 * Three enums are covered:
 *  1. AssignmentStatus → ProjectPositionFillStatus (11 → 8 collapse)
 *  2. StaffingRequestStatus → ProjectPositionFillStatus (5 → subset)
 *  3. StaffingRequestProposalCandidateDecision → ProjectPositionCandidateDecision (1:1)
 *
 * Behaviour: exhaustive switch — TypeScript enforces all cases via the
 * `never` default branch. Calling with a value outside the declared enum
 * throws `UnknownLegacyEnumValueError`.
 *
 * NB: `AssignmentStatus` already has a mapper in
 * `src/modules/project-positions/domain/value-objects/position-fill-status.ts`
 * (`mapLegacyAssignmentStatus`). That mapper accepts a free-text `string`
 * (it tolerates pre-CSW values that no longer appear in the Prisma enum)
 * and falls back to DRAFT for unknowns. The helper here is stricter — it
 * accepts the current Prisma enum only and throws on unknowns, which is
 * what production code paths want.
 */

import {
  AssignmentStatus,
  ProjectPositionCandidateDecision,
  ProjectPositionFillStatus,
  StaffingRequestProposalCandidateDecision,
  StaffingRequestStatus,
} from '@prisma/client';

export class UnknownLegacyEnumValueError extends Error {
  public constructor(enumName: string, value: unknown) {
    super(`Unknown ${enumName} value: ${String(value)}`);
    this.name = 'UnknownLegacyEnumValueError';
  }
}

/**
 * Map a legacy `AssignmentStatus` to a lean `ProjectPositionFillStatus`.
 *
 * Lossy collapses (documented in `lean-enum-mapping.md`):
 *  - IN_REVIEW → PROPOSED (review folds into the proposal state)
 *  - REJECTED → RELEASED (reason preserved in `rejectionReason`)
 *  - COMPLETED → RELEASED (reason preserved in `releaseReason`)
 *  - CANCELLED → RELEASED (reason preserved in `cancellationReason`)
 *  - CREATED → OPEN
 *
 * 1:1 mappings: DRAFT, PROPOSED, BOOKED, ONBOARDING, ASSIGNED, ON_HOLD.
 */
export function mapAssignmentStatusToFillStatus(
  status: AssignmentStatus,
): ProjectPositionFillStatus {
  switch (status) {
    case AssignmentStatus.DRAFT:
      return ProjectPositionFillStatus.DRAFT;
    case AssignmentStatus.CREATED:
      return ProjectPositionFillStatus.OPEN;
    case AssignmentStatus.PROPOSED:
      return ProjectPositionFillStatus.PROPOSED;
    case AssignmentStatus.IN_REVIEW:
      return ProjectPositionFillStatus.PROPOSED;
    case AssignmentStatus.REJECTED:
      return ProjectPositionFillStatus.RELEASED;
    case AssignmentStatus.BOOKED:
      return ProjectPositionFillStatus.BOOKED;
    case AssignmentStatus.ONBOARDING:
      return ProjectPositionFillStatus.ONBOARDING;
    case AssignmentStatus.ASSIGNED:
      return ProjectPositionFillStatus.ASSIGNED;
    case AssignmentStatus.ON_HOLD:
      return ProjectPositionFillStatus.ON_HOLD;
    case AssignmentStatus.COMPLETED:
      return ProjectPositionFillStatus.RELEASED;
    case AssignmentStatus.CANCELLED:
      return ProjectPositionFillStatus.RELEASED;
    default: {
      const exhaustive: never = status;
      throw new UnknownLegacyEnumValueError('AssignmentStatus', exhaustive);
    }
  }
}

/**
 * Map a legacy `StaffingRequestStatus` to a representative
 * `ProjectPositionFillStatus`.
 *
 * Per LEAN-P0-1, the SR-level status has no direct column on the lean
 * model — it is synthesized from the set of sibling positions. This
 * helper returns the "representative" fillStatus that a fresh single
 * position spawned from a request in this status should be initialised
 * with. Callers that want the full synthesis logic should query the
 * sibling positions instead.
 *
 * Lossy mappings:
 *  - IN_REVIEW → PROPOSED (review folds into the proposal state)
 *  - FULFILLED → ASSIGNED (representative active state; siblings may also
 *    be in BOOKED/ONBOARDING/ON_HOLD/RELEASED)
 *  - CANCELLED → RELEASED
 *
 * 1:1 mappings: DRAFT, OPEN.
 */
export function mapStaffingRequestStatusToFillStatus(
  status: StaffingRequestStatus,
): ProjectPositionFillStatus {
  switch (status) {
    case StaffingRequestStatus.DRAFT:
      return ProjectPositionFillStatus.DRAFT;
    case StaffingRequestStatus.OPEN:
      return ProjectPositionFillStatus.OPEN;
    case StaffingRequestStatus.IN_REVIEW:
      return ProjectPositionFillStatus.PROPOSED;
    case StaffingRequestStatus.FULFILLED:
      return ProjectPositionFillStatus.ASSIGNED;
    case StaffingRequestStatus.CANCELLED:
      return ProjectPositionFillStatus.RELEASED;
    default: {
      const exhaustive: never = status;
      throw new UnknownLegacyEnumValueError('StaffingRequestStatus', exhaustive);
    }
  }
}

/**
 * Map a legacy `StaffingRequestProposalCandidateDecision` to a lean
 * `ProjectPositionCandidateDecision`.
 *
 * 1:1 mapping for all four values (PENDING / PICKED / DECLINED /
 * AUTO_DECLINED). Both enums have identical value sets — the helper
 * exists for type safety and as a single canonical conversion site.
 */
export function mapCandidateDecisionLegacyToLean(
  decision: StaffingRequestProposalCandidateDecision,
): ProjectPositionCandidateDecision {
  switch (decision) {
    case StaffingRequestProposalCandidateDecision.PENDING:
      return ProjectPositionCandidateDecision.PENDING;
    case StaffingRequestProposalCandidateDecision.PICKED:
      return ProjectPositionCandidateDecision.PICKED;
    case StaffingRequestProposalCandidateDecision.DECLINED:
      return ProjectPositionCandidateDecision.DECLINED;
    case StaffingRequestProposalCandidateDecision.AUTO_DECLINED:
      return ProjectPositionCandidateDecision.AUTO_DECLINED;
    default: {
      const exhaustive: never = decision;
      throw new UnknownLegacyEnumValueError(
        'StaffingRequestProposalCandidateDecision',
        exhaustive,
      );
    }
  }
}
