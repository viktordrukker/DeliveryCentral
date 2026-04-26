import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Query, ValidationPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { RequireRoles } from '@src/modules/identity-access/application/roles.decorator';

import { NotificationTemplateDto } from '../application/contracts/notification-template.dto';
import { NotificationOutcomeDto } from '../application/contracts/notification-outcome.dto';
import { NotificationQueueResponseDto } from '../application/contracts/notification-queue.dto';
import { NudgeRequestDto } from '../application/contracts/nudge.dto';
import { NotificationOutcomeQueryService } from '../application/notification-outcome-query.service';
import { NotificationQueueQueryService } from '../application/notification-queue-query.service';
import { RequeueNotificationService } from '../application/requeue-notification.service';
import { NotificationTestSendRequestDto } from '../application/contracts/notification-test-send.request';
import { NotificationTestSendResponseDto } from '../application/contracts/notification-test-send.response';
import { NotificationTemplateQueryService } from '../application/notification-template-query.service';
import { NotificationTestSendService } from '../application/notification-test-send.service';
import { NudgeService } from '../application/nudge.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  public constructor(
    private readonly notificationTemplateQueryService: NotificationTemplateQueryService,
    private readonly notificationOutcomeQueryService: NotificationOutcomeQueryService,
    private readonly notificationQueueQueryService: NotificationQueueQueryService,
    private readonly requeueNotificationService: RequeueNotificationService,
    private readonly notificationTestSendService: NotificationTestSendService,
    private readonly nudgeService: NudgeService,
  ) {}

  @Post('nudge')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin', 'director', 'hr_manager', 'resource_manager', 'project_manager', 'delivery_manager', 'employee')
  @ApiOperation({ summary: 'Send a nudge reminder to a pending approver (rate-limited 1/24h per requestId+approver).' })
  public async nudge(
    @Body(new ValidationPipe({ whitelist: true })) body: NudgeRequestDto,
  ): Promise<{ status: string; notificationRequestId: string }> {
    return this.nudgeService.send(body);
  }

  @Get('templates')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List available notification templates' })
  @ApiOkResponse({ type: Object })
  public async listTemplates(): Promise<NotificationTemplateDto[]> {
    return this.notificationTemplateQueryService.listTemplates();
  }

  @Get('outcomes')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List recent notification delivery outcomes' })
  @ApiOkResponse({ type: Object })
  public async listRecentOutcomes(): Promise<NotificationOutcomeDto[]> {
    return this.notificationOutcomeQueryService.listRecent();
  }

  @Get('queue')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'List notification requests with optional status filter and pagination' })
  @ApiQuery({ name: 'status', required: false, type: String, enum: ['QUEUED', 'RETRYING', 'SENT', 'FAILED_TERMINAL'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiOkResponse({ type: NotificationQueueResponseDto })
  public async listQueue(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<NotificationQueueResponseDto> {
    return this.notificationQueueQueryService.execute({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
    });
  }

  @Post('queue/:id/requeue')
  @HttpCode(HttpStatus.OK)
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Requeue a FAILED_TERMINAL notification request' })
  @ApiOkResponse({ description: 'Notification requeued' })
  @ApiNotFoundResponse({ description: 'Notification request not found.' })
  public async requeueNotification(@Param('id') id: string): Promise<{ status: string }> {
    try {
      await this.requeueNotificationService.execute(id);
      return { status: 'requeued' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Requeue failed.';
      if (message === 'Notification request not found.') {
        throw new NotFoundException(message);
      }
      throw new BadRequestException(message);
    }
  }

  @Post('test-send')
  @RequireRoles('admin')
  @ApiOperation({ summary: 'Resolve and send a test notification through a selected channel' })
  @ApiOkResponse({ type: Object })
  public async testSend(
    @Body() request: NotificationTestSendRequestDto,
  ): Promise<NotificationTestSendResponseDto> {
    try {
      return await this.notificationTestSendService.execute(request);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Test notification send failed.',
      );
    }
  }
}
