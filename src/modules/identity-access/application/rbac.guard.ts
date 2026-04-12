import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestPrincipal } from './request-principal';
import { SELF_SCOPE_KEY, SelfScopeOptions } from './self-scope.decorator';
import { REQUIRED_ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PlatformRole } from '../domain/platform-role';

@Injectable()
export class RbacGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
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

    if (!requiredRoles || requiredRoles.length === 0) {
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

    const hasRole = requiredRoles.some((role) => principal.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role for this operation.');
    }

    return true;
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
