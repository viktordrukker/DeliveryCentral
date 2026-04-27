import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { isPlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { TokenService } from './token.service';
import type { TokenPair } from './token.service';
import type { MeDto } from './dto/me.dto';

// Pre-computed bcrypt hash of a dummy password — used for constant-time login to prevent email enumeration.
// Actual hash value doesn't matter; it just needs the same cost factor (12) as real password hashes.
const DUMMY_PASSWORD_HASH = '$2b$12$0000000000000000000000000000000000000000000000000000';

export type LoginResult =
  | { accessToken: string; refreshToken: string }
  | { requires2FA: true; tempToken: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfig,
    private readonly tokenService: TokenService,
  ) {}

  public async validateLocalCredentials(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string } | null> {
    // PERF-03: only load fields used by the credential check; skips twoFactorSecret/backupCodesHash etc.
    const account = await this.prisma.localAccount.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        lockedUntil: true,
        failedLoginAttempts: true,
      },
    });

    // Constant-time behavior: always run bcrypt.compare to prevent timing-based email enumeration.
    const passwordHash = account?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const valid = await bcrypt.compare(password, passwordHash);

    if (!account) {
      return null;
    }

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Account locked until ${account.lockedUntil.toISOString()}`,
      );
    }

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
    // validateLocalCredentials runs bcrypt.compare in constant time regardless of whether the account exists.
    const valid = await this.validateLocalCredentials(email, password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const account = await this.prisma.localAccount.findUnique({ where: { email } });

    if (!account) {
      // Should not occur after a successful validate, but guards against race with account deletion.
      throw new UnauthorizedException('Invalid credentials.');
    }

    const roles = account.roles.filter(isPlatformRole);
    const needs2FA =
      account.twoFactorEnabled ||
      roles.some((r) => this.appConfig.auth2faEnforceRoles.includes(r));

    if (needs2FA && account.twoFactorEnabled) {
      const tempToken = this.tokenService.signTempToken(account.id, '2fa_pending', 300);
      return { requires2FA: true, tempToken };
    }

    const pair = await this.tokenService.issueTokenPair(account.id, roles, account.personId ?? undefined, account.email, userAgent, ip);
    await this.prisma.localAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    return pair;
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
      throw new UnauthorizedException('Cannot delete your own account.');
    }

    await this.prisma.localAccount.delete({ where: { id: accountId } });
  }
}
