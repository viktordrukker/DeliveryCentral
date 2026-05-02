import { randomUUID } from 'node:crypto';

import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '@src/modules/identity-access/application/public.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { SetupService } from '../application/setup.service';
import { SystemStateService } from '../application/system-state.service';

@ApiTags('system')
@Controller('system')
export class SystemController {
  public constructor(private readonly stateService: SystemStateService) {}

  /**
   * Public — used by the frontend admin shell to render the "Pending
   * migrations" banner. Whitelisted by RequireSetupCompleteGuard so it
   * works pre-setup-completion too.
   */
  @Get('state')
  @Public()
  public state(): { degraded: boolean; pendingMigrations: string[] } {
    return this.stateService.snapshot();
  }
}

/**
 * Admin-only "Apply pending migrations" endpoint that lives off the
 * /api/admin namespace so the existing rbac guard handles role checks.
 * Reuses the wizard's `applyMigrations` step under a synthetic run_id —
 * the operation goes into the same setup_runs / setup_run_logs trail.
 */
@ApiTags('admin')
@Controller('admin/system')
export class AdminSystemController {
  public constructor(
    private readonly setup: SetupService,
    private readonly state: SystemStateService,
  ) {}

  @Post('migrations/apply')
  @RequireRoles('admin')
  public async applyMigrations(
    @Body() body: { wipeFirst?: boolean } = {},
  ): Promise<{ ok: true; runId: string }> {
    const runId = randomUUID();
    await this.setup.applyMigrations(runId, { wipeFirst: !!body.wipeFirst });
    await this.state.refresh();
    return { ok: true, runId };
  }
}
