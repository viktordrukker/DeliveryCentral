import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

const DM_ROLES = new Set(['delivery_manager', 'director', 'admin']);
const DIRECTOR_ROLES = new Set(['director', 'admin']);

const ALLOWED_SOURCE_KINDS = new Set(['timesheet', 'work-hour', 'milestone', 'leave']);

interface ActorPrincipal {
  personId: string;
  roles: readonly string[];
}

export type DmEscalationSourceKind = 'timesheet' | 'work-hour' | 'milestone' | 'leave';

export interface DmEscalationView {
  id: string;
  publicId: string | null;
  sourceKind: DmEscalationSourceKind;
  sourceId: string;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN' | 'CANCELLED';
  escalatedByPersonId: string;
  escalatedByDisplayName: string | null;
  escalatedToPersonId: string | null;
  escalatedToDisplayName: string | null;
  resolvedAt: string | null;
  resolvedByPersonId: string | null;
  resolvedByDisplayName: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * LEAN-P4-missing-9 — DM rejection escalation surface.
 *
 * A Delivery Manager rejects a timesheet, work-hour overrun, milestone slip
 * or leave outside policy. Instead of the rejection being final, it escalates
 * to a Director for confirmation or override:
 *
 *   * createEscalation — DM creates a `PENDING` row pointing at the
 *     rejected artefact via opaque `(sourceKind, sourceId)` pointer.
 *   * confirmEscalation — Director endorses the rejection; status →
 *     `CONFIRMED`, rejection stands.
 *   * overrideEscalation — Director overrules the DM; status →
 *     `OVERRIDDEN`, DM must re-approve the artefact upstream.
 *   * cancelEscalation — DM withdraws their own escalation before any
 *     Director has acted on it.
 *
 * No FK to upstream artefacts: timesheet / work-hour / milestone / leave
 * are heterogeneous, so the (sourceKind, sourceId) pair is treated as an
 * opaque pointer the UI resolves separately when needed.
 */
@Injectable()
export class DmEscalationService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async createEscalation(
    actor: ActorPrincipal,
    input: {
      sourceKind: string;
      sourceId: string;
      reason: string;
      escalatedToPersonId?: string | null;
    },
  ): Promise<DmEscalationView> {
    if (!DM_ROLES.has('delivery_manager') || !actor.roles.some((r) => DM_ROLES.has(r))) {
      // DM_ROLES.has('delivery_manager') is always true — kept for readability.
      // The real gate is `actor.roles ∩ DM_ROLES`.
      throw new ForbiddenException('Only delivery managers may create escalations.');
    }
    if (!ALLOWED_SOURCE_KINDS.has(input.sourceKind)) {
      throw new BadRequestException(
        `sourceKind must be one of ${[...ALLOWED_SOURCE_KINDS].join(', ')}.`,
      );
    }
    if (!input.reason || input.reason.trim().length === 0) {
      throw new BadRequestException('reason is required.');
    }

    const row = await this.prisma.dmEscalation.create({
      data: {
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
        reason: input.reason.trim(),
        escalatedByPersonId: actor.personId,
        escalatedToPersonId: input.escalatedToPersonId ?? null,
        status: 'PENDING',
      },
      include: {
        escalatedBy: { select: { id: true, displayName: true } },
        escalatedTo: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
      },
    });

    this.auditLogger?.record({
      actionType: 'dm.escalation.created',
      actorId: actor.personId,
      category: 'approval',
      changeSummary: `DM escalation opened for ${input.sourceKind} ${input.sourceId}.`,
      details: {
        escalationId: row.id,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
        reason: input.reason,
      },
      metadata: {
        escalationId: row.id,
        sourceKind: input.sourceKind,
        sourceId: input.sourceId,
      },
      targetEntityId: row.id,
      targetEntityType: 'DmEscalation',
    });

    return mapRow(row);
  }

