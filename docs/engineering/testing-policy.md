# Testing Policy

## Required test posture

- Add tests before or alongside implementation.
- Prefer domain-level tests first for new bounded-context logic.
- Add controller or API tests when endpoints are introduced.
- Keep in-memory repositories for fast, isolated domain testing.

## Minimum expectations per prompt

- new behavior has direct test coverage
- boundary-sensitive behavior has explicit regression tests
- adapter logic is covered without requiring live external systems
- tests must not depend on Jira or other provider uptime

## Test layers

- unit tests: entities, value objects, domain services, mapping logic
- application tests: orchestration services and use cases
- e2e tests: Nest bootstrap and public endpoints

## Forbidden shortcuts

- no skipping tests because implementation is “just scaffolding”
- no mixing unrelated domain assertions in one broad smoke test
- no silent mutation of authoritative aggregates without tests proving the rule
