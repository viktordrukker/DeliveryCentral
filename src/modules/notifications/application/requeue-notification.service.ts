import { Injectable, NotFoundException } from '@nestjs/common';

import { NotificationRequestRepositoryPort } from '../domain/repositories/notification-request-repository.port';

@Injectable()
export class RequeueNotificationService {
  public constructor(
    private readonly notificationRequestRepository: NotificationRequestRepositoryPort,
  ) {}

  public async execute(requestId: string): Promise<void> {
    const all = await this.notificationRequestRepository.listAll();
    const request = all.find((r) => r.id === requestId);

    if (!request) {
      throw new NotFoundException('Notification request not found.');
    }

    request.requeue();
    await this.notificationRequestRepository.save(request);
  }
}
