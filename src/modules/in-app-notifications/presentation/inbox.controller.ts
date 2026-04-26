import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';
import { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';
import { Observable, Subject, interval, startWith, switchMap, from, takeUntil } from 'rxjs';

import { InAppNotificationDto } from '../application/contracts/in-app-notification.dto';
import { InAppNotificationService } from '../application/in-app-notification.service';
import { InAppNotificationRecord } from '../infrastructure/in-app-notification.repository';

function toDto(record: InAppNotificationRecord): InAppNotificationDto {
  return {
    id: record.id,
    recipientPersonId: record.recipientPersonId,
    eventType: record.eventType,
    title: record.title,
    body: record.body,
    link: record.link,
    readAt: record.readAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

@ApiTags('notifications')
@Controller('notifications/inbox')
export class InboxController {
  public constructor(private readonly inAppNotificationService: InAppNotificationService) {}

  @Get()
  @RequireRoles('admin', 'director', 'hr_manager', 'resource_manager', 'project_manager', 'delivery_manager', 'employee')
  @ApiOperation({ summary: 'Get personal notification inbox' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: [InAppNotificationDto] })
  public async getInbox(
    @Req() req: { principal?: RequestPrincipal },
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ): Promise<InAppNotificationDto[]> {
    const personId = req.principal?.personId;

    if (!personId) return [];

    const records = await this.inAppNotificationService.getInbox(personId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? Number(limit) : 20,
    });

    return records.map(toDto);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin', 'director', 'hr_manager', 'resource_manager', 'project_manager', 'delivery_manager', 'employee')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  public async markRead(
    @Req() req: { principal?: RequestPrincipal },
    @Param('id') id: string,
  ): Promise<InAppNotificationDto> {
    const personId = req.principal?.personId ?? '';
    const result = await this.inAppNotificationService.markRead(id, personId);

    if (!result) {
      throw new NotFoundException('Notification not found.');
    }

    return toDto(result);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin', 'director', 'hr_manager', 'resource_manager', 'project_manager', 'delivery_manager', 'employee')
  @ApiOperation({ summary: 'Mark all unread notifications as read' })
  public async markAllRead(
    @Req() req: { principal?: RequestPrincipal },
  ): Promise<{ status: string }> {
    const personId = req.principal?.personId;

    if (personId) {
      await this.inAppNotificationService.markAllRead(personId);
    }

    return { status: 'ok' };
  }

  @Sse('stream')
  @RequireRoles('admin', 'director', 'hr_manager', 'resource_manager', 'project_manager', 'delivery_manager', 'employee')
  @ApiOperation({ summary: 'Server-sent events stream for real-time notification count updates' })
  public streamNotifications(
    @Req() req: { principal?: RequestPrincipal; on?: (event: string, handler: () => void) => void },
  ): Observable<MessageEvent> {
    const personId = req.principal?.personId;

    if (!personId) {
      // Return a single 'connected' event then close
      return new Observable((observer) => {
        observer.next({ data: { unreadCount: 0, connected: true } } as MessageEvent);
        observer.complete();
      });
    }

    // Stop polling when the client disconnects to prevent memory leaks from orphaned subscriptions.
    const close$ = new Subject<void>();
    req.on?.('close', () => {
      close$.next();
      close$.complete();
    });

    // Emit immediately and then every 30 seconds
    return interval(30_000).pipe(
      startWith(0),
      switchMap(() =>
        from(
          this.inAppNotificationService
            .getInbox(personId, { unreadOnly: true, limit: 1 })
            .then((records) => ({
              data: { unreadCount: records.length > 0 ? records.length : 0, connected: true },
            }))
            .catch(() => ({ data: { unreadCount: 0, connected: true } })),
        ),
      ),
      takeUntil(close$),
    );
  }
}
