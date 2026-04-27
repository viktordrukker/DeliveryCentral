import * as bcrypt from 'bcrypt';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';

// Deterministic mocks for otplib + qrcode so verify/setup behavior is testable.
// The audit (TEST-01/06) calls these out specifically as the only legitimate
// mocks in the auth specs — DB stays mocked too (these are unit tests), but
// otplib and qrcode aren't pure functions and can't be exercised against
// hardcoded fixtures otherwise.
jest.mock('otplib', () => {
  class FakeTOTP {
    private readonly secret?: string;
    public constructor(opts: { secret?: string }) {
      this.secret = opts.secret;
    }
    public generateSecret(): string {
      return 'FAKETOTPSECRET2BASE32';
    }
    public toURI({ label, issuer }: { label: string; issuer: string }): string {
      return `otpauth://totp/${issuer}:${label}?secret=${this.secret}&issuer=${issuer}`;
    }
    public async verify(token: string): Promise<{ valid: boolean }> {
      return { valid: token === '123456' };
    }
  }
  return {
    TOTP: FakeTOTP,
    NobleCryptoPlugin: class {},
    ScureBase32Plugin: class {},
  };
});

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKEDATAURI'),
}));

// otplib's TOTP constructor in the real impl takes opts as `new TOTP(opts)` — our mock
// reads `opts.secret`, but the service builds the verifier via `new TOTP({...})({...})`,
// so we need to mimic the constructor API faithfully. The mock above does.

import { AppConfig } from '@src/shared/config/app-config';
import { TokenService } from '@src/modules/auth/token.service';
import { TwoFactorService } from '@src/modules/auth/two-factor.service';
import { signPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';

import { createPrismaServiceStub } from '../../helpers/db/mock-prisma-client';

const KNOWN_PASSWORD = 'CorrectHorse!1';

function buildAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    auth2faTotpIssuer: 'DeliveryCentral',
    authAudience: 'dc-api',
    authIssuer: 'dc-test',
    authJwtSecret: 'unit-test-secret-do-not-use-in-prod',
    ...overrides,
  } as unknown as AppConfig;
}

function buildTokenStub(): TokenService {
  return {
    issueTokenPair: jest.fn().mockResolvedValue({ accessToken: 'a.b.c', refreshToken: 'r' }),
    signTempToken: jest.fn().mockReturnValue('temp.jwt.token'),
    refresh: jest.fn(),
    revokeRefreshToken: jest.fn(),
  } as unknown as TokenService;
}

