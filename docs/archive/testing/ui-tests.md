# UI Tests

## Purpose

The frontend test layer verifies visible user outcomes for the highest-value pages and shared shell behavior without duplicating backend integration coverage.

## Scope

UI tests should cover:

- loading states
- empty states
- error states
- successful data rendering
- user-triggered navigation
- form validation and submission feedback

UI tests should not over-specify:

- CSS class names
- spacing, color, or typography details
- backend business rules already covered by domain or API integration tests

## Shared Utilities

Frontend UI tests use shared helpers under [`frontend/test`](C:\VDISK1\DeliveryCentral\frontend\test):

- [`api-mocks.ts`](C:\VDISK1\DeliveryCentral\frontend\test\api-mocks.ts)
- [`render-route.tsx`](C:\VDISK1\DeliveryCentral\frontend\test\render-route.tsx)
- fixture builders in `frontend/test/fixtures/*`

The `@test/*` alias is available in Vitest for these helpers.

## Fixture Policy

Use deterministic fixture builders instead of inline anonymous payloads.

Current seeded UI fixtures include:

- person directory
- project registry
- dashboard summary
- assignment form options and submit payloads

Fixture builders should:

- mirror frontend API contracts
- provide realistic defaults
- allow targeted overrides per test

## Current Coverage Focus

Priority pages standardized on the shared harness:

- employee directory
- project registry
- create assignment form
- workload dashboard

Existing route tests also cover:

- employee details
- project details
- assignments list and workflow details
- manager scope
- work evidence
- planned vs actual
- integrations
- metadata admin
- org chart

## Authoring Pattern

1. Mock the API module used by the page.
2. Build the response with a fixture helper.
3. Render with `renderRoute(...)`.
4. Assert the visible user outcome, not implementation details.

## Commands

Run frontend UI tests with:

```bash
npm --prefix frontend run test
```

Use watch mode during implementation:

```bash
npm --prefix frontend run test:watch
```

## Boundaries

UI tests must stay UI-focused:

- no direct database access
- no transport-layer contract assertions better suited for backend integration tests
- no hardcoded business dictionaries inside tests unless they are explicit fixture inputs
