/**
 * Configuration for the {@link PublicIdSerializerInterceptor}.
 *
 * `enabled` controls whether the interceptor runs at all:
 *   - `false` (default) — interceptor is registered as `APP_INTERCEPTOR` but
 *     short-circuits to passthrough. Recommended posture during the multi-week
 *     DM-2.5 rollout, because scanning every response for UUIDs and logging
 *     every unmigrated aggregate's payload would drown the logs. Flip to
 *     `true` per-env when aggregates start migrating.
 *   - `true` — interceptor performs id↔publicId rewrite and residual-UUID
 *     detection on every response.
 *
 * `strict` controls how an enabled interceptor reacts to a uuid-shaped string
 * that survived the egress rewrite:
 *   - `true` — throw (fails the request; useful in tests / CI to catch leaks).
 *   - `false` — log at WARN and pass the value through.
 */
export interface PublicIdSerializerConfig {
  enabled: boolean;
  strict: boolean;
}

export const PUBLIC_ID_SERIALIZER_CONFIG = Symbol.for('PUBLIC_ID_SERIALIZER_CONFIG');

export const DEFAULT_PUBLIC_ID_SERIALIZER_CONFIG: PublicIdSerializerConfig = {
  enabled: false,
  strict: false,
};
