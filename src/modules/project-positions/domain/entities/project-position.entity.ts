import { PlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { AggregateRoot } from '@src/shared/domain/aggregate-root';

import { PositionId } from '../value-objects/position-id';
import {
  findFillTransition,
  InvalidPositionFillTransitionError,
  POSITION_AMENDABLE_STATUSES,
  PositionFillStatus,
  PositionFillStatusValue,
  requiresReason as transitionRequiresReason,
} from '../value-objects/position-fill-status';

/**
 * Sprint 2 / S2-2 — lean staffing aggregate root.
 *
 * Minimal entity scaffold focused on the state-machine helpers. The full
 * property surface (allocation, dates, SLA, billing rate, candidates) lands
 * with services in S2-3. This scaffold is sufficient for transition-matrix
 * unit tests and for the S2-3 service layer to compose against.
 */
export interface PositionFillSnapshot {
  status: PositionFillStatusValue;
  activePersonId?: string;
  activeAllocationPercent?: number;
  activeValidFrom?: Date;
  activeValidTo?: Date;
  releaseReason?: string;
}

interface ProjectPositionProps {
  publicId?: string;
  projectId: string;
  role: string;
  requiredAllocationPercent: number;
  startDate: Date;
  endDate: Date;
  fillStatus: PositionFillStatus;
  activePersonId?: string;
  activeAllocationPercent?: number;
  activeValidFrom?: Date;
  activeValidTo?: Date;
  releaseReason?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  onHoldReason?: string;
  onHoldCaseId?: string;
  requestedByPersonId?: string;
  createdByPersonId?: string;
  updatedByPersonId?: string;
  version?: number;
}

export interface FillTransitionOptions {
  actorRoles: readonly PlatformRole[];
  reason?: string;
  caseId?: string;
  // Person to set on `activePersonId` for transitions that mark the position filled.
  // Required for PROPOSED / BOOKED / ASSIGNED / ONBOARDING transitions when the
  // position has no active person yet — `transitionFill` throws
  // `InvalidPositionFillTransitionError` otherwise.
  personId?: string;
  allocationPercent?: number;
  validFrom?: Date;
  validTo?: Date;
  timestamp?: Date;
}

export class ProjectPosition extends AggregateRoot<ProjectPositionProps> {
  public static create(
    props: ProjectPositionProps,
    positionId: PositionId = PositionId.create(),
  ): ProjectPosition {
    return new ProjectPosition(props, positionId.value);
  }

  public get positionId(): PositionId {
    return PositionId.from(this.id);
  }

  /**
   * W1-11 — opaque tenant-scoped identifier emitted on response DTOs and in
   * URLs. Falls back to `undefined` for entities that pre-date the foundation
   * backfill; callers should treat absence as "use raw id".
   */
  public get publicId(): string | undefined {
    return this.props.publicId;
  }

  public get projectId(): string {
    return this.props.projectId;
  }

  public get role(): string {
    return this.props.role;
  }

  public get fillStatus(): PositionFillStatus {
    return this.props.fillStatus;
  }

  public get activePersonId(): string | undefined {
    return this.props.activePersonId;
  }

  public get activeAllocationPercent(): number | undefined {
    return this.props.activeAllocationPercent;
  }

  public get activeValidFrom(): Date | undefined {
    return this.props.activeValidFrom;
  }

  public get activeValidTo(): Date | undefined {
    return this.props.activeValidTo;
  }

  public get startDate(): Date {
    return this.props.startDate;
  }

  public get endDate(): Date {
    return this.props.endDate;
  }

  public get releaseReason(): string | undefined {
    return this.props.releaseReason;
  }

  public get onHoldReason(): string | undefined {
    return this.props.onHoldReason;
  }

  public get onHoldCaseId(): string | undefined {
    return this.props.onHoldCaseId;
  }

  public get requiredAllocationPercent(): number {
    return this.props.requiredAllocationPercent;
  }

  public get version(): number {
    return this.props.version ?? 1;
  }

  /**
   * Apply a fill-status transition. Validates the target is reachable for the
   * actor's roles AND that the optional reason is present when the transition
   * requires it. Mutates the aggregate state on success; throws on failure.
   */
  public transitionFill(to: PositionFillStatusValue, options: FillTransitionOptions): void {
    const from = this.props.fillStatus.value;

    const transition = findFillTransition(from, to);
    if (!transition) {
      throw new InvalidPositionFillTransitionError(
        `No transition from ${from} to ${to} exists in the position fill state machine.`,
        'MISSING_EDGE',
      );
    }

    const isAdmin = options.actorRoles.includes('admin');
    const hasAllowedRole =
      isAdmin || transition.roles.some((role) => options.actorRoles.includes(role));
    if (!hasAllowedRole) {
      throw new InvalidPositionFillTransitionError(
        `Actor roles [${options.actorRoles.join(', ')}] cannot transition position from ${from} to ${to}.`,
        'ROLE_FORBIDDEN',
      );
    }

    if (transitionRequiresReason(from, to) && (!options.reason || options.reason.trim().length === 0)) {
      throw new InvalidPositionFillTransitionError(
        `Transition from ${from} to ${to} requires a non-empty reason.`,
        'MISSING_REASON',
      );
    }

    // Fill-side invariant: a position can only be PROPOSED/BOOKED/ONBOARDING/
    // ASSIGNED *for someone* — either a person already active on the position
    // or one provided with this transition. Person-less fills would let
    // approvals book nobody.
    const isFillTransition =
      to === 'PROPOSED' || to === 'BOOKED' || to === 'ONBOARDING' || to === 'ASSIGNED';
    if (isFillTransition && !options.personId && !this.props.activePersonId) {
      throw new InvalidPositionFillTransitionError(
        `Transition from ${from} to ${to} requires a person — provide personId or fill the position first.`,
        'MISSING_PERSON',
      );
    }

    // Apply state changes.
    this.props.fillStatus = PositionFillStatus.from(to);

    // Person + allocation context for "fill" transitions.
    if (isFillTransition) {
      if (options.personId) {
        this.props.activePersonId = options.personId;
      }
      if (options.allocationPercent !== undefined) {
        this.props.activeAllocationPercent = options.allocationPercent;
      }
      if (options.validFrom) {
        this.props.activeValidFrom = options.validFrom;
      }
      if (options.validTo !== undefined) {
        this.props.activeValidTo = options.validTo;
      }
    }

    // Reason text routes to the appropriate bucket so downstream queries can
    // present "why was this rejected/cancelled/held/released" without juggling
    // a single overloaded field. The position's `fillStatus` + the *populated*
    // reason field together communicate the intent.
    if (options.reason) {
      const reasonText = options.reason.trim();
      if (to === 'RELEASED') {
        this.props.releaseReason = reasonText;
      } else if (to === 'ON_HOLD') {
        this.props.onHoldReason = reasonText;
        if (options.caseId) {
          this.props.onHoldCaseId = options.caseId;
        }
      } else if (to === 'OPEN' && from === 'PROPOSED') {
        // PROPOSED → OPEN with reason = reject this candidate, keep position open.
        this.props.rejectionReason = reasonText;
        // Clear the candidate from active slot since we're back to OPEN.
        this.props.activePersonId = undefined;
        this.props.activeAllocationPercent = undefined;
      }
    }

    // Bump optimistic-concurrency version so the repository write detects races.
    this.props.version = (this.props.version ?? 1) + 1;
  }

  /**
   * Is the position in a state that can be edited (role/skills/dates/allocation)?
   * RELEASED is read-only audit; mid-lifecycle states allow edits in S2-3 services.
   */
  public isAmendable(): boolean {
    return POSITION_AMENDABLE_STATUSES.has(this.props.fillStatus.value);
  }

  /**
   * Snapshot used by the FillHistory write path so the audit trail captures
   * the position state at the moment of transition.
   */
  public snapshot(): PositionFillSnapshot {
    return {
      status: this.props.fillStatus.value,
      activePersonId: this.props.activePersonId,
      activeAllocationPercent: this.props.activeAllocationPercent,
      activeValidFrom: this.props.activeValidFrom,
      activeValidTo: this.props.activeValidTo,
      releaseReason: this.props.releaseReason,
    };
  }

  /**
   * Set the actor-audit `updatedByPersonId` field before persisting. Mirror
   * of the pattern on `ProjectAssignment` (D-103-write-path).
   */
  public setUpdatedBy(actorId: string): void {
    this.props.updatedByPersonId = actorId;
  }

  /**
   * LEAN-P4-missing-1 — move a position to a different project. Used by
   * the PM bulk-reassign flow. Mutates the projectId in place; the caller
   * is responsible for bumping `version` (via `bumpVersion()`) once for the
   * full set of mutations applied to this aggregate before persisting.
   */
  public setProjectId(projectId: string): void {
    this.props.projectId = projectId;
  }

  /**
   * LEAN-P4-missing-1 — directly set `activePersonId` (or clear it). Used
   * by bulk-reassign when the position is already past PROPOSED so we just
   * swap the person without re-triggering the state machine.
   */
  public setActivePersonId(personId: string | undefined): void {
    this.props.activePersonId = personId;
  }

  /**
   * Bump the optimistic-concurrency version once. Mutators that go through
   * `transitionFill` already bump; setters added for narrow path changes
   * call this explicitly before persistence.
   */
  public bumpVersion(): void {
    this.props.version = (this.props.version ?? 1) + 1;
  }

  public get updatedByPersonId(): string | undefined {
    return this.props.updatedByPersonId;
  }

  public get createdByPersonId(): string | undefined {
    return this.props.createdByPersonId;
  }
}
