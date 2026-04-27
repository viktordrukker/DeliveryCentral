import { Body, Controller, Get, Patch, Req, ValidationPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

import {
  NotificationPreferenceDto,
  UpdateNotificationPreferencesDto,
} from '../application/contracts/notification-prefs.dto';
import {
  NotificationPreferencesService,
  NotificationPreferenceRecord,
} from '../application/notification-preferences.service';

const ALL_AUTHENTICATED_ROLES = [
  'admin',
  'director',
  'hr_manager',
  'resource_manager',
  'project_manager',
  'delivery_manager',
  'employee',
] as const;

function toDto(record: NotificationPreferenceRecord): NotificationPreferenceDto {
  return { channelKey: record.channelKey, enabled: record.enabled };
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
