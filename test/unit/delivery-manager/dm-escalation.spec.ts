import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { DmEscalationService } from '@src/modules/delivery-manager/application/dm-escalation.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P4-missing-9 — DM escalation approval flow.
 *
 * Covers:
 *   1. createEscalation happy path + bad sourceKind/role guards.
 *   2. listPending returns only PENDING rows.
 *   3. confirmEscalation by Director sets CONFIRMED + audits.
 *   4. confirmEscalation by non-Director → ForbiddenException.
 *   5. overrideEscalation by Director sets OVERRIDDEN + audits.
 *   6. cancelEscalation by originating DM sets CANCELLED + audits.
 *   7. cancelEscalation by another DM → ForbiddenException.
 *   8. Resolve/cancel against a non-PENDING row → BadRequestException.
 *   9. Unknown id → NotFoundException.
 */
describe('DmEscalationService', () => {
  interface RowSeed {
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
  }

  interface AuditRecordCall {
    actionType: string;
    actorId: string;
    targetEntityId?: string;
    targetEntityType?: string;
    metadata?: Record<string, unknown>;
  }

  function joinRefs(seed: RowSeed) {
    return {
      ...seed,
      escalatedBy: { id: seed.escalatedByPersonId, displayName: `DM ${seed.escalatedByPersonId}` },
      escalatedTo: seed.escalatedToPersonId
        ? { id: seed.escalatedToPersonId, displayName: `Dir ${seed.escalatedToPersonId}` }
        : null,
      resolvedBy: seed.resolvedByPersonId
        ? { id: seed.resolvedByPersonId, displayName: `Resolver ${seed.resolvedByPersonId}` }
        : null,
    };
  }

  function buildPrismaStub(initial: RowSeed[]): {
    prisma: PrismaService;
    rows: Map<string, RowSeed>;
    captured: { creates: Array<Record<string, unknown>>; updates: Array<Record<string, unknown>> };
  } {
    const rows = new Map<string, RowSeed>();
    for (const r of initial) rows.set(r.id, r);
    const captured = { creates: [] as Array<Record<string, unknown>>, updates: [] as Array<Record<string, unknown>> };
    let nextId = initial.length;

    const prisma = {
      dmEscalation: {
        create: async (args: { data: Record<string, unknown> }) => {
          captured.creates.push(args.data);
          const id = `gen-${nextId++}`;
          const now = new Date('2026-06-06T12:00:00Z');
          const row: RowSeed = {
            id,
            publicId: null,
            sourceKind: args.data.sourceKind as string,
            sourceId: args.data.sourceId as string,
            reason: args.data.reason as string,
            status: (args.data.status as RowSeed['status']) ?? 'PENDING',
            escalatedByPersonId: args.data.escalatedByPersonId as string,
            escalatedToPersonId: (args.data.escalatedToPersonId as string | null) ?? null,
            resolvedAt: null,
            resolvedByPersonId: null,
            resolutionNotes: null,
            createdAt: now,
            updatedAt: now,
          };
          rows.set(id, row);
          return joinRefs(row);
        },
        findMany: async (args: { where?: Record<string, unknown> }) => {
          const where = args.where ?? {};
          const result: ReturnType<typeof joinRefs>[] = [];
          for (const row of rows.values()) {
            if (where.status && row.status !== where.status) continue;
            if (where.escalatedByPersonId && row.escalatedByPersonId !== where.escalatedByPersonId) continue;
            result.push(joinRefs(row));
          }
          return result;
        },
        findUnique: async (args: { where: { id: string } }) => {
          const row = rows.get(args.where.id);
          return row ? joinRefs(row) : null;
        },
        update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
          captured.updates.push({ id: args.where.id, ...args.data });
          const row = rows.get(args.where.id);
          if (!row) throw new Error('not found');
          const updated: RowSeed = {
            ...row,
            status: (args.data.status as RowSeed['status']) ?? row.status,
            resolvedAt: (args.data.resolvedAt as Date | null) ?? row.resolvedAt,
            resolvedByPersonId: (args.data.resolvedByPersonId as string | null) ?? row.resolvedByPersonId,
            resolutionNotes: (args.data.resolutionNotes as string | null) ?? row.resolutionNotes,
            updatedAt: new Date(),
          };
          rows.set(updated.id, updated);
          return joinRefs(updated);
        },
      },
    } as unknown as PrismaService;
    return { prisma, rows, captured };
  }

  function buildAuditLogger(): {
    calls: AuditRecordCall[];
    logger: { record: (input: AuditRecordCall) => void };
  } {
    const calls: AuditRecordCall[] = [];
    return {
      calls,
      logger: { record: (input: AuditRecordCall) => calls.push(input) },
    };
  }

  describe('createEscalation', () => {
    it('opens a PENDING escalation and emits an audit record', async () => {
      const { prisma, captured } = buildPrismaStub([]);
      const audit = buildAuditLogger();
      const svc = new DmEscalationService(prisma, audit.logger as never);

      const result = await svc.createEscalation(
        { personId: 'dm-1', roles: ['delivery_manager'] },
        {
          sourceKind: 'timesheet',
          sourceId: '11111111-1111-1111-1111-111111111111',
          reason: 'Hours unbacked',
        },
      );

      expect(result.status).toBe('PENDING');
      expect(result.sourceKind).toBe('timesheet');
      expect(captured.creates).toHaveLength(1);
      expect(audit.calls[0]!.actionType).toBe('dm.escalation.created');
      expect(audit.calls[0]!.actorId).toBe('dm-1');
    });

    it('rejects non-DM roles', async () => {
      const { prisma } = buildPrismaStub([]);
      const svc = new DmEscalationService(prisma);
      await expect(
        svc.createEscalation(
          { personId: 'p-1', roles: ['employee'] },
          { sourceKind: 'timesheet', sourceId: 'abc', reason: 'x' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects unknown sourceKind', async () => {
      const { prisma } = buildPrismaStub([]);
      const svc = new DmEscalationService(prisma);
      await expect(
        svc.createEscalation(
          { personId: 'dm-1', roles: ['delivery_manager'] },
          { sourceKind: 'invalid', sourceId: 'abc', reason: 'x' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty reason', async () => {
      const { prisma } = buildPrismaStub([]);
      const svc = new DmEscalationService(prisma);
      await expect(
        svc.createEscalation(
          { personId: 'dm-1', roles: ['delivery_manager'] },
          { sourceKind: 'timesheet', sourceId: 'abc', reason: '   ' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listPending', () => {
    it('returns only PENDING rows', async () => {
      const now = new Date('2026-06-06T10:00:00Z');
      const { prisma } = buildPrismaStub([
        {
          id: 'e-1',
          publicId: null,
          sourceKind: 'timesheet',
          sourceId: 's-1',
          reason: 'pending',
          status: 'PENDING',
          escalatedByPersonId: 'dm-1',
          escalatedToPersonId: null,
          resolvedAt: null,
          resolvedByPersonId: null,
          resolutionNotes: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'e-2',
          publicId: null,
          sourceKind: 'timesheet',
          sourceId: 's-2',
          reason: 'done',
          status: 'CONFIRMED',
          escalatedByPersonId: 'dm-1',
          escalatedToPersonId: null,
          resolvedAt: now,
          resolvedByPersonId: 'dir-1',
          resolutionNotes: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      const svc = new DmEscalationService(prisma);
      const items = await svc.listPending();
      expect(items.map((i) => i.id)).toEqual(['e-1']);
    });
  });

  describe('confirmEscalation', () => {
    function seedRow(): RowSeed {
      const now = new Date('2026-06-06T10:00:00Z');
      return {
        id: 'e-1',
        publicId: null,
        sourceKind: 'timesheet',
        sourceId: 's-1',
        reason: 'pending',
        status: 'PENDING',
        escalatedByPersonId: 'dm-1',
        escalatedToPersonId: null,
        resolvedAt: null,
        resolvedByPersonId: null,
        resolutionNotes: null,
        createdAt: now,
        updatedAt: now,
      };
    }

    it('Director sets status to CONFIRMED and audits', async () => {
      const { prisma, captured } = buildPrismaStub([seedRow()]);
      const audit = buildAuditLogger();
      const svc = new DmEscalationService(prisma, audit.logger as never);

      const result = await svc.confirmEscalation(
        { personId: 'dir-1', roles: ['director'] },
        'e-1',
        'agreed',
      );

      expect(result.status).toBe('CONFIRMED');
      expect(result.resolvedByPersonId).toBe('dir-1');
      expect(result.resolutionNotes).toBe('agreed');
      expect(captured.updates).toHaveLength(1);
      expect(audit.calls[0]!.actionType).toBe('dm.escalation.confirmed');
    });

    it('rejects non-Director role with ForbiddenException', async () => {
      const { prisma } = buildPrismaStub([seedRow()]);
      const svc = new DmEscalationService(prisma);
      await expect(
        svc.confirmEscalation(
          { personId: 'dm-2', roles: ['delivery_manager'] },
          'e-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects already-resolved escalation with BadRequestException', async () => {
      const row = seedRow();
      row.status = 'CONFIRMED';
      const { prisma } = buildPrismaStub([row]);
      const svc = new DmEscalationService(prisma);
      await expect(
        svc.confirmEscalation({ personId: 'dir-1', roles: ['director'] }, 'e-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException for unknown id', async () => {
      const { prisma } = buildPrismaStub([]);
      const svc = new DmEscalationService(prisma);
      await expect(
        svc.confirmEscalation({ personId: 'dir-1', roles: ['director'] }, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('overrideEscalation', () => {
    it('Director sets status to OVERRIDDEN and audits', async () => {
      const now = new Date('2026-06-06T10:00:00Z');
      const { prisma } = buildPrismaStub([
        {
          id: 'e-1',
          publicId: null,
          sourceKind: 'milestone',
          sourceId: 's-1',
          reason: 'I disagree',
          status: 'PENDING',
          escalatedByPersonId: 'dm-1',
          escalatedToPersonId: null,
          resolvedAt: null,
          resolvedByPersonId: null,
          resolutionNotes: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      const audit = buildAuditLogger();
      const svc = new DmEscalationService(prisma, audit.logger as never);

      const result = await svc.overrideEscalation(
        { personId: 'dir-1', roles: ['admin'] },
        'e-1',
        'send back',
      );

      expect(result.status).toBe('OVERRIDDEN');
      expect(audit.calls[0]!.actionType).toBe('dm.escalation.overridden');
    });
  });

  describe('cancelEscalation', () => {
    function seedRow(escalatedBy: string): RowSeed {
      const now = new Date('2026-06-06T10:00:00Z');
      return {
        id: 'e-1',
        publicId: null,
        sourceKind: 'timesheet',
        sourceId: 's-1',
        reason: 'pending',
        status: 'PENDING',
        escalatedByPersonId: escalatedBy,
        escalatedToPersonId: null,
        resolvedAt: null,
        resolvedByPersonId: null,
        resolutionNotes: null,
        createdAt: now,
        updatedAt: now,
      };
    }

    it('originating DM cancels their own escalation', async () => {
      const { prisma } = buildPrismaStub([seedRow('dm-1')]);
      const audit = buildAuditLogger();
      const svc = new DmEscalationService(prisma, audit.logger as never);
      const result = await svc.cancelEscalation(
        { personId: 'dm-1', roles: ['delivery_manager'] },
        'e-1',
      );
      expect(result.status).toBe('CANCELLED');
      expect(audit.calls[0]!.actionType).toBe('dm.escalation.cancelled');
    });

    it('another DM cannot cancel — ForbiddenException', async () => {
      const { prisma } = buildPrismaStub([seedRow('dm-1')]);
      const svc = new DmEscalationService(prisma);
      await expect(
        svc.cancelEscalation({ personId: 'dm-2', roles: ['delivery_manager'] }, 'e-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
