import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreateRateCardDto,
  CreateRateCardEntryDto,
  RateCardEntryResponseDto,
  RateCardResponseDto,
  RateCardWithEntriesResponseDto,
  UpdateRateCardDto,
  UpdateRateCardEntryDto,
} from './contracts/rate-card.dto';

// HD-3 — Admin CRUD over `rate_cards` + `rate_card_entries`. Backs the
// `RateCardsAdminPage` UI. Soft-deletes via `archivedAt`. Mode:
// admin-only (controller @RequireRoles('admin')).

interface CardRow {
  id: string;
  name: string;
  currencyCode: string;
  clientId: string | null;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  notes: string | null;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

interface CardWithEntriesRow extends CardRow {
  entries: EntryRow[];
  client?: { name: string } | null;
  _count?: { entries: number };
}

interface EntryRow {
  id: string;
  rateCardId: string;
  staffingRole: string;
  grade: string;
  requiredSkills: string[];
  hourlyRate: Prisma.Decimal;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  _count?: { pinnedAssignments: number };
}

@Injectable()
export class RateCardAdminService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async list(filter?: {
    clientId?: string;
    includeArchived?: boolean;
  }): Promise<RateCardResponseDto[]> {
    const where: Record<string, unknown> = {};
    if (filter?.clientId) where.clientId = filter.clientId;
    if (!filter?.includeArchived) where.archivedAt = null;

    const rows = await (this.prisma as unknown as {
      rateCard: {
        findMany: (q: {
          where: Record<string, unknown>;
          include: unknown;
          orderBy: unknown;
        }) => Promise<Array<CardRow & { client?: { name: string } | null; _count?: { entries: number } }>>;
      };
    }).rateCard.findMany({
      where,
      include: {
        client: { select: { name: true } },
        _count: { select: { entries: true } },
      },
      orderBy: [{ clientId: 'asc' }, { validFrom: 'desc' }, { name: 'asc' }],
    });

    return rows.map((r) => this.toCardResponse(r, r.client?.name ?? null, r._count?.entries ?? 0));
  }

  public async getById(id: string): Promise<RateCardWithEntriesResponseDto> {
    const row = (await (this.prisma as unknown as {
      rateCard: {
        findUnique: (q: { where: { id: string }; include: unknown }) => Promise<CardWithEntriesRow | null>;
      };
    }).rateCard.findUnique({
      where: { id },
      include: {
        client: { select: { name: true } },
        entries: {
          include: { _count: { select: { pinnedAssignments: true } } },
          orderBy: [{ staffingRole: 'asc' }, { grade: 'asc' }],
        },
        _count: { select: { entries: true } },
      },
    })) as CardWithEntriesRow | null;

    if (!row) throw new NotFoundException(`Rate card ${id} not found.`);

    const card = this.toCardResponse(row, row.client?.name ?? null, row._count?.entries ?? 0);
    return {
      ...card,
      entries: row.entries.map((e) => this.toEntryResponse(e)),
    };
  }

  public async create(dto: CreateRateCardDto, actorId: string): Promise<RateCardResponseDto> {
    this.assertValidityWindow(dto.validFrom, dto.validTo ?? null);

    const created = await (this.prisma as unknown as {
      rateCard: {
        create: (q: { data: Record<string, unknown> }) => Promise<CardRow>;
      };
    }).rateCard.create({
      data: {
        name: dto.name.trim(),
        currencyCode: dto.currencyCode.toUpperCase(),
        clientId: dto.clientId ?? null,
        validFrom: new Date(dto.validFrom),
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isActive: true,
        notes: dto.notes?.trim() || null,
        tenantId: dto.tenantId ?? null,
      },
    });

    this.auditLogger?.record({
      actionType: 'rate_card.created',
      actorId,
      category: 'project',
      changeSummary: `Rate card ${created.name} (${created.currencyCode}) created.`,
      details: { rateCardId: created.id, ...dto },
      metadata: { rateCardId: created.id },
      targetEntityId: created.id,
      targetEntityType: 'RATE_CARD',
    });

    return this.toCardResponse(created, null, 0);
  }

