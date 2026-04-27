import { Injectable } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';

import { isPlatformRole } from '../domain/platform-role';
import { RequestPrincipal } from './request-principal';
import {
  AuthenticatedPrincipalClaims,
  verifyPlatformJwt,
} from './platform-jwt';

export const PLATFORM_ROLES_HEADER = 'x-platform-roles';
export const PLATFORM_USER_ID_HEADER = 'x-platform-user-id';

@Injectable()
export class AuthenticatedPrincipalFactory {
  public constructor(private readonly appConfig: AppConfig) {
    if (process.env.NODE_ENV === 'production') {
      if (this.appConfig.authAllowTestHeaders) {
        throw new Error('FATAL: AUTH_ALLOW_TEST_HEADERS must not be enabled in production.');
      }
      if (this.appConfig.authDevelopmentBootstrapEnabled) {
        throw new Error('FATAL: AUTH_DEV_BOOTSTRAP_ENABLED must not be enabled in production.');
      }
    }
  }

  public createFromRequest(request: {
    header(name: string): string | undefined;
  }): RequestPrincipal | undefined {
    const authorizationHeader = request.header('authorization');

    if (authorizationHeader) {
      return this.createFromAuthorizationHeader(authorizationHeader);
    }

    if (this.appConfig.authAllowTestHeaders) {
      const headerPrincipal = this.createFromTestHeaders(request);
      if (headerPrincipal) {
        return headerPrincipal;
      }
    }

    if (this.appConfig.authDevelopmentBootstrapEnabled) {
      return {
        authSource: 'development_bootstrap',
        personId: this.appConfig.authDevelopmentBootstrapPersonId,
        roles: this.appConfig.authDevelopmentBootstrapRoles,
        userId: this.appConfig.authDevelopmentBootstrapUserId,
      };
    }

    return undefined;
  }

  private createFromAuthorizationHeader(authorizationHeader: string): RequestPrincipal | undefined {
    const [scheme, token] = authorizationHeader.split(' ');

    if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    let claims: AuthenticatedPrincipalClaims;

    try {
      claims = verifyPlatformJwt(token, {
        audience: this.appConfig.authAudience,
        issuer: this.appConfig.authIssuer,
        secret: this.appConfig.authJwtSecret,
      });
    } catch {
      return undefined;
    }

    return {
      authSource: 'bearer_token',
      personId: claims.personId,
      roles: claims.roles,
      userId: claims.userId,
    };
  }

  private createFromTestHeaders(request: {
    header(name: string): string | undefined;
  }): RequestPrincipal | undefined {
    const roleHeader = request.header(PLATFORM_ROLES_HEADER) ?? '';
    const roles = roleHeader
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(isPlatformRole);
    const userId = request.header(PLATFORM_USER_ID_HEADER) ?? undefined;

    if (!userId && roles.length === 0) {
      return undefined;
    }

    return {
      authSource: 'test_header',
      roles,
      userId,
    };
  }
}
