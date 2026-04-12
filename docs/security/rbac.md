# RBAC

## Scope

The platform now enforces a lightweight role-based access control layer at the HTTP boundary.

This is the authorization layer that sits on top of authenticated request principals.

## Roles

- `employee`
- `project_manager`
- `resource_manager`
- `director`
- `hr_manager`
- `admin`

## Principal model

Request principals are resolved from bearer tokens:

- `Authorization: Bearer <token>`

The token boundary is intentionally compatible with standard OAuth/OIDC-style bearer authentication:

- `iss` is validated against configured issuer
- `aud` is validated against configured audience
- `sub` becomes the authenticated principal user id
- `roles` or `platform_roles` populate platform roles
- optional `person_id` can support self-scope decisions

The RBAC guard consumes an extensible principal object, so route policy stays stable while the authentication source evolves.

## Roles

Role semantics remain unchanged:

- `employee`
- `project_manager`
- `resource_manager`
- `director`
- `hr_manager`
- `admin`

## Enforcement

### Assignment creation

`POST /assignments` requires one of:

- `project_manager`
- `resource_manager`
- `director`
- `admin`

### Organization modification

The following endpoints require one of:

- `hr_manager`
- `director`
- `admin`

Endpoints:

- `POST /org/people`
- `POST /org/people/{id}/deactivate`

`POST /org/reporting-lines` requires one of:

- `resource_manager`
- `hr_manager`
- `director`
- `admin`

### Project closure

`POST /projects/{id}/close` requires one of:

- `project_manager`
- `director`
- `admin`

## Failure behavior

- missing principal or missing roles -> `401`
- principal present but lacking required role -> `403`

## Extensibility

- roles are stored as an array on the request principal
- multiple roles per principal are supported
- route policy is declared through role metadata rather than hardcoded in service logic
- optional self-scope metadata can be layered on top of role checks without rewriting controllers

## Test and local-runtime notes

- normal runtime no longer trusts raw `x-platform-*` headers as identity
- a non-production header bypass can be enabled explicitly through `AUTH_ALLOW_TEST_HEADERS=true` for targeted test scenarios only
- local Docker development can use signed bearer tokens generated with the repository helper script described in [authentication.md](./authentication.md)
