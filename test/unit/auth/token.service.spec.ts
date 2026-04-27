import { UnauthorizedException } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { hashToken, TokenService } from '@src/modules/auth/token.service';
import { verifyPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';

import { createPrismaServiceStub } from '../../helpers/db/mock-prisma-client';

function buildAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    authAudience: 'dc-api',
    authIssuer: 'dc-test',
    authJwtSecret: 'unit-test-secret-do-not-use-in-prod',
    authAccessTokenExpiresIn: 900,
    authRefreshTokenExpiresIn: 604800,
    ...overrides,
  } as unknown as AppConfig;
}

describe('TokenService', () => {
  describe('issueTokenPair', () => {
    it('signs a verifiable access token and persists a hashed refresh token', async () => {
      const create = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        refreshToken: { create },
      });
      const config = buildAppConfig();
      const svc = new TokenService(prisma, config);

      const pair = await svc.issueTokenPair(
        'account-1',
        ['admin', 'employee'],
        'person-9',
        'admin@example.test',
        'Mozilla/5.0',
        '127.0.0.1',
      );

      expect(pair.accessToken.split('.')).toHaveLength(3);
      // Refresh token is 32 random bytes hex-encoded → 64 chars.
      expect(pair.refreshToken).toMatch(/^[0-9a-f]{64}$/);

      // The access token verifies against the same config and exposes the claims.
      const claims = verifyPlatformJwt(pair.accessToken, {
        audience: config.authAudience,
        issuer: config.authIssuer,
        secret: config.authJwtSecret,
      });
      expect(claims.userId).toBe('account-1');
      expect(claims.personId).toBe('person-9');
      expect(claims.roles).toEqual(['admin', 'employee']);
      // email isn't on the typed claims interface; decode the raw payload to
      // verify it's persisted in the JWT for downstream consumers.
      const rawPayload = JSON.parse(
        Buffer.from(pair.accessToken.split('.')[1], 'base64url').toString('utf8'),
      );
      expect(rawPayload.email).toBe('admin@example.test');

      // refreshToken row stores a sha256 of the raw token, not the raw value itself.
      expect(create).toHaveBeenCalledTimes(1);
      const data = create.mock.calls[0][0].data;
      expect(data.accountId).toBe('account-1');
      expect(data.tokenHash).toBe(hashToken(pair.refreshToken));
      expect(data.tokenHash).not.toBe(pair.refreshToken);
      expect(data.userAgent).toBe('Mozilla/5.0');
      expect(data.ipAddress).toBe('127.0.0.1');
      expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('refresh', () => {
    it('rejects an unknown refresh token', async () => {
      const prisma = createPrismaServiceStub({
        refreshToken: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const svc = new TokenService(prisma, buildAppConfig());

      await expect(svc.refresh('not-a-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a revoked refresh token (replay protection)', async () => {
      const prisma = createPrismaServiceStub({
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'rt1',
            accountId: 'a1',
            revokedAt: new Date(Date.now() - 1000),
            expiresAt: new Date(Date.now() + 60_000),
          }),
        },
      });
      const svc = new TokenService(prisma, buildAppConfig());

      await expect(svc.refresh('revoked')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an expired refresh token', async () => {
      const prisma = createPrismaServiceStub({
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'rt1',
            accountId: 'a1',
            revokedAt: null,
            expiresAt: new Date(Date.now() - 1000),
          }),
        },
      });
      const svc = new TokenService(prisma, buildAppConfig());

      await expect(svc.refresh('expired')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates the token: revokes the old row and issues a fresh pair', async () => {
      const tokenUpdate = jest.fn().mockResolvedValue({});
      const tokenCreate = jest.fn().mockResolvedValue({});
      const prisma = createPrismaServiceStub({
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'rt1',
            accountId: 'a1',
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
          }),
          update: tokenUpdate,
          create: tokenCreate,
        },
        localAccount: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'a1',
            email: 'user@example.test',
            personId: 'p1',
            roles: ['employee'],
          }),
        },
      });
      const svc = new TokenService(prisma, buildAppConfig());

      const pair = await svc.refresh('valid-old-token');

      // Old row revoked
      expect(tokenUpdate).toHaveBeenCalledTimes(1);
      expect(tokenUpdate.mock.calls[0][0].where).toEqual({ id: 'rt1' });
      expect(tokenUpdate.mock.calls[0][0].data.revokedAt).toBeInstanceOf(Date);
      // New row created
      expect(tokenCreate).toHaveBeenCalledTimes(1);
      expect(tokenCreate.mock.calls[0][0].data.accountId).toBe('a1');
      // New pair returned
      expect(pair.refreshToken).not.toBe('valid-old-token');
      expect(pair.accessToken.split('.')).toHaveLength(3);
    });

    it('rejects when the underlying account has been deleted between issue and refresh', async () => {
      const prisma = createPrismaServiceStub({
        refreshToken: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'rt1',
            accountId: 'a1',
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
          }),
        },
        localAccount: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const svc = new TokenService(prisma, buildAppConfig());

      await expect(svc.refresh('orphan')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('revokeRefreshToken', () => {
    it('marks the matching un-revoked row as revoked', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const prisma = createPrismaServiceStub({
        refreshToken: { updateMany },
      });
      const svc = new TokenService(prisma, buildAppConfig());

      await svc.revokeRefreshToken('some-token');

      expect(updateMany).toHaveBeenCalledTimes(1);
      const args = updateMany.mock.calls[0][0];
      expect(args.where.tokenHash).toBe(hashToken('some-token'));
      expect(args.where.revokedAt).toBeNull();
      expect(args.data.revokedAt).toBeInstanceOf(Date);
    });

    it('is a no-op for an unknown token (no error thrown)', async () => {
      const updateMany = jest.fn().mockResolvedValue({ count: 0 });
      const prisma = createPrismaServiceStub({
        refreshToken: { updateMany },
      });
      const svc = new TokenService(prisma, buildAppConfig());

      await expect(svc.revokeRefreshToken('unknown')).resolves.toBeUndefined();
    });
  });

  describe('signTempToken', () => {
    it('signs a JWT carrying the scope claim with a short TTL', () => {
      const config = buildAppConfig();
      const svc = new TokenService(createPrismaServiceStub(), config);

      const token = svc.signTempToken('account-1', '2fa_pending', 300);

      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      expect(payload.sub).toBe('account-1');
      expect(payload.scope).toBe('2fa_pending');
      // Issued + expires-in respected (300s ± clock skew of a few seconds).
      const ttl = payload.exp - payload.iat;
      expect(ttl).toBe(300);
    });
  });
});
