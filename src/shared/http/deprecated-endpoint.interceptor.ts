import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import {
  DEPRECATED_ENDPOINT_KEY,
  DeprecatedEndpointMetadata,
} from './deprecated-endpoint.decorator';

interface ExpressLikeResponse {
  setHeader?: (name: string, value: string) => void;
}
interface ExpressLikeRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
}

/**
 * Reads {@link DEPRECATED_ENDPOINT_KEY} metadata. When present:
 *   - Sets `Deprecation: true` (RFC 8594).
 *   - Sets `Sunset: <RFC1123 from sunsetIso>`.
 *   - Sets `Link: </api/v1/<successorPath>>; rel="successor-version"`.
 *   - Logs a single structured warning per call carrying the stable `label`,
 *     so dashboards / log queries can count adoption progress.
 *
 * Counts can later be exposed as a Prom counter (HD-11); the warn line is
 * the first-class signal until then.
 */
@Injectable()
export class DeprecatedEndpointInterceptor implements NestInterceptor {
  private readonly logger = new Logger('DeprecatedEndpoint');

  public constructor(private readonly reflector: Reflector) {}

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<DeprecatedEndpointMetadata | undefined>(
      DEPRECATED_ENDPOINT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const response = http.getResponse<ExpressLikeResponse>();
    const request = http.getRequest<ExpressLikeRequest>();

    if (response.setHeader) {
      response.setHeader('Deprecation', 'true');
      response.setHeader('Sunset', new Date(metadata.sunsetIso).toUTCString());
      response.setHeader(
        'Link',
        `<${metadata.successorPath}>; rel="successor-version"`,
      );
    }

    this.logger.warn(
      JSON.stringify({
        event: 'legacy_endpoint_call',
        label: metadata.label,
        sunset: metadata.sunsetIso,
        successor: metadata.successorPath,
        method: request.method,
        path: request.originalUrl ?? request.url,
      }),
    );

    return next.handle().pipe(
      tap({
        // No-op — kept so future logic (e.g., increment a metric on success)
        // can plug in here without changing the contract.
      }),
    );
  }
}
