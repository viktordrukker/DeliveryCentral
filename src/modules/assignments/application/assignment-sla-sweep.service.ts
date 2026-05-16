import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { MetricsService } from '@src/shared/observability/metrics.service';

interface BreachedRow {
  id: string;
  slaStage: string | null;
  slaDueAt: Date | null;
  personId: string;
  projectId: string;
  requestedByPersonId: string | null;
}

interface PreBreachCandidateRow extends BreachedRow {
  requestedAt: Date;
  slaWarnedAt50pct: Date | null;
  slaWarnedAt75pct: Date | null;
}

const KEY_INTERVAL = 'assignment.sla.sweepIntervalMinutes';
const DEFAULT_INTERVAL_MINUTES = 15;

// F-11.4 / D-124 — pre-breach warning thresholds resolved from the
// `assignment.sla.warningPercents` PlatformSetting (default `[50, 75]`).
// Service still operates on exactly two columns (`slaWarnedAt50pct`,
// `slaWarnedAt75pct`) so the schema doesn't change; the array first
// two entries are interpreted as the lower (50pct column) + upper
// (75pct column) thresholds. Out-of-range / non-numeric values fall
// back to the legacy 0.5 / 0.75.
const KEY_WARNING_PERCENTS = 'assignment.sla.warningPercents';
const DEFAULT_PRE_BREACH_LEVEL_LOW = 0.5;
const DEFAULT_PRE_BREACH_LEVEL_HIGH = 0.75;

