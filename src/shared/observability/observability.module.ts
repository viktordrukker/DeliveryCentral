import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { StructuredLoggerService } from './logger.service';
import { StructuredExceptionFilter } from './structured-exception.filter';

@Global()
@Module({
  providers: [
    StructuredLoggerService,
    {
      provide: APP_FILTER,
      useFactory: (filter: StructuredExceptionFilter) => filter,
      inject: [StructuredExceptionFilter],
    },
    {
      provide: StructuredExceptionFilter,
      useFactory: (logger: StructuredLoggerService) => new StructuredExceptionFilter(logger),
      inject: [StructuredLoggerService],
    },
  ],
  exports: [StructuredLoggerService],
})
export class ObservabilityModule {}
