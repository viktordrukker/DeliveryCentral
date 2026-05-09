import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import {
  ResponsibilityResolverService,
  ResponsibilityVerdict,
} from '@src/modules/identity-access/application/responsibility-resolver.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { Project } from '../domain/entities/project.entity';
import { ProjectRepositoryPort } from '../domain/repositories/project-repository.port';
import { ProjectId } from '../domain/value-objects/project-id';

interface DecideProjectActivationCommand {
  /** Authenticated decider (Director or Admin). */
  actorId: string;
  projectId: string;
  decision: 'APPROVE' | 'REJECT';
  /** Required when decision === 'REJECT'; optional otherwise. */
  reason?: string;
}

interface DecideProjectActivationResult {
  project: Project;
  approvalId: string;
}

/**
 * HD-2 — Director-side decision on a `PENDING_APPROVAL` project.
 *
 * APPROVE → project transitions to ACTIVE; the open
 * `ProjectActivationApproval` row gets `decision='APPROVED'` and a
 * `decidedAt` timestamp.
 *
 * REJECT → project returns to DRAFT; the approval row gets
 * `decision='REJECTED'` with the supplied reason. PM can revise +
 * resubmit, opening a fresh approval row.
 *
 * Self-approval guard: the decider may not be the same person who
 * submitted the project (no rubber-stamping yourself). Resolved by
 * matching `requestedById` on the open approval row against
 * `command.actorId`.
 *
 * Both writes (project status + approval decision) share a single
 * `prisma.$transaction` so the project status and the audit row cannot
 * disagree.
 */
@Injectable()
export class DecideProjectActivationService {
  private readonly logger = new Logger(DecideProjectActivationService.name);

  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    // HD-4 — optional. Enforces `mode === 'PERSON'` gating: only the
    // configured `targetPersonId` may decide. ROLE gating is upstream
    // at the controller (`@RequireRoles(...)`); SKIP/PM_SOLO at decide
    // time means the rule was misconfigured (the submit path should
    // have auto-approved). When the resolver is not wired, the service
    // behaves identically to the pre-HD-4 path.
    private readonly responsibilityResolver?: ResponsibilityResolverService,
  ) {}

  public async execute(
    command: DecideProjectActivationCommand,
  ): Promise<DecideProjectActivationResult> {
    if (!command.actorId) {
      throw new BadRequestException('Authenticated decider is required.');
    }
    if (command.decision === 'REJECT' && !command.reason?.trim()) {
      throw new BadRequestException('A reason is required when rejecting an activation.');
    }

    const project = await this.projectRepository.findByProjectId(
      ProjectId.from(command.projectId),
    );
    if (!project) {
      throw new NotFoundException('Project not found.');
    }
    if (project.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(
        `Project is in status ${project.status}; only PENDING_APPROVAL projects accept an activation decision.`,
      );
    }

    // Find the open approval row (most recent without a decision).
    const openApproval = await (this.prisma as unknown as {
      projectActivationApproval: {
        findFirst: (args: unknown) => Promise<{ id: string; requestedById: string } | null>;
      };
    }).projectActivationApproval.findFirst({
      where: { projectId: project.projectId.value, decidedAt: null },
      orderBy: { requestedAt: 'desc' },
    });

    if (!openApproval) {
      throw new ConflictException(
        'No open activation approval request was found for this project.',
      );
    }

    if (openApproval.requestedById === command.actorId) {
      // The submitter cannot also be the decider — guards against rubber-stamp.
      throw new ForbiddenException(
        'The submitter of an activation request cannot decide on it.',
      );
    }

    const verdict = await this.resolveVerdict(project);
    this.enforcePersonGating(verdict, command.actorId);

    if (command.decision === 'APPROVE') {
      project.activate();
    } else {
      project.rejectActivation();
    }

    const decidedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await this.projectRepository.save(project, tx);
      await (tx as unknown as {
        projectActivationApproval: {
          update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
        };
      }).projectActivationApproval.update({
        where: { id: openApproval.id },
        data: {
          decision: command.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          decidedAt,
          decidedById: command.actorId,
          reason: command.reason ?? null,
        },
      });
    });

    const actionType =
      command.decision === 'APPROVE' ? 'project.approved' : 'project.rejected';
    const ruleId = verdict?.source === 'RULE' ? verdict.ruleId : null;
    this.auditLogger?.record({
      actionType,
      actorId: command.actorId,
      category: 'project',
      changeSummary:
        command.decision === 'APPROVE'
          ? `Project ${project.name} activation approved by ${command.actorId}.`
          : `Project ${project.name} activation rejected by ${command.actorId}: ${command.reason}.`,
      details: {
        approvalId: openApproval.id,
        decision: command.decision,
        projectCode: project.projectCode,
        reason: command.reason,
        responsibilityRuleId: ruleId,
        responsibilityMode: verdict?.mode,
        responsibilitySource: verdict?.source,
      },
      metadata: {
        approvalId: openApproval.id,
        projectCode: project.projectCode,
        decision: command.decision,
        responsibilityRuleId: ruleId ?? undefined,
      },
      targetEntityId: project.projectId.value,
      targetEntityType: 'PROJECT',
    });

    if (command.decision === 'APPROVE') {
      await this.notificationEventTranslator?.projectApproved({
        projectId: project.projectId.value,
        projectName: project.name,
        approvedByPersonId: command.actorId,
      });
      // Activation also produces the existing project.activated event so
      // existing downstream consumers (RAG snapshots, dashboards) still fire.
      await this.notificationEventTranslator?.projectActivated({
        projectId: project.projectId.value,
        projectName: project.name,
      });
    } else {
      await this.notificationEventTranslator?.projectRejected({
        projectId: project.projectId.value,
        projectName: project.name,
        rejectedByPersonId: command.actorId,
        reason: command.reason ?? 'No reason provided',
      });
    }

    return { project, approvalId: openApproval.id };
  }

  private async resolveVerdict(project: Project): Promise<ResponsibilityVerdict | null> {
    if (!this.responsibilityResolver) {
      return null;
    }
    try {
      return await this.responsibilityResolver.resolve({
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        projectId: project.projectId.value,
        clientId: project.clientId ?? null,
        projectType: project.projectType ?? null,
        fallbackRole: 'director',
      });
    } catch (err) {
      this.logger.warn(
        `ResponsibilityResolver failed during HD-2 decide for project ${project.projectId.value}; falling back to controller-level role gating. ${(err as Error).message}`,
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
          `Responsibility rule ${verdict.ruleId ?? '<unknown>'} requires person ${verdict.targetPersonId ?? '<unset>'} to decide on this activation.`,
        );
      }
      return;
    }
    if (verdict.mode === 'SKIP' || verdict.mode === 'PM_SOLO') {
      // Rule says "no approval needed" — but a PENDING_APPROVAL row
      // already exists (probably submitted before the rule was created
      // or changed). Don't strand the request; let the Director clear
      // it with an explicit decision. Just log so audit can correlate.
      this.logger.warn(
        `Open PENDING_APPROVAL exists for project but responsibility rule ${verdict.ruleId} is ${verdict.mode}. Allowing decision to clear the in-flight request.`,
      );
    }
  }
}
