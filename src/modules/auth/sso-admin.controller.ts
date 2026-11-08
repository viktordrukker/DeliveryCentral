import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import {
  SsoAdminService,
  SsoConfig,
  SsoProvider,
  SsoTestResult,
} from './sso-admin.service';

const PROVIDERS: SsoProvider[] = ['google', 'azure_ad', 'okta', 'oidc'];

export class UpdateSsoConfigDto {
  @IsString()
  @IsIn(PROVIDERS)
  public provider!: SsoProvider;

  @IsString()
  @MaxLength(255)
  public clientId!: string;

  @IsString()
  @MaxLength(2048)
  public discoveryUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  public clientSecret?: string;

  @IsBoolean()
  public autoProvisionUsers!: boolean;
}

interface RequestWithPrincipal {
  principal?: { personId?: string; userId?: string };
}

/**
 * NEW-LGL-2 — bank-ops self-serve SSO admin controller.
 *
 *   GET  /api/admin/sso/config — current persisted config (secret masked).
 *   PUT  /api/admin/sso/config — overwrite the config. Omit clientSecret to
 *                                leave the stored secret unchanged.
 *   POST /api/admin/sso/test   — hit the configured discovery URL and
 *                                verify it returns a valid OIDC document.
 *
 * All endpoints are admin-only via @RequireRoles('admin'). The secret is
 * encrypted at rest and never returned in plaintext to any client.
 */
@ApiTags('admin/sso')
@Controller('admin/sso')
export class SsoAdminController {
  public constructor(private readonly service: SsoAdminService) {}

  @Get('config')
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Get current SSO config. clientSecretSet indicates whether a secret is stored; the secret itself is never returned.',
  })
  @ApiOkResponse({ description: 'Current SSO config.' })
  public getConfig(): Promise<SsoConfig> {
    return this.service.getConfig();
  }

  @Put('config')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Update SSO config. Omit clientSecret to keep the existing secret; pass empty string to clear.',
  })
  @ApiOkResponse({ description: 'Updated SSO config (secret masked).' })
  public updateConfig(
    @Body() body: UpdateSsoConfigDto,
    @Req() req: RequestWithPrincipal,
  ): Promise<SsoConfig> {
    const actorId = req.principal?.personId ?? req.principal?.userId ?? null;
    return this.service.updateConfig(body, actorId);
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({
    summary: 'Test the configured SSO discovery URL. Returns the parsed issuer + endpoints, or an error description.',
  })
  @ApiOkResponse({ description: 'Test result.' })
  public testConnection(): Promise<SsoTestResult> {
    return this.service.testConnection();
  }
}
