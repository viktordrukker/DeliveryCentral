import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { CustomRoleService } from '@src/modules/identity-access/application/custom-role.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRow {
  id: string;
  publicId: string | null;
  roleKey: string;
  displayName: string;
  description: string | null;
  inheritedRoles: string[];
  isBuiltIn: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdByPersonId: string | null;
  updatedByPersonId: string | null;
}

interface FakePrismaApi {
  prisma: PrismaService;
  store: FakeRow[];
}

function makeFakePrisma(seed: FakeRow[] = []): FakePrismaApi {
  const store: FakeRow[] = [...seed];
  let counter = 0;
  const nextId = (): string => {
    counter += 1;
    return `cr-${counter.toString().padStart(4, '0')}`;
  };

  const prisma = {
    customRole: {
      findMany: async (args: { where?: Record<string, unknown> }): Promise<FakeRow[]> => {
        const where = args.where ?? {};
        return store.filter((r) => {
          if (where.deactivatedAt === null && r.deactivatedAt !== null) return false;
          return true;
        });
      },
      findUnique: async (args: {
        where: { id?: string; roleKey?: string };
      }): Promise<FakeRow | null> => {
        if (args.where.id) {
          return store.find((r) => r.id === args.where.id) ?? null;
        }
        if (args.where.roleKey) {
          return store.find((r) => r.roleKey === args.where.roleKey) ?? null;
        }
        return null;
      },
      create: async (args: { data: Partial<FakeRow> }): Promise<FakeRow> => {
        const now = new Date();
        const row: FakeRow = {
          id: nextId(),
          publicId: null,
          roleKey: args.data.roleKey as string,
          displayName: args.data.displayName as string,
          description: (args.data.description as string | null) ?? null,
          inheritedRoles: (args.data.inheritedRoles as string[]) ?? [],
          isBuiltIn: args.data.isBuiltIn ?? false,
          deactivatedAt: null,
          createdAt: now,
          updatedAt: now,
          createdByPersonId: (args.data.createdByPersonId as string | null) ?? null,
          updatedByPersonId: (args.data.updatedByPersonId as string | null) ?? null,
        };
        store.push(row);
        return row;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<FakeRow>;
      }): Promise<FakeRow> => {
        const idx = store.findIndex((r) => r.id === args.where.id);
        if (idx === -1) throw new Error('not found');
        const next: FakeRow = { ...store[idx], ...args.data, updatedAt: new Date() };
        store[idx] = next;
        return next;
      },
    },
  } as unknown as PrismaService;

  return { prisma, store };
}

const ACTOR = 'aaaa0000-0000-0000-0000-000000000001';

