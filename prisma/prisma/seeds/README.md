# Seeds

This directory contains deterministic seed modules used by `prisma/seed.ts`.

Current seeds:

- `it-company-profile.ts` — the **only** seed-time profile (200-person
  custom-software-development scenario, ~23k rows across 24 tables).
- `demo-dataset.ts` — runtime fixture imported by ~26 in-memory test
  repositories and test factories. **Not** wired up as a seed profile.
  Retained until the in-memory paths are migrated off it.

Legacy profiles (`phase2`, `life-demo`, `investor-demo`, `realistic`)
were removed as part of the DM-R-11 closure on 2026-05-01 — their
datasets pre-dated several schema additions and would have produced
rows missing fields the runtime now requires.

Pipelines:

- Dev: `docker compose exec -e SEED_PROFILE=it-company backend …`
- Staging: `gh workflow run build-and-stage.yml -f run_seed=true …`
- Prod: `gh workflow run promote-to-prod.yml -f run_seed=true -f seed_confirm=WIPE-PROD-DB …`

See CLAUDE.md § 10 for the canonical commands and
`memory/project-seeding-flow.md` for the design rationale.
