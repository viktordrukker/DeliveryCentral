import {
  BadRequestException,
  ConflictException,
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

import { FinancialRepository } from '../infrastructure/financial.repository';

interface RequestBudgetChangeCommand {
  /** Authenticated requester (PM/DM/Admin). */
  actorId: string;
  projectId: string;
  fiscalYear: number;
  /** Requested new capex budget. */
  capexBudget: number;
  /** Requested new opex budget. */
  opexBudget: number;
  /** Optional rationale shown to the Director in the approval queue. */
  reason?: string;
}

interface RequestBudgetChangeResult {
  approvalId: string;
  /** Echoes the proposed change. The actual ProjectBudget row is NOT mutated yet. */
  requestedChange: { capexBudget: number; opexBudget: number };
  // HD-4 — set when a responsibility rule with `mode in (SKIP|PM_SOLO)`
  // matched at request time, in which case the change was applied
  // immediately and the BudgetApproval row landed in `APPROVED`.
  autoApproved?: boolean;
  responsibilityRuleId?: string | null;
}

/**
 * HD-6 — request a budget change without mutating the live `ProjectBudget`.
 * Per J6, capex/opex changes go through Director approval; only on approve
 * does the change land. This service writes a `BudgetApproval` row in
 * PENDING with `requestedChange` JSON capturing the proposed capex+opex;
 * `DecideBudgetChangeService` flips the row + applies the diff.
 *
 * Self-approval guard lives on the decide service (the requester is
 * tracked here via `requestedByPersonId`).
 *
 * Idempotency note: at most one PENDING approval per `(projectId, fiscalYear)`.
 * A second request returns 409. The PM cancels via the reject path or
 * waits for a decision.
 */
@Injectable()
export class RequestBudgetChangeService {
  private readonly logger = new Logger(RequestBudgetChangeService.name);

  public constructor(
    private readonly repo: FinancialRepository,
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    // HD-4 — when wired, rules with mode SKIP / PM_SOLO cause the
    // request to apply the budget change immediately rather than
    // creating a PENDING approval. Otherwise behavior is identical
    // to the pre-HD-4 path.
    private readonly responsibilityResolver?: ResponsibilityResolverService,
  ) {}

  public async execute(
    command: RequestBudgetChangeCommand,
  ): Promise<RequestBudgetChangeResult> {
    if (!command.actorId) {
      throw new BadRequestException('Authenticated requester is required.');
    }
    if (!Number.isFinite(command.capexBudget) || command.capexBudget < 0) {
      throw new BadRequestException('capexBudget must be a non-negative number.');
    }
    if (!Number.isFinite(command.opexBudget) || command.opexBudget < 0) {
      throw new BadRequestException('opexBudget must be a non-negative number.');
    }

    const budget = await this.repo.findProjectBudget(command.projectId, command.fiscalYear);
    if (!budget) {
      throw new NotFoundException(
        `No budget found for project ${command.projectId} FY${command.fiscalYear}. Create the baseline budget first.`,
      );
    }

    // Refuse to stack a second pending request on the same budget.
    const existing = await this.prisma.budgetApproval.findFirst({
      where: { projectBudgetId: budget.id, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException(
        `A pending budget-change approval already exists for this budget (${existing.id}). Decide on it first.`,
      );
    }

    const requestedChange = {
      capexBudget: command.capexBudget,
      opexBudget: command.opexBudget,
    };

    const verdict = await this.resolveVerdict({
      projectId: command.projectId,
      currentCapex: Number(budget.capexBudget),
      currentOpex: Number(budget.opexBudget),
      requestedCapex: command.capexBudget,
      requestedOpex: command.opexBudget,
    });
    const autoApprove =
      verdict !== null && (verdict.mode === 'SKIP' || verdict.mode === 'PM_SOLO');

    const approval = await this.prisma.$transaction(async (tx) => {
      const created = await tx.budgetApproval.create({
        data: {
          projectBudgetId: budget.id,
          status: autoApprove ? 'APPROVED' : 'PENDING',
          requestedByPersonId: command.actorId,
          requestedChange: requestedChange as Prisma.InputJsonValue,
          decisionReason: command.reason ?? null,
          // F-108 / D-103-write-path — canonical actor-audit. Same value
          // as requestedByPersonId at create-time; distinct semantic for
          // future edits (decider on auto-approve, admin overrides etc.).
          createdByPersonId: command.actorId,
          updatedByPersonId: command.actorId,
          ...(autoApprove
            ? {
                decidedByPersonId: command.actorId,
                decisionAt: new Date(),
              }
            : {}),
        },
      });

      if (autoApprove) {
        await tx.projectBudget.update({
          where: { id: budget.id },
          data: {
            capexBudget: new Prisma.Decimal(command.capexBudget),
            opexBudget: new Prisma.Decimal(command.opexBudget),
          },
        });
      }

      return created;
    });

    const ruleId = verdict?.source === 'RULE' ? verdict.ruleId : null;
    this.auditLogger?.record({
      actionType: autoApprove
        ? 'project.budget_change.approved'
        : 'project.budget_change.requested',
      actorId: command.actorId,
      category: 'project',
      changeSummary: autoApprove
        ? `Budget change auto-approved for project ${command.projectId} FY${command.fiscalYear} via responsibility rule ${verdict?.mode}: capex=${command.capexBudget}, opex=${command.opexBudget}.`
        : `Budget change requested for project ${command.projectId} FY${command.fiscalYear}: capex=${command.capexBudget}, opex=${command.opexBudget}.`,
      details: {
        approvalId: approval.id,
        projectId: command.projectId,
        fiscalYear: command.fiscalYear,
        currentCapex: Number(budget.capexBudget),
        currentOpex: Number(budget.opexBudget),
        requestedCapex: command.capexBudget,
        requestedOpex: command.opexBudget,
        reason: command.reason,
        responsibilityRuleId: ruleId,
        responsibilityMode: verdict?.mode,
        responsibilitySource: verdict?.source,
      },
      metadata: {
        approvalId: approval.id,
        projectId: command.projectId,
        fiscalYear: command.fiscalYear,
        responsibilityRuleId: ruleId ?? undefined,
      },
      targetEntityId: budget.id,
      targetEntityType: 'PROJECT_BUDGET',
    });

    if (autoApprove) {
      this.logger.log(
        `Budget change for project ${command.projectId} auto-approved by responsibility rule ${verdict?.ruleId} (mode=${verdict?.mode}).`,
      );
      await this.notificationEventTranslator?.projectBudgetChangeApproved({
        projectId: command.projectId,
        approvalId: approval.id,
        approvedByPersonId: command.actorId,
        capexBudget: command.capexBudget,
        opexBudget: command.opexBudget,
      });
    } else {
      await this.notificationEventTranslator?.projectBudgetChangeRequested({
        projectId: command.projectId,
        approvalId: approval.id,
        requestedByPersonId: command.actorId,
        capexBudget: command.capexBudget,
        opexBudget: command.opexBudget,
      });
    }

    return {
      approvalId: approval.id,
      requestedChange,
      autoApproved: autoApprove,
      responsibilityRuleId: ruleId,
    };
  }

  private async resolveVerdict(args: {
    projectId: string;
    currentCapex: number;
    currentOpex: number;
    requestedCapex: number;
    requestedOpex: number;
  }): Promise<ResponsibilityVerdict | null> {
    if (!this.responsibilityResolver) {
      return null;
    }
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: args.projectId },
        select: { clientId: true, projectType: true },
      });
      // Magnitude of the change drives THRESHOLD_AMOUNT routing.
      const amount = Math.max(
        Math.abs(args.requestedCapex - args.currentCapex),
        Math.abs(args.requestedOpex - args.currentOpex),
      );
      return await this.responsibilityResolver.resolve({
        actionKind: 'BUDGET_CHANGE_APPROVAL',
        projectId: args.projectId,
        clientId: project?.clientId ?? null,
        projectType: project?.projectType ?? null,
        amount,
        fallbackRole: 'director',
      });
    } catch (err) {
      this.logger.warn(
        `ResponsibilityResolver failed during HD-6 request for project ${args.projectId}; falling back to default flow. ${(err as Error).message}`,
      );
      return null;
    }
  }
}
