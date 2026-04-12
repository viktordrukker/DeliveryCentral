# Frontend Test Utilities

This directory contains reusable UI-test infrastructure:

- `api-mocks.ts`: deferred and pending promise helpers for loading/error-state tests
- `render-route.tsx`: shared router render helper for route and navigation tests
- `fixtures/`: deterministic page and API fixtures reused across UI tests

Use these helpers instead of inlining mock payloads or custom router wrappers in each test file.
