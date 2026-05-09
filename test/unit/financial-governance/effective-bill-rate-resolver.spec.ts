import { Prisma } from '@prisma/client';

import { EffectiveBillRateResolverService } from '@src/modules/financial-governance/application/effective-bill-rate-resolver.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeCard {
  id: string;
  currencyCode: string;
  clientId: string | null;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  archivedAt: Date | null;
  tenantId: string | null;
}

interface FakeEntry {
  id: string;
  rateCardId: string;
  staffingRole: string;
  grade: string;
  requiredSkills: string[];
  hourlyRate: Prisma.Decimal;
  isActive: boolean;
  archivedAt: Date | null;
  updatedAt: Date;
}

const CLIENT_A = '11111111-1111-1111-1111-111111111111';
const CLIENT_B = '22222222-2222-2222-2222-222222222222';
const TENANT = '33333333-3333-3333-3333-333333333333';
const ASSIGNMENT_DATE = new Date('2026-06-15T00:00:00Z');

function buildPrisma(cards: FakeCard[], entries: FakeEntry[]): PrismaService {
  return {
    rateCard: {
      findMany: async (args: {
        where: {
          isActive: boolean;
          archivedAt: null;
          validFrom: { lte: Date };
          OR?: Array<{ validTo?: null | { gte: Date } }>;
          clientId?: string | null;
        };
        include?: { entries?: { where?: Partial<FakeEntry> } };
      }) => {
        const filtered = cards.filter((c) => {
          if (!c.isActive) return false;
          if (c.archivedAt !== null) return false;
          if (c.validFrom > args.where.validFrom.lte) return false;
          if (c.validTo !== null && c.validTo < args.where.validFrom.lte) return false;
          // clientId scope evaluation — when args.where.OR exists with
          // clientId variants, accept either; when it doesn't, accept any.
          return true;
        });
        return filtered.map((c) => ({
          ...c,
          entries: entries.filter((e) => {
            if (e.rateCardId !== c.id) return false;
            if (!e.isActive) return false;
            if (e.archivedAt !== null) return false;
            const w = args.include?.entries?.where;
            if (w?.staffingRole && e.staffingRole !== w.staffingRole) return false;
            if (w?.grade && e.grade !== w.grade) return false;
            return true;
          }),
        }));
      },
    },
    rateCardEntry: {
      findUnique: async (args: { where: { id: string } }) => {
        const e = entries.find((x) => x.id === args.where.id);
        if (!e) return null;
        const card = cards.find((c) => c.id === e.rateCardId);
        if (!card) return null;
        return { ...e, rateCard: card };
      },
    },
  } as unknown as PrismaService;
}

