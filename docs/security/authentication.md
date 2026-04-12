# Authentication

## Scope

The platform now resolves authenticated principals from signed bearer tokens instead of trusting caller-supplied identity headers.

This keeps authentication separate from RBAC:

- authentication establishes who the caller is
- RBAC decides what that caller is allowed to do

## Runtime model

Normal runtime expects:

- `Authorization: Bearer <token>`

Validated token fields:

- `iss`
- `aud`
- `sub`
- `roles` or `platform_roles`
- optional `person_id`

Current implementation uses an HMAC-signed JWT boundary suitable for local and controlled deployment environments. The principal model is intentionally aligned with future OIDC-compatible provider integration so Entra/OIDC adoption can reuse the same RBAC layer.

## Configuration

Relevant env vars:

- `AUTH_ISSUER`
- `AUTH_AUDIENCE`
- `AUTH_JWT_SECRET`
- `AUTH_ALLOW_TEST_HEADERS`
- `AUTH_DEV_BOOTSTRAP_ENABLED`
- `AUTH_DEV_BOOTSTRAP_USER_ID`
- `AUTH_DEV_BOOTSTRAP_PERSON_ID`
- `AUTH_DEV_BOOTSTRAP_ROLES`

Recommended defaults:

- keep `AUTH_ALLOW_TEST_HEADERS=false`
- keep `AUTH_DEV_BOOTSTRAP_ENABLED=false` unless you deliberately want a non-production bootstrap identity

## Local Docker token generation

For local Docker-only development, mint a signed bearer token inside the backend container:

```powershell
docker compose run --rm backend npx ts-node --transpile-only --project tsconfig.json scripts/mint-auth-token.ts --subject local-admin --person-id 11111111-1111-1111-1111-111111111004 --roles admin
```

Example with multiple roles:

```powershell
docker compose run --rm backend npx ts-node --transpile-only --project tsconfig.json scripts/mint-auth-token.ts --subject local-manager --person-id 11111111-1111-1111-1111-111111111005 --roles project_manager,director
```

Use the returned token as:

```text
Authorization: Bearer <token>
```

## Test-only fallback

The old raw header path is retained only as an explicit non-production fallback:

- `AUTH_ALLOW_TEST_HEADERS=true`

When enabled, the backend can accept:

- `x-platform-user-id`
- `x-platform-roles`

This path exists to keep narrow test scenarios practical. It must stay disabled in normal runtime.

## Self-scope support

The auth layer now supports optional self-scope metadata.

This makes it possible to express policies like:

- employee can access their own dashboard
- HR/admin can access broader organizational views

That scaffolding is available without changing the core RBAC model.

## Security notes

- never expose `AUTH_JWT_SECRET` in frontend code or browser-visible config
- never rely on `x-platform-*` headers as real authentication in normal runtime
- rotate shared secrets outside version control
- keep production issuer/audience values environment-driven
