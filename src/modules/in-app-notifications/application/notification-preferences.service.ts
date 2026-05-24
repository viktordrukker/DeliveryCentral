import { BadRequestException, Injectable } from '@nestjs/common';
import { DigestSchedule } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface NotificationPreferenceRecord {
  channelKey: string;
  enabled: boolean;
  updatedAt: Date;
}

// ds-trunk-10 — per-person digest + quiet-hours settings. Absent row = defaults.
export interface NotificationDigestRecord {
  digestSchedule: DigestSchedule;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursEmailOnly: boolean;
  updatedAt: Date;
}

export const DEFAULT_NOTIFICATION_DIGEST: NotificationDigestRecord = {
  digestSchedule: DigestSchedule.IMMEDIATE,
  quietHoursStart: null,
  quietHoursEnd: null,
  quietHoursEmailOnly: true,
  updatedAt: new Date(0),
};

export interface UpsertNotificationDigestInput {
  digestSchedule?: DigestSchedule;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietHoursEmailOnly?: boolean;
}

@Injectable()
export class NotificationPreferencesService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getForPerson(personId: string): Promise<NotificationPreferenceRecord[]> {
    return this.prisma.personNotificationPreference.findMany({
      where: { personId },
      select: { channelKey: true, enabled: true, updatedAt: true },
      orderBy: { channelKey: 'asc' },
    });
  }

  public async upsertForPerson(
    personId: string,
    preferences: ReadonlyArray<{ channelKey: string; enabled: boolean }>,
  ): Promise<NotificationPreferenceRecord[]> {
    if (!Array.isArray(preferences)) {
      throw new BadRequestException(
        'Body must include `preferences: Array<{ channelKey, enabled }>`.',
      );
    }
    if (preferences.length === 0) {
      return this.getForPerson(personId);
    }
    await this.prisma.$transaction(
      preferences.map((pref) =>
        this.prisma.personNotificationPreference.upsert({
          where: { personId_channelKey: { personId, channelKey: pref.channelKey } },
          create: { personId, channelKey: pref.channelKey, enabled: pref.enabled },
          update: { enabled: pref.enabled },
        }),
      ),
    );

    return this.getForPerson(personId);
  }

  public async getDigestForPerson(personId: string): Promise<NotificationDigestRecord> {
    const row = await this.prisma.personNotificationDigest.findUnique({
      where: { personId },
    });
    if (!row) return { ...DEFAULT_NOTIFICATION_DIGEST };
    return {
      digestSchedule: row.digestSchedule,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      quietHoursEmailOnly: row.quietHoursEmailOnly,
      updatedAt: row.updatedAt,
    };
  }

  public async upsertDigestForPerson(
    personId: string,
    input: UpsertNotificationDigestInput,
  ): Promise<NotificationDigestRecord> {
    this.validateQuietHoursPairing(input);
    const data = {
      digestSchedule: input.digestSchedule,
      quietHoursStart: input.quietHoursStart,
      quietHoursEnd: input.quietHoursEnd,
      quietHoursEmailOnly: input.quietHoursEmailOnly,
    };
    // Drop undefined keys so they don't overwrite existing values on update.
    const cleanedUpdate = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );
    const row = await this.prisma.personNotificationDigest.upsert({
      where: { personId },
      create: {
        personId,
        digestSchedule: data.digestSchedule ?? DigestSchedule.IMMEDIATE,
        quietHoursStart: data.quietHoursStart ?? null,
        quietHoursEnd: data.quietHoursEnd ?? null,
        quietHoursEmailOnly: data.quietHoursEmailOnly ?? true,
      },
      update: cleanedUpdate,
    });
    return {
      digestSchedule: row.digestSchedule,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
      quietHoursEmailOnly: row.quietHoursEmailOnly,
      updatedAt: row.updatedAt,
    };
  }

  private validateQuietHoursPairing(input: UpsertNotificationDigestInput): void {
    // Only validate if EITHER quiet-hours key is present in the payload.
    const startPresent = input.quietHoursStart !== undefined;
    const endPresent = input.quietHoursEnd !== undefined;
    if (!startPresent && !endPresent) return;
    const start = input.quietHoursStart;
    const end = input.quietHoursEnd;
    const bothSet = start != null && end != null;
    const bothNull = start === null && end === null;
    if (!bothSet && !bothNull) {
      throw new BadRequestException(
        'quietHoursStart and quietHoursEnd must be set together or both cleared.',
      );
    }
  }
}
