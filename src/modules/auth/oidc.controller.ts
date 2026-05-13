import { Controller, Get, Logger, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { sign as jwtSign, verify as jwtVerify } from 'jsonwebtoken';

import { Throttle } from '@nestjs/throttler';
import { AppConfig } from '@src/shared/config/app-config';
import { Public } from '@src/modules/identity-access/application/public.decorator';
import { SkipDemoGuard } from '@src/modules/identity-access/application/skip-demo-guard.decorator';
import { PlatformFlagsService } from '@src/shared/config/platform-flags.service';

import { OidcService } from './oidc.service';

const STATE_COOKIE = 'dc_oidc_state';
const REFRESH_COOKIE = 'dc_refresh';
const STATE_COOKIE_MAX_AGE_S = 10 * 60; // 10 min

interface StatePayload {
  state: string;
  codeVerifier: string;
  returnTo?: string;
}

/**
 * F-4.4 / D-155 — OIDC auth endpoints. Bank-IT login bypass.
 *
 *   GET /api/auth/oidc/login    → discovers issuer, mints PKCE + state,
 *                                 sets signed state cookie, 302 to IdP.
 *   GET /api/auth/oidc/callback → verifies state cookie, exchanges
 *                                 code for tokens, upserts LocalAccount,
 *                                 issues DC refresh-cookie, 302 to FE.
 *
 * Both endpoints are public (no JWT required) and bypass the
 * setup-complete guard. The whole flow is feature-flagged behind
 * `flag.feature.integrations.oidc.enabled` (default OFF) so existing
 * deployments keep their local-account login.
 */
@Public()
@SkipDemoGuard()
@Controller('auth/oidc')
export class OidcController {
  private readonly logger = new Logger(OidcController.name);

  public constructor(
    private readonly oidcService: OidcService,
    private readonly appConfig: AppConfig,
    private readonly platformFlags: PlatformFlagsService,
  ) {}

  @Get('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  public async login(
    @Query('returnTo') returnTo: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    await this.assertEnabled();
    const { authorizationUrl, state, codeVerifier } = await this.oidcService.beginLogin();

    const statePayload: StatePayload = { state, codeVerifier, returnTo };
    const stateJwt = jwtSign(statePayload, this.appConfig.authJwtSecret, {
      expiresIn: STATE_COOKIE_MAX_AGE_S,
    });
    res.cookie(STATE_COOKIE, stateJwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.appConfig.nodeEnv === 'production',
      maxAge: STATE_COOKIE_MAX_AGE_S * 1000,
      path: '/api/auth/oidc',
    });
    res.redirect(302, authorizationUrl);
  }

  @Get('callback')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  public async callback(
    @Query('state') stateParam: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    await this.assertEnabled();

    const stateCookie = (req.cookies as Record<string, string> | undefined)?.[STATE_COOKIE];
    if (!stateCookie || !stateParam) {
      throw new UnauthorizedException('Missing OIDC state.');
    }

    let payload: StatePayload;
    try {
      payload = jwtVerify(stateCookie, this.appConfig.authJwtSecret) as StatePayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired OIDC state.');
    }

    if (payload.state !== stateParam) {
      throw new UnauthorizedException('OIDC state mismatch.');
    }

    // Reconstruct the actual callback URL so openid-client can validate it
    // against the redirect_uri used at /login.
    const protocol = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol;
    const host = req.headers.host ?? 'localhost:3000';
    const callbackUrl = new URL(`${protocol}://${host}${req.originalUrl}`);

    const tokens = await this.oidcService.completeLogin({
      callbackUrl,
      expectedState: payload.state,
      codeVerifier: payload.codeVerifier,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    // Issue refresh cookie (matches AuthController.setRefreshCookie shape)
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.appConfig.nodeEnv === 'production',
      maxAge: this.appConfig.authRefreshTokenExpiresIn * 1000,
      path: '/',
    });
    res.clearCookie(STATE_COOKIE, { path: '/api/auth/oidc' });

    // Redirect back to the FE with the access token in URL fragment so the
    // FE's auth bootstrap can pick it up. Fragment is preferred over query
    // param to keep the token out of access logs / referrer headers.
    const safeReturnTo = this.sanitizeReturnTo(payload.returnTo);
    const target = `${safeReturnTo}#access_token=${encodeURIComponent(tokens.accessToken)}`;
    res.redirect(302, target);
  }

  private async assertEnabled(): Promise<void> {
    const enabled = await this.platformFlags.isEnabledByKey(
      'flag.feature.integrations.oidc.enabled',
      false,
    );
    if (!enabled) {
      throw new UnauthorizedException('OIDC login is disabled on this tenant.');
    }
  }

  /**
   * `returnTo` is user-controlled. Limit to absolute paths on the same host so
   * an attacker can't open-redirect to a phishing site after a successful login.
   */
  private sanitizeReturnTo(value: string | undefined): string {
    if (!value || !value.startsWith('/')) return '/';
    if (value.startsWith('//')) return '/'; // protocol-relative
    return value;
  }
}
