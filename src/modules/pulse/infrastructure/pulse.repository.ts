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
    // DATE-01: subtract whole days using millisecond arithmetic so a query that
    // straddles a DST boundary still subtracts exactly N×7 days. setDate() works
    // in local time and can drift by 1 hour across DST transitions.
    const cutoff = new Date(Date.now() - weeks * 7 * 86400000);

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
