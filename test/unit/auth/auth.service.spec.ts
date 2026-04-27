import * as bcrypt from 'bcrypt';

import { UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { AuthService } from '@src/modules/auth/auth.service';
import { TokenService } from '@src/modules/auth/token.service';

import { createPrismaServiceStub } from '../../helpers/db/mock-prisma-client';

const KNOWN_PASSWORD = 'CorrectHorse!1';

function buildAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    authMaxFailedAttempts: 5,
    authLockoutDurationMinutes: 15,
    auth2faEnforceRoles: [],
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

describe('AuthService', () => {
  let knownHash: string;

  beforeAll(async () => {
    knownHash = await bcrypt.hash(KNOWN_PASSWORD, 12);
  });

  describe('validateLocalCredentials', () => {
    it('returns null for an unknown email (and still runs bcrypt to avoid timing leaks)', async () => {
      const findUnique = jest.fn().mockResolvedValue(null);
      const prisma = createPrismaServiceStub({ localAccount: { findUnique } });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      const start = Date.now();
      const result = await svc.validateLocalCredentials('nobody@example.test', 'wrong');
      const elapsed = Date.now() - start;

      expect(result).toBeNull();
      // Constant-time guard: bcrypt.compare runs even on miss. cost-12 takes >50ms on
      // even fast machines; sanity-check the dummy hash path took non-trivial time.
      expect(elapsed).toBeGreaterThan(20);
    });

    it('throws when the account is currently locked out', async () => {
      const findUnique = jest.fn().mockResolvedValue({
        id: 'a1',
        email: 'u@example.test',
        passwordHash: knownHash,
        lockedUntil: new Date(Date.now() + 60_000),
        failedLoginAttempts: 3,
      });
      const prisma = createPrismaServiceStub({ localAccount: { findUnique } });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      await expect(
        svc.validateLocalCredentials('u@example.test', KNOWN_PASSWORD),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('records a failed attempt without locking on first miss', async () => {
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'u@example.test',
            passwordHash: knownHash,
            lockedUntil: null,
            failedLoginAttempts: 0,
          }),
          update,
        },
      });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      const result = await svc.validateLocalCredentials('u@example.test', 'wrong-password');

      expect(result).toBeNull();
      expect(update).toHaveBeenCalledTimes(1);
      const data = update.mock.calls[0][0].data;
      expect(data.failedLoginAttempts).toBe(1);
      expect(data.lockedUntil).toBeUndefined();
    });

    it('locks the account when the failed-attempt count reaches authMaxFailedAttempts', async () => {
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'u@example.test',
            passwordHash: knownHash,
            lockedUntil: null,
            failedLoginAttempts: 4,
          }),
          update,
        },
      });
      const svc = new AuthService(
        prisma,
        buildAppConfig({ authMaxFailedAttempts: 5, authLockoutDurationMinutes: 10 }),
        buildTokenStub(),
      );

      await svc.validateLocalCredentials('u@example.test', 'still-wrong');

      const data = update.mock.calls[0][0].data;
      expect(data.failedLoginAttempts).toBe(5);
      expect(data.lockedUntil).toBeInstanceOf(Date);
      const lockMsAhead = (data.lockedUntil as Date).getTime() - Date.now();
      expect(lockMsAhead).toBeGreaterThan(9 * 60_000);
      expect(lockMsAhead).toBeLessThan(11 * 60_000);
    });

    it('clears the lockout counter on a successful match', async () => {
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'u@example.test',
            passwordHash: knownHash,
            lockedUntil: null,
            failedLoginAttempts: 2,
          }),
          update,
        },
      });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      const result = await svc.validateLocalCredentials('u@example.test', KNOWN_PASSWORD);

      expect(result).toEqual({ id: 'a1', email: 'u@example.test' });
      expect(update.mock.calls[0][0].data).toEqual({ failedLoginAttempts: 0, lockedUntil: null });
    });
  });

  describe('login', () => {
    it('issues a token pair on the happy path', async () => {
      const update = jest.fn().mockResolvedValue({});
      const account = {
        id: 'a1',
        email: 'u@example.test',
        passwordHash: knownHash,
        personId: 'p1',
        roles: ['employee'],
        twoFactorEnabled: false,
        lockedUntil: null,
        failedLoginAttempts: 0,
      };
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue(account),
          update,
        },
      });
      const tokenStub = buildTokenStub();
      const svc = new AuthService(prisma, buildAppConfig(), tokenStub);

      const result = await svc.login('u@example.test', KNOWN_PASSWORD, 'curl/8.0', '10.0.0.1');

      expect(result).toEqual({ accessToken: 'a.b.c', refreshToken: 'r' });
      expect(tokenStub.issueTokenPair).toHaveBeenCalledWith(
        'a1',
        ['employee'],
        'p1',
        'u@example.test',
        'curl/8.0',
        '10.0.0.1',
      );
      // lastLoginAt timestamp gets set
      const lastLoginUpdate = update.mock.calls.find((c) => 'lastLoginAt' in (c[0].data ?? {}));
      expect(lastLoginUpdate).toBeDefined();
    });

    it('returns a 2FA-pending token when the account has 2FA enabled', async () => {
      const account = {
        id: 'a1',
        email: 'u@example.test',
        passwordHash: knownHash,
        personId: 'p1',
        roles: ['admin'],
        twoFactorEnabled: true,
        lockedUntil: null,
        failedLoginAttempts: 0,
      };
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue(account),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      const tokenStub = buildTokenStub();
      const svc = new AuthService(prisma, buildAppConfig(), tokenStub);

      const result = await svc.login('u@example.test', KNOWN_PASSWORD);

      expect(result).toEqual({ requires2FA: true, tempToken: 'temp.jwt.token' });
      expect(tokenStub.signTempToken).toHaveBeenCalledWith('a1', '2fa_pending', 300);
      expect(tokenStub.issueTokenPair).not.toHaveBeenCalled();
    });

    it('rejects with 401 for invalid credentials', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'u@example.test',
            passwordHash: knownHash,
            lockedUntil: null,
            failedLoginAttempts: 0,
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      await expect(svc.login('u@example.test', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('getMe', () => {
    it('returns the principal profile for a valid account', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'u@example.test',
            displayName: 'User',
            personId: 'p1',
            source: 'local',
            roles: ['employee', 'not-a-real-role'],
            twoFactorEnabled: false,
          }),
        },
      });
      const svc = new AuthService(
        prisma,
        buildAppConfig({ auth2faEnforceRoles: ['admin'] }),
        buildTokenStub(),
      );

      const me = await svc.getMe('a1');

      expect(me.userId).toBe('a1');
      expect(me.email).toBe('u@example.test');
      expect(me.personId).toBe('p1');
      // Unknown role is filtered out by isPlatformRole
      expect(me.roles).toEqual(['employee']);
      // Not enforced for employees
      expect(me.requires2FASetup).toBe(false);
    });

    it('flags requires2FASetup when the role demands 2FA but it is not enabled', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'admin@example.test',
            displayName: 'Admin',
            personId: null,
            source: 'local',
            roles: ['admin'],
            twoFactorEnabled: false,
          }),
        },
      });
      const svc = new AuthService(
        prisma,
        buildAppConfig({ auth2faEnforceRoles: ['admin'] }),
        buildTokenStub(),
      );

      const me = await svc.getMe('a1');
      expect(me.requires2FASetup).toBe(true);
    });

    it('throws when the account does not exist', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      await expect(svc.getMe('missing')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('listAccounts', () => {
    it('returns paginated accounts with isEnabled derived from lockedUntil', async () => {
      const futureLock = new Date(Date.now() + 1_000_000);
      const pastLock = new Date(Date.now() - 1_000_000);
      const accounts = [
        { id: 'a1', email: 'one@x', displayName: 'One', roles: ['employee'], source: 'local', lockedUntil: null },
        { id: 'a2', email: 'two@x', displayName: 'Two', roles: ['employee'], source: 'local', lockedUntil: futureLock },
        { id: 'a3', email: 'three@x', displayName: 'Three', roles: ['employee'], source: 'local', lockedUntil: pastLock },
      ];
      const prisma = createPrismaServiceStub({
        localAccount: {
          findMany: jest.fn().mockResolvedValue(accounts),
          count: jest.fn().mockResolvedValue(42),
        },
      });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      const result = await svc.listAccounts(2, 10);

      expect(result.totalCount).toBe(42);
      expect(result.items).toHaveLength(3);
      expect(result.items[0].isEnabled).toBe(true);  // null lockedUntil
      expect(result.items[1].isEnabled).toBe(false); // future lockedUntil
      expect(result.items[2].isEnabled).toBe(true);  // expired lockedUntil
      // Pagination args threaded correctly
      expect(prisma.localAccount.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('deleteAccount', () => {
    it('refuses to delete the requester own account', async () => {
      const svc = new AuthService(createPrismaServiceStub(), buildAppConfig(), buildTokenStub());

      await expect(svc.deleteAccount('a1', 'a1')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('deletes a different account', async () => {
      const del = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({ localAccount: { delete: del } });
      const svc = new AuthService(prisma, buildAppConfig(), buildTokenStub());

      await svc.deleteAccount('a2', 'a1');
      expect(del).toHaveBeenCalledWith({ where: { id: 'a2' } });
    });
  });
});
