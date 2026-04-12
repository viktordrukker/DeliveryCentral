# Architecture Enforcement

## Automated checks

- `npm run architecture:check`
- `npm run lint`
- `npm run test`
- `npm run contracts:validate`

## What is enforced

- bounded-context import restrictions via dependency-cruiser
- linting for TypeScript code health
- repeatable Jest execution for unit and e2e tests
- contract validation placeholder to keep API and DTO evolution explicit

## How to use

Run this before handing off any prompt result:

```bash
npm run lint
npm run test
npm run architecture:check
npm run contracts:validate
```

## Enforcement principle

Architecture rules must be executable, not only documented. If a dependency rule matters, encode it in repository automation.