function dec(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

describe('EffectiveBillRateResolverService — 5-layer precedence', () => {
  it('Layer 1 EXPLICIT — returns the supplied entry when active', async () => {
    const cards: FakeCard[] = [
      {
        id: 'card-1',
        currencyCode: 'USD',
        clientId: CLIENT_A,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'entry-explicit',
        rateCardId: 'card-1',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(250),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: [],
      clientId: CLIENT_A,
      assignmentValidFrom: ASSIGNMENT_DATE,
      explicitEntryId: 'entry-explicit',
    });
    expect(out.resolvedBy).toBe('EXPLICIT');
    expect(out.entryId).toBe('entry-explicit');
    expect(Number(out.hourlyRate)).toBe(250);
    expect(out.currencyCode).toBe('USD');
  });

  it('Layer 2 CLIENT_FULL — prefers a skills-matching client card over basic', async () => {
    const cards: FakeCard[] = [
      {
        id: 'client-a',
        currencyCode: 'USD',
        clientId: CLIENT_A,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'basic',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(220),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date('2026-05-01'),
      },
      {
        id: 'with-skills',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: ['rust', 'kubernetes'],
        hourlyRate: dec(310),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date('2026-05-01'),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: ['rust', 'kubernetes', 'aws'],
      clientId: CLIENT_A,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    expect(out.resolvedBy).toBe('CLIENT_FULL');
    expect(out.entryId).toBe('with-skills');
    expect(Number(out.hourlyRate)).toBe(310);
  });

  it('Layer 3 CLIENT_BASIC — falls back when person lacks the required skills', async () => {
    const cards: FakeCard[] = [
      {
        id: 'client-a',
        currencyCode: 'USD',
        clientId: CLIENT_A,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'basic',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(220),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
      {
        id: 'with-skills',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: ['rust', 'kubernetes'],
        hourlyRate: dec(310),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: ['rust'], // missing kubernetes
      clientId: CLIENT_A,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    expect(out.resolvedBy).toBe('CLIENT_BASIC');
    expect(out.entryId).toBe('basic');
    expect(Number(out.hourlyRate)).toBe(220);
  });

  it('Layer 4 TENANT_FULL — falls back to tenant-default when no client card matches', async () => {
    const cards: FakeCard[] = [
      {
        id: 'tenant-default',
        currencyCode: 'USD',
        clientId: null,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: TENANT,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'tenant-skilled',
        rateCardId: 'tenant-default',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: ['rust'],
        hourlyRate: dec(280),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: ['rust'],
      clientId: CLIENT_B, // no client B card exists
      assignmentValidFrom: ASSIGNMENT_DATE,
      tenantId: TENANT,
    });
    expect(out.resolvedBy).toBe('TENANT_FULL');
    expect(out.entryId).toBe('tenant-skilled');
    expect(Number(out.hourlyRate)).toBe(280);
  });

  it('Layer 5 TENANT_BASIC — last-resort match', async () => {
    const cards: FakeCard[] = [
      {
        id: 'tenant-default',
        currencyCode: 'EUR',
        clientId: null,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'tenant-basic',
        rateCardId: 'tenant-default',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(190),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: [],
      clientId: null,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    expect(out.resolvedBy).toBe('TENANT_BASIC');
    expect(out.entryId).toBe('tenant-basic');
    expect(out.currencyCode).toBe('EUR');
  });

  it('returns NONE when no card or entry matches', async () => {
    const svc = new EffectiveBillRateResolverService(buildPrisma([], []));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: [],
      clientId: CLIENT_A,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    expect(out.resolvedBy).toBe('NONE');
    expect(out.entryId).toBeNull();
    expect(out.hourlyRate).toBeNull();
  });

  it('skips inactive entries even when role + grade match', async () => {
    const cards: FakeCard[] = [
      {
        id: 'client-a',
        currencyCode: 'USD',
        clientId: CLIENT_A,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'inactive',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(999),
        isActive: false,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: [],
      clientId: CLIENT_A,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    expect(out.resolvedBy).toBe('NONE');
  });

  it('returns NONE when person has no grade (cannot match any entry)', async () => {
    const cards: FakeCard[] = [
      {
        id: 'tenant-default',
        currencyCode: 'USD',
        clientId: null,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'tenant-basic',
        rateCardId: 'tenant-default',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(190),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: null,
      personSkills: [],
      clientId: null,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    expect(out.resolvedBy).toBe('NONE');
  });

  it('CLIENT_BASIC outranks TENANT_FULL even when tenant has a more specific match', async () => {
    const cards: FakeCard[] = [
      {
        id: 'client-a',
        currencyCode: 'USD',
        clientId: CLIENT_A,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
      {
        id: 'tenant-default',
        currencyCode: 'USD',
        clientId: null,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'client-basic',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(200),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
      {
        id: 'tenant-skilled',
        rateCardId: 'tenant-default',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: ['rust'],
        hourlyRate: dec(350),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date(),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: ['rust'], // could match tenant-skilled at TENANT_FULL
      clientId: CLIENT_A,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    // Client layer wins regardless of tenant having a "more specific" entry.
    expect(out.resolvedBy).toBe('CLIENT_BASIC');
    expect(out.entryId).toBe('client-basic');
    expect(Number(out.hourlyRate)).toBe(200);
  });

  it('breaks ties on most-recently-updated entry within the same layer', async () => {
    const cards: FakeCard[] = [
      {
        id: 'client-a',
        currencyCode: 'USD',
        clientId: CLIENT_A,
        validFrom: new Date('2026-01-01'),
        validTo: null,
        isActive: true,
        archivedAt: null,
        tenantId: null,
      },
    ];
    const entries: FakeEntry[] = [
      {
        id: 'older',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(180),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date('2026-01-15'),
      },
      {
        id: 'newer',
        rateCardId: 'client-a',
        staffingRole: 'engineer',
        grade: 'g10',
        requiredSkills: [],
        hourlyRate: dec(220),
        isActive: true,
        archivedAt: null,
        updatedAt: new Date('2026-04-01'),
      },
    ];
    const svc = new EffectiveBillRateResolverService(buildPrisma(cards, entries));
    const out = await svc.resolve({
      staffingRole: 'engineer',
      personGrade: 'g10',
      personSkills: [],
      clientId: CLIENT_A,
      assignmentValidFrom: ASSIGNMENT_DATE,
    });
    expect(out.entryId).toBe('newer');
    expect(Number(out.hourlyRate)).toBe(220);
  });
});
