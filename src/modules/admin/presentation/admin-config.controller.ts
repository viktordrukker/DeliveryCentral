import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AbacPolicyRegistry } from '@src/modules/identity-access/application/abac/abac-policy.registry';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { AdminConfigQueryService } from '../application/admin-config-query.service';
import { InMemoryWebhookService, WebhookSubscription, WebhookDeliveryAttempt } from '../infrastructure/in-memory-webhook.service';

import {
  AdminConfigResponseDto,
  AdminIntegrationsResponseDto,
  AdminNotificationsResponseDto,
  AdminSettingsResponseDto,
} from '../application/contracts/admin-config.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { CreateAccountRequestDto } from '../application/contracts/create-account.request';
import { ImportPreviewRequestDto } from '../application/contracts/import-preview.request';
import { ImportConfirmRequestDto } from '../application/contracts/import-confirm.request';

@ApiTags('admin')
@Controller('admin')
export class AdminConfigController {
  public constructor(
    private readonly adminConfigQueryService: AdminConfigQueryService,
    private readonly prisma: PrismaService,
    private readonly webhookService: InMemoryWebhookService,
    private readonly abacRegistry: AbacPolicyRegistry,
  ) {}

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Create a local platform account for a person' })
  @ApiCreatedResponse({ description: 'Account created.' })
  @ApiConflictResponse({ description: 'Account already exists for this person or email.' })
  public async createAccount(
    @Body() body: CreateAccountRequestDto,
  ): Promise<{ email: string; id: string; personId: string | null; roles: string[] }> {
    try {
      if (body.personId) {
        const existing = await this.prisma.localAccount.findFirst({
          where: { personId: body.personId },
        });

        if (existing) {
          throw new ConflictException('Local account already exists for this person.');
        }
      }

      const emailConflict = await this.prisma.localAccount.findUnique({
        where: { email: body.email.trim().toLowerCase() },
      });

      if (emailConflict) {
        throw new ConflictException('An account with this email already exists.');
      }

      const passwordHash = await bcrypt.hash(body.password, 12);
      const account = await this.prisma.localAccount.create({
        data: {
          backupCodesHash: [],
          displayName: body.displayName,
          email: body.email.trim().toLowerCase(),
          passwordHash,
          personId: body.personId ?? null,
          roles: body.roles,
        },
      });

      return {
        email: account.email,
        id: account.id,
        personId: account.personId,
        roles: account.roles,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Account creation failed.',
      );
    }
  }

  @Get('accounts')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List all local platform accounts' })
  @ApiOkResponse({ description: 'Paginated account list.' })
  public async listAccounts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<{
    items: { id: string; email: string; displayName: string; personId: string | null; roles: string[]; source: string; isEnabled: boolean }[];
    totalCount: number;
  }> {
    const p = Math.max(Number(page) || 1, 1);
    const ps = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const skip = (p - 1) * ps;

    const [accounts, totalCount] = await Promise.all([
      this.prisma.localAccount.findMany({ skip, take: ps, orderBy: { email: 'asc' } }),
      this.prisma.localAccount.count(),
    ]);

    return {
      items: accounts.map((account) => ({
        id: account.id,
        displayName: account.displayName,
        email: account.email,
        isEnabled: !account.lockedUntil || account.lockedUntil <= new Date(),
        personId: account.personId ?? null,
        roles: account.roles,
        source: account.source,
      })),
      totalCount,
    };
  }

  @Patch('accounts/:id')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update account roles or enabled state' })
  @ApiOkResponse({ description: 'Account updated.' })
  public async updateAccount(
    @Param('id') id: string,
    @Body() body: UpdateAccountDto,
  ): Promise<{ id: string; email: string; displayName: string; roles: string[]; source: string; isEnabled: boolean }> {
    const existing = await this.prisma.localAccount.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Account not found.');
    }

    const data: Record<string, unknown> = {};

    if (body.roles !== undefined) {
      data.roles = body.roles;
    }

    if (body.isEnabled === false) {
      data.lockedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
    } else if (body.isEnabled === true) {
      data.lockedUntil = null;
    }

    const account = await this.prisma.localAccount.update({ data, where: { id } });

