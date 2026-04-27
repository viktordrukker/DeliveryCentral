import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface NotificationPreferenceRecord {
  channelKey: string;
  enabled: boolean;
  updatedAt: Date;
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
}
