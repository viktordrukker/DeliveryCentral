import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RbacGuard } from '@src/modules/identity-access/application/rbac.guard';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { REQUIRED_ROLE_PRESET_KEY } from '@src/shared/auth/role-preset.decorator';
import { READ_ACTION_KEY } from '@src/modules/identity-access/application/read-action.decorator';
import {
  ReadAccessResolverService,
  type ReadAccessVerdict,
} from '@src/modules/identity-access/application/read-access-resolver.service';
import { IS_PUBLIC_KEY } from '@src/modules/identity-access/application/public.decorator';
import { RolePresetsService } from '@src/shared/auth/role-presets.service';
import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';
import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

describe('RbacGuard (F-5.2 preset resolution + F-5.3 read-coverage)', () => {
  function makeReflector(metadata: Record<string, unknown>): Reflector {
    return {
      getAllAndOverride: jest.fn((key: string) => metadata[key]),
    } as unknown as Reflector;
  }

  function makeContext(roles: PlatformRole[] | null): ExecutionContext {
    const principal = roles ? { roles, personId: 'p1', userId: 'u1' } : undefined;
    return {
      switchToHttp: () => ({ getRequest: () => ({ principal, params: {} }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  function makePresetSvc(resolve: (preset: string) => PlatformRole[]): RolePresetsService {
    return {
      resolve: jest.fn(async (p: string) => resolve(p)),
    } as unknown as RolePresetsService;
  }

  function makeReadAccessSvc(verdict: ReadAccessVerdict): ReadAccessResolverService {
    return {
      resolveAllowedRoles: jest.fn(async () => verdict),
    } as unknown as ReadAccessResolverService;
  }

  function makeFlags(enabled: boolean): PlatformFlagsService {
    return {
      isEnabled: jest.fn(async () => enabled),
      isEnabledByKey: jest.fn(async () => enabled),
    } as unknown as PlatformFlagsService;
  }

  it('passes through when route is public', async () => {
    const guard = new RbacGuard(
      makeReflector({ [IS_PUBLIC_KEY]: true }),
      makePresetSvc(() => []),
      makeReadAccessSvc({ hasTenantPolicy: false, allowedRoles: [] }),
      makeFlags(false),
    );
    await expect(guard.canActivate(makeContext(null))).resolves.toBe(true);
  });

  it('passes when caller matches the overridden preset role set', async () => {
    const guard = new RbacGuard(
      makeReflector({ [REQUIRED_ROLE_PRESET_KEY]: 'EXEC_ROLES' }),
      makePresetSvc(() => ['admin', 'director', 'delivery_manager']),
      makeReadAccessSvc({ hasTenantPolicy: false, allowedRoles: [] }),
      makeFlags(false),
    );
    await expect(guard.canActivate(makeContext(['delivery_manager']))).resolves.toBe(true);
  });

  it('denies when caller has none of the preset roles after override', async () => {
    const guard = new RbacGuard(
      makeReflector({ [REQUIRED_ROLE_PRESET_KEY]: 'EXEC_ROLES' }),
      makePresetSvc(() => ['admin', 'director']),
      makeReadAccessSvc({ hasTenantPolicy: false, allowedRoles: [] }),
      makeFlags(false),
    );
    await expect(guard.canActivate(makeContext(['employee']))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('union semantics: static metadata accepts caller even if preset would not', async () => {
    const guard = new RbacGuard(
      makeReflector({
        [REQUIRED_ROLE_PRESET_KEY]: 'EXEC_ROLES',
        [REQUIRED_ROLES_KEY]: ['employee'] as PlatformRole[],
      }),
      makePresetSvc(() => ['admin', 'director']),
      makeReadAccessSvc({ hasTenantPolicy: false, allowedRoles: [] }),
      makeFlags(false),
    );
    await expect(guard.canActivate(makeContext(['employee']))).resolves.toBe(true);
  });

  it('throws Unauthorized when no principal is present and route requires roles', async () => {
    const guard = new RbacGuard(
      makeReflector({ [REQUIRED_ROLES_KEY]: ['admin'] as PlatformRole[] }),
      makePresetSvc(() => []),
      makeReadAccessSvc({ hasTenantPolicy: false, allowedRoles: [] }),
      makeFlags(false),
    );
    await expect(guard.canActivate(makeContext(null))).rejects.toThrow(UnauthorizedException);
  });

  it('passes when no roles + no preset are required (open endpoint)', async () => {
    const guard = new RbacGuard(
      makeReflector({}),
      makePresetSvc(() => []),
      makeReadAccessSvc({ hasTenantPolicy: false, allowedRoles: [] }),
      makeFlags(false),
    );
    await expect(guard.canActivate(makeContext(['employee']))).resolves.toBe(true);
  });

  describe('F-5.3 read-action coverage', () => {
    it('flag OFF: read-action metadata is inert; caller still needs static @RequireRoles match', async () => {
      const guard = new RbacGuard(
        makeReflector({
          [READ_ACTION_KEY]: 'READ_PROJECT',
          [REQUIRED_ROLES_KEY]: ['admin'] as PlatformRole[],
        }),
        makePresetSvc(() => []),
        // Tenant policy WOULD grant access to project_manager — but flag OFF
        // means the resolver is never consulted.
        makeReadAccessSvc({ hasTenantPolicy: true, allowedRoles: ['project_manager'] }),
        makeFlags(false),
      );
      await expect(guard.canActivate(makeContext(['project_manager']))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('flag ON + tenant policy allows caller: passes via read-coverage path', async () => {
      const guard = new RbacGuard(
        makeReflector({
          [READ_ACTION_KEY]: 'READ_PROJECT',
          [REQUIRED_ROLES_KEY]: ['admin'] as PlatformRole[],
        }),
        makePresetSvc(() => []),
        makeReadAccessSvc({ hasTenantPolicy: true, allowedRoles: ['project_manager'] }),
        makeFlags(true),
      );
      await expect(guard.canActivate(makeContext(['project_manager']))).resolves.toBe(true);
    });

    it('flag ON + no tenant policy: falls back to static @RequireRoles check', async () => {
      const guard = new RbacGuard(
        makeReflector({
          [READ_ACTION_KEY]: 'READ_PROJECT',
          [REQUIRED_ROLES_KEY]: ['admin'] as PlatformRole[],
        }),
        makePresetSvc(() => []),
        makeReadAccessSvc({ hasTenantPolicy: false, allowedRoles: [] }),
        makeFlags(true),
      );
      // No tenant policy + non-admin caller → forbidden
      await expect(guard.canActivate(makeContext(['project_manager']))).rejects.toThrow(
        ForbiddenException,
      );
      // No tenant policy + admin caller → permitted via static
      await expect(guard.canActivate(makeContext(['admin']))).resolves.toBe(true);
    });

    it('read-coverage never NARROWS access — union semantics with static metadata', async () => {
      const guard = new RbacGuard(
        makeReflector({
          [READ_ACTION_KEY]: 'READ_PROJECT',
          [REQUIRED_ROLES_KEY]: ['admin'] as PlatformRole[],
        }),
        makePresetSvc(() => []),
        // Tenant policy says "only employee can read" — but admin in @RequireRoles
        // still wins because semantics are union, not intersection.
        makeReadAccessSvc({ hasTenantPolicy: true, allowedRoles: ['employee'] }),
        makeFlags(true),
      );
      await expect(guard.canActivate(makeContext(['admin']))).resolves.toBe(true);
    });
  });
});
