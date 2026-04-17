import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface PublicHolidayDto {
  id: string;
  date: string;
  name: string;
  countryCode: string;
}

@Injectable()
export class PublicHolidayService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(year: number, countryCode = 'AU'): Promise<PublicHolidayDto[]> {
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year, 11, 31));
    const holidays = await this.prisma.publicHoliday.findMany({
      where: { countryCode, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });
    return holidays.map((h) => ({
      id: h.id,
      date: h.date.toISOString().slice(0, 10),
      name: h.name,
      countryCode: h.countryCode,
    }));
  }

  /** Returns set of date strings (YYYY-MM-DD) that are public holidays in a given month. */
  public async getHolidayDatesForMonth(year: number, month: number, countryCode = 'AU'): Promise<Set<string>> {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0)); // last day of month
    const holidays = await this.prisma.publicHoliday.findMany({
      where: { countryCode, date: { gte: from, lte: to } },
      select: { date: true },
    });
    return new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
  }

  /** Count working days in a month (Mon–Fri minus public holidays). */
  public async workingDaysInMonth(year: number, month: number, countryCode = 'AU'): Promise<number> {
    const holidays = await this.getHolidayDatesForMonth(year, month, countryCode);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      const dayOfWeek = date.getUTCDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // weekend
      const dateStr = date.toISOString().slice(0, 10);
      if (holidays.has(dateStr)) continue;
      count++;
    }
    return count;
  }
}
