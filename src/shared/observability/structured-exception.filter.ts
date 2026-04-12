import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

import { StructuredLoggerService } from './logger.service';

@Catch()
export class StructuredExceptionFilter implements ExceptionFilter {
  public constructor(private readonly logger: StructuredLoggerService) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { method?: string; url?: string }>();
    const response = http.getResponse<{
      headersSent?: boolean;
      json: (body: unknown) => void;
      status: (statusCode: number) => { json: (body: unknown) => void };
    }>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;

    // For non-HTTP exceptions (e.g. Prisma errors), never expose internal details to clients.
    const message = isHttpException
      ? (typeof exceptionResponse === 'string'
          ? exceptionResponse
          : typeof exceptionResponse === 'object' &&
              exceptionResponse !== null &&
              'message' in exceptionResponse
            ? (exceptionResponse as { message?: string | string[] }).message ?? 'An error occurred'
            : 'An error occurred')
      : 'An unexpected error occurred';

    const errorName = isHttpException
      ? (typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'error' in exceptionResponse
          ? String((exceptionResponse as { error?: unknown }).error ?? 'HttpException')
          : 'HttpException')
      : 'InternalServerError';

    this.logger.errorEvent(
      {
        errorName,
        message: Array.isArray(message) ? message.join(', ') : message,
        method: request?.method,
        path: request?.url,
        stack: exception instanceof Error ? exception.stack : undefined,
        type: 'http_exception',
      },
      'StructuredExceptionFilter',
    );

    if (response?.headersSent) {
      return;
    }

    response.status(statusCode).json({
      error: errorName,
      message,
      statusCode,
    });
  }
}
