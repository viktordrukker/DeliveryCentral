import { Injectable } from '@nestjs/common';

import { ExceptionResolutionRecord, ExceptionResolutionStore } from '../domain/exception-resolution.store';
import { ExceptionQueueQueryService } from './exception-queue-query.service';

interface ResolveExceptionCommand {
  exceptionId: string;
  resolution: string;
  resolvedBy: string;
}

@Injectable()
export class ResolveExceptionService {
  public constructor(
    private readonly resolutionStore: ExceptionResolutionStore,
    private readonly exceptionQueueQueryService: ExceptionQueueQueryService,
  ) {}

  public async execute(command: ResolveExceptionCommand): Promise<ExceptionResolutionRecord> {
    if (!command.resolution || command.resolution.trim().length === 0) {
      throw new Error('A resolution note is required.');
    }

    const queue = await this.exceptionQueueQueryService.getQueue({});
    const exists = queue.items.some((item) => item.id === command.exceptionId);

    if (!exists && !this.resolutionStore.isResolved(command.exceptionId)) {
      throw new Error('Exception not found.');
    }

    return this.resolutionStore.resolve(
      command.exceptionId,
      command.resolvedBy,
      command.resolution.trim(),
    );
  }
}
