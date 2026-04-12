# Mock Data Generator

## Seed Profiles

The platform now supports multiple deterministic seed profiles through `prisma/seed.ts`.

Available profiles:

- `demo`
- `bank-scale`

Default behavior remains `demo`.

## Demo Profile

The demo profile is intended for:

- local UI work
- targeted API checks
- lightweight developer flows

It keeps the dataset intentionally small and scenario-oriented.

## Bank-Scale Profile

The bank-scale profile is intended for:

- performance smoke runs
- scale-oriented validation
- realistic staffing/query pressure
- endpoint behavior checks against enterprise-sized data

Implementation:

- `prisma/seeds/bank-scale-profile.ts`

It layers deterministic generated enterprise data on top of the existing demo baseline so:

- older demo-oriented routes still remain addressable
- mixed runtime paths can still be exercised
- large-volume reads are available for durable query paths

## Generated Data Shape

The bank-scale profile generates:

- `10,240` people total
- a generated root org unit plus directorates and departments
- one team/resource pool per generated department
- `1,500+` projects
- `24k+` project assignments
- `30k+` work-evidence records

It also intentionally includes anomaly coverage for:

- orphan work evidence
- assignment-without-evidence conditions
- stale approval candidates
- closed-project staffing conflicts

## Running Profiles

Demo:

```powershell
docker compose exec -T backend npm run db:seed
```

Bank-scale:

```powershell
docker compose exec -T backend npm run db:seed:bank-scale
```

You can also select the profile directly:

```powershell
docker compose exec -T backend powershell -Command "$env:SEED_PROFILE='bank-scale'; npm run db:seed"
```

## Representative IDs

The bank-scale profile exports deterministic benchmark references used by the performance pack, including:

- department id
- employee id
- project id
- project-manager id
- HR dashboard person id
- team id
- exception-focused project id

These references come from:

- `prisma/seeds/bank-scale-profile.ts`

That keeps smoke scripts stable even as the generated dataset grows.

## Guardrails

- Seeds are deterministic.
- Seeds are configuration-driven by profile selection.
- Seeds do not replace the distinction between:
  - assignment as staffing truth
  - work evidence as observational truth
- The bank-scale profile is meant for runtime validation, not synthetic benchmark gaming.
