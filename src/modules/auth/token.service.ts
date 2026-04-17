import { createHash, randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { signPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';
import { isPlatformRole } from '@src/modules/identity-access/domain/platform-role';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfig,
  ) {}

  public async issueTokenPair(
    accountId: string,
    roles: string[],
    personId: string | undefined,
    email: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const accessToken = signPlatformJwt(
      {
        sub: accountId,
        email,
        person_id: personId,
        platform_roles: roles,
      },
      {
        audience: this.appConfig.authAudience,
        issuer: this.appConfig.authIssuer,
        secret: this.appConfig.authJwtSecret,
        expiresInSeconds: this.appConfig.authAccessTokenExpiresIn,
      },
    );

    const refreshTokenRaw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(refreshTokenRaw);
    const expiresAt = new Date(Date.now() + this.appConfig.authRefreshTokenExpiresIn * 1000);

    await this.prisma.refreshToken.create({
      data: { accountId, tokenHash, expiresAt, userAgent, ipAddress: ip },
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  public async refresh(refreshTokenRaw: string): Promise<TokenPair> {
    const tokenHash = hashToken(refreshTokenRaw);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const account = await this.prisma.localAccount.findUnique({ where: { id: stored.accountId } });

    if (!account) {
      throw new UnauthorizedException('Account not found.');
    }

    // Revoke old token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const roles = account.roles.filter(isPlatformRole);
    return this.issueTokenPair(account.id, roles, account.personId ?? undefined, account.email);
  }

  public async revokeRefreshToken(refreshTokenRaw: string): Promise<void> {
    const tokenHash = hashToken(refreshTokenRaw);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public signTempToken(accountId: string, scope: string, expiresInSeconds: number): string {
    return signPlatformJwt(
      { sub: accountId, scope } as Parameters<typeof signPlatformJwt>[0],
      {
        audience: this.appConfig.authAudience,
        issuer: this.appConfig.authIssuer,
        secret: this.appConfig.authJwtSecret,
        expiresInSeconds,
      },
    );
  }
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