  public async update(
    id: string,
    dto: UpdateRateCardDto,
    actorId: string,
  ): Promise<RateCardResponseDto> {
    const existing = await this.requireCard(id);
    const nextFrom = dto.validFrom ? new Date(dto.validFrom) : existing.validFrom;
    const nextTo = dto.validTo === undefined ? existing.validTo : dto.validTo ? new Date(dto.validTo) : null;
    if (nextTo && nextFrom > nextTo) {
      throw new BadRequestException('validFrom must be on or before validTo.');
    }

    const updated = await (this.prisma as unknown as {
      rateCard: {
        update: (q: { where: { id: string }; data: Record<string, unknown> }) => Promise<CardRow>;
      };
    }).rateCard.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.validFrom !== undefined ? { validFrom: new Date(dto.validFrom) } : {}),
        ...(dto.validTo !== undefined ? { validTo: dto.validTo ? new Date(dto.validTo) : null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    this.auditLogger?.record({
      actionType: 'rate_card.updated',
      actorId,
      category: 'project',
      changeSummary: `Rate card ${id} updated.`,
      details: { rateCardId: id, changes: dto },
      metadata: { rateCardId: id },
      targetEntityId: id,
      targetEntityType: 'RATE_CARD',
    });

    return this.toCardResponse(updated, null, 0);
  }

  public async archive(id: string, actorId: string): Promise<RateCardResponseDto> {
    const existing = await this.requireCard(id);
    if (existing.archivedAt) {
      throw new ConflictException(`Rate card ${id} is already archived.`);
    }

    const updated = await (this.prisma as unknown as {
      rateCard: {
        update: (q: { where: { id: string }; data: Record<string, unknown> }) => Promise<CardRow>;
      };
    }).rateCard.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    this.auditLogger?.record({
      actionType: 'rate_card.archived',
      actorId,
      category: 'project',
      changeSummary: `Rate card ${id} archived.`,
      details: { rateCardId: id },
      metadata: { rateCardId: id },
      targetEntityId: id,
      targetEntityType: 'RATE_CARD',
    });

    return this.toCardResponse(updated, null, 0);
  }

  public async createEntry(
    cardId: string,
    dto: CreateRateCardEntryDto,
    actorId: string,
  ): Promise<RateCardEntryResponseDto> {
    await this.requireCard(cardId);
    try {
      const created = await (this.prisma as unknown as {
        rateCardEntry: {
          create: (q: { data: Record<string, unknown> }) => Promise<EntryRow>;
        };
      }).rateCardEntry.create({
        data: {
          rateCardId: cardId,
          staffingRole: dto.staffingRole.trim(),
          grade: dto.grade.trim(),
          requiredSkills: dto.requiredSkills ?? [],
          hourlyRate: new Prisma.Decimal(dto.hourlyRate),
          notes: dto.notes?.trim() || null,
          isActive: true,
        },
      });

      this.auditLogger?.record({
        actionType: 'rate_card_entry.created',
        actorId,
        category: 'project',
        changeSummary: `Rate card entry created on ${cardId}: ${dto.staffingRole}/${dto.grade} @ ${dto.hourlyRate}.`,
        details: { rateCardId: cardId, entryId: created.id, ...dto },
        metadata: { rateCardId: cardId, entryId: created.id },
        targetEntityId: created.id,
        targetEntityType: 'RATE_CARD_ENTRY',
      });

      return this.toEntryResponse(created);
    } catch (err: unknown) {
      // Unique constraint on (rateCardId, staffingRole, grade) — surface
      // a friendly error rather than leaking P2002.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(
          `A rate card entry for role "${dto.staffingRole}" + grade "${dto.grade}" already exists on this card. Update the existing entry or archive it first.`,
        );
      }
      throw err;
    }
  }

  public async updateEntry(
    cardId: string,
    entryId: string,
    dto: UpdateRateCardEntryDto,
    actorId: string,
  ): Promise<RateCardEntryResponseDto> {
    const entry = await this.requireEntry(cardId, entryId);

    const data: Record<string, unknown> = {};
    if (dto.requiredSkills !== undefined) data.requiredSkills = dto.requiredSkills;
    if (dto.hourlyRate !== undefined) data.hourlyRate = new Prisma.Decimal(dto.hourlyRate);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await (this.prisma as unknown as {
      rateCardEntry: {
        update: (q: { where: { id: string }; data: Record<string, unknown> }) => Promise<EntryRow>;
      };
    }).rateCardEntry.update({
      where: { id: entry.id },
      data,
    });

    this.auditLogger?.record({
      actionType: 'rate_card_entry.updated',
      actorId,
      category: 'project',
      changeSummary: `Rate card entry ${entryId} updated.`,
      details: { rateCardId: cardId, entryId, changes: dto },
      metadata: { rateCardId: cardId, entryId },
      targetEntityId: entryId,
      targetEntityType: 'RATE_CARD_ENTRY',
    });

    return this.toEntryResponse(updated);
  }

  public async archiveEntry(
    cardId: string,
    entryId: string,
    actorId: string,
  ): Promise<RateCardEntryResponseDto> {
    const entry = await this.requireEntry(cardId, entryId);
    if (entry.archivedAt) {
      throw new ConflictException(`Rate card entry ${entryId} is already archived.`);
    }

    const updated = await (this.prisma as unknown as {
      rateCardEntry: {
        update: (q: { where: { id: string }; data: Record<string, unknown> }) => Promise<EntryRow>;
      };
    }).rateCardEntry.update({
      where: { id: entry.id },
      data: { archivedAt: new Date(), isActive: false },
    });

    this.auditLogger?.record({
      actionType: 'rate_card_entry.archived',
      actorId,
      category: 'project',
      changeSummary: `Rate card entry ${entryId} archived.`,
      details: { rateCardId: cardId, entryId },
      metadata: { rateCardId: cardId, entryId },
      targetEntityId: entryId,
      targetEntityType: 'RATE_CARD_ENTRY',
    });

    return this.toEntryResponse(updated);
  }

  private async requireCard(id: string): Promise<CardRow> {
    const row = (await (this.prisma as unknown as {
      rateCard: {
        findUnique: (q: { where: { id: string } }) => Promise<CardRow | null>;
      };
    }).rateCard.findUnique({ where: { id } })) as CardRow | null;
    if (!row) throw new NotFoundException(`Rate card ${id} not found.`);
    return row;
  }

  private async requireEntry(cardId: string, entryId: string): Promise<EntryRow> {
    const row = (await (this.prisma as unknown as {
      rateCardEntry: {
        findUnique: (q: { where: { id: string } }) => Promise<EntryRow | null>;
      };
    }).rateCardEntry.findUnique({ where: { id: entryId } })) as EntryRow | null;
    if (!row) throw new NotFoundException(`Rate card entry ${entryId} not found.`);
    if (row.rateCardId !== cardId) {
      throw new BadRequestException(
        `Entry ${entryId} does not belong to rate card ${cardId}.`,
      );
    }
    return row;
  }

  private assertValidityWindow(validFrom: string, validTo: string | null): void {
    const from = new Date(validFrom);
    if (Number.isNaN(from.getTime())) {
      throw new BadRequestException('validFrom must be a valid ISO date.');
    }
    if (validTo) {
      const to = new Date(validTo);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('validTo must be a valid ISO date.');
      }
      if (from > to) {
        throw new BadRequestException('validFrom must be on or before validTo.');
      }
    }
  }

  private toCardResponse(
    r: CardRow,
    clientName: string | null,
    entryCount: number,
  ): RateCardResponseDto {
    return {
      id: r.id,
      name: r.name,
      currencyCode: r.currencyCode,
      clientId: r.clientId,
      clientName,
      validFrom: r.validFrom.toISOString().slice(0, 10),
      validTo: r.validTo ? r.validTo.toISOString().slice(0, 10) : null,
      isActive: r.isActive,
      notes: r.notes,
      tenantId: r.tenantId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
      entryCount,
    };
  }

  private toEntryResponse(r: EntryRow): RateCardEntryResponseDto {
    return {
      id: r.id,
      rateCardId: r.rateCardId,
      staffingRole: r.staffingRole,
      grade: r.grade,
      requiredSkills: r.requiredSkills,
      hourlyRate: Number(r.hourlyRate),
      notes: r.notes,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
      pinnedAssignmentCount: r._count?.pinnedAssignments ?? 0,
    };
  }
}
