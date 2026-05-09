import { SetMetadata } from '@nestjs/common';

// HD-0.4 — `@Idempotent()` opts a controller method into front-door
// idempotency caching. Pairs with `IdempotencyInterceptor`, which
// reads the `Idempotency-Key` header, replays cached COMPLETED
// responses, and rejects concurrent duplicates with 409.
//
// The decorator is a marker only; behaviour lives on the interceptor.
// We use a marker (rather than auto-applying to every POST) so the
// interceptor only touches endpoints that actually want to be safe to
// retry — money/state-changing mutations — and not throwaways like
// login or telemetry beacons.

export const IDEMPOTENT_KEY = 'idempotent_endpoint';

export interface IdempotentMetadata {
  // TTL after which the cached row stops being a replay candidate.
  // Default 24h. Set lower if the endpoint deals with rapidly-changing
  // state where a stale replay would be worse than re-running.
  ttlSeconds?: number;
}

export function Idempotent(metadata: IdempotentMetadata = {}) {
  return SetMetadata(IDEMPOTENT_KEY, metadata);
}
