import { BadRequestException, Body, Controller, Get, Patch, Req, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DigestSchedule } from '@prisma/client';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';

import {
  DigestScheduleApi,
  NotificationDigestDto,
  NotificationPreferenceDto,
  UpdateNotificationDigestDto,
  UpdateNotificationPreferencesDto,
} from '../application/contracts/notification-prefs.dto';
import {
  DEFAULT_NOTIFICATION_DIGEST,
  NotificationDigestRecord,
  NotificationPreferenceRecord,
  NotificationPreferencesService,
} from '../application/notification-preferences.service';

function toDto(record: NotificationPreferenceRecord): NotificationPreferenceDto {
  return { channelKey: record.channelKey, enabled: record.enabled };
}

function digestToDto(record: NotificationDigestRecord): NotificationDigestDto {
  return {
    digestSchedule: record.digestSchedule as unknown as DigestScheduleApi,
    quietHoursStart: record.quietHoursStart,
    quietHoursEnd: record.quietHoursEnd,
    quietHoursEmailOnly: record.quietHoursEmailOnly,
  };
}

@ApiTags('me')
@Controller('me/notification-prefs')
export class MeNotificationPrefsController {
  public constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Read the current user notification preferences' })
  @ApiOkResponse({ type: [NotificationPreferenceDto] })
  public async getMyPrefs(
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<NotificationPreferenceDto[]> {
    const personId = req.principal?.personId;
    if (!personId) return [];
    const records = await this.service.getForPerson(personId);
    return records.map(toDto);
  }

  @Patch()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Replace one or more notification preferences for the current user' })
  @ApiOkResponse({ type: [NotificationPreferenceDto] })
  public async updateMyPrefs(
    @Req() req: { principal?: RequestPrincipal },
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceDto[]> {
    const personId = req.principal?.personId;
    if (!personId) return [];
    const records = await this.service.upsertForPerson(personId, body.preferences);
    return records.map(toDto);
  }
}

// ds-trunk-10 — per-person digest + quiet-hours.
@ApiTags('me')
@Controller('me/notification-digest')
export class MeNotificationDigestController {
  public constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Read the current user notification digest + quiet-hours settings' })
  @ApiOkResponse({ type: NotificationDigestDto })
  public async getMyDigest(
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<NotificationDigestDto> {
    const personId = req.principal?.personId;
    if (!personId) return digestToDto(DEFAULT_NOTIFICATION_DIGEST);
    const record = await this.service.getDigestForPerson(personId);
    return digestToDto(record);
  }

  @Patch()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({ summary: 'Update digest schedule and / or quiet-hours window for the current user' })
  @ApiOkResponse({ type: NotificationDigestDto })
  public async updateMyDigest(
    @Req() req: { principal?: RequestPrincipal },
    @Body(new ValidationPipe({ whitelist: true })) body: UpdateNotificationDigestDto,
  ): Promise<NotificationDigestDto> {
    const personId = req.principal?.personId;
    if (!personId) {
      throw new BadRequestException('Could not determine actor identity from request.');
    }
    const record = await this.service.upsertDigestForPerson(personId, {
      digestSchedule: body.digestSchedule as unknown as DigestSchedule | undefined,
      quietHoursStart: body.quietHoursStart,
      quietHoursEnd: body.quietHoursEnd,
      quietHoursEmailOnly: body.quietHoursEmailOnly,
    });
    return digestToDto(record);
  }
}
