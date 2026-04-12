import { Injectable } from '@nestjs/common';

import { ExceptionResolutionRecord, ExceptionResolutionStore } from '../domain/exception-resolution.store';
import { ExceptionQueueQueryService } from './exception-queue-query.service';

interface SuppressExceptionCommand {
  exceptionId: string;
  reason: string;
  suppressedBy: string;
}

@Injectable()
export class SuppressExceptionService {
  public constructor(
    private readonly resolutionStore: ExceptionResolutionStore,
    private readonly exceptionQueueQueryService: ExceptionQueueQueryService,
  ) {}

  public async execute(command: SuppressExceptionCommand): Promise<ExceptionResolutionRecord> {
    if (!command.reason || command.reason.trim().length === 0) {
      throw new Error('A suppression reason is required.');
    }

    const queue = await this.exceptionQueueQueryService.getQueue({});
    const exists = queue.items.some((item) => item.id === command.exceptionId);

    if (!exists && !this.resolutionStore.isResolved(command.exceptionId)) {
      throw new Error('Exception not found.');
    }

    return this.resolutionStore.suppress(
      command.exceptionId,
      command.suppressedBy,
      command.reason.trim(),
    );
  }
}
