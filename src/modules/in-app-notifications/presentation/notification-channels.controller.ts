import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { ALL_AUTHENTICATED_ROLES } from '@src/shared/auth/role-presets';
import { PrismaService } from '@src/shared/persistence/prisma.service';

// HD-8 / F2a — channel discovery for the AccountSettingsPage. Returns
// the full set of `NotificationChannel` rows the deployment has
// installed, so the FE preferences UI can render one toggle per
// channel instead of hard-coding `email`/`in_app`/`teams`. Disabled
// channels are filtered out — toggling a channel off in the platform
// is the right way to hide it from end users.

export class NotificationChannelDto {
  channelKey!: string;
  displayName!: string;
  kind!: string;
}

@ApiTags('notifications')
@Controller('notifications/channels')
export class NotificationChannelsController {
  public constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequireRoles(...ALL_AUTHENTICATED_ROLES)
  @ApiOperation({
    summary: 'HD-8 / F2a — list active notification channels for the FE prefs page.',
  })
  @ApiOkResponse({ type: [NotificationChannelDto] })
  public async list(): Promise<NotificationChannelDto[]> {
    const rows = await this.prisma.notificationChannel.findMany({
      where: { isEnabled: true },
      select: { channelKey: true, displayName: true, kind: true },
      orderBy: { displayName: 'asc' },
    });
    return rows;
  }
}