describe('TwoFactorService', () => {
  let knownHash: string;

  beforeAll(async () => {
    knownHash = await bcrypt.hash(KNOWN_PASSWORD, 12);
  });

  describe('setup', () => {
    it('generates secret + QR + 8 backup codes and persists secret + hashed backups', async () => {
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', email: 'u@example.test' }),
          update,
        },
      });
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      const result = await svc.setup('a1');

      expect(result.secret).toBe('FAKETOTPSECRET2BASE32');
      expect(result.qrCodeDataUri).toMatch(/^data:image\/png;base64,/);
      expect(result.backupCodes).toHaveLength(8);
      // Each backup code is 6 random bytes hex-encoded → 12 chars
      result.backupCodes.forEach((c) => expect(c).toMatch(/^[0-9a-f]{12}$/));

      const data = update.mock.calls[0][0].data;
      expect(data.twoFactorSecret).toBe('FAKETOTPSECRET2BASE32');
      // backupCodesHash stored as bcrypt hashes, not raw codes.
      expect(data.backupCodesHash).toHaveLength(8);
      data.backupCodesHash.forEach((h: string, i: number) => {
        expect(h).toMatch(/^\$2[ab]\$/);
        expect(h).not.toBe(result.backupCodes[i]);
      });
    });

    it('throws when account is missing', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      await expect(svc.setup('missing')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('verify', () => {
    it('rejects when the account has not started setup (no secret on file)', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', twoFactorSecret: null }),
        },
      });
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      await expect(svc.verify('a1', '123456')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid TOTP code', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: 'a1', twoFactorSecret: 'ANY' }),
        },
      });
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      await expect(svc.verify('a1', '999999')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('flips twoFactorEnabled=true on a valid TOTP code', async () => {
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', twoFactorSecret: 'ANY' }),
          update,
        },
      });
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      await svc.verify('a1', '123456');

      expect(update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { twoFactorEnabled: true },
      });
    });
  });

  describe('disable', () => {
    it('rejects when the password does not match', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', passwordHash: knownHash }),
        },
      });
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      await expect(svc.disable('a1', 'wrong-password')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('clears all 2FA state on a correct password', async () => {
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', passwordHash: knownHash }),
          update,
        },
      });
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      await svc.disable('a1', KNOWN_PASSWORD);

      expect(update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { twoFactorEnabled: false, twoFactorSecret: null, backupCodesHash: [] },
      });
    });
  });

  describe('completeTwoFactorLogin', () => {
    it('rejects an invalid temp token', async () => {
      const prisma = createPrismaServiceStub();
      const svc = new TwoFactorService(prisma, buildAppConfig(), buildTokenStub());

      await expect(svc.completeTwoFactorLogin('not.a.token', '123456')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a temp token whose scope is not 2fa_pending', async () => {
      const config = buildAppConfig();
      const wrongScope = signPlatformJwt(
        // scope mismatch — service should reject
        { sub: 'a1', scope: 'something_else' } as Parameters<typeof signPlatformJwt>[0],
        {
          audience: config.authAudience,
          issuer: config.authIssuer,
          secret: config.authJwtSecret,
          expiresInSeconds: 300,
        },
      );
      const prisma = createPrismaServiceStub();
      const svc = new TwoFactorService(prisma, config, buildTokenStub());

      await expect(svc.completeTwoFactorLogin(wrongScope, '123456')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues a token pair on a valid temp token + matching TOTP code', async () => {
      const config = buildAppConfig();
      const tempToken = signPlatformJwt(
        { sub: 'a1', scope: '2fa_pending' } as Parameters<typeof signPlatformJwt>[0],
        {
          audience: config.authAudience,
          issuer: config.authIssuer,
          secret: config.authJwtSecret,
          expiresInSeconds: 300,
        },
      );
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'u@example.test',
            personId: 'p1',
            roles: ['admin'],
            twoFactorSecret: 'ANY',
          }),
          update,
        },
      });
      const tokenStub = buildTokenStub();
      const svc = new TwoFactorService(prisma, config, tokenStub);

      const pair = await svc.completeTwoFactorLogin(tempToken, '123456', 'curl/8.0', '10.0.0.1');

      expect(pair).toEqual({ accessToken: 'a.b.c', refreshToken: 'r' });
      expect(tokenStub.issueTokenPair).toHaveBeenCalledWith(
        'a1',
        ['admin'],
        'p1',
        'u@example.test',
        'curl/8.0',
        '10.0.0.1',
      );
      // lastLoginAt timestamp gets set
      expect(update.mock.calls[0][0].data.lastLoginAt).toBeInstanceOf(Date);
    });

    it('rejects a wrong TOTP code even with a valid temp token', async () => {
      const config = buildAppConfig();
      const tempToken = signPlatformJwt(
        { sub: 'a1', scope: '2fa_pending' } as Parameters<typeof signPlatformJwt>[0],
        {
          audience: config.authAudience,
          issuer: config.authIssuer,
          secret: config.authJwtSecret,
          expiresInSeconds: 300,
        },
      );
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'u@example.test',
            personId: null,
            roles: ['employee'],
            twoFactorSecret: 'ANY',
          }),
        },
      });
      const svc = new TwoFactorService(prisma, config, buildTokenStub());

      await expect(svc.completeTwoFactorLogin(tempToken, '999999')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
