import { randomBytes } from 'node:crypto';

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import * as qrcode from 'qrcode';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { verifyPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';
import { isPlatformRole } from '@src/modules/identity-access/domain/platform-role';

import { TokenService, type TokenPair } from './token.service';

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

@Injectable()
export class TwoFactorService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfig,
    private readonly tokenService: TokenService,
  ) {}

  public async setup(
    accountId: string,
  ): Promise<{ secret: string; qrCodeDataUri: string; backupCodes: string[] }> {
    const account = await this.prisma.localAccount.findUnique({ where: { id: accountId } });

    if (!account) {
      throw new UnauthorizedException('Account not found.');
    }

    const secret = totpGenSecret();
    const otpauth = totpKeyUri(account.email, this.appConfig.auth2faTotpIssuer, secret);
    const qrCodeDataUri = await qrcode.toDataURL(otpauth);

    const backupCodes = Array.from({ length: 8 }, () => randomBytes(6).toString('hex'));
    const backupCodesHash = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));

    await this.prisma.localAccount.update({
      where: { id: accountId },
      data: { twoFactorSecret: secret, backupCodesHash },
    });

    return { secret, qrCodeDataUri, backupCodes };
  }

  public async verify(accountId: string, code: string): Promise<void> {
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

  public async disable(accountId: string, password: string): Promise<void> {
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

  public async completeTwoFactorLogin(
    tempToken: string,
    code: string,
    userAgent?: string,
    ip?: string,
  ): Promise<TokenPair> {
    let accountId: string;

    try {
      const claims = verifyPlatformJwt(tempToken, {
        audience: this.appConfig.authAudience,
        issuer: this.appConfig.authIssuer,
        secret: this.appConfig.authJwtSecret,
      });

      const payloadPart = tempToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as { scope?: string };

      if (payload.scope !== '2fa_pending') {
        throw new Error('Invalid token scope');
      }

      accountId = claims.userId ?? '';
      if (!accountId) throw new Error('Missing subject');
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
    const pair = await this.tokenService.issueTokenPair(account.id, roles, account.personId ?? undefined, account.email, userAgent, ip);

    await this.prisma.localAccount.update({
      where: { id: account.id },
      data: { lastLoginAt: new Date() },
    });

    return pair;
  }
}
