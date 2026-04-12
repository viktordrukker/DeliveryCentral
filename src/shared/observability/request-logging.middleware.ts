import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { StructuredLoggerService } from './logger.service';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  public constructor(private readonly logger: StructuredLoggerService) {}

  public use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();

    response.on('finish', () => {
      this.logger.logEvent(
        {
          durationMs: Date.now() - startedAt,
          method: request.method,
          path: request.originalUrl || request.url,
          statusCode: response.statusCode,
          type: 'http_request',
        },
        'RequestLoggingMiddleware',
      );
    });

    next();
  }
}
