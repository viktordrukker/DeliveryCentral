import { Injectable } from '@nestjs/common';

import { NotificationTestSendRequestDto } from './contracts/notification-test-send.request';
import { NotificationTestSendResponseDto } from './contracts/notification-test-send.response';
import { NotificationDispatchService } from './notification-dispatch.service';

@Injectable()
export class NotificationTestSendService {
  public constructor(private readonly notificationDispatchService: NotificationDispatchService) {}

  public async execute(
    request: NotificationTestSendRequestDto,
  ): Promise<NotificationTestSendResponseDto> {
    return this.notificationDispatchService.dispatch({
      channelKey: request.channelKey,
      eventName: `test.${request.templateKey}`,
      payload: request.payload,
      recipient: request.recipient,
      templateKey: request.templateKey,
    });
  }
}
