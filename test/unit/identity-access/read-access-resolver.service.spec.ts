import {
  ReadAccessResolverService,
  type ReadAccessVerdict,
} from '@src/modules/identity-access/application/read-access-resolver.service';
import { READ_ACTION_KINDS } from '@src/modules/identity-access/application/responsibility-resolver.service';

describe('ReadAccessResolverService (F-5.3 / D-158)', () => {
  function makePrisma(rows: Array<Record<string, unknown>>) {
    return {
      responsibilityRule: {
        findMany: jest.fn(async () => rows),
      },
    } as unknown as ConstructorParameters<typeof ReadAccessResolverService>[0];
  }

  describe('resolveAllowedRoles', () => {
    it('returns hasTenantPolicy=false when no rules exist', async () => {
      const svc = new ReadAccessResolverService(makePrisma([]));
      const verdict = await svc.resolveAllowedRoles('READ_PROJECT');
      expect(verdict.hasTenantPolicy).toBe(false);
      expect(verdict.allowedRoles).toEqual([]);
    });

    it('returns the union of targetRoles across matching ROLE-mode rules', async () => {
      const svc = new ReadAccessResolverService(
        makePrisma([
          { mode: 'ROLE', targetRole: 'admin', actionKind: 'READ_PROJECT' },
          { mode: 'ROLE', targetRole: 'director', actionKind: 'READ_PROJECT' },
          { mode: 'ROLE', targetRole: 'project_manager', actionKind: 'READ_PROJECT' },
        ]),
      );
      const verdict = await svc.resolveAllowedRoles('READ_PROJECT');
      expect(verdict.hasTenantPolicy).toBe(true);
      expect(new Set(verdict.allowedRoles)).toEqual(
        new Set(['admin', 'director', 'project_manager']),
      );
    });

    it('ignores rules whose mode is not ROLE', async () => {
      const svc = new ReadAccessResolverService(
        makePrisma([
          { mode: 'PERSON', targetRole: null, actionKind: 'READ_PROJECT' },
          { mode: 'SKIP', targetRole: null, actionKind: 'READ_PROJECT' },
        ]),
      );
      const verdict = await svc.resolveAllowedRoles('READ_PROJECT');
      expect(verdict.hasTenantPolicy).toBe(true);
      expect(verdict.allowedRoles).toEqual([]);
    });

    it('ignores rows with invalid PlatformRole values in targetRole', async () => {
      const svc = new ReadAccessResolverService(
        makePrisma([
          { mode: 'ROLE', targetRole: 'admin', actionKind: 'READ_PROJECT' },
          { mode: 'ROLE', targetRole: 'wizard', actionKind: 'READ_PROJECT' },
        ]),
      );
      const verdict = await svc.resolveAllowedRoles('READ_PROJECT');
      expect(verdict.allowedRoles).toEqual(['admin']);
    });

    it('returns hasTenantPolicy=false when DB query throws', async () => {
      const prismaMock = {
        responsibilityRule: {
          findMany: jest.fn(async () => {
            throw new Error('db down');
          }),
        },
      } as unknown as ConstructorParameters<typeof ReadAccessResolverService>[0];
      const svc = new ReadAccessResolverService(prismaMock);
      const verdict = await svc.resolveAllowedRoles('READ_PROJECT');
      expect(verdict.hasTenantPolicy).toBe(false);
      expect(verdict.allowedRoles).toEqual([]);
    });
  });

  describe('permits (pure function — determinism gate per Phase 11 R-03)', () => {
    it('returns false when no tenant policy is set', () => {
      const verdict: ReadAccessVerdict = { hasTenantPolicy: false, allowedRoles: ['admin'] };
      expect(ReadAccessResolverService.permits(verdict, ['admin'])).toBe(false);
    });

    it('returns true when caller has at least one allowed role', () => {
      const verdict: ReadAccessVerdict = {
        hasTenantPolicy: true,
        allowedRoles: ['admin', 'director'],
      };
      expect(ReadAccessResolverService.permits(verdict, ['employee', 'director'])).toBe(true);
    });

    it('returns false when caller has none of the allowed roles', () => {
      const verdict: ReadAccessVerdict = {
        hasTenantPolicy: true,
        allowedRoles: ['admin', 'director'],
      };
      expect(ReadAccessResolverService.permits(verdict, ['employee'])).toBe(false);
    });

    it('is referentially transparent — same inputs ⇒ same output', () => {
      const verdict: ReadAccessVerdict = {
        hasTenantPolicy: true,
        allowedRoles: ['admin'],
      };
      const r1 = ReadAccessResolverService.permits(verdict, ['admin']);
      const r2 = ReadAccessResolverService.permits(verdict, ['admin']);
      const r3 = ReadAccessResolverService.permits(verdict, ['admin']);
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
    });

    it('all READ_* kinds are typable and resolvable without error', async () => {
      const svc = new ReadAccessResolverService(makePrisma([]));
      for (const kind of READ_ACTION_KINDS) {
        await expect(svc.resolveAllowedRoles(kind)).resolves.toBeDefined();
      }
    });
  });
});
