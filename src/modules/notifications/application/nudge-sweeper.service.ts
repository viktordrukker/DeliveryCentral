import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { MetricsService } from '@src/shared/observability/metrics.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { NotificationEventTranslatorService } from './notification-event-translator.service';

const KEY_INTERVAL = 'nudge.sweep.intervalMinutes';
const KEY_PROPOSAL_SLA_HOURS = 'staffing.proposalAck.slaHours';
const KEY_TIMESHEET_SUBMIT_SLA_HOURS = 'timesheet.submission.slaHours';
const KEY_DEDUP_HOURS = 'nudge.dedup.hours';

const DEFAULT_INTERVAL_MINUTES = 60;
const DEFAULT_PROPOSAL_SLA_HOURS = 48;
const DEFAULT_TIMESHEET_SLA_HOURS = 72;
const DEFAULT_DEDUP_HOURS = 24;

const NUDGE_PROPOSAL_EVENT = 'nudge.proposal_acknowledgment_overdue';
const NUDGE_TIMESHEET_EVENT = 'nudge.timesheet_submission_overdue';

interface ProposalCandidate {
  slateId: string;
  staffingRequestId: string;
  proposedAt: Date;
  proposedByPersonId: string;
  recipientPersonIds: string[];
}

interface TimesheetCandidate {
  weekId: string;
  personId: string;
  weekStart: Date;
}

