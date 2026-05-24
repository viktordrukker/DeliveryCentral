import { CmdkSearchService } from '@src/modules/search/application/cmdk-search.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

function emptyDelegate() {
  return { findMany: async (_q: unknown): Promise<unknown[]> => [] };
}

function buildPrisma(seed: {
  people?: Array<{ id: string; displayName: string; primaryEmail?: string; role?: string; archivedAt?: Date | null; terminatedAt?: Date | null }>;
  projects?: Array<{ id: string; name: string; projectCode: string; description?: string | null; status: 'ACTIVE' | 'DRAFT' | 'PENDING_APPROVAL' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED' }>;
  positions?: Array<{ id: string; role: string; summary?: string | null; fillStatus: string }>;
  cases?: Array<{ id: string; caseNumber: string; summary?: string | null; status: string }>;
  assignments?: Array<{ id: string; personName: string; projectName: string; status: string }>;
}): PrismaService {
  const insens = (s: string, q: string) => s.toLowerCase().includes(q.toLowerCase());
  const person = {
    findMany: async (qry: { where: { OR: Array<{ displayName?: { contains: string } }> } }): Promise<unknown[]> => {
      const q = qry.where.OR[0]!.displayName!.contains;
      return (seed.people ?? [])
        .filter((p) => insens(p.displayName, q) || (p.primaryEmail && insens(p.primaryEmail, q)))
        .map((p) => ({
          id: p.id,
          displayName: p.displayName,
          primaryEmail: p.primaryEmail ?? null,
          role: p.role ?? null,
          archivedAt: p.archivedAt ?? null,
          terminatedAt: p.terminatedAt ?? null,
        }));
    },
  };
  const project = {
    findMany: async (qry: { where: { OR: Array<{ name?: { contains: string } }> } }): Promise<unknown[]> => {
      const q = qry.where.OR[0]!.name!.contains;
      return (seed.projects ?? []).filter((p) => insens(p.name, q) || insens(p.projectCode, q));
    },
  };
  const projectPosition = {
    findMany: async (qry: { where: { OR: Array<{ role?: { contains: string } }> } }): Promise<unknown[]> => {
      const q = qry.where.OR[0]!.role!.contains;
      return (seed.positions ?? []).filter((p) => insens(p.role, q));
    },
  };
  const caseRecord = {
    findMany: async (qry: { where: { OR: Array<{ caseNumber?: { contains: string } }> } }): Promise<unknown[]> => {
      const q = qry.where.OR[0]!.caseNumber!.contains;
      return (seed.cases ?? []).filter((c) => insens(c.caseNumber, q) || (c.summary && insens(c.summary, q)));
    },
  };
  const projectAssignment = {
    findMany: async (qry: {
      where: { person?: { displayName: { contains: string } }; project?: { name: { contains: string } } };
    }): Promise<unknown[]> => {
      const q =
        qry.where.person?.displayName?.contains ?? qry.where.project?.name?.contains ?? '';
      return (seed.assignments ?? [])
        .filter((a) => (qry.where.person ? insens(a.personName, q) : insens(a.projectName, q)))
        .map((a) => ({
          id: a.id,
          person: { displayName: a.personName },
          project: { name: a.projectName },
          status: a.status,
        }));
    },
  };
  void emptyDelegate;
  return { person, project, projectPosition, caseRecord, projectAssignment } as unknown as PrismaService;
}

describe('CmdkSearchService (FE-#270)', () => {
  it('returns empty when query is shorter than 2 chars', async () => {
    const svc = new CmdkSearchService(buildPrisma({}));
    expect(await svc.search({ q: '' })).toEqual([]);
    expect(await svc.search({ q: 'a' })).toEqual([]);
  });

  it('returns higher rank for prefix matches than substring matches', async () => {
    const prisma = buildPrisma({
      people: [
        { id: 'p1', displayName: 'Alex Chen', role: 'PM' }, // prefix on "ale"
        { id: 'p2', displayName: 'Carl Alexander', role: 'RM' }, // substring on "ale"
      ],
    });
    const svc = new CmdkSearchService(prisma);
    const results = await svc.search({ q: 'ale' });
    const alex = results.find((r) => r.id === 'p1')!;
    const carl = results.find((r) => r.id === 'p2')!;
    expect(alex.rank).toBeGreaterThan(carl.rank);
  });

  it('de-ranks archived rows by half', async () => {
    const prisma = buildPrisma({
      people: [
        { id: 'p1', displayName: 'Active Alice' },
        { id: 'p2', displayName: 'Active Andrew', terminatedAt: new Date() },
      ],
    });
    const svc = new CmdkSearchService(prisma);
    const results = await svc.search({ q: 'active' });
    const alice = results.find((r) => r.id === 'p1')!;
    const andrew = results.find((r) => r.id === 'p2')!;
    expect(alice.rank).toBe(0.9);
    expect(andrew.rank).toBe(0.45);
  });

  it('mixes entity kinds and sorts by rank desc', async () => {
    const prisma = buildPrisma({
      people: [{ id: 'p1', displayName: 'Atlas Group' }],
      projects: [{ id: 'pr1', name: 'Atlas Migration', projectCode: 'ATM-1', status: 'ACTIVE' }],
      positions: [{ id: 'pos1', role: 'Atlas Architect', fillStatus: 'OPEN' }],
    });
    const svc = new CmdkSearchService(prisma);
    const results = await svc.search({ q: 'atlas', limit: 10 });
    expect(results.length).toBe(3);
    expect(results.every((r) => r.rank === 0.9)).toBe(true);
    expect(results.map((r) => r.kind).sort()).toEqual(['person', 'position', 'project']);
  });

  it('caps results at limit', async () => {
    const people = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i}`,
      displayName: `Atlas ${i}`,
    }));
    const prisma = buildPrisma({ people });
    const svc = new CmdkSearchService(prisma);
    const results = await svc.search({ q: 'atlas', limit: 5 });
    expect(results).toHaveLength(5);
  });
});
