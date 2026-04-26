import { Injectable } from '@nestjs/common';

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
