# DM-R-30 — Read replica cutover

**Purpose:** isolate read traffic (dashboards, reports, analytics, audit
browsing) from the OLTP primary. Reduces blast radius: an adversarial or
runaway read query against the replica cannot stall writes, and a write
path overload does not slow reads.

## Provision a streaming replica

### Option 1 — docker-compose profile (dev / staging)

Add to `docker-compose.yml` under a `replica` profile:

```yaml
  postgres-replica:
    profiles: ['replica']
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    depends_on:
      postgres:
        condition: service_healthy
    entrypoint: ['/bin/sh', '-c']
    command: >
      'rm -rf /var/lib/postgresql/data/* &&
       PGPASSWORD=postgres pg_basebackup -h postgres -U postgres -D /var/lib/postgresql/data -Fp -R -P -X stream &&
       exec docker-entrypoint.sh postgres'
    volumes:
      - postgres-replica-data:/var/lib/postgresql/data
    ports:
      - '${POSTGRES_REPLICA_PORT:-5433}:5432'
```

Then:

```bash
docker compose --profile replica up -d
```

### Option 2 — separate host (production)

Follow the standard Postgres streaming-replication setup
(`pg_basebackup … -R`, `primary_conninfo`, `standby.signal`). Document
the IP / port / credentials in your ops vault.

## Wire the app

Set these env vars on the backend container:

```bash
READ_REPLICA_DATABASE_URL=postgresql://postgres:postgres@postgres-replica:5432/workload_tracking?schema=public
```

Restart the backend. Look for this line in startup logs:

```
[Nest] … LOG [PrismaReadReplicaService] Read-replica connected (DM-R-30).
```

If you see `READ_REPLICA_DATABASE_URL unset` instead, the service silently
aliases to the primary — safe, but replicate-first endpoints still go to
the primary until the env var is set.

## Route endpoints to the replica

Inject `PrismaReadReplicaService` (instead of `PrismaService`) into any
service that only reads. Safe candidates:

- `src/modules/dashboard/**` (all dashboard queries)
- `src/modules/reports/**`
- `src/modules/audit-observability/application/audit-query*`
- `/api/health/deep` in a read-heavy environment (optional — shallow
  `/api/health` should always stay on the primary so the probe exercises
  the primary connection).

Do **not** route writes through `PrismaReadReplicaService`. The replica
is `hot_standby = on` and rejects writes at the server; a misrouted
write fails with `ERROR: cannot execute … in a read-only transaction`.

## Verification

```bash
# 1. Replica is serving reads
docker compose exec postgres-replica psql -U postgres -d workload_tracking -c 'SELECT count(*) FROM "Person";'

# 2. Replica rejects writes
docker compose exec postgres-replica psql -U postgres -d workload_tracking -c 'DELETE FROM "Person" WHERE 1=0;'
# Expected: ERROR: cannot execute DELETE in a read-only transaction

# 3. Replication lag
docker compose exec postgres psql -U postgres -c "SELECT application_name, state, sent_lsn, write_lsn, flush_lsn, replay_lsn FROM pg_stat_replication;"
```

## Failure modes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Backend logs show READ_REPLICA_DATABASE_URL unset | env var missing | Set it + restart backend |
| Replica connect errors | replica container not healthy | `docker compose logs postgres-replica` |
| Replication lag > 1 min | primary overload OR replica slow | Scale replica; investigate primary |
| Replica rejects legit read with read-only error | misconfigured `default_transaction_read_only` | Should be off on replica (hot_standby handles it); check `SHOW default_transaction_read_only` |

## Related

- DM-R-26 connection provenance — replica connections tagged `dc::replica::<agent>::<session>`.
- DM-R-24 panic-halt — does NOT touch replica; reads keep flowing even after primary halt.
- DM-R-25 PITR — WAL archive + base backup are on primary; replica rebuilt from primary.
