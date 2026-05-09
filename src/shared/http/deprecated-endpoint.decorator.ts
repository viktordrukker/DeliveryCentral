import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key the {@link DeprecatedEndpointInterceptor} reads to emit
 * `Deprecation` / `Sunset` / `Link` headers and log a structured warning
 * when a deprecated route is invoked.
 */
export const DEPRECATED_ENDPOINT_KEY = 'deprecated_endpoint';

export interface DeprecatedEndpointMetadata {
  /** ISO date the endpoint will be removed. Surfaced as the `Sunset` header (RFC 8594). */
  sunsetIso: string;
  /** Canonical path that replaces this endpoint. Surfaced as `Link: <…>; rel="successor-version"`. */
  successorPath: string;
  /** Stable label used in logs / metrics. Lower-snake-case, dot-separated. */
  label: string;
}

/**
 * Marks a controller method as deprecated. Cooperates with
 * {@link DeprecatedEndpointInterceptor}, which converts this metadata into
 * standards-compliant response headers and a logger warning.
 *
 * @example
 *   @DeprecatedEndpoint({
 *     sunsetIso: '2026-08-01',
 *     successorPath: '/assignments/:id/book',
 *     label: 'assignment.legacy.approve',
 *   })
 *   public async approveAssignment(...) { ... }
 */
export function DeprecatedEndpoint(metadata: DeprecatedEndpointMetadata) {
  return SetMetadata(DEPRECATED_ENDPOINT_KEY, metadata);
}
