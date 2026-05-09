import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ResponsibilityRulesAdminService } from '@src/modules/identity-access/application/responsibility-rules-admin.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRule {
  id: string;
  actionKind: string;
  scopeKind: string;
  scopeValue: string | null;
  mode: string;
  targetRole: string | null;
  targetPersonId: string | null;
  priority: number;
  isActive: boolean;
  notes: string | null;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

function buildPrismaStub(initial: FakeRule[] = []): {
  prisma: PrismaService;
  rules: FakeRule[];
} {
  const rules: FakeRule[] = [...initial];
  let nextId = initial.length + 1;

  const responsibilityRule = {
    findMany: async (q: {
      where: Record<string, unknown>;
      orderBy?: unknown;
    }): Promise<FakeRule[]> => {
      return rules.filter((r) => {
        if (q.where.actionKind && r.actionKind !== q.where.actionKind) return false;
        if (Object.prototype.hasOwnProperty.call(q.where, 'archivedAt')) {
          if (q.where.archivedAt === null && r.archivedAt !== null) return false;
        }
        return true;
      });
    },
    findUnique: async (q: { where: { id: string } }): Promise<FakeRule | null> =>
      rules.find((r) => r.id === q.where.id) ?? null,
    create: async (q: { data: Record<string, unknown> }): Promise<FakeRule> => {
      const row: FakeRule = {
        id: `rule-${nextId++}`,
        actionKind: q.data.actionKind as string,
        scopeKind: q.data.scopeKind as string,
        scopeValue: (q.data.scopeValue as string | null) ?? null,
        mode: q.data.mode as string,
        targetRole: (q.data.targetRole as string | null) ?? null,
        targetPersonId: (q.data.targetPersonId as string | null) ?? null,
        priority: (q.data.priority as number) ?? 100,
        isActive: (q.data.isActive as boolean) ?? true,
        notes: (q.data.notes as string | null) ?? null,
        tenantId: (q.data.tenantId as string | null) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      };
      rules.push(row);
      return row;
    },
    update: async (q: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<FakeRule> => {
      const row = rules.find((r) => r.id === q.where.id);
      if (!row) throw new Error('row not found');
      Object.assign(row, q.data, { updatedAt: new Date() });
      return row;
    },
  };

  const prisma = {
    responsibilityRule,
  } as unknown as PrismaService;
  return { prisma, rules };
}

describe('ResponsibilityRulesAdminService', () => {
  it('lists active rules (excludes archived) ordered by actionKind, priority', async () => {
    const { prisma } = buildPrismaStub([
      {
        id: 'a',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        scopeValue: null,
        mode: 'ROLE',
        targetRole: 'director',
        targetPersonId: null,
        priority: 100,
        isActive: true,
        notes: null,
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      },
      {
        id: 'b',
        actionKind: 'BUDGET_CHANGE_APPROVAL',
        scopeKind: 'TENANT',
        scopeValue: null,
        mode: 'ROLE',
        targetRole: 'director',
        targetPersonId: null,
        priority: 100,
        isActive: true,
        notes: null,
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
      },
    ]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    const result = await svc.list();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('marks seeded defaults via the d04XX UUID prefix', async () => {
    const { prisma } = buildPrismaStub([
      {
        id: '00000000-0000-4000-8000-0000000d0401',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        scopeValue: null,
        mode: 'ROLE',
        targetRole: 'director',
        targetPersonId: null,
        priority: 100,
        isActive: true,
        notes: null,
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      },
    ]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    const result = await svc.list();
    expect(result[0].isSeededDefault).toBe(true);
  });

  it('creates a ROLE rule with required targetRole', async () => {
    const { prisma, rules } = buildPrismaStub([]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    const dto = {
      actionKind: 'PROJECT_ACTIVATION_APPROVAL' as const,
      scopeKind: 'CLIENT' as const,
      scopeValue: 'client-id',
      mode: 'ROLE' as const,
      targetRole: 'delivery_manager',
      priority: 50,
      notes: 'Override for client X',
    };
    const result = await svc.create(dto, 'admin-1');
    expect(result.mode).toBe('ROLE');
    expect(result.targetRole).toBe('delivery_manager');
    expect(rules).toHaveLength(1);
  });

  it("rejects mode='ROLE' without targetRole", async () => {
    const { prisma } = buildPrismaStub([]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(
      svc.create(
        {
          actionKind: 'PROJECT_ACTIVATION_APPROVAL',
          scopeKind: 'TENANT',
          mode: 'ROLE',
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects mode='PERSON' without targetPersonId", async () => {
    const { prisma } = buildPrismaStub([]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(
      svc.create(
        {
          actionKind: 'PROJECT_ACTIVATION_APPROVAL',
          scopeKind: 'TENANT',
          mode: 'PERSON',
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects mode='SKIP' carrying a targetRole", async () => {
    const { prisma } = buildPrismaStub([]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(
      svc.create(
        {
          actionKind: 'PROJECT_ACTIVATION_APPROVAL',
          scopeKind: 'TENANT',
          mode: 'SKIP',
          targetRole: 'director',
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects non-TENANT scope without scopeValue', async () => {
    const { prisma } = buildPrismaStub([]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(
      svc.create(
        {
          actionKind: 'PROJECT_ACTIVATION_APPROVAL',
          scopeKind: 'CLIENT',
          mode: 'ROLE',
          targetRole: 'director',
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects THRESHOLD_AMOUNT scope with non-numeric scopeValue', async () => {
    const { prisma } = buildPrismaStub([]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(
      svc.create(
        {
          actionKind: 'BUDGET_CHANGE_APPROVAL',
          scopeKind: 'THRESHOLD_AMOUNT',
          scopeValue: 'not-a-number',
          mode: 'ROLE',
          targetRole: 'director',
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates priority + isActive', async () => {
    const { prisma } = buildPrismaStub([
      {
        id: 'a',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        scopeValue: null,
        mode: 'ROLE',
        targetRole: 'director',
        targetPersonId: null,
        priority: 100,
        isActive: true,
        notes: null,
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      },
    ]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    const result = await svc.update('a', { priority: 50, isActive: false }, 'admin-1');
    expect(result.priority).toBe(50);
    expect(result.isActive).toBe(false);
  });

  it('archives a rule (sets archivedAt + flips isActive=false)', async () => {
    const { prisma, rules } = buildPrismaStub([
      {
        id: 'a',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        scopeValue: null,
        mode: 'ROLE',
        targetRole: 'director',
        targetPersonId: null,
        priority: 100,
        isActive: true,
        notes: null,
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      },
    ]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await svc.archive('a', 'admin-1');
    expect(rules[0].archivedAt).not.toBeNull();
    expect(rules[0].isActive).toBe(false);
  });

  it('refuses archiving an already-archived rule', async () => {
    const { prisma } = buildPrismaStub([
      {
        id: 'a',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        scopeValue: null,
        mode: 'ROLE',
        targetRole: 'director',
        targetPersonId: null,
        priority: 100,
        isActive: false,
        notes: null,
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: new Date(),
      },
    ]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(svc.archive('a', 'admin-1')).rejects.toThrow(ConflictException);
  });

  it('returns 404 on update of unknown rule', async () => {
    const { prisma } = buildPrismaStub([]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(svc.update('missing', { priority: 1 }, 'admin-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('refuses an update that would leave a ROLE rule without a targetRole', async () => {
    const { prisma } = buildPrismaStub([
      {
        id: 'a',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        scopeValue: null,
        mode: 'ROLE',
        targetRole: 'director',
        targetPersonId: null,
        priority: 100,
        isActive: true,
        notes: null,
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      },
    ]);
    const svc = new ResponsibilityRulesAdminService(prisma);
    await expect(svc.update('a', { targetRole: '' }, 'admin-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
