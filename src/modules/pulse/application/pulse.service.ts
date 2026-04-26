import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { PulseRepository } from '../infrastructure/pulse.repository';
import { PulseEntryDto, PulseHistoryDto, SubmitPulseDto } from './contracts/pulse.dto';

/** Returns the ISO Monday (YYYY-MM-DD) for the week containing the given date. */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
  ) {}

  public async submit(personId: string, dto: SubmitPulseDto): Promise<PulseEntryDto> {
    const weekStart = getMondayOfWeek(new Date());
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
}
