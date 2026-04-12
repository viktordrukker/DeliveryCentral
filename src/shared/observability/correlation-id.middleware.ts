import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

import { CORRELATION_ID_HEADER } from './observability.constants';
import { CorrelationIdContext } from './correlation-id.context';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  public use(request: Request, response: Response, next: NextFunction): void {
    const correlationId = request.header(CORRELATION_ID_HEADER) ?? randomUUID();

    request.headers[CORRELATION_ID_HEADER] = correlationId;
    response.setHeader(CORRELATION_ID_HEADER, correlationId);

    CorrelationIdContext.run(correlationId, next);
  }
}
