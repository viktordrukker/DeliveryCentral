# Contributing to DeliveryCentral

## Development Environment

**Docker is the only supported local runtime.** Do not install backend dependencies outside Docker.

```bash
# Start all services
docker compose up -d backend frontend

# Run migrations
docker compose exec backend sh -c "npx prisma migrate deploy"

# Seed demo data
docker compose exec -e SEED_PROFILE=phase2 backend sh -c "npx ts-node --transpile-only --project tsconfig.json prisma/seed.ts"

# Reset everything
docker compose down -v --remove-orphans && docker compose up -d
```

## Branch Conventions

- `main` — production-ready, always green
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `chore/<name>` — maintenance, docs, refactoring

## Before Submitting a PR

Run the PR lane locally:

```bash
# Fast backend + frontend PR checks
npm run verify:pr
```

Run the full lane before a release cut or when touching test infrastructure:

```bash
npm run verify:full
```

All checks must pass. The CI pipeline runs the same lanes in order, with fast checks ahead of DB-coupled and slower suites.

## Code Standards

- **TypeScript strict mode** — no `any` unless unavoidable
- **Prisma for all DB access** — never raw SQL in application code
- **`@RequireRoles(...)` on all controller methods** — no unguarded endpoints except `@Public()`
- **`useAuth()` for principal access** — never hardcode UUIDs
- **class-validator decorators on all write DTOs** — enables request validation
- **No in-memory stores for persistent data** — all domain data goes through Prisma

## Architecture Rules

The project enforces DDD boundaries via `dependency-cruiser`:

```
presentation/ → application/ → domain/
                application/ → infrastructure/
```

Cross-module dependencies are forbidden. Run `npm run architecture:check` to verify.

## Testing

| Layer | Command | Purpose |
|-------|---------|---------|
| Frontend | `npm --prefix frontend run test` | Vitest + React Testing Library |
| Backend Fast | `npm run test:fast` | Unit, domain, and contract suites in parallel |
| Backend DB | `npm run test:db` | Repository and integration suites with serialized DB access |
| Backend Slow | `npm run test:slow` | Performance and backend Jest e2e suites |
| Playwright Smoke | `npm run test:e2e:ui:smoke` | Merge-gate browser flow |
| Playwright Critical | `npm run test:e2e:ui:critical` | Core JTBD browser coverage |
| Playwright Full | `npm run test:e2e:ui:full` | Broad browser regression coverage |
| Architecture | `npm run architecture:check` | Dependency-cruiser |
| PR lane | `npm run verify:pr` | Default local PR validation |
| Full lane | `npm run verify:full` | Full verification including Playwright |

## Seed Data

The `phase2` profile is the canonical demo dataset:
- 32 people, 16 org units, 12 projects, 22 assignments
- 8 test accounts (one per role + admin + dual-role)
- Full coverage of timesheets, pulse, cases, notifications, skills, platform settings

See [CLAUDE.md](./CLAUDE.md) section 9 for test account credentials.
