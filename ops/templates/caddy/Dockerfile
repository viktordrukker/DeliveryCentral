# Custom Caddy build with the mholt/caddy-ratelimit module.
# The base caddy:2.9-alpine image ships only the standard handlers; the
# `rate_limit` directive used by the dual-site Caddyfile requires this
# third-party module.
FROM caddy:2.9-builder-alpine AS builder
RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit

FROM caddy:2.9-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
