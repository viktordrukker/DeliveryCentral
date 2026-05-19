import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreateResponsibilityRuleDto,
  ResponsibilityActionKindStr,
  ResponsibilityModeStr,
  ResponsibilityRuleResponseDto,
  ResponsibilityScopeStr,
  UpdateResponsibilityRuleDto,
} from './contracts/responsibility-rule.dto';

// HD-4 — Admin CRUD over `responsibility_rules`. Backs the
// `ResponsibilityMatrixAdminPage` UI. The 7 seeded defaults
// (`00000000-0000-4000-8000-0000000d04xx`) are normal rules but
// surface `isSeededDefault=true` so the UI can show a badge.

const SEEDED_DEFAULT_PREFIX = '00000000-0000-4000-8000-0000000d04';

// F-41 / 20c-11 — drop the 5 `(this.prisma as unknown as {...})` casts
// that coerced the Prisma client into a hand-rolled shape per call site.
type RuleRow = Prisma.ResponsibilityRuleGetPayload<Record<string, never>>;

@Injectable()
export class ResponsibilityRulesAdminService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async list(filter?: {
    actionKind?: ResponsibilityActionKindStr;
    includeArchived?: boolean;
  }): Promise<ResponsibilityRuleResponseDto[]> {
    const where: Record<string, unknown> = {};
    if (filter?.actionKind) where.actionKind = filter.actionKind;
    if (!filter?.includeArchived) where.archivedAt = null;
    const rows = await this.prisma.responsibilityRule.findMany({
      where,
      orderBy: [{ actionKind: 'asc' }, { priority: 'asc' }, { updatedAt: 'desc' }],
    });
    return rows.map((r) => this.toResponse(r));
  }

  public async create(
    dto: CreateResponsibilityRuleDto,
    actorId: string,
  ): Promise<ResponsibilityRuleResponseDto> {
    this.assertModeTargetCoherence(dto.mode, dto.targetRole, dto.targetPersonId);
    this.assertScopeValueCoherence(dto.scopeKind, dto.scopeValue ?? null);

    const created = await this.prisma.responsibilityRule.create({
      data: {
        actionKind: dto.actionKind,
        scopeKind: dto.scopeKind,
        scopeValue: dto.scopeValue ?? null,
        mode: dto.mode,
        targetRole: dto.targetRole ?? null,
        targetPersonId: dto.targetPersonId ?? null,
        priority: dto.priority ?? 100,
        isActive: true,
        notes: dto.notes ?? null,
        tenantId: dto.tenantId ?? null,
      },
    });

    this.auditLogger?.record({
      actionType: 'responsibility_rule.created',
      actorId,
      category: 'settings',
      changeSummary: `Responsibility rule created: ${dto.actionKind}/${dto.scopeKind} → ${dto.mode}.`,
      details: { ruleId: created.id, ...dto },
      metadata: { ruleId: created.id },
      targetEntityId: created.id,
      targetEntityType: 'RESPONSIBILITY_RULE',
    });

    return this.toResponse(created);
  }

  public async update(
    id: string,
    dto: UpdateResponsibilityRuleDto,
    actorId: string,
  ): Promise<ResponsibilityRuleResponseDto> {
    const existing = await this.requireRule(id);

    const nextMode = (dto.mode ?? existing.mode) as ResponsibilityModeStr;
    const nextTargetRole = dto.targetRole === undefined ? existing.targetRole : dto.targetRole;
    const nextTargetPersonId =
      dto.targetPersonId === undefined ? existing.targetPersonId : dto.targetPersonId;
    this.assertModeTargetCoherence(nextMode, nextTargetRole, nextTargetPersonId);

    const updated = await this.prisma.responsibilityRule.update({
      where: { id },
      data: {
        ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
        ...(dto.targetRole !== undefined ? { targetRole: dto.targetRole } : {}),
        ...(dto.targetPersonId !== undefined ? { targetPersonId: dto.targetPersonId } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    this.auditLogger?.record({
      actionType: 'responsibility_rule.updated',
      actorId,
      category: 'settings',
      changeSummary: `Responsibility rule ${id} updated.`,
      details: { ruleId: id, changes: dto },
      metadata: { ruleId: id },
      targetEntityId: id,
      targetEntityType: 'RESPONSIBILITY_RULE',
    });

    return this.toResponse(updated);
  }

  public async archive(id: string, actorId: string): Promise<ResponsibilityRuleResponseDto> {
    const existing = await this.requireRule(id);
    if (existing.archivedAt) {
      throw new ConflictException(`Rule ${id} is already archived.`);
    }
    const updated = await this.prisma.responsibilityRule.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    this.auditLogger?.record({
      actionType: 'responsibility_rule.archived',
      actorId,
      category: 'settings',
      changeSummary: `Responsibility rule ${id} archived.`,
      details: { ruleId: id },
      metadata: { ruleId: id },
      targetEntityId: id,
      targetEntityType: 'RESPONSIBILITY_RULE',
    });

    return this.toResponse(updated);
  }

  private async requireRule(id: string): Promise<RuleRow> {
    const row = await this.prisma.responsibilityRule.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Responsibility rule ${id} not found.`);
    }
    return row;
  }

  private assertModeTargetCoherence(
    mode: ResponsibilityModeStr,
    targetRole: string | null | undefined,
    targetPersonId: string | null | undefined,
  ): void {
    switch (mode) {
      case 'ROLE':
        if (!targetRole?.trim()) {
          throw new BadRequestException("mode='ROLE' requires a non-empty targetRole.");
        }
        return;
      case 'PERSON':
        if (!targetPersonId?.trim()) {
          throw new BadRequestException("mode='PERSON' requires a targetPersonId.");
        }
        return;
      case 'PM_SOLO':
      case 'SKIP':
        if (targetRole?.trim() || targetPersonId?.trim()) {
          throw new BadRequestException(
            `mode='${mode}' must NOT carry targetRole or targetPersonId.`,
          );
        }
        return;
    }
  }

  private assertScopeValueCoherence(
    scopeKind: ResponsibilityScopeStr,
    scopeValue: string | null,
  ): void {
    if (scopeKind === 'TENANT') {
      if (scopeValue !== null && scopeValue !== '') {
        throw new BadRequestException("scopeKind='TENANT' must have NULL scopeValue.");
      }
      return;
    }
    if (!scopeValue?.trim()) {
      throw new BadRequestException(
        `scopeKind='${scopeKind}' requires a non-empty scopeValue.`,
      );
    }
    if (scopeKind === 'THRESHOLD_AMOUNT') {
      const n = Number(scopeValue);
      if (!Number.isFinite(n) || n < 0) {
        throw new BadRequestException(
          "scopeKind='THRESHOLD_AMOUNT' scopeValue must be a non-negative number.",
        );
      }
    }
  }

  private toResponse(r: RuleRow): ResponsibilityRuleResponseDto {
    return {
      id: r.id,
      actionKind: r.actionKind as ResponsibilityActionKindStr,
      scopeKind: r.scopeKind as ResponsibilityScopeStr,
      scopeValue: r.scopeValue,
      mode: r.mode as ResponsibilityModeStr,
      targetRole: r.targetRole,
      targetPersonId: r.targetPersonId,
      priority: r.priority,
      isActive: r.isActive,
      notes: r.notes,
      tenantId: r.tenantId,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
      isSeededDefault: r.id.startsWith(SEEDED_DEFAULT_PREFIX),
    };
  }
}
