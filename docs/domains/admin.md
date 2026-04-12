# Admin Configuration

## Purpose

`GET /admin/config` provides a unified backend read for operational/admin pages that need platform configuration context without stitching multiple backend calls together on the client.

## Current sections

- `dictionaries`
- `integrations`
- `systemFlags`

## Design rules

- read-only aggregation only
- each section stays owned by its source bounded context
- the admin endpoint composes summaries rather than becoming the source of truth
- the response shape is extensible by adding new arrays or fields without changing the ownership model of metadata, integrations, or runtime configuration

## Current sources

### Dictionaries

Drawn from the Metadata module dictionary query slice.

The admin endpoint returns summary-level rows so operators can see:

- which dictionaries exist
- which entity types they apply to
- how many entries they contain
- whether they are system-managed

### Integrations config

Drawn from integration status services.

The first implementation exposes Jira integration configuration/status summaries including:

- provider
- availability status
- capability flags
- latest sync outcome summary when available

### System flags

Drawn from application configuration.

The first implementation exposes environment-backed flags that are useful for admin visibility, such as:

- development-mode indication
- workspend-summary availability
- browser API access expectations

## Security

This endpoint is restricted to the `admin` role.

It is intended for admin/ops pages and should not expose secrets or low-level credentials.
