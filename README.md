# Workload Tracking Platform

Enterprise workload tracking platform centered on internal staffing truth, organizational visibility, and externally sourced work evidence.

## Docker-only localhost policy

Local runtime is supported through Docker and Docker Compose only.

Unsupported for localhost runtime:
- running backend directly on the host
- running frontend directly on the host
- running PostgreSQL directly on the host
- running Prisma migrate or seed directly on the host

Host `npm` scripts still exist for CI and container-internal workflows, but the supported developer runtime path is Docker-only.

## Core rules

- `ProjectAssignment` is authoritative only inside this platform.
- Jira must not create or mutate staffing truth.
- `WorkEvidence` is observational and separate from formal assignment truth.
- External integrations are isolated behind adapters and anti-corruption boundaries.
- Internal `Project` identity remains distinct from external project links.

## Prerequisites

- Docker Desktop or Docker Engine with Docker Compose v2
- an available localhost port set for PostgreSQL, backend, and frontend

## Localhost quick start

1. Copy the environment file.

```bash
cp .env.example .env
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

2. Build the container images.

```bash
docker compose build
```

3. Start PostgreSQL first if you want explicit staged startup.

```bash
docker compose up -d postgres
```

4. Apply Prisma migrations inside Docker.

```bash
docker compose run --rm migrate
```

5. Seed the deterministic demo dataset inside Docker.

```bash
docker compose --profile tools run --rm seed
```

6. Start backend and frontend in Docker.

```bash
docker compose up -d backend frontend
```

7. Open the platform.

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/health`
- Backend readiness: `http://localhost:3000/api/readiness`
- Backend diagnostics: `http://localhost:3000/api/diagnostics`
- Swagger/OpenAPI UI: `http://localhost:3000/api/docs`
- Monitoring UI: `http://localhost:8081` after `docker compose --profile monitoring up -d monitoring monitoring-agent`
- Monitoring agent health: `http://localhost:8686/health`

If you change `BACKEND_PORT` or `FRONTEND_PORT` in `.env`, keep `PUBLIC_API_BASE_URL` and `CORS_ORIGIN` aligned with those port changes.

## Common Docker commands

Start the full developer stack after env setup:

```bash
docker compose up -d backend frontend
```

See running containers:

```bash
docker compose ps
```

Follow logs:

```bash
docker compose logs -f backend frontend postgres
```

Start the separate monitoring/log viewer:

```bash
docker compose --profile monitoring up -d monitoring monitoring-agent
```

Stop the stack:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v --remove-orphans
```

## Optional Docker wrapper scripts

These wrappers call Docker only. They are optional shortcuts, not the primary documented flow.

- `npm run local:build`
- `npm run local:up`
- `npm run local:down`
- `npm run local:logs`
- `npm run local:migrate`
- `npm run local:seed`
- `npm run local:reset`

## PowerShell one-click helpers

Windows-friendly Docker-only helpers are available in [`scripts/`](C:\VDISK1\DeliveryCentral\scripts):

- [local-platform.ps1](C:\VDISK1\DeliveryCentral\scripts\local-platform.ps1)
- [local-launch.ps1](C:\VDISK1\DeliveryCentral\scripts\local-launch.ps1)
- [local-restart.ps1](C:\VDISK1\DeliveryCentral\scripts\local-restart.ps1)
- [local-stop.ps1](C:\VDISK1\DeliveryCentral\scripts\local-stop.ps1)

Examples:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\local-platform.ps1 launch -Seed
powershell -ExecutionPolicy Bypass -File .\scripts\local-platform.ps1 restart
powershell -ExecutionPolicy Bypass -File .\scripts\local-platform.ps1 stop
```

Double-clickable wrappers:
- `scripts/local-launch.ps1`
- `scripts/local-restart.ps1`
- `scripts/local-stop.ps1`

Each PowerShell run writes a transcript log under `logs/`. If a double-clicked wrapper fails, the window stays open and prints the saved log path before closing.

## Seed datasets

Three seed profiles are available. Pass the profile via environment variable when running the seed job inside the backend container:

```bash
# Default demo dataset (runs automatically on first seed)
docker compose --profile tools run --rm seed

# Phase 2 — expanded mock org with 32 people, 12 projects, 8 test accounts
docker compose exec -e SEED_PROFILE=phase2 backend sh -c \
  "npx ts-node --project tsconfig.json prisma/seed.ts"
```

### Phase 2 test accounts

| Email | Password | Roles |
|-------|----------|-------|
| `noah.bennett@example.com` | `DirectorPass1!` | `director` |
| `diana.walsh@example.com` | `HrManagerPass1!` | `hr_manager` |
| `sophia.kim@example.com` | `ResourceMgrPass1!` | `resource_manager` |
| `lucas.reed@example.com` | `ProjectMgrPass1!` | `project_manager` |
| `carlos.vega@example.com` | `DeliveryMgrPass1!` | `delivery_manager` |
| `ethan.brooks@example.com` | `EmployeePass1!` | `employee` |
| `emma.garcia@example.com` | `DualRolePass1!` | `resource_manager`, `hr_manager` |

### Demo dataset

The default demo dataset covers:
- directorates, departments, and resource pools
- people and reporting lines
- internal and Jira-linked projects
- assignments and approval states
- work evidence separated from staffing truth
- metadata dictionaries and customization fixtures

See [demo dataset documentation](docs/demo/demo-dataset.md).

## Testing and quality

Primary testing and architecture docs:
- [Testing strategy](docs/testing/testing-strategy.md)
- [Domain invariants](docs/testing/domain-invariants.md)
- [API integration tests](docs/testing/api-integration-tests.md)
- [Persistence tests](docs/testing/persistence-tests.md)
- [UI tests](docs/testing/ui-tests.md)
- [E2E tests](docs/testing/e2e-tests.md)
- [Planning pack](docs/planning/README.md)
- [Architecture enforcement](docs/engineering/architecture-enforcement.md)
- [Monitoring and logging](docs/infra/monitoring.md)
- [Observability integration](docs/infra/observability-integration.md)

## Docker deployment guide

For the full localhost deployment flow, env reference, troubleshooting, and reset guidance, see [localhost Docker deployment](docs/deployment/localhost-docker.md).
