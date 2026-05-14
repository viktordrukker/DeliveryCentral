import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RbacGuard } from '@src/modules/identity-access/application/rbac.guard';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { REQUIRED_ROLE_PRESET_KEY } from '@src/shared/auth/role-preset.decorator';
import { IS_PUBLIC_KEY } from '@src/modules/identity-access/application/public.decorator';
import { RolePresetsService } from '@src/shared/auth/role-presets.service';
import type { PlatformRole } from '@src/modules/identity-access/domain/platform-role';

describe('RbacGuard (F-5.2 preset resolution)', () => {
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

  it('passes through when route is public', async () => {
    const guard = new RbacGuard(
      makeReflector({ [IS_PUBLIC_KEY]: true }),
      makePresetSvc(() => []),
    );
    await expect(guard.canActivate(makeContext(null))).resolves.toBe(true);
  });

  it('passes when caller matches the overridden preset role set', async () => {
    const guard = new RbacGuard(
      makeReflector({ [REQUIRED_ROLE_PRESET_KEY]: 'EXEC_ROLES' }),
      makePresetSvc(() => ['admin', 'director', 'delivery_manager']),
    );
    // delivery_manager is NOT in the default EXEC_ROLES, but the override
    // includes it. Caller is DM → permitted.
    await expect(guard.canActivate(makeContext(['delivery_manager']))).resolves.toBe(true);
  });

  it('denies when caller has none of the preset roles after override', async () => {
    const guard = new RbacGuard(
      makeReflector({ [REQUIRED_ROLE_PRESET_KEY]: 'EXEC_ROLES' }),
      makePresetSvc(() => ['admin', 'director']),
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
    );
    // EXEC_ROLES override doesn't include employee, but static metadata does.
    await expect(guard.canActivate(makeContext(['employee']))).resolves.toBe(true);
  });

  it('throws Unauthorized when no principal is present and route requires roles', async () => {
    const guard = new RbacGuard(
      makeReflector({ [REQUIRED_ROLES_KEY]: ['admin'] as PlatformRole[] }),
      makePresetSvc(() => []),
    );
    await expect(guard.canActivate(makeContext(null))).rejects.toThrow(UnauthorizedException);
  });

  it('passes when no roles + no preset are required (open endpoint)', async () => {
    const guard = new RbacGuard(makeReflector({}), makePresetSvc(() => []));
    await expect(guard.canActivate(makeContext(['employee']))).resolves.toBe(true);
  });
});
