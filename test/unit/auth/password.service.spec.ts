import * as bcrypt from 'bcrypt';

import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { PasswordService } from '@src/modules/auth/password.service';

import { createPrismaServiceStub } from '../../helpers/db/mock-prisma-client';

const KNOWN_PASSWORD = 'CorrectHorse!1';

function buildAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    authPasswordResetExpiresIn: 3600,
    smtpEnabled: false,
    corsOrigin: 'https://app.example.test',
    ...overrides,
  } as unknown as AppConfig;
}

describe('PasswordService', () => {
  let knownHash: string;

  beforeAll(async () => {
    knownHash = await bcrypt.hash(KNOWN_PASSWORD, 12);
  });

  describe('changePassword', () => {
    it('rejects with UnauthorizedException when account not found', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.changePassword('missing', 'old', 'NewPass!2')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects with BadRequestException for non-local accounts', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            source: 'azure_ad',
            passwordHash: 'irrelevant',
          }),
        },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.changePassword('a1', 'x', 'NewPass!2')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects when current password is wrong', async () => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            source: 'local',
            passwordHash: knownHash,
          }),
        },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.changePassword('a1', 'WrongPassword!1', 'NewPass!23')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it.each([
      ['short', 'too short'],
      ['lowercaseonly1!', 'no uppercase'],
      ['UPPERCASEONLY1!', 'no lowercase'],
      ['NoDigitsHere!', 'no digit'],
      ['NoSpecial1abc', 'no special char'],
    ])('rejects new password %s (%s)', async (newPassword) => {
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            source: 'local',
            passwordHash: knownHash,
          }),
        },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.changePassword('a1', KNOWN_PASSWORD, newPassword)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('hashes and persists the new password on the happy path', async () => {
      const update = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            source: 'local',
            passwordHash: knownHash,
          }),
          update,
        },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await svc.changePassword('a1', KNOWN_PASSWORD, 'AnotherPass!2');

      expect(update).toHaveBeenCalledTimes(1);
      const callArg = update.mock.calls[0][0];
      expect(callArg.where).toEqual({ id: 'a1' });
      expect(callArg.data.passwordHash).toEqual(expect.any(String));
      expect(callArg.data.passwordHash).not.toBe('AnotherPass!2');
      // Verify the persisted hash actually matches the new password.
      const verified = await bcrypt.compare('AnotherPass!2', callArg.data.passwordHash);
      expect(verified).toBe(true);
    });
  });

  describe('requestPasswordReset', () => {
    it('silently no-ops for unknown email (no user enumeration)', async () => {
      const create = jest.fn();
      const prisma = createPrismaServiceStub({
        localAccount: { findUnique: jest.fn().mockResolvedValue(null) },
        passwordResetToken: { create },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.requestPasswordReset('nobody@example.test')).resolves.toBeUndefined();
      expect(create).not.toHaveBeenCalled();
    });

    it('creates a hashed reset token for an existing account', async () => {
      const create = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({ id: 'a1', email: 'real@example.test' }),
        },
        passwordResetToken: { create },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await svc.requestPasswordReset('real@example.test');

      expect(create).toHaveBeenCalledTimes(1);
      const data = create.mock.calls[0][0].data;
      expect(data.accountId).toBe('a1');
      // Hash, not raw token; sha256 hex = 64 chars.
      expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(data.expiresAt).toBeInstanceOf(Date);
      expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('confirmPasswordReset', () => {
    it('rejects an unknown token', async () => {
      const prisma = createPrismaServiceStub({
        passwordResetToken: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.confirmPasswordReset('bad', 'NewPass!23')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an already-used token', async () => {
      const prisma = createPrismaServiceStub({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            accountId: 'a1',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: new Date(),
          }),
        },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.confirmPasswordReset('reused', 'NewPass!23')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an expired token', async () => {
      const prisma = createPrismaServiceStub({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            accountId: 'a1',
            expiresAt: new Date(Date.now() - 60_000),
            usedAt: null,
          }),
        },
      });
      const svc = new PasswordService(prisma, buildAppConfig());

      await expect(svc.confirmPasswordReset('expired', 'NewPass!23')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('updates account + marks token used in a transaction on the happy path', async () => {
      const accountUpdate = jest.fn().mockReturnValue('account-update-call');
      const tokenUpdate = jest.fn().mockReturnValue('token-update-call');
      const tx = jest.fn().mockResolvedValue([]);
      const prisma = createPrismaServiceStub({
        passwordResetToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 't1',
            accountId: 'a1',
            expiresAt: new Date(Date.now() + 60_000),
            usedAt: null,
          }),
          update: tokenUpdate,
        },
        localAccount: { update: accountUpdate },
      });
      // Override the default $transaction stub to capture the array.
      (prisma as unknown as { $transaction: jest.Mock }).$transaction = tx;
      const svc = new PasswordService(prisma, buildAppConfig());

      await svc.confirmPasswordReset('valid-token', 'NewPass!23');

      expect(accountUpdate).toHaveBeenCalledTimes(1);
      expect(tokenUpdate).toHaveBeenCalledTimes(1);
      // Both calls were composed into a single $transaction([...])
      expect(tx).toHaveBeenCalledWith(['account-update-call', 'token-update-call']);
      // Account update clears lockout state (failedLoginAttempts + lockedUntil reset).
      const accountData = accountUpdate.mock.calls[0][0].data;
      expect(accountData.failedLoginAttempts).toBe(0);
      expect(accountData.lockedUntil).toBeNull();
      expect(accountData.passwordHash).toEqual(expect.any(String));
    });
  });
});
