import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface BulkReassignOrgMembershipCommand {
  /** People to reassign. */
  personIds: string[];
  /** Destination org unit. */
  toOrgUnitId: string;
  /** ISO-8601 date (YYYY-MM-DD or full datetime). The current membership is
   *  closed at `effectiveFrom - 1 day` and a new one starts at `effectiveFrom`. */
  effectiveFrom: string;
  reason?: string;
  actorId: string;
}

export interface BulkReassignOrgMembershipResult {
  movedPersonIds: string[];
  /** Persons who were already in the destination org unit on `effectiveFrom`
   *  and therefore needed no change (idempotent re-run safety). */
  skippedPersonIds: string[];
  newMembershipIds: string[];
}

/**
 * LEAN-P4-missing-4 — HR bulk org-structure reassignment.
 *
 * For each person:
 *   1. Validate the person + destination org unit exist.
 *   2. If the person already has an active membership in `toOrgUnitId` on
 *      `effectiveFrom`, skip them (idempotent re-run safety).
 *   3. Otherwise close all currently-active memberships at
 *      `effectiveFrom - 1 day` and open a fresh PersonOrgMembership row
 *      starting at `effectiveFrom`.
 *
 * The entire batch runs inside a single `prisma.$transaction`, so partial
 * failure on any one person rolls back every preceding write.
 */
@Injectable()
export class BulkReassignOrgMembershipService {
  private readonly logger = new Logger(BulkReassignOrgMembershipService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async execute(
    command: BulkReassignOrgMembershipCommand,
  ): Promise<BulkReassignOrgMembershipResult> {
    if (!command.actorId) {
      throw new BadRequestException('Authenticated actor is required.');
    }
    if (!Array.isArray(command.personIds) || command.personIds.length === 0) {
      throw new BadRequestException('At least one personId is required.');
    }
    if (!command.toOrgUnitId) {
      throw new BadRequestException('toOrgUnitId is required.');
    }

    const effectiveFromDate = new Date(command.effectiveFrom);
    if (Number.isNaN(effectiveFromDate.getTime())) {
      throw new BadRequestException('effectiveFrom must be a valid ISO-8601 date.');
    }

    const uniquePersonIds = Array.from(new Set(command.personIds));

    const orgUnit = await this.prisma.orgUnit.findUnique({
      where: { id: command.toOrgUnitId },
      select: { id: true, name: true },
    });
    if (!orgUnit) {
      throw new NotFoundException(`Org unit ${command.toOrgUnitId} not found.`);
    }

    const persons = await this.prisma.person.findMany({
      where: { id: { in: uniquePersonIds } },
      select: { id: true },
    });
    const foundIds = new Set(persons.map((p) => p.id));
    const missing = uniquePersonIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundException(
        `Person(s) not found: ${missing.join(', ')}.`,
      );
    }

    const movedPersonIds: string[] = [];
    const skippedPersonIds: string[] = [];
    const newMembershipIds: string[] = [];

    const closeAt = new Date(effectiveFromDate.getTime() - 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      for (const personId of uniquePersonIds) {
        const activeRows = await tx.personOrgMembership.findMany({
          where: {
            personId,
            archivedAt: null,
            validFrom: { lte: effectiveFromDate },
            OR: [{ validTo: null }, { validTo: { gte: effectiveFromDate } }],
          },
          select: { id: true, orgUnitId: true, isPrimary: true },
        });

        const alreadyInTarget = activeRows.some(
          (row) => row.orgUnitId === command.toOrgUnitId,
        );
        if (alreadyInTarget) {
          skippedPersonIds.push(personId);
          continue;
        }

        for (const row of activeRows) {
          await tx.personOrgMembership.update({
            where: { id: row.id },
            data: {
              validTo: closeAt,
              updatedByPersonId: command.actorId,
            },
          });
        }

        const created = await tx.personOrgMembership.create({
          data: {
            personId,
            orgUnitId: command.toOrgUnitId,
            isPrimary: true,
            validFrom: effectiveFromDate,
            createdByPersonId: command.actorId,
            updatedByPersonId: command.actorId,
          },
          select: { id: true },
        });

        movedPersonIds.push(personId);
        newMembershipIds.push(created.id);
      }
    });

    this.auditLogger?.record({
      actionType: 'organization.bulk_reassign_org_membership',
      actorId: command.actorId,
      category: 'organization',
      changeSummary: `Reassigned ${movedPersonIds.length} person(s) to org unit ${orgUnit.name} (${command.toOrgUnitId}) effective ${command.effectiveFrom}.`,
      details: {
        toOrgUnitId: command.toOrgUnitId,
        effectiveFrom: command.effectiveFrom,
        reason: command.reason ?? null,
        movedPersonIds,
        skippedPersonIds,
        newMembershipIds,
      },
      metadata: {
        toOrgUnitId: command.toOrgUnitId,
        effectiveFrom: command.effectiveFrom,
        movedCount: movedPersonIds.length,
        skippedCount: skippedPersonIds.length,
      },
      targetEntityId: command.toOrgUnitId,
      targetEntityType: 'ORG_UNIT',
    });

    this.logger.log(
      `Bulk reassign: moved ${movedPersonIds.length} skipped ${skippedPersonIds.length} → ${orgUnit.name}.`,
    );

    return { movedPersonIds, skippedPersonIds, newMembershipIds };
  }
}
