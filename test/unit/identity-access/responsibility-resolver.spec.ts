import { ResponsibilityResolverService } from '@src/modules/identity-access/application/responsibility-resolver.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeRule {
  id: string;
  actionKind: string;
  scopeKind:
    | 'TENANT'
    | 'ORG_UNIT'
    | 'CLIENT'
    | 'PROJECT'
    | 'PROJECT_TYPE'
    | 'THRESHOLD_AMOUNT'
    | 'ROLE_GRADE';
  scopeValue: string | null;
  mode: 'ROLE' | 'PERSON' | 'PM_SOLO' | 'SKIP';
  targetRole: string | null;
  targetPersonId: string | null;
  priority: number;
  isActive: boolean;
  archivedAt: Date | null;
  updatedAt: Date;
  tenantId: string | null;
}

function buildPrisma(rules: FakeRule[]): PrismaService {
  return {
    responsibilityRule: {
      findMany: async (args: {
        where: {
          actionKind: string;
          scopeKind?: string;
          scopeValue?: string | null;
          isActive: boolean;
          archivedAt: null;
          OR?: Array<{ tenantId?: string | null }>;
        };
      }): Promise<FakeRule[]> => {
        return rules.filter((r) => {
          if (r.actionKind !== args.where.actionKind) return false;
          if (args.where.scopeKind && r.scopeKind !== args.where.scopeKind) return false;
          if (args.where.scopeValue !== undefined && r.scopeValue !== args.where.scopeValue)
            return false;
          if (!r.isActive) return false;
          if (r.archivedAt !== null) return false;
          // tenant filter — accept rules whose tenantId is null OR matches one
          // of the OR options.
          if (args.where.OR) {
            const tenantOk = args.where.OR.some((o) => {
              if (o.tenantId === undefined) return false;
              return r.tenantId === o.tenantId;
            });
            if (!tenantOk) return false;
          }
          return true;
        });
      },
    },
  } as unknown as PrismaService;
}

function rule(props: Partial<FakeRule> & { id: string; actionKind: string }): FakeRule {
  return {
    scopeKind: 'TENANT',
    scopeValue: null,
    mode: 'ROLE',
    targetRole: null,
    targetPersonId: null,
    priority: 100,
    isActive: true,
    archivedAt: null,
    updatedAt: new Date(),
    tenantId: null,
    ...props,
  };
}

