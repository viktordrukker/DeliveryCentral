import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RolePresetsService } from '@src/shared/auth/role-presets.service';
import { REQUIRED_ROLE_PRESET_KEY } from '@src/shared/auth/role-preset.decorator';
import type { RolePresetName } from '@src/shared/auth/role-presets';

import { RequestPrincipal } from './request-principal';
import { SELF_SCOPE_KEY, SelfScopeOptions } from './self-scope.decorator';
import { REQUIRED_ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PlatformRole } from '../domain/platform-role';

@Injectable()
export class RbacGuard implements CanActivate {
  public constructor(
    private readonly reflector: Reflector,
    private readonly rolePresets: RolePresetsService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      params?: Record<string, string | undefined>;
      principal?: RequestPrincipal;
    }>();
    const principal = request.principal;

    if (!principal) {
      throw new UnauthorizedException('Authentication required.');
    }

    const requiredRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPreset = this.reflector.getAllAndOverride<RolePresetName>(
      REQUIRED_ROLE_PRESET_KEY,
      [context.getHandler(), context.getClass()],
    );

    const noStaticRoles = !requiredRoles || requiredRoles.length === 0;
    if (noStaticRoles && !requiredPreset) {
      return true;
    }

    if (principal.roles.length === 0) {
      throw new UnauthorizedException('Authentication principal is required.');
    }

    const selfScope = this.reflector.getAllAndOverride<SelfScopeOptions>(
      SELF_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (selfScope && this.matchesSelfScope(request, principal, selfScope)) {
      return true;
    }

    // F-5.2 — preset metadata resolves via PlatformSetting overrides
    // (defaults to compile-time constants in role-presets.ts).
    if (requiredPreset) {
      const liveRoles = await this.rolePresets.resolve(requiredPreset);
      if (liveRoles.some((role) => principal.roles.includes(role))) return true;
    }

    if (!noStaticRoles && requiredRoles!.some((role) => principal.roles.includes(role))) {
      return true;
    }

    throw new ForbiddenException('Insufficient role for this operation.');
  }

  private matchesSelfScope(
    request: { params?: Record<string, string | undefined> },
    principal: RequestPrincipal,
    selfScope: SelfScopeOptions,
  ): boolean {
    const targetId = request.params?.[selfScope.param];

    if (!targetId) {
      return false;
    }

    return principal.personId === targetId || principal.userId === targetId;
  }
}
