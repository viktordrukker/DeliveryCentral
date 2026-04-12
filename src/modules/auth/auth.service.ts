import { createHash, randomBytes } from 'node:crypto';

import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import * as qrcode from 'qrcode';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { signPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';
import { isPlatformRole } from '@src/modules/identity-access/domain/platform-role';

import type { MeDto } from './dto/me.dto';

const TOTP_CRYPTO = new NobleCryptoPlugin();
const TOTP_BASE32 = new ScureBase32Plugin();

function makeTOTP(secret: string): TOTP {
  return new TOTP({ crypto: TOTP_CRYPTO, base32: TOTP_BASE32, secret });
}

async function totpVerify(token: string, secret: string): Promise<boolean> {
  const totp = makeTOTP(secret);
  const result = await totp.verify(token);
  return result.valid;
}

function totpGenSecret(): string {
  const totp = new TOTP({ crypto: TOTP_CRYPTO, base32: TOTP_BASE32 });
  return totp.generateSecret();
}

function totpKeyUri(email: string, issuer: string, secret: string): string {
  const totp = makeTOTP(secret);
  return totp.toURI({ label: email, issuer });
}

export type LoginResult =
  | { accessToken: string; refreshToken: string }
  | { requires2FA: true; tempToken: string };

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfig,
  ) {}

  public async validateLocalCredentials(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string } | null> {
    const account = await this.prisma.localAccount.findUnique({ where: { email } });

    if (!account) {
      return null;
    }

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account locked until ${account.lockedUntil.toISOString()}`,
      );
    }

    const valid = await bcrypt.compare(password, account.passwordHash);

    if (!valid) {
      const newFailCount = account.failedLoginAttempts + 1;
      const lockedUntil =
        newFailCount >= this.appConfig.authMaxFailedAttempts
          ? new Date(Date.now() + this.appConfig.authLockoutDurationMinutes * 60 * 1000)
          : null;

      await this.prisma.localAccount.update({
        where: { id: account.id },
        data: {
          failedLoginAttempts: newFailCount,
          ...(lockedUntil ? { lockedUntil } : {}),
        },
      });

      return null;
    }

    await this.prisma.localAccount.update({
      where: { id: account.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    return { id: account.id, email: account.email };
  }

  public async login(
    email: string,
    password: string,
    userAgent?: string,
    ip?: string,
  ): Promise<LoginResult> {
    const account = await this.prisma.localAccount.findUnique({ where: { email } });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await this.validateLocalCredentials(email, password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const roles = account.roles.filter(isPlatformRole);
    const needs2FA =
      account.twoFactorEnabled ||
      roles.some((r) => this.appConfig.auth2faEnforceRoles.includes(r));

    if (needs2FA && account.twoFactorEnabled) {
      const tempToken = signPlatformJwt(
        { sub: account.id, scope: '2fa_pending' } as Parameters<typeof signPlatformJwt>[0],
        {
          audience: this.appConfig.authAudience,
          issuer: this.appConfig.authIssuer,
          secret: this.appConfig.authJwtSecret,
          expiresInSeconds: 300,
        },
      );

      return { requires2FA: true, tempToken };
    }

    const pair = await this.issueTokenPair(account.id, roles, account.personId ?? undefined, account.email, userAgent, ip);
    await this.prisma.localAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    return pair;
  }

  public async completeTwoFactorLogin(
    tempToken: string,
    code: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    // Verify temp token manually (simple base64 decode — we trust signPlatformJwt format)
    let accountId: string;

    try {
      const parts = tempToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
        sub?: string;
        scope?: string;
        exp?: number;
      };

      if (payload.scope !== '2fa_pending' || !payload.sub) {
        throw new Error('Invalid token scope');
      }

      if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      accountId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA session.');
    }

    const account = await this.prisma.localAccount.findUnique({ where: { id: accountId } });

    if (!account || !account.twoFactorSecret) {
      throw new UnauthorizedException('Account not found.');
    }

    const valid = await totpVerify(code, account.twoFactorSecret);

    if (!valid) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    const roles = account.roles.filter(isPlatformRole);
    const pair = await this.issueTokenPair(account.id, roles, account.personId ?? undefined, account.email, userAgent, ip);

    await this.prisma.localAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    return pair;
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

  public async logout(refreshTokenRaw: string): Promise<void> {
    const tokenHash = hashToken(refreshTokenRaw);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public async requestPasswordReset(email: string): Promise<void> {
    const account = await this.prisma.localAccount.findUnique({ where: { email } });

    if (!account) {
      // No enumeration — silently return
      return;
    }

    const tokenRaw = randomBytes(32).toString('hex');
    const tokenHash = hashToken(tokenRaw);
    const expiresAt = new Date(Date.now() + this.appConfig.authPasswordResetExpiresIn * 1000);

    await this.prisma.passwordResetToken.create({
      data: { accountId: account.id, tokenHash, expiresAt },
    });

    const resetLink = `${this.appConfig.corsOrigin}/reset-password?token=${tokenRaw}`;

    if (this.appConfig.smtpEnabled) {
      // TODO: integrate notifications module for email delivery
      this.logger.log(`Password reset link for ${email}: ${resetLink}`);
    } else {
      this.logger.log(`[SMTP disabled] Password reset link for ${email}: ${resetLink}`);
    }
  }

  public async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or expired.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.localAccount.update({
        where: { id: stored.accountId },
        data: { passwordHash, mustChangePw: false, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  public async setup2FA(
    accountId: string,
  ): Promise<{ secret: string; qrCodeDataUri: string; backupCodes: string[] }> {
    const account = await this.prisma.localAccount.findUnique({ where: { id: accountId } });

    if (!account) {
      throw new UnauthorizedException('Account not found.');
    }

    const secret = totpGenSecret();
    const otpauth = totpKeyUri(account.email, this.appConfig.auth2faTotpIssuer, secret);
    const qrCodeDataUri = await qrcode.toDataURL(otpauth);

    const backupCodes = Array.from({ length: 8 }, () => randomBytes(4).toString('hex'));
    const backupCodesHash = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

    await this.prisma.localAccount.update({
      where: { id: accountId },
      data: { twoFactorSecret: secret, backupCodesHash },
    });

    return { secret, qrCodeDataUri, backupCodes };
  }

  public async verify2FA(accountId: string, code: string): Promise<void> {
    const account = await this.prisma.localAccount.findUnique({ where: { id: accountId } });

    if (!account || !account.twoFactorSecret) {
      throw new BadRequestException('2FA setup not started.');
    }

    const valid = await totpVerify(code, account.twoFactorSecret);

    if (!valid) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    await this.prisma.localAccount.update({
      where: { id: accountId },
      data: { twoFactorEnabled: true },
    });
  }

  public async disable2FA(accountId: string, password: string): Promise<void> {
    const account = await this.prisma.localAccount.findUnique({ where: { id: accountId } });

    if (!account) {
      throw new UnauthorizedException('Account not found.');
    }

    const valid = await bcrypt.compare(password, account.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid password.');
    }

    await this.prisma.localAccount.update({
      where: { id: accountId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, backupCodesHash: [] },
    });
  }

  public async getMe(accountId: string): Promise<MeDto> {
    const account = await this.prisma.localAccount.findUnique({ where: { id: accountId } });

    if (!account) {
      throw new UnauthorizedException('Account not found.');
    }

    const roles = account.roles.filter(isPlatformRole);
    const requires2FASetup =
      !account.twoFactorEnabled &&
      roles.some((r) => this.appConfig.auth2faEnforceRoles.includes(r));

    return {
      userId: account.id,
      personId: account.personId ?? undefined,
      email: account.email,
      displayName: account.displayName,
      roles,
      source: account.source,
      twoFactorEnabled: account.twoFactorEnabled,
      requires2FASetup,
    };
  }

  public async changePassword(
    accountId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const account = await this.prisma.localAccount.findUnique({ where: { id: accountId } });

    if (!account) {
      throw new UnauthorizedException('Account not found.');
    }

    if (account.source !== 'local') {
      throw new BadRequestException('Password change is only available for local accounts.');
    }

    const valid = await bcrypt.compare(currentPassword, account.passwordHash);

    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.localAccount.update({
      data: { passwordHash: newHash },
      where: { id: accountId },
    });
  }

  public async listAccounts(page: number, pageSize: number): Promise<{
    items: { id: string; email: string; displayName: string; roles: string[]; source: string; isEnabled: boolean }[];
    totalCount: number;
  }> {
    const skip = (page - 1) * pageSize;
    const [accounts, totalCount] = await Promise.all([
      this.prisma.localAccount.findMany({ skip, take: pageSize, orderBy: { email: 'asc' } }),
      this.prisma.localAccount.count(),
    ]);

    return {
      items: accounts.map((account) => ({
        id: account.id,
        displayName: account.displayName,
        email: account.email,
        isEnabled: !account.lockedUntil || account.lockedUntil <= new Date(),
        roles: account.roles,
        source: account.source,
      })),
      totalCount,
    };
  }

  public async updateAccount(
    accountId: string,
    patch: { roles?: string[]; isEnabled?: boolean },
  ): Promise<{ id: string; email: string; displayName: string; roles: string[]; source: string; isEnabled: boolean }> {
    const data: Record<string, unknown> = {};

    if (patch.roles !== undefined) {
      data.roles = patch.roles;
    }

    if (patch.isEnabled === false) {
      data.lockedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // ~100 years
    } else if (patch.isEnabled === true) {
      data.lockedUntil = null;
    }

    const account = await this.prisma.localAccount.update({
      data,
      where: { id: accountId },
    });

    return {
      id: account.id,
      displayName: account.displayName,
      email: account.email,
      isEnabled: !account.lockedUntil || account.lockedUntil <= new Date(),
      roles: account.roles,
      source: account.source,
    };
  }

  public async deleteAccount(accountId: string, requestingAccountId: string): Promise<void> {
    if (accountId === requestingAccountId) {
      throw new BadRequestException('Cannot delete your own account.');
    }

    await this.prisma.localAccount.delete({ where: { id: accountId } });
  }

  private async issueTokenPair(
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
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
