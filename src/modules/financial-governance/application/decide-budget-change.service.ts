import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import {
  ResponsibilityResolverService,
  ResponsibilityVerdict,
} from '@src/modules/identity-access/application/responsibility-resolver.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface DecideBudgetChangeCommand {
  /** Authenticated decider (Director/Admin). */
  actorId: string;
  approvalId: string;
  decision: 'APPROVE' | 'REJECT';
  /** Required when decision === 'REJECT'. */
  reason?: string;
}

interface DecideBudgetChangeResult {
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED';
  /** Final live budget values after the decision applied (or before, on reject). */
  budget: {
    projectId: string;
    fiscalYear: number;
    capexBudget: number;
    opexBudget: number;
  };
}

interface BudgetApprovalRow {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  projectBudgetId: string;
  requestedByPersonId: string;
  requestedChange: Prisma.JsonValue | null;
}

/**
 * HD-6 — Director-side decision on a `BudgetApproval` row.
 *
 * APPROVE → applies the `requestedChange` JSON to the live `ProjectBudget`
 * row, flips the approval to `APPROVED`, stamps `decidedById` + `decisionAt`.
 *
 * REJECT → leaves the live budget unchanged, flips the approval to
 * `REJECTED` with the supplied reason.
 *
 * Self-approval guard: the decider may not be the same person who
 * requested the change.
 *
 * Both writes (approval row + optional budget mutation) share a single
 * `prisma.$transaction` so the live budget and the audit row cannot
 * disagree.
 */
@Injectable()
export class DecideBudgetChangeService {
  private readonly logger = new Logger(DecideBudgetChangeService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    // HD-4 — when wired, enforces `mode === 'PERSON'` gating: only the
    // configured `targetPersonId` may decide. Other modes (ROLE,
    // SKIP, PM_SOLO) are advisory at decide time so already-pending
    // approvals are never stranded by a mid-flight rule change.
    private readonly responsibilityResolver?: ResponsibilityResolverService,
  ) {}

  public async execute(command: DecideBudgetChangeCommand): Promise<DecideBudgetChangeResult> {
    if (!command.actorId) {
      throw new BadRequestException('Authenticated decider is required.');
    }
    if (command.decision === 'REJECT' && !command.reason?.trim()) {
      throw new BadRequestException('A reason is required when rejecting a budget change.');
    }

    const approval = (await (this.prisma as unknown as {
      budgetApproval: {
        findUnique: (args: unknown) => Promise<BudgetApprovalRow | null>;
      };
    }).budgetApproval.findUnique({
      where: { id: command.approvalId },
    })) as BudgetApprovalRow | null;

    if (!approval) {
      throw new NotFoundException(`Budget approval ${command.approvalId} not found.`);
    }
    if (approval.status !== 'PENDING') {
      throw new ConflictException(
        `Budget approval is in status ${approval.status}; only PENDING approvals accept a decision.`,
      );
    }
    if (approval.requestedByPersonId === command.actorId) {
      throw new ForbiddenException(
        'The requester of a budget change cannot decide on it.',
      );
    }

    const verdict = await this.resolveVerdict(approval, command);
    this.enforcePersonGating(verdict, command.actorId);

    const decisionAt = new Date();
    const finalDecision = command.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const finalBudget = await this.prisma.$transaction(async (tx) => {
      // Update the approval row first (lock the row by primary key).
      await (tx as unknown as {
        budgetApproval: {
          update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
        };
      }).budgetApproval.update({
        where: { id: approval.id },
        data: {
          status: finalDecision,
          decidedByPersonId: command.actorId,
          decisionAt,
          decisionReason: command.reason ?? null,
        },
      });

      const liveBudget = await (tx as unknown as {
        projectBudget: {
          findUnique: (args: unknown) => Promise<{
            id: string;
            projectId: string;
            fiscalYear: number;
            capexBudget: Prisma.Decimal;
            opexBudget: Prisma.Decimal;
          } | null>;
          update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<{
            id: string;
            projectId: string;
            fiscalYear: number;
            capexBudget: Prisma.Decimal;
            opexBudget: Prisma.Decimal;
          }>;
        };
      }).projectBudget.findUnique({
        where: { id: approval.projectBudgetId },
      });
      if (!liveBudget) {
        throw new NotFoundException(
          `ProjectBudget ${approval.projectBudgetId} disappeared during decision.`,
        );
      }

      if (command.decision === 'APPROVE') {
        const change = approval.requestedChange as
          | { capexBudget?: number; opexBudget?: number }
          | null;
        if (!change || typeof change.capexBudget !== 'number' || typeof change.opexBudget !== 'number') {
          throw new ConflictException('Approval row is missing requestedChange data.');
        }
        const updated = await (tx as unknown as {
          projectBudget: {
            update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<{
              id: string;
              projectId: string;
              fiscalYear: number;
              capexBudget: Prisma.Decimal;
              opexBudget: Prisma.Decimal;
            }>;
          };
        }).projectBudget.update({
          where: { id: approval.projectBudgetId },
          data: {
            capexBudget: new Prisma.Decimal(change.capexBudget),
            opexBudget: new Prisma.Decimal(change.opexBudget),
          },
        });
        return updated;
      }

      // REJECT — live budget stays unchanged.
      return liveBudget;
    });

    const actionType =
      command.decision === 'APPROVE'
        ? 'project.budget_change.approved'
        : 'project.budget_change.rejected';
    const ruleId = verdict?.source === 'RULE' ? verdict.ruleId : null;
    this.auditLogger?.record({
      actionType,
      actorId: command.actorId,
      category: 'project',
      changeSummary:
        command.decision === 'APPROVE'
          ? `Budget change ${approval.id} approved by ${command.actorId}; project ${finalBudget.projectId} FY${finalBudget.fiscalYear}: capex=${Number(finalBudget.capexBudget)}, opex=${Number(finalBudget.opexBudget)}.`
          : `Budget change ${approval.id} rejected by ${command.actorId}: ${command.reason}.`,
      details: {
        approvalId: approval.id,
        decision: finalDecision,
        projectId: finalBudget.projectId,
        fiscalYear: finalBudget.fiscalYear,
        capex: Number(finalBudget.capexBudget),
        opex: Number(finalBudget.opexBudget),
        reason: command.reason,
        responsibilityRuleId: ruleId,
        responsibilityMode: verdict?.mode,
        responsibilitySource: verdict?.source,
      },
      metadata: {
        approvalId: approval.id,
        projectId: finalBudget.projectId,
        decision: finalDecision,
        responsibilityRuleId: ruleId ?? undefined,
      },
      targetEntityId: finalBudget.id,
      targetEntityType: 'PROJECT_BUDGET',
    });

    if (command.decision === 'APPROVE') {
      await this.notificationEventTranslator?.projectBudgetChangeApproved({
        projectId: finalBudget.projectId,
        approvalId: approval.id,
        approvedByPersonId: command.actorId,
        capexBudget: Number(finalBudget.capexBudget),
        opexBudget: Number(finalBudget.opexBudget),
      });
    } else {
      await this.notificationEventTranslator?.projectBudgetChangeRejected({
        projectId: finalBudget.projectId,
        approvalId: approval.id,
        rejectedByPersonId: command.actorId,
        reason: command.reason ?? 'No reason provided',
      });
    }

    return {
      approvalId: approval.id,
      decision: finalDecision,
      budget: {
        projectId: finalBudget.projectId,
        fiscalYear: finalBudget.fiscalYear,
        capexBudget: Number(finalBudget.capexBudget),
        opexBudget: Number(finalBudget.opexBudget),
      },
    };
  }

