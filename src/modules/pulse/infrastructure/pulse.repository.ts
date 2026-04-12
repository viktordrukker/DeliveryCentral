import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface PulseEntryRecord {
  id: string;
  personId: string;
  weekStart: Date;
  mood: number;
  note: string | null;
  submittedAt: Date;
}

@Injectable()
export class PulseRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async upsert(
    personId: string,
    weekStart: Date,
    mood: number,
    note?: string,
  ): Promise<PulseEntryRecord> {
    return this.prisma.pulseEntry.upsert({
      where: { personId_weekStart: { personId, weekStart } },
      create: { personId, weekStart, mood, note },
      update: { mood, note },
    });
  }

  public async findHistory(personId: string, weeks: number): Promise<PulseEntryRecord[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);

    return this.prisma.pulseEntry.findMany({
      where: {
        personId,
        weekStart: { gte: cutoff },
      },
      orderBy: { weekStart: 'desc' },
    });
  }

  public async findForPeople(
    personIds: string[],
    from: Date,
    to: Date,
  ): Promise<PulseEntryRecord[]> {
    return this.prisma.pulseEntry.findMany({
      where: {
        personId: { in: personIds },
        weekStart: { gte: from, lte: to },
      },
      orderBy: { weekStart: 'asc' },
    });
  }
}