  public async listPending(): Promise<DmEscalationView[]> {
    const rows = await this.prisma.dmEscalation.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        escalatedBy: { select: { id: true, displayName: true } },
        escalatedTo: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
      },
      take: 200,
    });
    return rows.map(mapRow);
  }

  public async listMine(personId: string): Promise<DmEscalationView[]> {
    const rows = await this.prisma.dmEscalation.findMany({
      where: { escalatedByPersonId: personId },
      orderBy: { createdAt: 'desc' },
      include: {
        escalatedBy: { select: { id: true, displayName: true } },
        escalatedTo: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
      },
      take: 200,
    });
    return rows.map(mapRow);
  }

  public async confirmEscalation(
    actor: ActorPrincipal,
    id: string,
    notes?: string,
  ): Promise<DmEscalationView> {
    if (!actor.roles.some((r) => DIRECTOR_ROLES.has(r))) {
      throw new ForbiddenException('Only directors may confirm escalations.');
    }
    const existing = await this.prisma.dmEscalation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`DmEscalation ${id} not found.`);
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Escalation is already ${existing.status}; cannot confirm.`,
      );
    }

    const row = await this.prisma.dmEscalation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        resolvedAt: new Date(),
        resolvedByPersonId: actor.personId,
        resolutionNotes: notes ?? null,
      },
      include: {
        escalatedBy: { select: { id: true, displayName: true } },
        escalatedTo: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
      },
    });

    this.auditLogger?.record({
      actionType: 'dm.escalation.confirmed',
      actorId: actor.personId,
      category: 'approval',
      changeSummary: `Director confirmed DM escalation for ${row.sourceKind} ${row.sourceId}.`,
      details: {
        escalationId: id,
        sourceKind: row.sourceKind,
        sourceId: row.sourceId,
        notes: notes ?? null,
      },
      metadata: { escalationId: id, decision: 'CONFIRMED', notes: notes ?? null },
      targetEntityId: id,
      targetEntityType: 'DmEscalation',
    });

    return mapRow(row);
  }

  public async overrideEscalation(
    actor: ActorPrincipal,
    id: string,
    notes?: string,
  ): Promise<DmEscalationView> {
    if (!actor.roles.some((r) => DIRECTOR_ROLES.has(r))) {
      throw new ForbiddenException('Only directors may override escalations.');
    }
    const existing = await this.prisma.dmEscalation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`DmEscalation ${id} not found.`);
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Escalation is already ${existing.status}; cannot override.`,
      );
    }

    const row = await this.prisma.dmEscalation.update({
      where: { id },
      data: {
        status: 'OVERRIDDEN',
        resolvedAt: new Date(),
        resolvedByPersonId: actor.personId,
        resolutionNotes: notes ?? null,
      },
      include: {
        escalatedBy: { select: { id: true, displayName: true } },
        escalatedTo: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
      },
    });

    this.auditLogger?.record({
      actionType: 'dm.escalation.overridden',
      actorId: actor.personId,
      category: 'approval',
      changeSummary: `Director overrode DM escalation for ${row.sourceKind} ${row.sourceId}.`,
      details: {
        escalationId: id,
        sourceKind: row.sourceKind,
        sourceId: row.sourceId,
        notes: notes ?? null,
      },
      metadata: { escalationId: id, decision: 'OVERRIDDEN', notes: notes ?? null },
      targetEntityId: id,
      targetEntityType: 'DmEscalation',
    });

    return mapRow(row);
  }

  public async cancelEscalation(
    actor: ActorPrincipal,
    id: string,
    notes?: string,
  ): Promise<DmEscalationView> {
    const existing = await this.prisma.dmEscalation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`DmEscalation ${id} not found.`);
    if (existing.escalatedByPersonId !== actor.personId) {
      throw new ForbiddenException('Only the originating DM may cancel an escalation.');
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Escalation is already ${existing.status}; cannot cancel.`,
      );
    }

    const row = await this.prisma.dmEscalation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        resolvedAt: new Date(),
        resolvedByPersonId: actor.personId,
        resolutionNotes: notes ?? null,
      },
      include: {
        escalatedBy: { select: { id: true, displayName: true } },
        escalatedTo: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, displayName: true } },
      },
    });

    this.auditLogger?.record({
      actionType: 'dm.escalation.cancelled',
      actorId: actor.personId,
      category: 'approval',
      changeSummary: `DM cancelled their own escalation for ${row.sourceKind} ${row.sourceId}.`,
      details: { escalationId: id, notes: notes ?? null },
      metadata: { escalationId: id, decision: 'CANCELLED' },
      targetEntityId: id,
      targetEntityType: 'DmEscalation',
    });

    return mapRow(row);
  }
}

interface RowShape {
  id: string;
  publicId: string | null;
  sourceKind: string;
  sourceId: string;
  reason: string;
  status: 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN' | 'CANCELLED';
  escalatedByPersonId: string;
  escalatedToPersonId: string | null;
  resolvedAt: Date | null;
  resolvedByPersonId: string | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  escalatedBy: { id: string; displayName: string } | null;
  escalatedTo: { id: string; displayName: string } | null;
  resolvedBy: { id: string; displayName: string } | null;
}

function mapRow(row: RowShape): DmEscalationView {
  return {
    id: row.id,
    publicId: row.publicId ?? null,
    sourceKind: row.sourceKind as DmEscalationSourceKind,
    sourceId: row.sourceId,
    reason: row.reason,
    status: row.status,
    escalatedByPersonId: row.escalatedByPersonId,
    escalatedByDisplayName: row.escalatedBy?.displayName ?? null,
    escalatedToPersonId: row.escalatedToPersonId ?? null,
    escalatedToDisplayName: row.escalatedTo?.displayName ?? null,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    resolvedByPersonId: row.resolvedByPersonId ?? null,
    resolvedByDisplayName: row.resolvedBy?.displayName ?? null,
    resolutionNotes: row.resolutionNotes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