describe('ResponsibilityResolverService', () => {
  it('returns FALLBACK with the supplied role when no rule matches', async () => {
    const svc = new ResponsibilityResolverService(buildPrisma([]));
    const out = await svc.resolve({
      actionKind: 'PROJECT_ACTIVATION_APPROVAL',
      fallbackRole: 'director',
    });
    expect(out.source).toBe('FALLBACK');
    expect(out.mode).toBe('ROLE');
    expect(out.targetRole).toBe('director');
    expect(out.ruleId).toBeNull();
  });

  it('matches a TENANT-scoped rule when only tenant default exists', async () => {
    const rules = [
      rule({
        id: 'r-tenant',
        actionKind: 'BUDGET_CHANGE_APPROVAL',
        mode: 'ROLE',
        targetRole: 'director',
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));
    const out = await svc.resolve({
      actionKind: 'BUDGET_CHANGE_APPROVAL',
      fallbackRole: 'admin',
    });
    expect(out.source).toBe('RULE');
    expect(out.matchedScope).toBe('TENANT');
    expect(out.targetRole).toBe('director');
    expect(out.ruleId).toBe('r-tenant');
  });

  it('prefers a more-specific scope (PROJECT > CLIENT > TENANT) at the same priority', async () => {
    const projectId = 'aaa-project';
    const clientId = 'bbb-client';
    const rules = [
      rule({
        id: 'r-tenant',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        mode: 'ROLE',
        targetRole: 'director',
      }),
      rule({
        id: 'r-client',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'CLIENT',
        scopeValue: clientId,
        mode: 'ROLE',
        targetRole: 'delivery_manager',
      }),
      rule({
        id: 'r-project',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'PROJECT',
        scopeValue: projectId,
        mode: 'PERSON',
        targetPersonId: '11111111-1111-1111-1111-111111111111',
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));
    const out = await svc.resolve({
      actionKind: 'PROJECT_ACTIVATION_APPROVAL',
      projectId,
      clientId,
      fallbackRole: 'admin',
    });
    expect(out.source).toBe('RULE');
    expect(out.matchedScope).toBe('PROJECT');
    expect(out.mode).toBe('PERSON');
    expect(out.targetPersonId).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('priority overrides specificity: a tenant rule with priority=1 beats a project rule with priority=100', async () => {
    const projectId = 'aaa-project';
    const rules = [
      rule({
        id: 'r-tenant-priority',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'TENANT',
        priority: 1,
        mode: 'ROLE',
        targetRole: 'admin',
      }),
      rule({
        id: 'r-project-default',
        actionKind: 'PROJECT_ACTIVATION_APPROVAL',
        scopeKind: 'PROJECT',
        scopeValue: projectId,
        priority: 100,
        mode: 'ROLE',
        targetRole: 'director',
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));
    const out = await svc.resolve({
      actionKind: 'PROJECT_ACTIVATION_APPROVAL',
      projectId,
      fallbackRole: 'director',
    });
    expect(out.ruleId).toBe('r-tenant-priority');
    expect(out.targetRole).toBe('admin');
  });

  it('THRESHOLD_AMOUNT fires when amount ≥ scopeValue and skips when below', async () => {
    const rules = [
      rule({
        id: 'r-threshold',
        actionKind: 'BUDGET_CHANGE_APPROVAL',
        scopeKind: 'THRESHOLD_AMOUNT',
        scopeValue: '50000',
        mode: 'ROLE',
        targetRole: 'admin',
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));

    const above = await svc.resolve({
      actionKind: 'BUDGET_CHANGE_APPROVAL',
      amount: 100000,
      fallbackRole: 'director',
    });
    expect(above.source).toBe('RULE');
    expect(above.targetRole).toBe('admin');

    const below = await svc.resolve({
      actionKind: 'BUDGET_CHANGE_APPROVAL',
      amount: 25000,
      fallbackRole: 'director',
    });
    expect(below.source).toBe('FALLBACK');
    expect(below.targetRole).toBe('director');
  });

  it('returns SKIP mode when the matched rule says approval is not required', async () => {
    const rules = [
      rule({
        id: 'r-skip',
        actionKind: 'BUDGET_CHANGE_APPROVAL',
        scopeKind: 'THRESHOLD_AMOUNT',
        scopeValue: '1000',
        mode: 'SKIP',
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));
    const out = await svc.resolve({
      actionKind: 'BUDGET_CHANGE_APPROVAL',
      amount: 500, // below the threshold — SKIP rule does NOT fire
      fallbackRole: 'director',
    });
    expect(out.source).toBe('FALLBACK');

    const out2 = await svc.resolve({
      actionKind: 'BUDGET_CHANGE_APPROVAL',
      amount: 5000, // above — SKIP rule fires, no approver needed
      fallbackRole: 'director',
    });
    expect(out2.source).toBe('RULE');
    expect(out2.mode).toBe('SKIP');
  });

  it('returns PM_SOLO when the rule targets the project PM', async () => {
    const rules = [
      rule({
        id: 'r-pm-solo',
        actionKind: 'PROJECT_CLOSE_APPROVAL',
        scopeKind: 'PROJECT_TYPE',
        scopeValue: 'INTERNAL',
        mode: 'PM_SOLO',
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));
    const out = await svc.resolve({
      actionKind: 'PROJECT_CLOSE_APPROVAL',
      projectType: 'INTERNAL',
      fallbackRole: 'director',
    });
    expect(out.source).toBe('RULE');
    expect(out.matchedScope).toBe('PROJECT_TYPE');
    expect(out.mode).toBe('PM_SOLO');
  });

  it('skips inactive and archived rules', async () => {
    const rules = [
      rule({
        id: 'r-inactive',
        actionKind: 'PERSON_RELEASE_HR_APPROVAL',
        scopeKind: 'TENANT',
        mode: 'ROLE',
        targetRole: 'admin',
        isActive: false,
      }),
      rule({
        id: 'r-archived',
        actionKind: 'PERSON_RELEASE_HR_APPROVAL',
        scopeKind: 'TENANT',
        mode: 'ROLE',
        targetRole: 'admin',
        archivedAt: new Date(),
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));
    const out = await svc.resolve({
      actionKind: 'PERSON_RELEASE_HR_APPROVAL',
      fallbackRole: 'hr_manager',
    });
    expect(out.source).toBe('FALLBACK');
    expect(out.targetRole).toBe('hr_manager');
  });

  it('breaks ties on most-recently-updated when priority + specificity are equal', async () => {
    const rules = [
      rule({
        id: 'r-old',
        actionKind: 'ASSIGNMENT_DIRECTOR_APPROVAL',
        scopeKind: 'TENANT',
        priority: 100,
        mode: 'ROLE',
        targetRole: 'director',
        updatedAt: new Date('2026-01-01'),
      }),
      rule({
        id: 'r-new',
        actionKind: 'ASSIGNMENT_DIRECTOR_APPROVAL',
        scopeKind: 'TENANT',
        priority: 100,
        mode: 'ROLE',
        targetRole: 'admin',
        updatedAt: new Date('2026-04-01'),
      }),
    ];
    const svc = new ResponsibilityResolverService(buildPrisma(rules));
    const out = await svc.resolve({
      actionKind: 'ASSIGNMENT_DIRECTOR_APPROVAL',
      fallbackRole: 'director',
    });
    expect(out.ruleId).toBe('r-new');
    expect(out.targetRole).toBe('admin');
  });
});
