# Test Layout

This directory is organized by test intent rather than only by bounded context.

- `unit`: isolated helpers and utilities
- `domain`: business invariants
- `repository`: persistence adapter behavior
- `integration`: backend slice integration
- `contracts`: stable API response contracts
- `e2e`: smoke and end-to-end flows
- `performance`: baseline timing and resilience scenarios
- `scenarios`: named enterprise scenarios
- `fixtures`: deterministic shared data
- `factories`: focused builders for test setup
- `helpers`: shared utilities for API clients, fixture loading, and database reset

Existing bounded-context suites remain in place and can be gradually re-homed when doing meaningful test maintenance.
