import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Singleton snapshot of the platform's runtime state — populated at boot
 * and refreshed after every wizard / admin migration apply. Today it
 * tracks pending migrations only, but it's the natural home for any
 * future "degraded" signals the admin shell wants to surface (e.g.
 * notification dispatch backlog, integration auth failures).
 *
 * Reads happen via GET /api/system/state — public, whitelisted by the
 * RequireSetupCompleteGuard. The data is non-sensitive (migration names
 * + counts), so no auth gate.
 */
@Injectable()
export class SystemStateService {
  private readonly logger = new Logger('system-state');
  private degraded = false;
  private pending: string[] = [];

  public constructor(private readonly prisma: PrismaService) {}

  public snapshot(): { degraded: boolean; pendingMigrations: string[] } {
    return { degraded: this.degraded, pendingMigrations: [...this.pending] };
  }

  /**
   * Compute `pending` by diffing the on-disk migrations folder against
   * the `_prisma_migrations` table. Cheaper than spawning the prisma CLI
   * — same logic the wizard's preflight uses, just without the cluster
   * connectivity probe (we know the DB is up because Nest booted).
   */
  public async refresh(): Promise<void> {
    try {
      const onDisk = await this.listMigrationsOnDisk();
      const inDbRows = await this.prisma.$queryRawUnsafe<
        Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
      >(
        `SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`,
      );
      const applied = new Set(
        inDbRows
          .filter((r) => r.finished_at !== null && r.rolled_back_at === null)
          .map((r) => r.migration_name),
      );
      const pending = onDisk.filter((m) => !applied.has(m));
      this.pending = pending;
      this.degraded = pending.length > 0;
      if (pending.length > 0) {
        this.logger.warn(
          `Degraded: ${pending.length} pending migration(s) — admin banner will prompt to apply. ${pending.join(', ')}`,
        );
      } else {
        this.logger.log('No pending migrations.');
      }
    } catch (err) {
      // _prisma_migrations may not exist (fresh DB before any migrate).
      // Fail-open: not degraded, no pending list.
      this.degraded = false;
      this.pending = [];
      this.logger.warn(
        `Could not read migration state (assuming healthy): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  public markHealthy(): void {
    this.degraded = false;
    this.pending = [];
  }

  private async listMigrationsOnDisk(): Promise<string[]> {
    const candidates = [
      path.resolve(process.cwd(), 'prisma/migrations'),
      '/app/prisma/migrations',
    ];
    for (const p of candidates) {
      try {
        const entries = await fs.readdir(p, { withFileTypes: true });
        return entries
          .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
          .map((e) => e.name)
          .sort();
      } catch {
        // try next
      }
    }
    return [];
  }
}
