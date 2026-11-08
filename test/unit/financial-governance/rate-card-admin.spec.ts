import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { RateCardAdminService } from '@src/modules/financial-governance/application/rate-card-admin.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeCard {
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

interface FakeEntry {
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
}

function buildPrismaStub(initialCards: FakeCard[] = [], initialEntries: FakeEntry[] = []): {
  prisma: PrismaService;
  cards: FakeCard[];
  entries: FakeEntry[];
} {
  const cards: FakeCard[] = [...initialCards];
  const entries: FakeEntry[] = [...initialEntries];
  let nextCardId = cards.length + 1;
  let nextEntryId = entries.length + 1;

  const rateCard = {
    findMany: async (q: { where: Record<string, unknown>; include: unknown }): Promise<unknown[]> => {
      let rows = cards.slice();
      const w = q.where ?? {};
      if (Object.prototype.hasOwnProperty.call(w, 'archivedAt') && w.archivedAt === null) {
        rows = rows.filter((r) => r.archivedAt === null);
      }
      if (typeof w.clientId === 'string') {
        rows = rows.filter((r) => r.clientId === w.clientId);
      }
      // hydrate include
      return rows.map((r) => ({
        ...r,
        client: r.clientId ? { name: `Client-${r.clientId}` } : null,
        _count: { entries: entries.filter((e) => e.rateCardId === r.id).length },
      }));
    },
    findUnique: async (q: { where: { id: string }; include?: unknown }): Promise<unknown | null> => {
      const r = cards.find((c) => c.id === q.where.id);
      if (!r) return null;
      if (q.include) {
        return {
          ...r,
          client: r.clientId ? { name: `Client-${r.clientId}` } : null,
          entries: entries
            .filter((e) => e.rateCardId === r.id)
            // LEAN PR 16a/2 — the relation count is now via
            // `pinnedPositionRelations` (the canonical ProjectPosition[]
            // relation); `pinnedAssignments` drops with the legacy model
            // in PR 16b.
            .map((e) => ({ ...e, _count: { pinnedPositionRelations: 0 } })),
          _count: { entries: entries.filter((e) => e.rateCardId === r.id).length },
        };
      }
      return r;
    },
    create: async (q: { data: Record<string, unknown> }): Promise<FakeCard> => {
      const row: FakeCard = {
        id: `card-${nextCardId++}`,
        name: q.data.name as string,
        currencyCode: q.data.currencyCode as string,
        clientId: (q.data.clientId as string | null) ?? null,
        validFrom: q.data.validFrom as Date,
        validTo: (q.data.validTo as Date | null) ?? null,
        isActive: (q.data.isActive as boolean) ?? true,
        notes: (q.data.notes as string | null) ?? null,
        tenantId: (q.data.tenantId as string | null) ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      };
      cards.push(row);
      return row;
    },
    update: async (q: { where: { id: string }; data: Record<string, unknown> }): Promise<FakeCard> => {
      const r = cards.find((c) => c.id === q.where.id);
      if (!r) throw new Error('card not found');
      Object.assign(r, q.data, { updatedAt: new Date() });
      return r;
    },
  };

  const rateCardEntry = {
    findUnique: async (q: { where: { id: string } }): Promise<FakeEntry | null> =>
      entries.find((e) => e.id === q.where.id) ?? null,
    create: async (q: { data: Record<string, unknown> }): Promise<FakeEntry> => {
      // Enforce composite unique (rateCardId, staffingRole, grade).
      const cardId = q.data.rateCardId as string;
      const role = q.data.staffingRole as string;
      const grade = q.data.grade as string;
      if (entries.some((e) => e.rateCardId === cardId && e.staffingRole === role && e.grade === grade)) {
        const err = new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        });
        throw err;
      }
      const row: FakeEntry = {
        id: `entry-${nextEntryId++}`,
        rateCardId: cardId,
        staffingRole: role,
        grade,
        requiredSkills: (q.data.requiredSkills as string[]) ?? [],
        hourlyRate: q.data.hourlyRate as Prisma.Decimal,
        notes: (q.data.notes as string | null) ?? null,
        isActive: (q.data.isActive as boolean) ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
        archivedAt: null,
      };
      entries.push(row);
      return row;
    },
    update: async (q: { where: { id: string }; data: Record<string, unknown> }): Promise<FakeEntry> => {
      const r = entries.find((e) => e.id === q.where.id);
      if (!r) throw new Error('entry not found');
      Object.assign(r, q.data, { updatedAt: new Date() });
      return r;
    },
  };

  const prisma = {
    rateCard,
    rateCardEntry,
  } as unknown as PrismaService;
  return { prisma, cards, entries };
}

const D = (s: string) => new Date(s);

