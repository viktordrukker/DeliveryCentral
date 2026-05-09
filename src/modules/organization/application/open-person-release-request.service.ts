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

import { Person } from '../domain/entities/person.entity';
import { PersonRepositoryPort } from '../domain/repositories/person-repository.port';
import { PersonId } from '../domain/value-objects/person-id';

interface OpenPersonReleaseRequestCommand {
  /** Authenticated initiator. Per J3 the canonical caller role is `resource_manager`,
   *  but admins may also initiate. The service does NOT enforce role here — that
   *  lives on the controller via `@RequireRoles(...)`. */
  actorId: string;
  /** Subject of the release. */
  personId: string;
  /** Free-text rationale shown to HR + Director in their queues. Required. */
  reason: string;
  /** Optional dictionary key from `release-reasons` MetadataDictionary. */
  reasonCode?: string;
  /** ISO date `YYYY-MM-DD` — the day the person's effective last day will be. */
  targetTerminationDate: string;
}

interface OpenPersonReleaseRequestResult {
  requestId: string;
  // HD-4 — set when a responsibility rule resolved at open time.
  // Recorded for downstream callers + traceability. The dual-approval
  // semantic of release means open-time SKIP/PM_SOLO are NOT honored —
  // the request still requires HR + Director slots. The rule influences
  // who is allowed to fill each slot at decide time.
  hrResponsibilityRuleId?: string | null;
  directorResponsibilityRuleId?: string | null;
}

/**
 * HD-5 — RM (or admin) opens a `PersonReleaseRequest` for an active
 * employee. Per J3, the request enters `PENDING_APPROVAL` and waits for
 * BOTH an HR Manager AND a Director approval before it can be
 * finalized. This service writes the request row only; HR/Director
 * decisions land via `DecidePersonReleaseService`.
 *
 * Guards:
 *   - Subject must be `ACTIVE` (terminating an inactive person is not
 *     a release flow — it's a data-cleanup operation).
 *   - Subject ≠ initiator (you cannot release yourself).
 *   - At most one open (`PENDING_APPROVAL`) request per person at a
 *     time. Withdraw or decide the open one first.
 *   - `targetTerminationDate` must parse as a valid date.
 *
 * Notification: emits `person.release.requested` so HR + Director see
 * the row in their approval queues.
 */
@Injectable()
export class OpenPersonReleaseRequestService {
  private readonly logger = new Logger(OpenPersonReleaseRequestService.name);

  public constructor(
    private readonly personRepository: PersonRepositoryPort,
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    // HD-4 — when wired, the resolver is consulted at open time for
    // both HR and Director slots. Verdicts are persisted in the audit
    // record + returned for traceability. Auto-decide is intentionally
    // NOT applied at open time — release is dual-approval by design and
    // SKIP/PM_SOLO would bypass the safety net. Per-slot enforcement
    // lives in `DecidePersonReleaseService`.
    private readonly responsibilityResolver?: ResponsibilityResolverService,
  ) {}

  public async execute(
    command: OpenPersonReleaseRequestCommand,
  ): Promise<OpenPersonReleaseRequestResult> {
    if (!command.actorId) {
      throw new BadRequestException('Authenticated initiator is required.');
    }
    if (!command.reason?.trim()) {
      throw new BadRequestException('Release reason is required.');
    }
    if (command.actorId === command.personId) {
      throw new ForbiddenException('A person cannot initiate their own release.');
    }
    const targetDate = new Date(command.targetTerminationDate);
    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException('targetTerminationDate must be a valid ISO date.');
    }

    const person = await this.personRepository.findByPersonId(PersonId.from(command.personId));
    if (!person) {
      throw new NotFoundException('Person not found.');
    }
    if (person.status !== 'ACTIVE') {
      throw new ConflictException(
        `Person is in status ${person.status}; only ACTIVE persons can be released. Inactive/terminated persons need direct admin action.`,
      );
    }

    const existing = await (this.prisma as unknown as {
      personReleaseRequest: {
        findFirst: (args: unknown) => Promise<{ id: string } | null>;
      };
    }).personReleaseRequest.findFirst({
      where: { personId: command.personId, status: 'PENDING_APPROVAL' },
    });
    if (existing) {
      throw new ConflictException(
        `A release request is already pending for this person (${existing.id}). Decide on it or cancel it first.`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      return (tx as unknown as {
        personReleaseRequest: {
          create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
        };
      }).personReleaseRequest.create({
        data: {
          personId: command.personId,
          initiatedByPersonId: command.actorId,
          reason: command.reason.trim(),
          reasonCode: command.reasonCode ?? null,
          targetTerminationDate: targetDate,
        },
      });
    });

    const hrVerdict = await this.resolveSlotVerdict(person, 'PERSON_RELEASE_HR_APPROVAL', 'hr_manager');
    const directorVerdict = await this.resolveSlotVerdict(
      person,
      'PERSON_RELEASE_DIRECTOR_APPROVAL',
      'director',
    );
    const hrRuleId = hrVerdict?.source === 'RULE' ? hrVerdict.ruleId : null;
    const directorRuleId = directorVerdict?.source === 'RULE' ? directorVerdict.ruleId : null;

    this.auditLogger?.record({
      actionType: 'person.release.requested',
      actorId: command.actorId,
      category: 'organization',
      changeSummary: `Release initiated for ${person.displayName} by ${command.actorId} — target date ${command.targetTerminationDate}.`,
      details: {
        requestId: created.id,
        personId: command.personId,
        reason: command.reason,
        reasonCode: command.reasonCode,
        targetTerminationDate: command.targetTerminationDate,
        hrResponsibilityRuleId: hrRuleId,
        hrResponsibilityMode: hrVerdict?.mode,
        directorResponsibilityRuleId: directorRuleId,
        directorResponsibilityMode: directorVerdict?.mode,
      },
      metadata: {
        requestId: created.id,
        personId: command.personId,
        hrResponsibilityRuleId: hrRuleId ?? undefined,
        directorResponsibilityRuleId: directorRuleId ?? undefined,
      },
      targetEntityId: command.personId,
      targetEntityType: 'PERSON',
    });

    await this.notificationEventTranslator?.personReleaseRequested({
      requestId: created.id,
      personId: command.personId,
      initiatedByPersonId: command.actorId,
      targetTerminationDate: command.targetTerminationDate,
    });

    return {
      requestId: created.id,
      hrResponsibilityRuleId: hrRuleId,
      directorResponsibilityRuleId: directorRuleId,
    };
  }

  private async resolveSlotVerdict(
    person: Person,
    actionKind: 'PERSON_RELEASE_HR_APPROVAL' | 'PERSON_RELEASE_DIRECTOR_APPROVAL',
    fallbackRole: 'hr_manager' | 'director',
  ): Promise<ResponsibilityVerdict | null> {
    if (!this.responsibilityResolver) {
      return null;
    }
    try {
      return await this.responsibilityResolver.resolve({
        actionKind,
        orgUnitId: person.orgUnitId?.value ?? null,
        grade: person.grade ?? null,
        fallbackRole,
      });
    } catch (err) {
      this.logger.warn(
        `ResponsibilityResolver failed during HD-5 open (${actionKind}) for person ${person.personId.value}; falling back. ${(err as Error).message}`,
      );
      return null;
    }
  }
}
