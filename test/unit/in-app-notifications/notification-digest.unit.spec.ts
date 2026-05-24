import { BadRequestException } from '@nestjs/common';
import { DigestSchedule } from '@prisma/client';

import {
  DEFAULT_NOTIFICATION_DIGEST,
  NotificationPreferencesService,
} from '@src/modules/in-app-notifications/application/notification-preferences.service';

interface DigestRow {
  personId: string;
  digestSchedule: DigestSchedule;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursEmailOnly: boolean;
  updatedAt: Date;
}

function fakePrisma() {
  const store = new Map<string, DigestRow>();
  return {
    store,
    prisma: {
      personNotificationDigest: {
        findUnique: jest.fn(async ({ where }: { where: { personId: string } }) => {
          return store.get(where.personId) ?? null;
        }),
        upsert: jest.fn(async ({
          where,
          create,
          update,
        }: {
          where: { personId: string };
          create: Omit<DigestRow, 'updatedAt'>;
          update: Partial<Omit<DigestRow, 'personId'>>;
        }) => {
          const existing = store.get(where.personId);
          const now = new Date();
          if (existing) {
            const next: DigestRow = { ...existing, ...update, updatedAt: now };
            store.set(where.personId, next);
            return next;
          }
          const row: DigestRow = {
            personId: create.personId,
            digestSchedule: create.digestSchedule,
            quietHoursStart: create.quietHoursStart ?? null,
            quietHoursEnd: create.quietHoursEnd ?? null,
            quietHoursEmailOnly: create.quietHoursEmailOnly ?? true,
            updatedAt: now,
          };
          store.set(where.personId, row);
          return row;
        }),
      },
      personNotificationPreference: {
        findMany: jest.fn(async () => [] as unknown[]),
      },
    },
  };
}

const PERSON = 'aaaaaaaa-0000-0000-0000-000000000001';

describe('NotificationPreferencesService — digest + quiet hours', () => {
  describe('getDigestForPerson', () => {
    it('returns defaults when no row exists', async () => {
      const { prisma } = fakePrisma();
      const svc = new NotificationPreferencesService(prisma as never);
      const result = await svc.getDigestForPerson(PERSON);
      expect(result.digestSchedule).toBe(DEFAULT_NOTIFICATION_DIGEST.digestSchedule);
      expect(result.quietHoursStart).toBeNull();
      expect(result.quietHoursEnd).toBeNull();
      expect(result.quietHoursEmailOnly).toBe(DEFAULT_NOTIFICATION_DIGEST.quietHoursEmailOnly);
    });

    it('returns persisted row when present', async () => {
      const { prisma, store } = fakePrisma();
      store.set(PERSON, {
        personId: PERSON,
        digestSchedule: DigestSchedule.WEEKLY_MON_9AM,
        quietHoursStart: '20:00',
        quietHoursEnd: '08:00',
        quietHoursEmailOnly: false,
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });
      const svc = new NotificationPreferencesService(prisma as never);
      const result = await svc.getDigestForPerson(PERSON);
      expect(result.digestSchedule).toBe(DigestSchedule.WEEKLY_MON_9AM);
      expect(result.quietHoursStart).toBe('20:00');
      expect(result.quietHoursEnd).toBe('08:00');
      expect(result.quietHoursEmailOnly).toBe(false);
    });
  });

  describe('upsertDigestForPerson', () => {
    it('creates a row with defaults when no input given', async () => {
      const { prisma, store } = fakePrisma();
      const svc = new NotificationPreferencesService(prisma as never);
      const result = await svc.upsertDigestForPerson(PERSON, {});
      expect(result.digestSchedule).toBe(DigestSchedule.IMMEDIATE);
      expect(result.quietHoursEmailOnly).toBe(true);
      expect(store.has(PERSON)).toBe(true);
    });

    it('persists digestSchedule changes', async () => {
      const { prisma } = fakePrisma();
      const svc = new NotificationPreferencesService(prisma as never);
      const result = await svc.upsertDigestForPerson(PERSON, {
        digestSchedule: DigestSchedule.DAILY_9AM,
      });
      expect(result.digestSchedule).toBe(DigestSchedule.DAILY_9AM);
    });

    it('persists paired quiet-hours start + end', async () => {
      const { prisma } = fakePrisma();
      const svc = new NotificationPreferencesService(prisma as never);
      const result = await svc.upsertDigestForPerson(PERSON, {
        quietHoursStart: '22:00',
        quietHoursEnd: '07:30',
      });
      expect(result.quietHoursStart).toBe('22:00');
      expect(result.quietHoursEnd).toBe('07:30');
    });

    it('rejects half-configured quiet hours (start only)', async () => {
      const { prisma } = fakePrisma();
      const svc = new NotificationPreferencesService(prisma as never);
      await expect(
        svc.upsertDigestForPerson(PERSON, { quietHoursStart: '22:00' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects half-configured quiet hours (end only)', async () => {
      const { prisma } = fakePrisma();
      const svc = new NotificationPreferencesService(prisma as never);
      await expect(
        svc.upsertDigestForPerson(PERSON, { quietHoursEnd: '07:30' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows clearing both quiet-hours to null in one call', async () => {
      const { prisma, store } = fakePrisma();
      store.set(PERSON, {
        personId: PERSON,
        digestSchedule: DigestSchedule.IMMEDIATE,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:30',
        quietHoursEmailOnly: true,
        updatedAt: new Date(),
      });
      const svc = new NotificationPreferencesService(prisma as never);
      const result = await svc.upsertDigestForPerson(PERSON, {
        quietHoursStart: null,
        quietHoursEnd: null,
      });
      expect(result.quietHoursStart).toBeNull();
      expect(result.quietHoursEnd).toBeNull();
    });

    it('partial update leaves untouched fields intact', async () => {
      const { prisma, store } = fakePrisma();
      store.set(PERSON, {
        personId: PERSON,
        digestSchedule: DigestSchedule.WEEKLY_MON_9AM,
        quietHoursStart: '20:00',
        quietHoursEnd: '08:00',
        quietHoursEmailOnly: false,
        updatedAt: new Date(),
      });
      const svc = new NotificationPreferencesService(prisma as never);
      const result = await svc.upsertDigestForPerson(PERSON, {
        quietHoursEmailOnly: true,
      });
      expect(result.quietHoursEmailOnly).toBe(true);
      expect(result.digestSchedule).toBe(DigestSchedule.WEEKLY_MON_9AM);
      expect(result.quietHoursStart).toBe('20:00');
    });
  });
});
