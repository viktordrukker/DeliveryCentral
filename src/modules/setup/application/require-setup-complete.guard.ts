import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * Global guard that locks the entire app behind /setup until the wizard's
 * `complete` step has landed. Registered as APP_GUARD with a higher
 * priority than RbacGuard so the gate decision happens BEFORE any auth
 * check (no point asking for a JWT when the app isn't yet provisioned).
 *
 * Whitelist:
 *   - /api/setup/**      — the wizard itself (token-gated by SetupTokenGuard)
 *   - /api/system/**     — setup-status, health, readiness
 *   - /api/health, /api/health/deep, /api/readiness, /api/diagnostics
 *
 * Cache: we read `setup.completedAt` once at boot, then trust an in-memory
 * boolean. SetupService.completeRun + .reset flip it. This avoids a DB
 * round-trip on every request once the system is set up.
 */
@Injectable()
export class RequireSetupCompleteGuard implements CanActivate {
  private static cachedCompleted: boolean | null = null;

  private readonly logger = new Logger('require-setup-complete');

  public constructor(private readonly prisma: PrismaService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ originalUrl?: string; url?: string }>();
    const path = req.originalUrl ?? req.url ?? '';

    // Whitelist — these always pass even when setup is incomplete.
    if (this.isWhitelisted(path)) return true;

    const completed = await this.checkCompleted();
    if (completed) return true;

    throw new ServiceUnavailableException({
      message: 'DeliveryCentral setup has not been completed. Visit /setup to finish onboarding.',
      setupRequired: true,
      redirect: '/setup',
    });
  }

  private isWhitelisted(path: string): boolean {
    return (
      path.startsWith('/api/setup') ||
      path.startsWith('/api/system') ||
      path === '/api/health' ||
      path.startsWith('/api/health/') ||
      path === '/api/readiness' ||
      path === '/api/diagnostics'
    );
  }

  private async checkCompleted(): Promise<boolean> {
    if (RequireSetupCompleteGuard.cachedCompleted !== null) {
      return RequireSetupCompleteGuard.cachedCompleted;
    }
    try {
      const row = await this.prisma.platformSetting.findUnique({
        where: { key: 'setup.completedAt' },
      });
      const isCompleted = !!row && row.value !== null;
      RequireSetupCompleteGuard.cachedCompleted = isCompleted;
      return isCompleted;
    } catch (err) {
      // If the DB is unreachable we let requests through — the deeper
      // health endpoints will catch the real issue. Failing closed here
      // would lock everyone out on a transient connectivity blip.
      this.logger.warn(
        `Could not read setup.completedAt (allowing request): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return true;
    }
  }

  /** Called by SetupService.completeRun to flip the cache without a DB read. */
  public static markCompleted(): void {
    RequireSetupCompleteGuard.cachedCompleted = true;
  }

  /** Called by SetupService.reset to flip the cache when the wizard re-arms. */
  public static markIncomplete(): void {
    RequireSetupCompleteGuard.cachedCompleted = false;
  }
}
