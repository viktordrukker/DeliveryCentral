import { createHash, randomBytes } from 'node:crypto';

import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfig,
  ) {}

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

    this.validatePasswordComplexity(newPassword);

    const newHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.localAccount.update({
      data: { passwordHash: newHash },
      where: { id: accountId },
    });
  }

  public async requestPasswordReset(email: string): Promise<void> {
    const account = await this.prisma.localAccount.findUnique({ where: { email } });

    if (!account) {
      // No enumeration — silently return
      return;
    }

    const tokenRaw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(tokenRaw).digest('hex');
    const expiresAt = new Date(Date.now() + this.appConfig.authPasswordResetExpiresIn * 1000);

    await this.prisma.passwordResetToken.create({
      data: { accountId: account.id, tokenHash, expiresAt },
    });

    // Reset link is the future shape of the email body — kept out-of-band as
    // a string here so the integration in the notifications module is a single
    // string substitution. Prefix `_` keeps the lint rule happy until then.
    const _resetLink = `${this.appConfig.corsOrigin}/reset-password?token=${tokenRaw}`;
    void _resetLink;

    if (this.appConfig.smtpEnabled) {
      // TODO: integrate notifications module for email delivery
      this.logger.log(`Password reset requested for ${email}. Token hash: ${tokenHash.slice(0, 8)}…`);
    } else {
      this.logger.log(`[SMTP disabled] Password reset requested for ${email}. Token hash: ${tokenHash.slice(0, 8)}…`);
    }
  }

  public async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
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

  private validatePasswordComplexity(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters.');
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.');
    }
  }
}
