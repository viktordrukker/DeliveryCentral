# Persistence Tests

## Purpose
These tests verify that Prisma-backed repositories preserve the domain model and honor database constraints.

## Location
- `test/integration/repositories`
- shared DB helpers under `test/helpers/db`

## Required environment
Set one of:
- `TEST_DATABASE_URL`
- `DATABASE_URL`

The persistence suite expects a PostgreSQL database with the project schema already migrated.

## Helpers
- `create-test-prisma-client.ts`: creates a Prisma client bound to the test database URL
- `create-app-prisma-client.ts`: creates a Prisma client bound to the same database URL the Nest app runtime uses
- `reset-persistence-test-database.ts`: truncates test tables between runs
- `seed-persistence-reference-data.ts`: inserts the minimal foreign-key graph required by repository tests
- `seed-demo-organization-runtime-data.ts`: inserts the deterministic organization runtime graph used by app-backed organization tests
- `seed-demo-project-runtime-data.ts`: inserts deterministic demo projects, external links, and sync state for app-backed runtime tests
- `seed-demo-assignment-runtime-data.ts`: inserts deterministic assignment rows, approvals, and history for app-backed assignment reads
- `seed-demo-work-evidence-runtime-data.ts`: inserts deterministic work evidence sources, evidence rows, and evidence links for app-backed analytics tests

## Covered scenarios
- duplicate external key violation for project external links
- assignment persistence independent from work evidence persistence
- dotted-line reporting persisted alongside solid-line reporting
- person directory queries sourced from persisted organization records
- team/resource-pool membership persistence
- organization runtime persistence across application restart
- assignment repository persistence independent from work evidence persistence
- assignment runtime persistence across application restart
- project runtime persistence across application restart
- external sync state persistence for linked projects
- work evidence persistence across application restart
- assignment approval and history rows preserved across lifecycle transitions
- archived external link does not delete the internal project
- metadata/custom field persistence with foreign-key enforcement
- onboarding case persistence and participant storage

## Commands
Use the repository and integration layers together:
- `npm run test:repository`
- `npm run test:integration`

Focused organization persistence checks:
- `docker compose run --rm backend npm test -- test/integration/repositories/organization-directory-query.repository.integration.spec.ts --runInBand`
- `docker compose run --rm backend npm test -- test/integration/repositories/organization-team.store.integration.spec.ts --runInBand`
- `docker compose run --rm backend npm test -- test/integration/api/organization-runtime.persistence.integration.spec.ts --runInBand`

Focused assignment persistence checks:
- `docker compose run --rm backend npm test -- test/integration/repositories/assignments.repository.integration.spec.ts --runInBand`
- `docker compose run --rm backend npm test -- test/integration/api/assignment-runtime.persistence.integration.spec.ts --runInBand`

Focused project persistence checks:
- `docker compose run --rm backend npm test -- test/integration/repositories/project-registry.repository.integration.spec.ts --runInBand`
- `docker compose run --rm backend npm test -- test/integration/api/project-runtime.persistence.integration.spec.ts --runInBand`

Focused work-evidence persistence checks:
- `docker compose run --rm backend npm test -- test/integration/repositories/work-evidence.repository.integration.spec.ts --runInBand`
- `docker compose run --rm backend npm test -- test/integration/api/work-evidence-runtime.persistence.integration.spec.ts --runInBand`

## Scope note
These tests do not replace domain tests. Domain invariants stay under `test/domain`; persistence tests prove mapping fidelity, relational integrity, and repository query behavior against the actual database.
