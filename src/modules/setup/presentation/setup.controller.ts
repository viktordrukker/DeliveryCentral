import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '@src/modules/identity-access/application/public.decorator';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { DiagnosticBundleService } from '../application/diagnostic-bundle.service';
import { MonitoringSnippetService, type SnippetTarget } from '../application/monitoring-snippet.service';
import { SetupTokenGuard } from '../application/setup-guard';
import { SetupService, type SetupStatus } from '../application/setup.service';
import { SetupTokenService } from '../application/setup-token.service';

import {
  AdminStepDto,
  IntegrationsStepDto,
  MigrationsApplyDto,
  MonitoringStepDto,
  ResetDto,
  SeedStepDto,
  SmtpTestDto,
  StartRunDto,
  TenantStepDto,
} from './dto/setup-wizard.dto';

@ApiTags('setup')
@Controller('setup')
export class SetupController {
  public constructor(
    private readonly service: SetupService,
    private readonly diagnostics: DiagnosticBundleService,
    private readonly snippets: MonitoringSnippetService,
    private readonly token: SetupTokenService,
  ) {}

  /**
   * Status — public (no token, no auth). The frontend reads this on every
   * app boot to decide whether to render `/login` or redirect to `/setup`.
   */
  @Get('status')
  @Public()
  public async status(): Promise<SetupStatus> {
    return this.service.getStatus();
  }

  /**
   * Issue / re-issue a setup token. The OPERATOR retrieves the token from
   * `docker logs <c> | grep SETUP_TOKEN` and pastes it into the wizard's
   * first screen. This endpoint exists so an admin Reset can rotate the
   * token from inside the app — but it's NOT publicly callable: requires
   * either no token-active state (fresh install) or admin role.
   */
  @Post('token/issue')
  @Public()
  @HttpCode(HttpStatus.OK)
  public async issueToken(): Promise<{ tokenIssued: boolean }> {
    if (this.token.isActive()) {
      throw new BadRequestException('A setup token is already active.');
    }
    await this.service.issueToken();
    return { tokenIssued: true };
  }

  // ─── Token-gated wizard steps ────────────────────────────────────────────
  // Every endpoint below requires X-Setup-Token. The runner UI either has
  // the token in memory (after the first paste) or is locked out.

  @Post('preflight')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async preflight(@Body() body: StartRunDto) {
    return this.service.runPreflight(body.runId);
  }

  @Post('preflight/create-database')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async createDatabase(@Body() body: { runId: string }) {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.createDatabase(body.runId);
    return { ok: true };
  }

  @Post('migrations/apply')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async applyMigrations(@Body() body: MigrationsApplyDto) {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.applyMigrations(body.runId, { wipeFirst: !!body.wipeFirst });
    return { ok: true };
  }

  @Post('tenant')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async upsertTenant(
    @Body() body: TenantStepDto & { runId: string },
  ): Promise<{ ok: true }> {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.upsertDefaultTenant(body.runId, body);
    return { ok: true };
  }

  @Post('admin')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async createAdmin(
    @Body() body: AdminStepDto & { runId: string },
  ): Promise<{ ok: true }> {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.createAdmin(body.runId, body);
    return { ok: true };
  }

  @Post('integrations')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async saveIntegrations(
    @Body() body: IntegrationsStepDto & { runId: string },
  ): Promise<{ ok: true }> {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.saveIntegrations(body.runId, body);
    return { ok: true };
  }

  @Post('integrations/smtp-test')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async smtpTest(
    @Body() body: SmtpTestDto & { runId: string },
  ): Promise<{ ok: boolean; detail?: string }> {
    if (!body.runId) throw new BadRequestException('runId required.');
    return this.service.sendSmtpTest(body.runId, body.recipient);
  }

  @Post('monitoring')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async saveMonitoring(
    @Body() body: MonitoringStepDto & { runId: string },
  ): Promise<{ ok: true }> {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.saveMonitoring(body.runId, body);
    return { ok: true };
  }

  @Post('seed')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async runSeed(
    @Body() body: SeedStepDto & { runId: string },
  ): Promise<{ ok: true }> {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.runSeed(body.runId, body.profile);
    return { ok: true };
  }

  @Post('complete')
  @Public()
  @UseGuards(SetupTokenGuard)
  @HttpCode(HttpStatus.OK)
  public async complete(@Body() body: { runId: string }): Promise<{ ok: true }> {
    if (!body.runId) throw new BadRequestException('runId required.');
    await this.service.completeRun(body.runId);
    return { ok: true };
  }

  /** Diagnostic bundle download — gzipped JSON the operator pastes back to support. */
  @Get('diagnostic-bundle')
  @Public()
  @UseGuards(SetupTokenGuard)
  public async diagnosticBundle(
    @Query('runId') runId: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!runId) throw new BadRequestException('runId query parameter required.');
    const { filename, gzipped } = await this.diagnostics.build(runId);
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(gzipped);
  }

  /**
   * Monitoring config snippet download. Returns a copy-pasteable shipper
   * config (OTLP collector / Splunk HEC / Datadog / syslog / fluent-bit)
   * filled in with the endpoints + tokens captured by the wizard's
   * `monitoring` step. Token-gated like every other /setup/* endpoint
   * AND admin-callable post-setup via the same path (admin Settings
   * surfaces a "Download config snippet" link too).
   */
  @Get('monitoring/snippet')
  @Public()
  @UseGuards(SetupTokenGuard)
  public async monitoringSnippet(
    @Query('target') target: string,
    @Res() res: Response,
  ): Promise<void> {
    const allowed: SnippetTarget[] = ['otlp', 'splunk', 'datadog', 'syslog', 'fluentbit'];
    if (!allowed.includes(target as SnippetTarget)) {
      throw new BadRequestException(
        `Unsupported snippet target. Use one of: ${allowed.join(', ')}.`,
      );
    }
    const snippet = await this.snippets.build(target as SnippetTarget);
    res.setHeader('Content-Type', `${snippet.contentType}; charset=utf-8`);
    res.setHeader('Content-Disposition', `attachment; filename="${snippet.filename}"`);
    res.send(snippet.body);
  }

  // ─── Admin-only Reset ────────────────────────────────────────────────────
  // POST /api/admin/setup/reset is registered under the same controller so
  // the path lives within the existing /api prefix. The route differs from
  // the Public ones above — it requires admin auth instead of the setup token.

  @Post('/admin/setup/reset')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async reset(
    @Body() body: ResetDto,
    @Headers('x-actor-id') actorId?: string,
  ): Promise<void> {
    if (body.confirm !== 'RESET-DELIVERYCENTRAL') {
      throw new BadRequestException(
        "Reset confirm string did not match. Expected literal 'RESET-DELIVERYCENTRAL'.",
      );
    }
    await this.service.reset(actorId ?? 'unknown', body.profile);
  }
}
