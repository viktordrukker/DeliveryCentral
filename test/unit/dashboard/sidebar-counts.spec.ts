import { SidebarCountsService } from '@src/modules/dashboard/application/sidebar-counts.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

function buildStub(values: Partial<Record<string, number>>): PrismaService {
  return {
    project: { count: async () => values['project'] ?? 0 },
    projectPosition: {
      count: async () => values['projectPositionProposed'] ?? 0,
      groupBy: async () => Array.from({ length: values['filledDistinct'] ?? 0 }, (_, i) => ({ activePersonId: `p${i}` })),
    },
    budgetApproval: { count: async () => values['budgetApproval'] ?? 0 },
    projectActivationApproval: { count: async () => values['projectActivationApproval'] ?? 0 },
    leaveRequest: { count: async () => values['leaveRequest'] ?? 0 },
    caseRecord: { count: async () => values['caseRecord'] ?? 0 },
    person: {
      // Canonical bench helper uses findMany; HR card counts use count().
      // Distinguish HR's probation/contract/review by inspecting the where
      // clause shape.
      findMany: async (_q: unknown) =>
        Array.from({ length: values['personActive'] ?? 0 }, (_, i) => ({ id: `p${i}` })),
      count: async (q: { where: Record<string, unknown> }) => {
        if ('probationEndsAt' in q.where) return values['probationDue'] ?? 0;
        if ('contractEndsAt' in q.where) return values['contractDue'] ?? 0;
        if ('OR' in q.where) return values['reviewDue'] ?? 0;
        return values['personActive'] ?? 0;
      },
    },
    personSkill: { count: async () => values['personSkillExpired'] ?? 0 },
  } as unknown as PrismaService;
}

describe('SidebarCountsService (FE-#309)', () => {
  it('sums the 5 approvals sources', async () => {
    const svc = new SidebarCountsService(
      buildStub({
        projectPositionProposed: 1,
        budgetApproval: 2,
        projectActivationApproval: 3,
        leaveRequest: 4,
        caseRecord: 5,
      }),
    );
    const out = await svc.getCounts(['admin']);
    expect(out.approvals).toBe(15);
  });

  it('out-of-scope counters return 0 for non-privileged callers', async () => {
    const svc = new SidebarCountsService(
      buildStub({ personActive: 100, filledDistinct: 30, caseRecord: 10 }),
    );
    const out = await svc.getCounts(['employee']);
    expect(out.bench).toBe(0);
    expect(out.hrQueue).toBe(0);
  });

  it('RM roles see bench count = active people minus filled distinct', async () => {
    const svc = new SidebarCountsService(
      buildStub({ personActive: 50, filledDistinct: 20 }),
    );
    const out = await svc.getCounts(['resource_manager']);
    expect(out.bench).toBe(30);
  });

  it('HR roles see hrQueue = cases + probation + contract + review + cert', async () => {
    // Stub: caseRecord=10. With no probation/contract/review/cert seed,
    // person.count returns 0 from each call → hrQueue should be 10.
    const svc = new SidebarCountsService(buildStub({ caseRecord: 10 }));
    const out = await svc.getCounts(['hr_manager']);
    expect(out.hrQueue).toBe(10);
  });

  it('admin sees all counters non-zero', async () => {
    const svc = new SidebarCountsService(
      buildStub({
        project: 24,
        projectPositionProposed: 7,
        personActive: 50,
        filledDistinct: 38,
        caseRecord: 3,
      }),
    );
    const out = await svc.getCounts(['admin']);
    expect(out.projects).toBe(24);
    // approvals = positions(7) + budget(0) + activation(0) + leave(0) + case(3) = 10
    expect(out.approvals).toBe(10);
    expect(out.bench).toBe(12);
    expect(out.hrQueue).toBe(3);
  });
});