  private async resolveVerdict(
    approval: BudgetApprovalRow,
    command: DecideBudgetChangeCommand,
  ): Promise<ResponsibilityVerdict | null> {
    if (!this.responsibilityResolver) {
      return null;
    }
    try {
      const budget = await (this.prisma as unknown as {
        projectBudget: {
          findUnique: (q: {
            where: { id: string };
            select: {
              projectId: boolean;
              capexBudget: boolean;
              opexBudget: boolean;
            };
          }) => Promise<{
            projectId: string;
            capexBudget: Prisma.Decimal;
            opexBudget: Prisma.Decimal;
          } | null>;
        };
      }).projectBudget.findUnique({
        where: { id: approval.projectBudgetId },
        select: { projectId: true, capexBudget: true, opexBudget: true },
      });
      if (!budget) {
        return null;
      }
      const project = await (this.prisma as unknown as {
        project: {
          findUnique: (q: {
            where: { id: string };
            select: { clientId: boolean; projectType: boolean };
          }) => Promise<{ clientId: string | null; projectType: string | null } | null>;
        };
      }).project.findUnique({
        where: { id: budget.projectId },
        select: { clientId: true, projectType: true },
      });
      const change = approval.requestedChange as
        | { capexBudget?: number; opexBudget?: number }
        | null;
      const amount =
        change && typeof change.capexBudget === 'number' && typeof change.opexBudget === 'number'
          ? Math.max(
              Math.abs(change.capexBudget - Number(budget.capexBudget)),
              Math.abs(change.opexBudget - Number(budget.opexBudget)),
            )
          : null;
      void command;
      return await this.responsibilityResolver.resolve({
        actionKind: 'BUDGET_CHANGE_APPROVAL',
        projectId: budget.projectId,
        clientId: project?.clientId ?? null,
        projectType: project?.projectType ?? null,
        amount,
        fallbackRole: 'director',
      });
    } catch (err) {
      this.logger.warn(
        `ResponsibilityResolver failed during HD-6 decide for approval ${approval.id}; falling back. ${(err as Error).message}`,
      );
      return null;
    }
  }

  private enforcePersonGating(
    verdict: ResponsibilityVerdict | null,
    actorId: string,
  ): void {
    if (!verdict || verdict.source !== 'RULE') return;
    if (verdict.mode === 'PERSON') {
      if (!verdict.targetPersonId || verdict.targetPersonId !== actorId) {
        throw new ForbiddenException(
          `Responsibility rule ${verdict.ruleId ?? '<unknown>'} requires person ${verdict.targetPersonId ?? '<unset>'} to decide on this budget change.`,
        );
      }
      return;
    }
    if (verdict.mode === 'SKIP' || verdict.mode === 'PM_SOLO') {
      this.logger.warn(
        `Open PENDING budget approval but rule ${verdict.ruleId} is ${verdict.mode}. Allowing decision to clear the in-flight request.`,
      );
    }
  }
}