describe('CustomRoleService (NEW-LGL-3)', () => {
  it('create() persists row with actor-audit fields and is non-built-in', async () => {
    const { prisma, store } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const dto = await svc.create(
      {
        roleKey: 'squad_lead',
        displayName: 'Squad Lead',
        description: 'Owns a squad of 5-7 engineers.',
        inheritedRoles: ['project_manager'],
      },
      ACTOR,
    );

    expect(dto.id).toBe('cr-0001');
    expect(dto.roleKey).toBe('squad_lead');
    expect(dto.displayName).toBe('Squad Lead');
    expect(dto.inheritedRoles).toEqual(['project_manager']);
    expect(dto.isBuiltIn).toBe(false);
    expect(dto.active).toBe(true);
    expect(dto.deactivatedAt).toBeNull();
    expect(dto.createdByPersonId).toBe(ACTOR);
    expect(dto.updatedByPersonId).toBe(ACTOR);
    expect(store).toHaveLength(1);
  });

  it('create() rejects a malformed roleKey slug', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    await expect(
      svc.create(
        {
          roleKey: 'Bad Key With Spaces',
          displayName: 'Bad',
          inheritedRoles: ['employee'],
        },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() rejects a reserved (built-in PlatformRole) key', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    await expect(
      svc.create(
        {
          roleKey: 'admin',
          displayName: 'Tenant admin',
          inheritedRoles: ['admin'],
        },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() rejects an empty inheritedRoles list', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    await expect(
      svc.create(
        {
          roleKey: 'tribe_lead',
          displayName: 'Tribe Lead',
          inheritedRoles: [],
        },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() rejects an unknown PlatformRole in inheritedRoles', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    await expect(
      svc.create(
        {
          roleKey: 'tribe_lead',
          displayName: 'Tribe Lead',
          inheritedRoles: ['not_a_real_role'],
        },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create() rejects a duplicate roleKey via ConflictException', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    await svc.create(
      {
        roleKey: 'service_owner',
        displayName: 'IT Service Owner',
        inheritedRoles: ['delivery_manager'],
      },
      ACTOR,
    );

    await expect(
      svc.create(
        {
          roleKey: 'service_owner',
          displayName: 'Different name',
          inheritedRoles: ['delivery_manager'],
        },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('update() patches displayName + inheritedRoles and stamps the new actor', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const created = await svc.create(
      {
        roleKey: 'squad_lead',
        displayName: 'Squad Lead',
        inheritedRoles: ['project_manager'],
      },
      ACTOR,
    );

    const updater = 'aaaa0000-0000-0000-0000-000000000002';
    const updated = await svc.update(
      created.id,
      {
        displayName: 'Squad Lead (renamed)',
        inheritedRoles: ['project_manager', 'resource_manager'],
      },
      updater,
    );

    expect(updated.displayName).toBe('Squad Lead (renamed)');
    expect(updated.inheritedRoles).toEqual(['project_manager', 'resource_manager']);
    expect(updated.updatedByPersonId).toBe(updater);
    expect(updated.createdByPersonId).toBe(ACTOR);
  });

  it('update() throws NotFoundException for an unknown id', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    await expect(
      svc.update('cr-ghost', { displayName: 'x' }, ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update() rejects modification of an isBuiltIn row', async () => {
    const now = new Date();
    const { prisma } = makeFakePrisma([
      {
        id: 'cr-builtin',
        publicId: null,
        roleKey: 'platform_seed',
        displayName: 'Seeded',
        description: null,
        inheritedRoles: ['admin'],
        isBuiltIn: true,
        deactivatedAt: null,
        createdAt: now,
        updatedAt: now,
        createdByPersonId: null,
        updatedByPersonId: null,
      },
    ]);
    const svc = new CustomRoleService(prisma);

    await expect(
      svc.update('cr-builtin', { displayName: 'no' }, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivate() flips deactivatedAt and marks the row inactive', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const created = await svc.create(
      {
        roleKey: 'squad_lead',
        displayName: 'Squad Lead',
        inheritedRoles: ['project_manager'],
      },
      ACTOR,
    );

    const deactivated = await svc.deactivate(created.id, ACTOR, 0);
    expect(deactivated.active).toBe(false);
    expect(deactivated.deactivatedAt).not.toBeNull();
  });

  it('deactivate() rejects when assignedCount > 0 via ConflictException', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const created = await svc.create(
      {
        roleKey: 'squad_lead',
        displayName: 'Squad Lead',
        inheritedRoles: ['project_manager'],
      },
      ACTOR,
    );

    await expect(svc.deactivate(created.id, ACTOR, 3)).rejects.toBeInstanceOf(ConflictException);
  });

  it('deactivate() rejects built-in rows', async () => {
    const now = new Date();
    const { prisma } = makeFakePrisma([
      {
        id: 'cr-builtin',
        publicId: null,
        roleKey: 'platform_seed',
        displayName: 'Seeded',
        description: null,
        inheritedRoles: ['admin'],
        isBuiltIn: true,
        deactivatedAt: null,
        createdAt: now,
        updatedAt: now,
        createdByPersonId: null,
        updatedByPersonId: null,
      },
    ]);
    const svc = new CustomRoleService(prisma);

    await expect(svc.deactivate('cr-builtin', ACTOR, 0)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reactivate() clears deactivatedAt on a deactivated row', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const created = await svc.create(
      {
        roleKey: 'tribe_lead',
        displayName: 'Tribe Lead',
        inheritedRoles: ['delivery_manager'],
      },
      ACTOR,
    );
    await svc.deactivate(created.id, ACTOR, 0);

    const reactivated = await svc.reactivate(created.id, ACTOR);
    expect(reactivated.active).toBe(true);
    expect(reactivated.deactivatedAt).toBeNull();
  });

  it('list() returns inactive rows when includeDeactivated=true', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const a = await svc.create(
      { roleKey: 'role_a', displayName: 'A', inheritedRoles: ['employee'] },
      ACTOR,
    );
    await svc.create(
      { roleKey: 'role_b', displayName: 'B', inheritedRoles: ['employee'] },
      ACTOR,
    );
    await svc.deactivate(a.id, ACTOR, 0);

    const all = await svc.list(true);
    expect(all).toHaveLength(2);

    const onlyActive = await svc.list(false);
    expect(onlyActive).toHaveLength(1);
    expect(onlyActive[0].roleKey).toBe('role_b');
  });

  it('findById() throws NotFoundException for an unknown id', async () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    await expect(svc.findById('cr-ghost')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listAvailablePermissions() returns the seven PlatformRole values', () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const perms = svc.listAvailablePermissions();
    expect(perms).toEqual(
      expect.arrayContaining([
        'admin',
        'director',
        'hr_manager',
        'delivery_manager',
        'project_manager',
        'resource_manager',
        'employee',
      ]),
    );
    expect(perms).toHaveLength(7);
  });

  it('listBuiltInRoles() returns descriptors for the seven built-in roles', () => {
    const { prisma } = makeFakePrisma();
    const svc = new CustomRoleService(prisma);

    const builtIns = svc.listBuiltInRoles();
    expect(builtIns).toHaveLength(7);
    expect(builtIns.every((r) => r.isBuiltIn === true)).toBe(true);
    expect(builtIns.every((r) => r.active === true)).toBe(true);
  });
});
