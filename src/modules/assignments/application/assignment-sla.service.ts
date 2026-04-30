import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  AssignmentSlaStageValue,
  ProjectAssignment,
} from '../domain/entities/project-assignment.entity';
import { AssignmentStatusValue } from '../domain/value-objects/assignment-status';

/**
 * Adds `days` business days to `from`. Skips Saturdays (6) and Sundays (0).
 * Pure function — replaces a date-fns dependency that isn't installed in the backend bundle.
 */
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  if (days <= 0) return result;
  let remaining = Math.floor(days);
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const dow = result.getUTCDay();
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return result;
}

export interface SlaSnapshot {
  proposalDays: number;
  reviewDays: number;
  approvalDays: number;
  rmFinalizeDays: number;
}

const DEFAULTS: SlaSnapshot = {
  proposalDays: 2,
  reviewDays: 1,
  approvalDays: 2,
  rmFinalizeDays: 1,
};

const KEYS = {
  proposalDays: 'assignment.sla.proposalDays',
  reviewDays: 'assignment.sla.reviewDays',
  approvalDays: 'assignment.sla.approvalDays',
  rmFinalizeDays: 'assignment.sla.rmFinalizeDays',
};

const STATUS_TO_STAGE: Partial<Record<AssignmentStatusValue, AssignmentSlaStageValue>> = {
  CREATED: 'PROPOSAL',
  PROPOSED: 'REVIEW',
  IN_REVIEW: 'APPROVAL',
  ONBOARDING: 'RM_FINALIZE',
};

@Injectable()
export class AssignmentSlaService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Recomputes the SLA stage and due-at for an assignment based on its current status.
   * Mutates the entity in place. Safe to call repeatedly; clears SLA fields when the
   * status no longer maps to a tracked stage.
   */
  public async applyTransition(assignment: ProjectAssignment, anchor: Date = new Date()): Promise<void> {
    const stage = STATUS_TO_STAGE[assignment.status.value];
    if (!stage) {
      assignment.setSlaStage(undefined);
      assignment.setSlaDueAt(undefined);
      assignment.setSlaBreachedAt(undefined);
      return;
    }

    const snapshot = await this.snapshot();
    const days = this.daysFor(stage, snapshot);
    assignment.setSlaStage(stage);
    assignment.setSlaDueAt(addBusinessDays(anchor, days));
    assignment.setSlaBreachedAt(undefined);
  }

  public async snapshot(): Promise<SlaSnapshot> {
    const rows = await this.prisma.platformSetting.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const map = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
    return {
      proposalDays: this.coerce(map.get(KEYS.proposalDays), DEFAULTS.proposalDays),
      reviewDays: this.coerce(map.get(KEYS.reviewDays), DEFAULTS.reviewDays),
      approvalDays: this.coerce(map.get(KEYS.approvalDays), DEFAULTS.approvalDays),
      rmFinalizeDays: this.coerce(map.get(KEYS.rmFinalizeDays), DEFAULTS.rmFinalizeDays),
    };
  }

  private daysFor(stage: AssignmentSlaStageValue, snapshot: SlaSnapshot): number {
    switch (stage) {
      case 'PROPOSAL':
        return snapshot.proposalDays;
      case 'REVIEW':
        return snapshot.reviewDays;
      case 'APPROVAL':
        return snapshot.approvalDays;
      case 'RM_FINALIZE':
        return snapshot.rmFinalizeDays;
    }
  }

  private coerce(value: unknown, fallback: number): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const n = Number(value);
      if (!Number.isNaN(n)) return n;
    }
    return fallback;
  }
}
