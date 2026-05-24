import { HrActionCardsService } from '@src/modules/dashboard/application/hr-action-cards.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakePerson {
  id: string;
  displayName: string;
  probationEndsAt: Date | null;
  contractEndsAt: Date | null;
  lastHrReviewAt: Date | null;
  hiredAt: Date | null;
}

interface FakePersonSkill {
  personId: string;
  certified: boolean;
  certificationExpiresAt: Date | null;
  person: { displayName: string };
  skill: { name: string };
}

function buildStub(seed: {
  persons?: FakePerson[];
  personSkills?: FakePersonSkill[];
}): PrismaService {
  const now = new Date();
  const stripT = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const today = stripT(now);

  const person = {
    findMany: async (q: {
      where: {
        probationEndsAt?: { gte: Date; lte: Date };
        contractEndsAt?: { gte: Date; lte: Date };
        OR?: Array<{ lastHrReviewAt: null | { lte: Date } }>;
      };
    }): Promise<unknown[]> => {
      const rows = seed.persons ?? [];
      if (q.where.probationEndsAt) {
        const { gte, lte } = q.where.probationEndsAt;
        return rows
          .filter((p) => p.probationEndsAt && p.probationEndsAt >= gte && p.probationEndsAt <= lte)
          .map((p) => ({ id: p.id, displayName: p.displayName, probationEndsAt: p.probationEndsAt }));
      }
      if (q.where.contractEndsAt) {
        const { gte, lte } = q.where.contractEndsAt;
        return rows
          .filter((p) => p.contractEndsAt && p.contractEndsAt >= gte && p.contractEndsAt <= lte)
          .map((p) => ({ id: p.id, displayName: p.displayName, contractEndsAt: p.contractEndsAt }));
      }
      if (q.where.OR) {
        const lte = (q.where.OR[1] as { lastHrReviewAt: { lte: Date } }).lastHrReviewAt.lte;
        return rows
          .filter((p) => p.lastHrReviewAt === null || p.lastHrReviewAt <= lte)
          .map((p) => ({
            id: p.id,
            displayName: p.displayName,
            hiredAt: p.hiredAt,
            lastHrReviewAt: p.lastHrReviewAt,
          }));
      }
      return [];
    },
  };

  const personSkill = {
    findMany: async (q: {
      where: { certified: true; certificationExpiresAt: { lte: Date } };
    }): Promise<unknown[]> => {
      return (seed.personSkills ?? [])
        .filter(
          (s) =>
            s.certified === true &&
            s.certificationExpiresAt !== null &&
            s.certificationExpiresAt <= q.where.certificationExpiresAt.lte,
        )
        .map((s) => ({
          personId: s.personId,
          certificationExpiresAt: s.certificationExpiresAt,
          person: s.person,
          skill: s.skill,
        }));
    },
  };

  void today;
  return { person, personSkill } as unknown as PrismaService;
}

const today = new Date();
const addDays = (n: number) => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() + n);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const addMonths = (n: number) => {
  const d = new Date(today);
  d.setUTCMonth(d.getUTCMonth() + n);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

describe('HrActionCardsService (FE-#263)', () => {
  it('returns empty list when no rows seed any card', async () => {
    const prisma = buildStub({});
    const svc = new HrActionCardsService(prisma);
    const cards = await svc.listActionCards();
    expect(cards).toEqual([]);
  });

  it('raises probation_ending for persons whose probation ends in the next 30d', async () => {
    const prisma = buildStub({
      persons: [
        {
          id: 'p1',
          displayName: 'Alex',
          probationEndsAt: addDays(10),
          contractEndsAt: null,
          lastHrReviewAt: addMonths(-1),
          hiredAt: addMonths(-3),
        },
      ],
    });
    const svc = new HrActionCardsService(prisma);
    const cards = await svc.listActionCards();
    const probation = cards.find((c) => c.kind === 'probation_ending');
    expect(probation).toBeDefined();
    expect(probation!.personId).toBe('p1');
    expect(probation!.severity).toBe('warning'); // 10d ≤ 21d
  });

  it('raises certification_stale for expired cert + scores high overdue as danger', async () => {
    const prisma = buildStub({
      personSkills: [
        {
          personId: 'p1',
          certified: true,
          certificationExpiresAt: addDays(-60),
          person: { displayName: 'Alex' },
          skill: { name: 'AWS Solutions Architect' },
        },
      ],
    });
    const svc = new HrActionCardsService(prisma);
    const cards = await svc.listActionCards();
    const cert = cards.find((c) => c.kind === 'certification_stale');
    expect(cert).toBeDefined();
    expect(cert!.severity).toBe('danger'); // 60d overdue ≥ 30
    expect(cert!.message).toContain('AWS Solutions Architect');
  });

  it('raises hr_review_due when lastHrReviewAt is null', async () => {
    const prisma = buildStub({
      persons: [
        {
          id: 'p1',
          displayName: 'Alex',
          probationEndsAt: null,
          contractEndsAt: null,
          lastHrReviewAt: null,
          hiredAt: addMonths(-24),
        },
      ],
    });
    const svc = new HrActionCardsService(prisma);
    const cards = await svc.listActionCards();
    const review = cards.find((c) => c.kind === 'hr_review_due');
    expect(review).toBeDefined();
    expect(review!.message).toMatch(/never recorded/);
  });

  it('sorts by severity DESC then dueAt ASC', async () => {
    const prisma = buildStub({
      persons: [
        {
          id: 'p1',
          displayName: 'Info-Far',
          probationEndsAt: addDays(28),
          contractEndsAt: null,
          lastHrReviewAt: addMonths(-1),
          hiredAt: addMonths(-3),
        },
        {
          id: 'p2',
          displayName: 'Danger-Soon',
          probationEndsAt: addDays(3),
          contractEndsAt: null,
          lastHrReviewAt: addMonths(-1),
          hiredAt: addMonths(-3),
        },
      ],
    });
    const svc = new HrActionCardsService(prisma);
    const cards = await svc.listActionCards();
    // First card should be danger (Danger-Soon).
    expect(cards[0]!.severity).toBe('danger');
    expect(cards[0]!.personName).toBe('Danger-Soon');
  });

  it('pages results — page=2 pageSize=1 returns the 2nd card', async () => {
    const prisma = buildStub({
      persons: [
        {
          id: 'p1',
          displayName: 'Card-1',
          probationEndsAt: addDays(3),
          contractEndsAt: null,
          lastHrReviewAt: addMonths(-1),
          hiredAt: addMonths(-3),
        },
        {
          id: 'p2',
          displayName: 'Card-2',
          probationEndsAt: addDays(5),
          contractEndsAt: null,
          lastHrReviewAt: addMonths(-1),
          hiredAt: addMonths(-3),
        },
      ],
    });
    const svc = new HrActionCardsService(prisma);
    const cards = await svc.listActionCards({ page: 2, pageSize: 1 });
    expect(cards).toHaveLength(1);
    expect(cards[0]!.personName).toBe('Card-2');
  });
});
