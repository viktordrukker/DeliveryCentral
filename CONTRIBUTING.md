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

Run all quality checks:

```bash
# Backend TypeScript
node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit

# Frontend tests (53 files, 265+ tests)
npm --prefix frontend run test

# Backend unit tests
npm run test:unit

# Lint
npm run lint
```

All checks must pass. The CI pipeline runs these automatically on every PR.

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
| Backend Unit | `npm run test:unit` | Jest unit tests |
| Backend Integration | `npm run test:integration` | Requires running DB |
| Architecture | `npm run architecture:check` | Dependency-cruiser |
| All | `npm run test:all` | Full suite |

## Seed Data

The `phase2` profile is the canonical demo dataset:
- 32 people, 16 org units, 12 projects, 22 assignments
- 8 test accounts (one per role + admin + dual-role)
- Full coverage of timesheets, pulse, cases, notifications, skills, platform settings

See [CLAUDE.md](./CLAUDE.md) section 9 for test account credentials.