@Injectable()
export class AssignmentSlaSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssignmentSlaSweepService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  public constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly auditLogger?: AuditLoggerService,
    private readonly metrics?: MetricsService,
  ) {}

  public async onModuleInit(): Promise<void> {
    if (process.env.ASSIGNMENT_SLA_SWEEP_DISABLED === 'true') {
      this.logger.log('Assignment SLA sweep disabled by env flag.');
      return;
    }
    const intervalMs = await this.loadIntervalMs();
    this.timer = setInterval(() => {
      void this.tickSafe();
    }, intervalMs);
    this.logger.log(`Assignment SLA sweep scheduled every ${intervalMs / 1000}s.`);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  // HD-10 — Public sweep entry point. Two responsibilities now:
  //   1. Hard breach (existing) — slaDueAt has elapsed, fire ONCE.
  //   2. Pre-breach warning (new) — elapsed-fraction crosses 50% then
  //      75%, each fires ONCE, deduplicated via slaWarnedAt{50,75}pct
  //      timestamps. Pre-breach rows that ALSO breach this tick fall
  //      through into the breach branch (no double-emit) because
  //      findPreBreachCandidates excludes slaDueAt < now.
  public async sweep(
    now: Date = new Date(),
  ): Promise<{ breached: number; warned50: number; warned75: number }> {
    this.metrics?.incSlaSweepTick();
    const breached = await this.findBreached(now);
    for (const row of breached) {
      await this.markBreached(row.id, now);
      await this.recordBreach(row);
      this.metrics?.incSlaBreached(row.slaStage ?? 'UNKNOWN');
    }

    const candidates = await this.findPreBreachCandidates(now);
    const { low: levelLow, high: levelHigh } = await this.loadPreBreachLevels();
    let warned50 = 0;
    let warned75 = 0;
    for (const row of candidates) {
      const fraction = this.elapsedFraction(now, row.requestedAt, row.slaDueAt!);
      if (fraction >= levelHigh && !row.slaWarnedAt75pct) {
        await this.markWarned(row.id, '75pct', now);
        await this.recordPreBreach(row, '75pct', fraction);
        this.metrics?.incSlaPreBreachWarned('75pct', row.slaStage ?? 'UNKNOWN');
        warned75 += 1;
      } else if (fraction >= levelLow && !row.slaWarnedAt50pct) {
        await this.markWarned(row.id, '50pct', now);
        await this.recordPreBreach(row, '50pct', fraction);
        this.metrics?.incSlaPreBreachWarned('50pct', row.slaStage ?? 'UNKNOWN');
        warned50 += 1;
      }
    }

    return { breached: breached.length, warned50, warned75 };
  }

  private async tickSafe(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.sweep();
      if (result.breached > 0) {
        this.logger.log(`Marked ${result.breached} assignment(s) as SLA-breached.`);
      }
      if (result.warned50 > 0 || result.warned75 > 0) {
        this.logger.log(
          `Emitted SLA pre-breach warnings: ${result.warned50} at 50%, ${result.warned75} at 75%.`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Assignment SLA sweep failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async loadIntervalMs(): Promise<number> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: KEY_INTERVAL } });
    const value = row?.value;
    let minutes = DEFAULT_INTERVAL_MINUTES;
    if (typeof value === 'number') minutes = value;
    else if (typeof value === 'string') {
      const n = Number(value);
      if (!Number.isNaN(n)) minutes = n;
    }
    if (minutes < 1) minutes = 1;
    if (minutes > 1440) minutes = 1440;
    return minutes * 60 * 1000;
  }

  /**
   * F-11.4 / D-124 — resolve pre-breach thresholds from
   * `assignment.sla.warningPercents` (e.g. `[50, 75]` → low=0.5, high=0.75).
   * Out-of-range / wrong-type values fall back to the legacy hardcoded
   * 0.5 / 0.75 so an empty PlatformSetting table doesn't break the sweep.
   */
  private async loadPreBreachLevels(): Promise<{ low: number; high: number }> {
    try {
      const row = await this.prisma.platformSetting.findUnique({
        where: { key: KEY_WARNING_PERCENTS },
      });
      const value = row?.value;
      if (Array.isArray(value) && value.length >= 2) {
        const lowRaw = Number(value[0]);
        const highRaw = Number(value[1]);
        const low =
          Number.isFinite(lowRaw) && lowRaw >= 0 && lowRaw <= 100
            ? lowRaw / 100
            : DEFAULT_PRE_BREACH_LEVEL_LOW;
        const high =
          Number.isFinite(highRaw) && highRaw >= 0 && highRaw <= 100
            ? highRaw / 100
            : DEFAULT_PRE_BREACH_LEVEL_HIGH;
        // Defensive: ensure ordering. If admin set [75, 50] mistakenly,
        // swap so the higher value still gates the 75pct column.
        return low <= high ? { low, high } : { low: high, high: low };
      }
    } catch {
      // PlatformSetting unavailable → fall through to defaults.
    }
    return { low: DEFAULT_PRE_BREACH_LEVEL_LOW, high: DEFAULT_PRE_BREACH_LEVEL_HIGH };
  }

  private async findBreached(now: Date): Promise<BreachedRow[]> {
    return (await this.prisma.projectAssignment.findMany({
      where: {
        slaDueAt: { lt: now },
        slaBreachedAt: null,
        slaStage: { not: null },
      },
      select: {
        id: true,
        slaStage: true,
        slaDueAt: true,
        personId: true,
        projectId: true,
        requestedByPersonId: true,
      },
    })) as unknown as BreachedRow[];
  }

  private async markBreached(assignmentId: string, breachedAt: Date): Promise<void> {
    await this.prisma.projectAssignment.update({
      where: { id: assignmentId },
      data: { slaBreachedAt: breachedAt },
    });
  }

  // HD-10 — find assignments whose SLA is still pending (slaDueAt in
  // the future, no breach yet) but whose elapsed-fraction may have
  // crossed a warning threshold. We fetch a superset by date math
  // and filter precisely in `sweep()` so the SQL stays simple.
  private async findPreBreachCandidates(now: Date): Promise<PreBreachCandidateRow[]> {
    return (await this.prisma.projectAssignment.findMany({
      where: {
        slaDueAt: { gt: now },
        slaBreachedAt: null,
        slaStage: { not: null },
        OR: [{ slaWarnedAt50pct: null }, { slaWarnedAt75pct: null }],
      },
      select: {
        id: true,
        slaStage: true,
        slaDueAt: true,
        personId: true,
        projectId: true,
        requestedByPersonId: true,
        requestedAt: true,
        slaWarnedAt50pct: true,
        slaWarnedAt75pct: true,
      },
    })) as unknown as PreBreachCandidateRow[];
  }

  private elapsedFraction(now: Date, start: Date, due: Date): number {
    const total = due.getTime() - start.getTime();
    if (total <= 0) return 1;
    const elapsed = now.getTime() - start.getTime();
    if (elapsed <= 0) return 0;
    return elapsed / total;
  }

  private async markWarned(
    assignmentId: string,
    level: '50pct' | '75pct',
    warnedAt: Date,
  ): Promise<void> {
    const data: { slaWarnedAt50pct?: Date; slaWarnedAt75pct?: Date } = {};
    if (level === '50pct') data.slaWarnedAt50pct = warnedAt;
    if (level === '75pct') {
      data.slaWarnedAt75pct = warnedAt;
      // Crossing 75% implies 50% was also crossed; if 50pct hasn't
      // been stamped yet (e.g., a long gap between sweeps), backfill
      // it so deduplication still holds.
      data.slaWarnedAt50pct = warnedAt;
    }
    await this.prisma.projectAssignment.update({
      where: { id: assignmentId },
      data,
    });
  }

  private async recordPreBreach(
    row: PreBreachCandidateRow,
    level: '50pct' | '75pct',
    fraction: number,
  ): Promise<void> {
    this.auditLogger?.record({
      actionType: 'assignment.sla_pre_breach',
      actorId: 'system',
      category: 'assignment',
      changeSummary: `Assignment ${row.id} crossed SLA ${level} pre-breach threshold at stage ${row.slaStage}.`,
      details: {
        assignmentId: row.id,
        slaStage: row.slaStage,
        slaDueAt: row.slaDueAt?.toISOString(),
        personId: row.personId,
        projectId: row.projectId,
        warnLevel: level,
        elapsedFraction: Math.round(fraction * 1000) / 1000,
      },
      metadata: {
        slaStage: row.slaStage,
        warnLevel: level,
      },
      targetEntityId: row.id,
      targetEntityType: 'ASSIGNMENT',
    });

    await this.notificationEventTranslator
      ?.assignmentSlaPreBreach?.({
        assignmentId: row.id,
        slaStage: row.slaStage ?? 'UNKNOWN',
        warnLevel: level,
        recipientPersonIds: [row.requestedByPersonId, row.personId].filter(
          (id): id is string => Boolean(id),
        ),
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to dispatch SLA pre-breach notification for ${row.id}: ${
            err instanceof Error ? err.message : 'unknown'
          }`,
        );
      });
  }

  private async recordBreach(row: BreachedRow): Promise<void> {
    this.auditLogger?.record({
      actionType: 'assignment.sla_breached',
      actorId: 'system',
      category: 'assignment',
      changeSummary: `Assignment ${row.id} breached SLA at stage ${row.slaStage}.`,
      details: {
        assignmentId: row.id,
        slaStage: row.slaStage,
        slaDueAt: row.slaDueAt?.toISOString(),
        personId: row.personId,
        projectId: row.projectId,
      },
      metadata: {
        slaStage: row.slaStage,
      },
      targetEntityId: row.id,
      targetEntityType: 'ASSIGNMENT',
    });

    await this.notificationEventTranslator
      ?.assignmentSlaBreached?.({
        assignmentId: row.id,
        slaStage: row.slaStage ?? 'UNKNOWN',
        recipientPersonIds: [row.requestedByPersonId, row.personId].filter(
          (id): id is string => Boolean(id),
        ),
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to dispatch SLA-breach notification for ${row.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        );
      });
  }
}
