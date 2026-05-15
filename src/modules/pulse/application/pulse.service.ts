import { Injectable } from '@nestjs/common';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { getWeekStart, type WeekStartOptions } from '@src/shared/temporal/week-of';
import { PulseRepository } from '../infrastructure/pulse.repository';
import {
  PulseEntryDto,
  PulseHistoryDto,
  PulseTeamTrendDto,
  PulseTrendWeekDto,
  SubmitPulseDto,
} from './contracts/pulse.dto';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const STRUGGLING_MOOD = 1;

@Injectable()
export class PulseService {
  // Phase 11 will wire this from platform settings.
  public readonly frequency = 'weekly';

  public constructor(
    private readonly repo: PulseRepository,
    private readonly prisma: PrismaService,
    private readonly inAppNotifications: InAppNotificationService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  /**
   * F-7.1 / D-161 — read tenant timezone + week-start from PlatformSettings.
   * Falls back to UTC + Monday when unset.
   */
  private async loadWeekOptions(): Promise<WeekStartOptions> {
    const [tz, wsd] = await Promise.all([
      this.platformSettings.getRawValue('general.timezone'),
      this.platformSettings.getRawValue('timesheets.weekStartDay'),
    ]);
    return {
      timezone: typeof tz === 'string' && tz.length > 0 ? tz : undefined,
      weekStartDay: typeof wsd === 'number' ? wsd : undefined,
    };
  }

  public async submit(personId: string, dto: SubmitPulseDto): Promise<PulseEntryDto> {
    const opts = await this.loadWeekOptions();
    const weekStart = getWeekStart(new Date(), opts);
    const record = await this.repo.upsert(personId, weekStart, dto.mood, dto.note);

    if (dto.mood === STRUGGLING_MOOD) {
      void this.notifyManagerOfStruggling(personId).catch(() => {
        // Notification must not block the pulse submission.
      });
    }

    return {
      id: record.id,
      personId: record.personId,
      weekStart: toDateStr(record.weekStart),
      mood: record.mood,
      note: record.note ?? undefined,
      submittedAt: record.submittedAt.toISOString(),
    };
  }

  private async notifyManagerOfStruggling(personId: string): Promise<void> {
    const now = new Date();
    const reportingLine = await this.prisma.reportingLine.findFirst({
      where: {
        subjectPersonId: personId,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      include: { subject: { select: { displayName: true } } },
      orderBy: { validFrom: 'desc' },
    });

    if (!reportingLine) return;

    const employeeName = reportingLine.subject.displayName;
    await this.inAppNotifications.createNotification(
      reportingLine.managerPersonId,
      'pulse.struggling',
      `${employeeName} is struggling`,
      `${employeeName} submitted a mood score of 1/5 this week. Consider reaching out.`,
      `/people/${personId}?tab=360`,
    );
  }

  public async getMyHistory(personId: string, weeks: number): Promise<PulseHistoryDto> {
    const records = await this.repo.findHistory(personId, weeks);
    const entries: PulseEntryDto[] = records.map((r) => ({
      id: r.id,
      personId: r.personId,
      weekStart: toDateStr(r.weekStart),
      mood: r.mood,
      note: r.note ?? undefined,
      submittedAt: r.submittedAt.toISOString(),
    }));

    return { entries, frequency: this.frequency };
  }

  public async avgMoodForPeople(personIds: string[], from: Date, to: Date): Promise<number | null> {
    if (personIds.length === 0) return null;
    const entries = await this.prisma.pulseEntry.findMany({
      where: { personId: { in: personIds }, weekStart: { gte: from, lte: to } },
      select: { mood: true },
    });
    if (entries.length === 0) return null;
    const sum = entries.reduce((s, e) => s + e.mood, 0);
    return sum / entries.length;
  }

  // HD-7 — weekly team-trend tile aggregator. Given a set of person IDs
  // (the caller's reporting scope) and a window of weeks, returns one
  // row per week with avgMood, responseCount, and strugglingCount.
  // Empty weeks are filled with nulls so the FE can plot a continuous
  // sparkline. Sorted oldest → newest.
  public async getTeamTrend(personIds: string[], weeks: number): Promise<PulseTeamTrendDto> {
    const safeWeeks = Math.max(1, Math.min(52, Math.floor(weeks)));
    const opts = await this.loadWeekOptions();
    const todayMonday = getWeekStart(new Date(), opts);
    const earliestMonday = new Date(todayMonday);
    earliestMonday.setUTCDate(earliestMonday.getUTCDate() - 7 * (safeWeeks - 1));

    if (personIds.length === 0) {
      return { scopePersonCount: 0, weeks: this.emptyTrendWeeks(earliestMonday, safeWeeks) };
    }

    const entries = await this.prisma.pulseEntry.findMany({
      where: {
        personId: { in: personIds },
        weekStart: { gte: earliestMonday, lte: todayMonday },
      },
      select: { weekStart: true, mood: true },
    });

    const buckets = new Map<string, { sum: number; count: number; struggling: number }>();
    for (const e of entries) {
      const key = toDateStr(getWeekStart(e.weekStart, opts));
      const bucket = buckets.get(key) ?? { sum: 0, count: 0, struggling: 0 };
      bucket.sum += e.mood;
      bucket.count += 1;
      if (e.mood === STRUGGLING_MOOD) bucket.struggling += 1;
      buckets.set(key, bucket);
    }

    const weeksOut: PulseTrendWeekDto[] = [];
    const cursor = new Date(earliestMonday);
    for (let i = 0; i < safeWeeks; i++) {
      const key = toDateStr(cursor);
      const bucket = buckets.get(key);
      weeksOut.push({
        weekStart: key,
        avgMood: bucket && bucket.count > 0 ? bucket.sum / bucket.count : null,
        responseCount: bucket?.count ?? 0,
        strugglingCount: bucket?.struggling ?? 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }

    return { scopePersonCount: personIds.length, weeks: weeksOut };
  }

  private emptyTrendWeeks(start: Date, count: number): PulseTrendWeekDto[] {
    const out: PulseTrendWeekDto[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < count; i++) {
      out.push({ weekStart: toDateStr(cursor), avgMood: null, responseCount: 0, strugglingCount: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
    return out;
  }
}
