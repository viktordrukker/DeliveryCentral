import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

const KEY_RETENTION_DAYS = 'audit.retentionDays';
const KEY_SWEEP_INTERVAL_HOURS = 'audit.sweep.intervalHours';

const DEFAULT_RETENTION_DAYS = 365;
const DEFAULT_SWEEP_INTERVAL_HOURS = 24;

/**
 * F-5.6 / D-168 — nightly AuditLog retention sweep.
 *
 * Reads `audit.retentionDays` PlatformSetting (default 365) and deletes
 * AuditLog rows whose `createdAt` is older than the cutoff. Runs once
 * per `audit.sweep.intervalHours` (default 24) in-process via a single
 * setInterval timer; the first tick fires `intervalHours` after boot
 * to avoid hammering the DB on every container restart.
 *
 * Disabled in CI/test via `AUDIT_SWEEP_DISABLED=true`. Idempotent —
 * repeated runs find nothing new because the cutoff moves forward
 * monotonically.
 *
 * The sweep deletes a row regardless of whether it's been redacted by
 * the F-5.5 forgetting endpoint: redaction preserves the hash chain
 * but doesn't preserve the row past retention. Compliance teams asking
 * "can you prove this row existed?" should snapshot AuditLog rows
 * before retention expires; the hash chain is for tamper-detection,
 * not eternal preservation.
 */
@Injectable()
export class AuditRetentionSweepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditRetentionSweepService.name);
  private timer?: NodeJS.Timeout;

  public constructor(private readonly prisma: PrismaService) {}

  public async onModuleInit(): Promise<void> {
    if (process.env.AUDIT_SWEEP_DISABLED === 'true') {
      this.logger.log('Audit retention sweep disabled by env flag.');
      return;
    }
    const intervalMs = await this.loadIntervalMs();
    this.timer = setInterval(() => {
      void this.tickSafe();
    }, intervalMs);
    this.logger.log(`Audit retention sweep scheduled every ${intervalMs / 3_600_000}h.`);
  }

  public onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public async sweep(now: Date = new Date()): Promise<{ deleted: number; cutoff: string }> {
    const days = await this.numberSetting(KEY_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
    const clamped = Math.max(1, Math.floor(days));
    const cutoff = new Date(now.getTime() - clamped * 24 * 60 * 60 * 1000);

    const deleted = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    if (deleted.count > 0) {
      this.logger.log(
        `Audit retention sweep deleted ${deleted.count} AuditLog row(s) older than ${cutoff.toISOString()} (retention=${clamped}d).`,
      );
    }
    return { deleted: deleted.count, cutoff: cutoff.toISOString() };
  }

  private async tickSafe(): Promise<void> {
    try {
      await this.sweep();
    } catch (error) {
      this.logger.warn(
        `Audit retention sweep tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async loadIntervalMs(): Promise<number> {
    const hours = await this.numberSetting(KEY_SWEEP_INTERVAL_HOURS, DEFAULT_SWEEP_INTERVAL_HOURS);
    const clamped = Math.min(Math.max(1, hours), 168);
    return clamped * 60 * 60 * 1000;
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
