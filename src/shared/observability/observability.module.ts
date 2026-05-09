import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { StructuredLoggerService } from './logger.service';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { StructuredExceptionFilter } from './structured-exception.filter';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    StructuredLoggerService,
    MetricsService,
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
  exports: [StructuredLoggerService, MetricsService],
})
export class ObservabilityModule {}
