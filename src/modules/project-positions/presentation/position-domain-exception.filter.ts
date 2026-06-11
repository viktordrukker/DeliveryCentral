import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';

import { OptimisticConcurrencyConflictError } from '../domain/repositories/project-position-repository.port';
import {
  InvalidPositionFillTransitionError,
  PositionFillTransitionErrorKind,
} from '../domain/value-objects/position-fill-status';

const STATUS_BY_TRANSITION_ERROR_KIND: Record<PositionFillTransitionErrorKind, HttpStatus> = {
  MISSING_EDGE: HttpStatus.CONFLICT, // state conflict — edge does not exist from the current status
  ROLE_FORBIDDEN: HttpStatus.FORBIDDEN,
  MISSING_REASON: HttpStatus.BAD_REQUEST,
  MISSING_PERSON: HttpStatus.BAD_REQUEST,
};

/**
 * Module-scoped filter mapping project-positions domain errors to HTTP
 * statuses. Without it every state-machine rejection surfaced as an opaque
 * 500 "An unexpected error occurred" via the global catch-all filter —
 * invalid edge, role rejection, missing reason, and version conflict were
 * indistinguishable to clients.
 *
 * Mapping:
 *   - missing edge (no transition from current status)   → 409
 *   - actor roles not allowed on the edge                → 403
 *   - missing required reason                            → 400
 *   - optimistic-concurrency version conflict            → 409
 *
 * The original domain error message is preserved in the response body
 * (same `{ error, message, statusCode }` shape as `StructuredExceptionFilter`).
 * All other exceptions fall through to the global filter.
 */
@Catch(InvalidPositionFillTransitionError, OptimisticConcurrencyConflictError)
export class PositionDomainExceptionFilter implements ExceptionFilter {
  public catch(
    exception: InvalidPositionFillTransitionError | OptimisticConcurrencyConflictError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<{
      status: (statusCode: number) => { json: (body: unknown) => void };
    }>();
    const statusCode =
      exception instanceof InvalidPositionFillTransitionError
        ? STATUS_BY_TRANSITION_ERROR_KIND[exception.kind]
        : HttpStatus.CONFLICT;
    response.status(statusCode).json({
      error: exception.name,
      message: exception.message,
      statusCode,
    });
  }
}
