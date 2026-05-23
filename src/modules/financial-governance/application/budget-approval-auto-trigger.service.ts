import { Injectable, Logger } from '@nestjs/common';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Sprint 4 / S4-5 — auto-create a PENDING BudgetApproval row whenever a
 * `ProjectBudget` upsert produces a material variance.
 *
 * Design choices:
 *  - Threshold is a tenant-wide PlatformSetting
 *    (`finance.budgetApproval.autoTriggerVariancePercent`, default 10%).
 *    Mirrors `project.closure.budgetVarianceThresholdPercent` precedent.
 *  - "Material" = |Δ(capex+opex)| / prior(capex+opex) ≥ threshold.
 *  - Initial-budget creates (prior total = 0, new total > 0) ALWAYS trigger
 *    a PENDING approval — treated as an initial-budget gate. Matches the
 *    INITIAL_BUDGET classification in the lean-simplification plan.
 *  - Idempotent: if a PENDING approval already exists for the budget,
 *    we return that row's id rather than stacking duplicates. The user-driven
 *    `RequestBudgetChangeService` path (HD-6) creates approval rows of its
 *    own; this guard prevents the auto-trigger from racing it.
 *  - Failure semantics: never throws — never blocks the budget mutation
 *    that called it. Same precedent as
 *    `TransitionProjectAssignmentService.syncParentSrHeadcount`.
 *  - If no actor is available (e.g. import job) the trigger no-ops, since
 *    `BudgetApproval.requestedByPersonId` is NOT NULL.
 *
 * The approver pool is the existing `BUDGET_DECIDE_ROLES` (admin / director);
 * the existing `DecideBudgetChangeService` already drives the decide path
 * via `/api/projects/:id/budget-change-requests/:approvalId/{approve,reject}`.
 * Auto-triggered rows surface there alongside human-requested rows.
 */

export const BUDGET_APPROVAL_VARIANCE_THRESHOLD_KEY =
  'finance.budgetApproval.autoTriggerVariancePercent';
const DEFAULT_VARIANCE_THRESHOLD_PCT = 10;

export type AutoTriggerReason = 'INITIAL_BUDGET' | 'REFORECAST_UP' | 'REFORECAST_DOWN';

export interface AutoTriggerInput {
  budgetId: string;
  projectId: string;
  fiscalYear: number;
  priorCapex: number;
  priorOpex: number;
  newCapex: number;
  newOpex: number;
  actorId: string | undefined;
}

export interface AutoTriggerResult {
  triggered: boolean;
  approvalId?: string;
  reason: string;
  variancePct?: number;
  thresholdPct?: number;
}

@Injectable()
export class BudgetApprovalAutoTriggerService {
  private readonly logger = new Logger(BudgetApprovalAutoTriggerService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  public async maybeTriggerForBudgetMutation(
    input: AutoTriggerInput,
  ): Promise<AutoTriggerResult> {
    try {
      if (!input.actorId) {
        return { triggered: false, reason: 'no actor available; auto-trigger skipped' };
      }

      const thresholdPct = await this.resolveThresholdPct();

      const priorTotal = input.priorCapex + input.priorOpex;
      const newTotal = input.newCapex + input.newOpex;

      let triggerReason: AutoTriggerReason | null = null;
      let variancePct: number | undefined;

      if (priorTotal === 0 && newTotal === 0) {
        return { triggered: false, reason: 'zero budget; nothing to approve' };
      }

      if (priorTotal === 0) {
        triggerReason = 'INITIAL_BUDGET';
        variancePct = 100;
      } else {
        const delta = Math.abs(newTotal - priorTotal);
        variancePct = (delta / priorTotal) * 100;
        if (variancePct < thresholdPct) {
          return {
            triggered: false,
            reason: `variance ${variancePct.toFixed(2)}% below ${thresholdPct}% threshold`,
            variancePct,
            thresholdPct,
          };
        }
        triggerReason = newTotal > priorTotal ? 'REFORECAST_UP' : 'REFORECAST_DOWN';
      }

      const pending = await this.prisma.budgetApproval.findFirst({
        where: { projectBudgetId: input.budgetId, status: 'PENDING' },
        select: { id: true },
      });
      if (pending) {
        return {
          triggered: false,
          approvalId: pending.id,
          reason: 'pending approval already exists for this budget',
          variancePct,
          thresholdPct,
        };
      }

      const approval = await this.prisma.budgetApproval.create({
        data: {
          projectBudgetId: input.budgetId,
          status: 'PENDING',
          requestedByPersonId: input.actorId,
          requestedAt: new Date(),
          requestedChange: {
            source: 'auto-trigger',
            reason: triggerReason,
            projectId: input.projectId,
            fiscalYear: input.fiscalYear,
            priorCapex: input.priorCapex,
            priorOpex: input.priorOpex,
            newCapex: input.newCapex,
            newOpex: input.newOpex,
            variancePct,
            thresholdPct,
          },
          createdByPersonId: input.actorId,
          updatedByPersonId: input.actorId,
        },
        select: { id: true },
      });

      return {
        triggered: true,
        approvalId: approval.id,
        reason: triggerReason,
        variancePct,
        thresholdPct,
      };
    } catch (err) {
      this.logger.warn(
        `Auto-trigger failed for budget ${input.budgetId} ` +
          `(project ${input.projectId} fy ${input.fiscalYear}): ${(err as Error).message}`,
      );
      return { triggered: false, reason: `auto-trigger error: ${(err as Error).message}` };
    }
  }

  private async resolveThresholdPct(): Promise<number> {
    const raw = await this.platformSettings.getRawValue(BUDGET_APPROVAL_VARIANCE_THRESHOLD_KEY);
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      return raw;
    }
    return DEFAULT_VARIANCE_THRESHOLD_PCT;
  }
}
