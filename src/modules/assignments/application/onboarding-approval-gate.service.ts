import { ConflictException, Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface OnboardingGateState {
  positionId: string | null;
  requiresOnboardingApproval: boolean;
  isApproved: boolean;
  onboardingApprovedAt: Date | null;
  onboardingApprovedByPersonId: string | null;
}

/**
 * LEAN-P4c-1 — Onboarding-stage approval gate (read side).
 *
 * Centralises the lookup of "does this assignment have an onboarding
 * gate, and is it approved?" Used by `TransitionProjectAssignmentService`
 * (ONBOARDING → ASSIGNED) and `ScheduleOnboardingService` to enforce the
 * gate without duplicating Prisma queries.
 *
 * Optional dependency: when `prisma` is not supplied (in-memory test
 * fixtures), the gate is treated as "not required" — preserving the
 * pre-LEAN-P4c-1 behaviour for code paths that have not yet wired the
 * service in.
 */
@Injectable()
export class OnboardingApprovalGateService {
  public constructor(private readonly prisma?: PrismaService) {}

  public async getState(assignmentId: string): Promise<OnboardingGateState> {
    if (!this.prisma) {
      return {
        positionId: null,
        requiresOnboardingApproval: false,
        isApproved: true,
        onboardingApprovedAt: null,
        onboardingApprovedByPersonId: null,
      };
    }

    const position = await this.prisma.projectPosition.findFirst({
      where: { legacyAssignmentId: assignmentId },
      select: {
        id: true,
        requiresOnboardingApproval: true,
        onboardingApprovedAt: true,
        onboardingApprovedByPersonId: true,
      },
    });

    if (!position) {
      return {
        positionId: null,
        requiresOnboardingApproval: false,
        isApproved: true,
        onboardingApprovedAt: null,
        onboardingApprovedByPersonId: null,
      };
    }

    return {
      positionId: position.id,
      requiresOnboardingApproval: position.requiresOnboardingApproval,
      isApproved:
        !position.requiresOnboardingApproval || position.onboardingApprovedAt !== null,
      onboardingApprovedAt: position.onboardingApprovedAt,
      onboardingApprovedByPersonId: position.onboardingApprovedByPersonId,
    };
  }

  /**
   * Throws ConflictException if a transition to ASSIGNED is blocked by
   * an unapproved gate. Safe to call on every transition — only enforces
   * when the target is ASSIGNED and the position requires approval.
   */
  public async assertTransitionAllowed(
    assignmentId: string,
    targetStatus: string,
  ): Promise<void> {
    if (targetStatus !== 'ASSIGNED') return;
    const state = await this.getState(assignmentId);
    if (state.requiresOnboardingApproval && !state.isApproved) {
      throw new ConflictException(
        'Cannot transition to ASSIGNED: the onboarding approval gate has not been approved.',
      );
    }
  }
}
