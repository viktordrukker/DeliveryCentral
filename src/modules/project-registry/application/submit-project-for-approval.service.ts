import {
  BadRequestException,
  ConflictException,
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

interface SubmitProjectForApprovalCommand {
  /** Authenticated submitter (PM or Admin). */
  actorId: string;
  /** Project being submitted. Must currently be in DRAFT. */
  projectId: string;
  /** Optional context the Director sees in the approval queue. */
  reason?: string;
}

interface SubmitProjectForApprovalResult {
  project: Project;
  approvalId: string;
  // HD-4 — set when a responsibility rule with `mode in (SKIP|PM_SOLO)`
  // matched at submit time, in which case the project went straight to
  // ACTIVE and the approval row was written as APPROVED. Callers that
  // want to surface "auto-approved by rule" state in the API can read this.
  autoApproved?: boolean;
  responsibilityRuleId?: string | null;
}

/**
 * HD-2 — DRAFT → PENDING_APPROVAL transition. Creates a paired
 * `ProjectActivationApproval` row tracking the request; the actual
 * approval/rejection decision is handled by
 * `DecideProjectActivationService`.
 *
 * Both writes (project status + approval row) share a single
 * `prisma.$transaction` so a partial-failure window cannot leave the
 * project in PENDING_APPROVAL without an approval record (or vice versa).
 */
@Injectable()
export class SubmitProjectForApprovalService {
  private readonly logger = new Logger(SubmitProjectForApprovalService.name);

  public constructor(
    private readonly projectRepository: ProjectRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    // HD-4 — optional. When supplied, rules with mode `SKIP` or `PM_SOLO`
    // cause the submission to auto-approve (DRAFT → ACTIVE) instead of
    // landing in PENDING_APPROVAL. Existing FALLBACK behavior is identical
    // to the pre-HD-4 path, so unwired callers (and existing tests) see no
    // change.
    private readonly responsibilityResolver?: ResponsibilityResolverService,
  ) {}

  public async execute(
    command: SubmitProjectForApprovalCommand,
  ): Promise<SubmitProjectForApprovalResult> {
    if (!command.actorId) {
      throw new BadRequestException('Authenticated submitter is required.');
    }
    const project = await this.projectRepository.findByProjectId(
      ProjectId.from(command.projectId),
    );
    if (!project) {
      throw new NotFoundException('Project not found.');
    }
    if (project.status === 'PENDING_APPROVAL') {
      throw new ConflictException('Project is already pending approval.');
    }
    if (project.status !== 'DRAFT') {
      throw new ConflictException(
        `Cannot submit a project for approval from status ${project.status}.`,
      );
    }

    const verdict = await this.resolveVerdict(project);
    const autoApprove =
      verdict !== null && (verdict.mode === 'SKIP' || verdict.mode === 'PM_SOLO');

    if (autoApprove) {
      project.activate();
    } else {
      project.submitForApproval();
    }

    const approvalId = await this.prisma.$transaction(async (tx) => {
      await this.projectRepository.save(project, tx);
      // F-57 / 20c-11 — drop the gateway coercion; Prisma exposes the
      // `projectActivationApproval` delegate on the transaction client.
      const created = await tx.projectActivationApproval.create({
        data: {
          projectId: project.projectId.value,
          requestedById: command.actorId,
          reason: command.reason ?? null,
          // F-109 / D-103-write-path — canonical actor-audit alongside
          // the domain-specific requestedById / decidedById.
          createdByPersonId: command.actorId,
          updatedByPersonId: command.actorId,
          ...(autoApprove
            ? {
                decision: 'APPROVED',
                decidedAt: new Date(),
                decidedById: command.actorId,
              }
            : {}),
        },
        select: { id: true },
      });
      return created.id;
    });

    const ruleId = verdict?.source === 'RULE' ? verdict.ruleId : null;
    this.auditLogger?.record({
      actionType: autoApprove
        ? 'project.approved'
        : 'project.submitted_for_approval',
      actorId: command.actorId,
      category: 'project',
      changeSummary: autoApprove
        ? `Project ${project.name} auto-approved at submit (responsibility rule ${verdict?.mode}).`
        : `Project ${project.name} submitted for Director approval.`,
      details: {
        approvalId,
        projectCode: project.projectCode,
        reason: command.reason,
        responsibilityRuleId: ruleId,
        responsibilityMode: verdict?.mode,
        responsibilitySource: verdict?.source,
      },
      metadata: {
        approvalId,
        projectCode: project.projectCode,
        responsibilityRuleId: ruleId ?? undefined,
      },
      targetEntityId: project.projectId.value,
      targetEntityType: 'PROJECT',
    });

    if (autoApprove) {
      this.logger.log(
        `Project ${project.projectId.value} auto-activated at submit by responsibility rule ${verdict?.ruleId} (mode=${verdict?.mode}).`,
      );
      await this.notificationEventTranslator?.projectApproved({
        projectId: project.projectId.value,
        projectName: project.name,
        approvedByPersonId: command.actorId,
      });
      await this.notificationEventTranslator?.projectActivated({
        projectId: project.projectId.value,
        projectName: project.name,
      });
    } else {
      await this.notificationEventTranslator?.projectSubmittedForApproval({
        projectId: project.projectId.value,
        projectName: project.name,
        submittedByPersonId: command.actorId,
        approvalId,
      });
    }

    return {
      project,
      approvalId,
      autoApproved: autoApprove,
      responsibilityRuleId: ruleId,
    };
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
      // Resolver should never block the submit path. Log + fall through
      // to the default PENDING_APPROVAL flow.
      this.logger.warn(
        `ResponsibilityResolver failed during HD-2 submit for project ${project.projectId.value}; falling back to default flow. ${(err as Error).message}`,
      );
      return null;
    }
  }
}
