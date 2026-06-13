import { randomBytes } from 'node:crypto';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as oidc from 'openid-client';

import { LocalAccountSource } from '@prisma/client';
import { isPlatformRole } from '@src/modules/identity-access/domain/platform-role';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { TokenService } from './token.service';

interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  source: LocalAccountSource;
}

export interface OidcLoginRedirect {
  authorizationUrl: string;
  state: string;
  codeVerifier: string;
}

/**
 * F-4.4 / D-155 — OIDC handler (bank-IT login bypass).
 *
 * Two-step flow:
 *   1. `beginLogin()` discovers the issuer, builds a PKCE-protected
 *      authorization URL with a random state. Caller stores state +
 *      codeVerifier in an httpOnly cookie + redirects the user.
 *   2. `completeLogin()` reads the cookie, verifies state, exchanges
 *      the authorization code for tokens, validates the ID token,
 *      upserts a LocalAccount by email, and issues DC session tokens
 *      via the existing TokenService.
 *
 * Config lives in PlatformSettings (`sso.idp.*`) so a bank-IT admin
 * can re-target the IdP at runtime via `/admin/feature-flags` without
 * a redeploy. The clientSecret follows the existing redaction rule on
 * GET; reads through `PlatformSettingsService` decrypt at the BE
 * boundary.
 *
 * IdP-agnostic: discovery handles Entra ID, Okta, Keycloak,
 * PingFederate, Google, anything that publishes a valid `/.well-known/
 * openid-configuration`.
 */
@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private cachedConfig: { config: oidc.Configuration; source: OidcConfig } | null = null;

  public constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  public async beginLogin(): Promise<OidcLoginRedirect> {
    const source = await this.loadConfig();
    const config = await this.getDiscoveredConfig(source);
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
    const state = oidc.randomState();

    const authorizationUrl = oidc
      .buildAuthorizationUrl(config, {
        redirect_uri: source.redirectUri,
        scope: 'openid profile email',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state,
      })
      .toString();

    return { authorizationUrl, state, codeVerifier };
  }

  public async completeLogin(input: {
    callbackUrl: URL;
    expectedState: string;
    codeVerifier: string;
    userAgent?: string;
    ip?: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const source = await this.loadConfig();
    const config = await this.getDiscoveredConfig(source);

    let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
    try {
      tokens = await oidc.authorizationCodeGrant(config, input.callbackUrl, {
        pkceCodeVerifier: input.codeVerifier,
        expectedState: input.expectedState,
      });
    } catch (error) {
      this.logger.warn(`OIDC code exchange failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('OIDC authorization failed.');
    }

    const claims = tokens.claims();
    if (!claims) {
      throw new UnauthorizedException('OIDC response did not include an ID token.');
    }
    const email = typeof claims.email === 'string' ? claims.email : null;
    if (!email) {
      throw new UnauthorizedException('OIDC ID token did not carry an `email` claim.');
    }
    const displayName =
      (typeof claims.name === 'string' && claims.name) ||
      (typeof claims.preferred_username === 'string' && claims.preferred_username) ||
      email;

    const account = await this.provisionAccountForLogin({
      email,
      displayName,
      source: source.source,
      roleClaim: claims.roles,
    });

    const roles = account.roles.filter(isPlatformRole);
    return this.tokenService.issueTokenPair(
      account.id,
      roles,
      account.personId ?? undefined,
      account.email,
      input.userAgent,
      input.ip,
    );
  }

  /**
   * EPIC D / D1 — provision-or-login an account for a verified OIDC identity,
   * enforcing sso.autoProvisionUsers and mapping the IdP roles claim. Extracted
   * for unit-testability (no OIDC token-exchange flow needed).
   */
  private async provisionAccountForLogin(input: {
    email: string;
    displayName: string;
    source: LocalAccountSource;
    roleClaim: unknown;
  }): Promise<{ id: string; roles: string[]; personId: string | null; email: string }> {
    const existing = await this.prisma.localAccount.findUnique({ where: { email: input.email } });
    if (!existing) {
      const autoProvision = Boolean(await this.platformSettings.getRawValue('sso.autoProvisionUsers'));
      if (!autoProvision) {
        this.logger.warn(`OIDC sign-in for unprovisioned ${input.email} rejected: sso.autoProvisionUsers is OFF.`);
        throw new UnauthorizedException(
          'Your identity is valid, but automatic account provisioning is disabled. Ask an administrator to create your account.',
        );
      }
    }

    // Map the IdP `roles` claim → platform roles on first provision. Unknown /
    // non-platform roles are dropped; existing accounts keep their locally-managed
    // roles (the IdP claim does not clobber on update).
    const claimedRoles = Array.isArray(input.roleClaim)
      ? (input.roleClaim.filter((r) => typeof r === 'string') as string[]).filter(isPlatformRole)
      : [];

    return this.prisma.localAccount.upsert({
      where: { email: input.email },
      update: { displayName: input.displayName, source: input.source, lastLoginAt: new Date() },
      create: {
        email: input.email,
        displayName: input.displayName,
        // No password — OIDC accounts can't local-login. Random hash so the
        // column constraint is satisfied; bcrypt would never match this string.
        passwordHash: `oidc:${randomBytes(24).toString('hex')}`,
        roles: claimedRoles,
        source: input.source,
        lastLoginAt: new Date(),
      },
    });
  }

  private async loadConfig(): Promise<OidcConfig> {
    const issuerUrl = this.asString(await this.platformSettings.getRawValue('sso.idp.issuerUrl'));
    const clientId = this.asString(await this.platformSettings.getRawValue('sso.idp.clientId'));
    const clientSecret = this.asString(await this.platformSettings.getRawValue('sso.idp.clientSecret'));
    const redirectUri =
      this.asString(await this.platformSettings.getRawValue('sso.idp.redirectUri')) ||
      `${process.env.BACKEND_PUBLIC_URL ?? 'http://localhost:3000'}/api/auth/oidc/callback`;
    const source = this.asString(await this.platformSettings.getRawValue('sso.idp.source'));

    if (!issuerUrl || !clientId || !clientSecret) {
      throw new UnauthorizedException('OIDC is not configured (sso.idp.* PlatformSettings missing).');
    }

    return {
      issuerUrl,
      clientId,
      clientSecret,
      redirectUri,
      source: this.coerceSource(source),
    };
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private coerceSource(value: string | null): LocalAccountSource {
    switch (value) {
      case 'azure_ad':
      case 'okta':
      case 'google':
      case 'ldap':
      case 'local':
        return value;
      default:
        return 'azure_ad';
    }
  }

  private async getDiscoveredConfig(source: OidcConfig): Promise<oidc.Configuration> {
    if (
      this.cachedConfig &&
      this.cachedConfig.source.issuerUrl === source.issuerUrl &&
      this.cachedConfig.source.clientId === source.clientId
    ) {
      return this.cachedConfig.config;
    }
    const config = await oidc.discovery(new URL(source.issuerUrl), source.clientId, source.clientSecret);
    this.cachedConfig = { config, source };
    return config;
  }
}