describe('RateCardAdminService', () => {
  it('creates a card with sane defaults + uppercases currency', async () => {
    const { prisma, cards } = buildPrismaStub();
    const svc = new RateCardAdminService(prisma);

    const result = await svc.create(
      {
        name: 'Tenant default 2026',
        currencyCode: 'usd',
        validFrom: '2026-01-01',
      },
      'admin-1',
    );

    expect(result.currencyCode).toBe('USD');
    expect(result.isActive).toBe(true);
    expect(cards).toHaveLength(1);
  });

  it('rejects validFrom > validTo on create', async () => {
    const { prisma } = buildPrismaStub();
    const svc = new RateCardAdminService(prisma);
    await expect(
      svc.create(
        {
          name: 'Bad',
          currencyCode: 'EUR',
          validFrom: '2026-12-01',
          validTo: '2026-01-01',
        },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists active cards by default + includes archived only when asked', async () => {
    const { prisma } = buildPrismaStub([
      mkCard('a', null, false, null),
      mkCard('b', null, false, new Date()),
    ]);
    const svc = new RateCardAdminService(prisma);
    const live = await svc.list();
    expect(live.map((c) => c.id)).toEqual(['a']);
    const all = await svc.list({ includeArchived: true });
    expect(all.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('updates name + flips isActive', async () => {
    const { prisma } = buildPrismaStub([mkCard('a', null, true, null)]);
    const svc = new RateCardAdminService(prisma);
    const updated = await svc.update('a', { name: 'Renamed', isActive: false }, 'admin-1');
    expect(updated.name).toBe('Renamed');
    expect(updated.isActive).toBe(false);
  });

  it('refuses update that would invert validity window', async () => {
    const { prisma } = buildPrismaStub([
      {
        ...mkCard('a', null, true, null),
        validFrom: D('2026-01-01'),
        validTo: D('2026-12-31'),
      },
    ]);
    const svc = new RateCardAdminService(prisma);
    await expect(
      svc.update('a', { validFrom: '2027-01-01' }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('archives a card (sets archivedAt + flips isActive=false)', async () => {
    const { prisma, cards } = buildPrismaStub([mkCard('a', null, true, null)]);
    const svc = new RateCardAdminService(prisma);
    await svc.archive('a', 'admin-1');
    expect(cards[0].archivedAt).not.toBeNull();
    expect(cards[0].isActive).toBe(false);
  });

  it('refuses archiving an already-archived card', async () => {
    const { prisma } = buildPrismaStub([mkCard('a', null, false, new Date())]);
    const svc = new RateCardAdminService(prisma);
    await expect(svc.archive('a', 'admin-1')).rejects.toThrow(ConflictException);
  });

  it('returns 404 on update of unknown card', async () => {
    const { prisma } = buildPrismaStub();
    const svc = new RateCardAdminService(prisma);
    await expect(svc.update('missing', { name: 'x' }, 'admin-1')).rejects.toThrow(NotFoundException);
  });

  it('creates an entry on a card and surfaces it', async () => {
    const { prisma, entries } = buildPrismaStub([mkCard('a', null, true, null)]);
    const svc = new RateCardAdminService(prisma);
    const e = await svc.createEntry(
      'a',
      { staffingRole: 'Engineer', grade: 'g13', hourlyRate: 95.5 },
      'admin-1',
    );
    expect(e.staffingRole).toBe('Engineer');
    expect(e.hourlyRate).toBe(95.5);
    expect(entries).toHaveLength(1);
  });

  it('refuses a duplicate (role, grade) entry on the same card with a friendly 409', async () => {
    const { prisma } = buildPrismaStub([mkCard('a', null, true, null)]);
    const svc = new RateCardAdminService(prisma);
    await svc.createEntry('a', { staffingRole: 'Eng', grade: 'g13', hourlyRate: 95 }, 'admin-1');
    await expect(
      svc.createEntry('a', { staffingRole: 'Eng', grade: 'g13', hourlyRate: 110 }, 'admin-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('updates an entry + archives it', async () => {
    const { prisma, entries } = buildPrismaStub([mkCard('a', null, true, null)]);
    const svc = new RateCardAdminService(prisma);
    const e = await svc.createEntry(
      'a',
      { staffingRole: 'Eng', grade: 'g13', hourlyRate: 95 },
      'admin-1',
    );
    const updated = await svc.updateEntry('a', e.id, { hourlyRate: 110 }, 'admin-1');
    expect(updated.hourlyRate).toBe(110);
    await svc.archiveEntry('a', e.id, 'admin-1');
    expect(entries[0].archivedAt).not.toBeNull();
    expect(entries[0].isActive).toBe(false);
  });

  it('cross-card entry access returns 400', async () => {
    const { prisma } = buildPrismaStub([mkCard('a', null, true, null), mkCard('b', null, true, null)]);
    const svc = new RateCardAdminService(prisma);
    const e = await svc.createEntry('a', { staffingRole: 'Eng', grade: 'g13', hourlyRate: 95 }, 'admin-1');
    await expect(
      svc.updateEntry('b', e.id, { hourlyRate: 110 }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('getById hydrates entries + count', async () => {
    const { prisma } = buildPrismaStub([mkCard('a', null, true, null)]);
    const svc = new RateCardAdminService(prisma);
    await svc.createEntry('a', { staffingRole: 'Eng', grade: 'g13', hourlyRate: 95 }, 'admin-1');
    const card = await svc.getById('a');
    expect(card.entries).toHaveLength(1);
    expect(card.entryCount).toBe(1);
  });
});

function mkCard(id: string, clientId: string | null, isActive: boolean, archivedAt: Date | null): FakeCard {
  return {
    id,
    name: `Card-${id}`,
    currencyCode: 'USD',
    clientId,
    validFrom: D('2026-01-01'),
    validTo: null,
    isActive,
    notes: null,
    tenantId: null,
    createdAt: D('2026-01-01'),
    updatedAt: D('2026-01-01'),
    archivedAt,
  };
}
