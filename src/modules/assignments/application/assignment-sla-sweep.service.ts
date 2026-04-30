import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';

interface BreachedRow {
  id: string;
  slaStage: string | null;
  slaDueAt: Date | null;
  personId: string;
  projectId: string;
  requestedByPersonId: string | null;
}

const KEY_INTERVAL = 'assignment.sla.sweepIntervalMinutes';
const DEFAULT_INTERVAL_MINUTES = 15;

@Injectable()
export class AssignmentSlaSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssignmentSlaSweepService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  public constructor(
    private readonly prisma: PrismaService,
    private readonly notificationEventTranslator?: NotificationEventTranslatorService,
    private readonly auditLogger?: AuditLoggerService,
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

  /** Public sweep entry point. Returns the number of newly-breached assignments. */
  public async sweep(now: Date = new Date()): Promise<{ breached: number }> {
    const breached = await this.findBreached(now);
    if (breached.length === 0) return { breached: 0 };

    for (const row of breached) {
      await this.markBreached(row.id, now);
      await this.recordBreach(row);
    }
    return { breached: breached.length };
  }

  private async tickSafe(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.sweep();
      if (result.breached > 0) {
        this.logger.log(`Marked ${result.breached} assignment(s) as SLA-breached.`);
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