    return {
      id: account.id,
      displayName: account.displayName,
      email: account.email,
      isEnabled: !account.lockedUntil || account.lockedUntil <= new Date(),
      roles: account.roles,
      source: account.source,
    };
  }

  @Delete('accounts/:id')
  @RequireRoles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a platform account' })
  public async deleteAccount(
    @Param('id') id: string,
    @Req() req: { principal?: { userId?: string } },
  ): Promise<void> {
    if (id === req.principal?.userId) {
      throw new BadRequestException('Cannot delete your own account.');
    }

    const existing = await this.prisma.localAccount.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Account not found.');
    }

    await this.prisma.localAccount.delete({ where: { id } });
  }

  @Get('config')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Get unified admin configuration for metadata, integrations, and system flags',
  })
  @ApiOkResponse({ type: AdminConfigResponseDto })
  public async getConfig(): Promise<AdminConfigResponseDto> {
    return this.adminConfigQueryService.execute();
  }

  @Get('settings')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get admin-visible system settings and feature flags' })
  @ApiOkResponse({ type: AdminSettingsResponseDto })
  public async getSettings(): Promise<AdminSettingsResponseDto> {
    return this.adminConfigQueryService.getSettings();
  }

  @Get('integrations')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get admin integration summaries' })
  @ApiOkResponse({ type: AdminIntegrationsResponseDto })
  public async getIntegrations(): Promise<AdminIntegrationsResponseDto> {
    return {
      integrations: await this.adminConfigQueryService.getIntegrations(),
    };
  }

  @Get('notifications')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get admin notification channels and templates' })
  @ApiOkResponse({ type: AdminNotificationsResponseDto })
  public async getNotifications(): Promise<AdminNotificationsResponseDto> {
    return this.adminConfigQueryService.getNotifications();
  }

  @Post('people/import/preview')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Preview bulk people import from CSV text' })
  @ApiOkResponse({ description: 'Preview of valid and invalid rows' })
  public async importPreview(
    @Body() body: ImportPreviewRequestDto,
  ): Promise<{ invalid: { errors: string[]; row: number }[]; valid: { email: string; givenName: string; familyName: string; grade?: string; role?: string }[] }> {
    const lines = body.csvText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      throw new BadRequestException('CSV must have a header row and at least one data row.');
    }

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
    const requiredHeaders = ['email', 'givenname', 'familyname'];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new BadRequestException(`CSV is missing required columns: ${missingHeaders.join(', ')}`);
    }

    const valid: { email: string; givenName: string; familyName: string; grade?: string; role?: string }[] = [];
    const invalid: { errors: string[]; row: number }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

      const errors: string[] = [];
      if (!row['email'] || !row['email'].includes('@')) errors.push('Invalid or missing email.');
      if (!row['givenname']) errors.push('Missing givenname.');
      if (!row['familyname']) errors.push('Missing familyname.');

      if (errors.length > 0) {
        invalid.push({ errors, row: i });
      } else {
        valid.push({
          email: row['email'],
          familyName: row['familyname'],
          givenName: row['givenname'],
          grade: row['grade'] || undefined,
          role: row['role'] || undefined,
        });
      }
    }

    return { invalid, valid };
  }

  @Post('people/import/confirm')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin', 'hr_manager')
  @ApiOperation({ summary: 'Confirm bulk people import' })
  @ApiOkResponse({ description: 'Import result' })
  public async importConfirm(
    @Body() body: ImportConfirmRequestDto,
  ): Promise<{ created: number; failed: { email: string; reason: string }[]; skipped: number }> {
    const CHUNK_SIZE = 100;
    let created = 0;
    let skipped = 0;
    const failed: { email: string; reason: string }[] = [];

    for (let i = 0; i < body.rows.length; i += CHUNK_SIZE) {
      const chunk = body.rows.slice(i, i + CHUNK_SIZE);
      for (const row of chunk) {
        try {
          const existing = await this.prisma.person.findFirst({ where: { primaryEmail: row.email } });
          if (existing) {
            skipped++;
            continue;
          }
          await this.prisma.person.create({
            data: {
              displayName: `${row.givenName} ${row.familyName}`,
              familyName: row.familyName,
              givenName: row.givenName,
              grade: row.grade ?? null,
              primaryEmail: row.email,
              role: row.role ?? null,
            },
          });
          created++;
        } catch (error) {
          failed.push({ email: row.email, reason: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    }

    return { created, failed, skipped };
  }

  // ── Webhook subscriptions ──────────────────────────────────────────────

  @Post('webhooks')
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Create a webhook subscription' })
  @ApiCreatedResponse({ description: 'Webhook subscription created.' })
  public createWebhook(
    @Body() body: CreateWebhookDto,
  ): WebhookSubscription {
    return this.webhookService.create(body.url, body.secret, body.eventTypes ?? [], body.createdByPersonId ?? '');
  }

  @Get('webhooks')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List webhook subscriptions' })
  @ApiOkResponse({ description: 'Webhook subscriptions.' })
  public listWebhooks(): WebhookSubscription[] {
    return this.webhookService.list();
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Delete a webhook subscription' })
  public deleteWebhook(@Param('id') id: string): void {
    const deleted = this.webhookService.delete(id);
    if (!deleted) {
      throw new NotFoundException('Webhook subscription not found.');
    }
  }

  @Post('webhooks/:id/test')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Send a test delivery to a webhook subscription' })
  @ApiOkResponse({ description: 'Test delivery result.' })
  public async testWebhook(@Param('id') id: string): Promise<WebhookDeliveryAttempt> {
    try {
      return await this.webhookService.testDelivery(id);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Test delivery failed.');
    }
  }

  @Get('webhooks/:id/deliveries')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Get last 10 delivery attempts for a webhook subscription' })
  @ApiOkResponse({ description: 'Delivery log.' })
  public getWebhookDeliveries(@Param('id') id: string): WebhookDeliveryAttempt[] {
    return this.webhookService.getDeliveryLog(id);
  }

  // ── ABAC Policies ──────────────────────────────────────────────────────

  @Get('access-policies')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List active ABAC policies' })
  @ApiOkResponse({ description: 'ABAC policies.' })
  public listAbacPolicies(): Array<{ id: string; roles: string[]; resource: string; action: string; description: string }> {
    return this.abacRegistry.listPolicies().map((p) => ({
      id: p.id,
      roles: p.roles,
      resource: p.resource,
      action: p.action,
      description: p.description,
    }));
  }
}