// HD-8 / Chunk 8.3 — proactive nudge sweep. Fires once per
// `nudge.sweep.intervalMinutes` (default 60) and scans two categories:
//   1. Staffing proposal slates that are still OPEN past the
//      `staffing.proposalAck.slaHours` window with no candidate
//      decisions recorded — recipient is the slate's `proposedByPersonId`.
//   2. Timesheet weeks still in DRAFT past the
//      `timesheet.submission.slaHours` window after the period end —
//      recipient is the timesheet's `personId`.
//
// Dedup: skips a candidate if there's a matching `NotificationRequest`
// row whose `eventName` matches the nudge category and `recipient`
// equals the recipient's primary email, within `nudge.dedup.hours`
// (default 24h). Mirrors the pattern of the existing `NudgeService`
// without introducing a new nudge-history table.
//
// Each match calls into `NotificationEventTranslatorService` so the
// event flows through the dual-write seam (HD-0.3 era) and the outbox
// publisher fan-outs to email + in-app.
@Injectable()
export class NudgeSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NudgeSweeperService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  public constructor(
    private readonly prisma: PrismaService,
    private readonly translator: NotificationEventTranslatorService,
    private readonly metrics?: MetricsService,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (process.env.NUDGE_SWEEP_DISABLED === 'true') {
      this.logger.log('Nudge sweep disabled by env flag.');
      return;
    }
    const intervalMs = await this.loadIntervalMs();
    this.timer = setInterval(() => {
      void this.tickSafe();
    }, intervalMs);
    this.logger.log(`Nudge sweep scheduled every ${intervalMs / 1000}s.`);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  // Public entry point — used by tests + admin trigger paths.
  public async sweep(now: Date = new Date()): Promise<{
    proposalsNudged: number;
    proposalsSuppressed: number;
    timesheetsNudged: number;
    timesheetsSuppressed: number;
  }> {
    this.metrics?.incNudgeSweepTick();
    const dedupHours = await this.numberSetting(KEY_DEDUP_HOURS, DEFAULT_DEDUP_HOURS);
    const dedupSince = new Date(now.getTime() - dedupHours * 60 * 60 * 1000);

    const proposalSlaHours = await this.numberSetting(
      KEY_PROPOSAL_SLA_HOURS,
      DEFAULT_PROPOSAL_SLA_HOURS,
    );
    const proposalCutoff = new Date(now.getTime() - proposalSlaHours * 60 * 60 * 1000);

    const timesheetSlaHours = await this.numberSetting(
      KEY_TIMESHEET_SUBMIT_SLA_HOURS,
      DEFAULT_TIMESHEET_SLA_HOURS,
    );
    // Timesheet weekStart is a date (Monday); the period ends Sunday;
    // the SLA window starts after that. We compare weekStart against
    // (now - 7 days - SLA hours) so a 72h SLA means "Wednesday after
    // the period end" if `weekStart` was the Monday of last week.
    const timesheetCutoffWeekStart = new Date(
      now.getTime() - (7 * 24 + timesheetSlaHours) * 60 * 60 * 1000,
    );

    const proposals = await this.findStaleProposals(proposalCutoff);
    let proposalsNudged = 0;
    let proposalsSuppressed = 0;
    for (const p of proposals) {
      const recipientEmail = await this.lookupEmail(p.proposedByPersonId);
      if (!recipientEmail) continue;
      if (
        await this.alreadyNudged(NUDGE_PROPOSAL_EVENT, recipientEmail, dedupSince, p.staffingRequestId)
      ) {
        proposalsSuppressed += 1;
        this.metrics?.incNudgeSuppressed('proposal_acknowledgment');
        continue;
      }
      const overdueByHours = Math.round((now.getTime() - p.proposedAt.getTime()) / 36e5);
      await this.translator.nudgeProposalAcknowledgmentOverdue({
        proposalId: p.slateId,
        staffingRequestId: p.staffingRequestId,
        requesterPersonId: p.proposedByPersonId,
        recipientPersonIds: [p.proposedByPersonId],
        overdueByHours,
      });
      proposalsNudged += 1;
      this.metrics?.incNudgeEmitted('proposal_acknowledgment');
    }

    const timesheets = await this.findStaleTimesheets(timesheetCutoffWeekStart);
    let timesheetsNudged = 0;
    let timesheetsSuppressed = 0;
    for (const t of timesheets) {
      const recipientEmail = await this.lookupEmail(t.personId);
      if (!recipientEmail) continue;
      if (
        await this.alreadyNudged(NUDGE_TIMESHEET_EVENT, recipientEmail, dedupSince, t.weekId)
      ) {
        timesheetsSuppressed += 1;
        this.metrics?.incNudgeSuppressed('timesheet_submission');
        continue;
      }
      const periodEnd = new Date(t.weekStart);
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);
      const overdueByHours = Math.max(
        0,
        Math.round((now.getTime() - periodEnd.getTime()) / 36e5),
      );
      await this.translator.nudgeTimesheetSubmissionOverdue({
        personId: t.personId,
        weekStart: t.weekStart.toISOString().slice(0, 10),
        overdueByHours,
      });
      timesheetsNudged += 1;
      this.metrics?.incNudgeEmitted('timesheet_submission');
    }

    return {
      proposalsNudged,
      proposalsSuppressed,
      timesheetsNudged,
      timesheetsSuppressed,
    };
  }

  private async tickSafe(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.sweep();
      const total =
        result.proposalsNudged +
        result.proposalsSuppressed +
        result.timesheetsNudged +
        result.timesheetsSuppressed;
      if (total > 0) {
        this.logger.log(
          `Nudge sweep: proposals=${result.proposalsNudged}/${result.proposalsSuppressed} timesheets=${result.timesheetsNudged}/${result.timesheetsSuppressed} (emitted/suppressed).`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Nudge sweep failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }

  /* ── Queries ─────────────────────────────────────────────────── */

  private async findStaleProposals(cutoff: Date): Promise<ProposalCandidate[]> {
    // SoT PR 16b — slates were dropped along with the legacy staffing
    // tables. Stale-proposal nudges now surface from
    // `ProjectPositionCandidate`: pending candidate rows on positions
    // still in PROPOSED state past the SLA cutoff are the lean
    // equivalent of an unacknowledged slate. The nudge recipient
    // remains the candidate's `createdByPersonId` (the proposer).
    const rows = await this.prisma.projectPositionCandidate.findMany({
      where: {
        decision: 'PENDING',
        createdAt: { lt: cutoff },
        position: { fillStatus: { in: ['PROPOSED', 'OPEN'] } },
      },
      select: {
        id: true,
        positionId: true,
        createdAt: true,
        createdByPersonId: true,
      },
    });
    return rows
      .filter((r): r is typeof r & { createdByPersonId: string } => r.createdByPersonId !== null)
      .map((r) => ({
        slateId: r.id,
        staffingRequestId: r.positionId,
        proposedAt: r.createdAt,
        proposedByPersonId: r.createdByPersonId,
        recipientPersonIds: [r.createdByPersonId],
      }));
  }

  private async findStaleTimesheets(weekStartCutoff: Date): Promise<TimesheetCandidate[]> {
    const rows = await this.prisma.timesheetWeek.findMany({
      where: {
        status: 'DRAFT',
        weekStart: { lt: weekStartCutoff },
      },
      select: { id: true, personId: true, weekStart: true },
    });
    return rows.map((r) => ({
      weekId: r.id,
      personId: r.personId,
      weekStart: r.weekStart,
    }));
  }

  private async lookupEmail(personId: string): Promise<string | null> {
    const row = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { primaryEmail: true },
    });
    return row?.primaryEmail ?? null;
  }

  private async alreadyNudged(
    eventName: string,
    _recipientEmail: string,
    dedupSince: Date,
    entityId: string,
  ): Promise<boolean> {
    // Dedup against `OutboxEvent` rather than `NotificationRequest`
    // because the email dispatch path is conditional on
    // `notificationsDefaultEmailRecipient` (i.e., it can no-op),
    // whereas the outbox row is written for every translator call
    // when `flag.outboxEnabled` is on. The translator uses
    // staffingRequestId or personId as the OutboxEvent.aggregateId,
    // which is exactly the entity id we want to match.
    const existing = await this.prisma.outboxEvent.findFirst({
      where: {
        eventName,
        aggregateId: entityId,
        createdAt: { gte: dedupSince },
      },
      select: { id: true },
    });
    return existing !== null;
  }

  /* ── PlatformSetting plumbing ────────────────────────────────── */

  private async loadIntervalMs(): Promise<number> {
    const minutes = await this.numberSetting(KEY_INTERVAL, DEFAULT_INTERVAL_MINUTES);
    const clamped = Math.min(Math.max(1, minutes), 1440);
    return clamped * 60 * 1000;
  }

  private async numberSetting(key: string, fallback: number): Promise<number> {
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key } });
      const v = row?.value;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    } catch {
      // PlatformSetting unavailable — use the fallback.
    }
    return fallback;
  }
}
