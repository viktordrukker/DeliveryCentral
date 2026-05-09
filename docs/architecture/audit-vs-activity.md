# `AuditLog` vs `EmployeeActivityEvent` — when to use which

DeliveryCentral keeps two parallel append-only event streams. Both are
canonical, both are written from application services. They serve
different audiences and answer different questions, and conflating
them dilutes both. This page is the doctrine.

---

## The two streams

### `AuditLog` — the **forensic** ledger
*"What did anyone do, against any aggregate, that I might need to
prove or replay?"*

- **Audience:** auditors, compliance, security, incident response, an
  ops engineer chasing "who changed X at 03:14".
- **Schema:** `aggregateType` (enum) × `aggregateId` (UUID) × `eventName`
  × `actorId` × `payload` (JSON) × `prevHash`/`rowHash`/`chainSeq`
  (hash-chain over `(prevHash, payload)`).
- **Coverage:** **every** mutation in the platform. If a service
  writes to the database and the change is interesting at all,
  there's an `AuditLog` row.
- **Tone:** structured, machine-friendly, never assumed to be
  user-facing. `payload` carries the full diff or relevant fields.
- **Retention:** indefinite (subject to tenant-level retention
  policy). Tamper-evident via the chained `rowHash`.

### `EmployeeActivityEvent` — the **person timeline** feed
*"What happened to or because of this person, in plain language, so
I can show it on their profile?"*

- **Audience:** end users — managers reading a Person 360 timeline,
  HR scrolling someone's history, the person themself viewing their
  own activity.
- **Schema:** `personId` × `eventType` (string enum: `HIRED`,
  `ASSIGNED`, `UNASSIGNED`, `DEACTIVATED`, `TERMINATED`,
  `REACTIVATED`, `ROLE_CHANGED`, `ORG_UNIT_CHANGED`,
  `ASSIGNMENT_APPROVED`, `ASSIGNMENT_ENDED`, …) × `summary` (human
  text) × `actorId` × `relatedEntityId`.
- **Coverage:** the subset of platform events that matter **for a
  person's lived experience** — joins, leaves, role changes,
  assignments, terminations, etc. Things a manager would want to
  see in a feed.
- **Tone:** human-readable. The `summary` field is the rendered
  string the UI displays.
- **Retention:** matches the underlying `Person` row; archived
  alongside the person.

---

## When to write which

| Situation | Write `AuditLog`? | Write `EmployeeActivityEvent`? |
|---|---|---|
| Person is hired (`create-employee.service.ts`) | YES | YES (`HIRED`) |
| Project is activated | YES | NO (project-scoped, not person-scoped) |
| Bill rate is changed on an assignment | YES | NO (entity-scoped detail; surface via assignment audit, not person feed) |
| Person's role changes | YES | YES (`ROLE_CHANGED`) |
| RM submits a release request for a person | YES (audit on the request) | NO — wait until the release is actually approved/finalized; the *request* is a workflow event, not a person-experience event |
| HR + Director both approve the release | YES | YES (`TERMINATED`/`DEACTIVATED` once finalized) |
| A user changes their own notification preferences | YES | NO (settings change, not lived experience) |
| Director rejects a budget change | YES | NO (project/financial-scoped) |
| A `reportingLine` row is added | YES | YES (`MANAGER_CHANGED`) |
| A pulse entry is submitted | NO (high-volume, low forensic value) | NO (already its own time-series; over-cluttering the activity feed) |
| A scheduled job runs | NO (not a domain event; emit metrics instead) | NO |
| Integration sync fails | YES (`integration.sync_failed`) | NO |

### Rule of thumb

- **Write `AuditLog`** whenever a service mutates persistent state and
  the mutation has a `who`, a `what`, and a `which entity`. Even
  read-side reveals of PII (see `@AuditRead` decorator, HD-0.7) get
  audited.
- **Also write `EmployeeActivityEvent`** when the audited mutation
  visibly changes a specific person's situation in a way that you
  would expect to see on their timeline if you were that person, or
  their manager.

These overlap heavily — a hire generates BOTH. That's correct. They
answer different questions, so they live in different tables.

---

## What lives in `payload` / `summary`

- `AuditLog.payload` is **structured** JSON — keys, IDs, before/after
  values where applicable. UI consumers (the business audit page)
  format it on display. Don't pre-render strings into payload.
- `EmployeeActivityEvent.summary` is **already-rendered prose** —
  e.g., `"Sophia Kim assigned Catherine Monroe to project Atlas
  through 2026-09-30."`. The frontend renders it verbatim.

The two diverge on purpose: structured payload survives schema
evolution and is queryable; prose summary stays readable even if
metadata schema drifts.

---

## What about `OutboxEvent`?

`OutboxEvent` is a **transport** — the dual-write seam that decouples
"the database transaction succeeded" from "the notification fan-out
fired". An audit-log row can be written *inside* a $transaction; an
outbox row is written there too, then a separate publisher loop
dispatches the side-effects (email, in-app push, integration calls).

`OutboxEvent` is not an audit ledger — rows are deleted after they
publish (or moved to `FAILED`). If you need both, you write both:

```ts
await prisma.$transaction(async (tx) => {
  // 1. mutate
  await mutate(tx);
  // 2. structured forensic record
  await auditLogger.record({ ... });
  // 3. activity feed (if the mutation matters to a person)
  await activityService.recordHired({ ... });
  // 4. transport for downstream side-effects
  await outboxService.append({ ... });
});
```

(The translator's `dualDispatch` helper hides 3 + 4 behind a single
call. See `notification-event-translator.service.ts`.)

---

## What we DON'T have (and why)

- **No "audit-lite" stream.** It would just be a third table that
  drifts from `AuditLog`. If a category of mutation is too noisy
  for forensic retention, we filter it out at write time, not at
  query time.
- **No "activity timeline for non-people aggregates".** Projects,
  staffing requests, etc. have audit-log rows; their detail pages
  query AuditLog filtered by `aggregateId`. We don't replicate that
  data into a parallel activity stream — it would just diverge.

---

## Common pitfalls

1. **"Just write to the activity feed"** — and the audit ledger is
   silently bypassed. The auditors find out three quarters later. ❌
2. **"Just write to the audit log"** — and the Person 360 timeline
   shows nothing for events that should be on it. UX regression. ❌
3. **Writing both, but with diverging summaries** — `AuditLog.payload`
   says one thing, `EmployeeActivityEvent.summary` says another.
   Use the same source-of-truth string in both, or compute one from
   the other inside the same service call. ❌
4. **Writing audit rows AFTER the transaction commits** — partial
   failures lose the audit trail. Put `auditLogger.record()` inside
   the `$transaction` callback when the audit is for THE thing the
   transaction did. (Translator-driven audits are an exception
   because they fire on already-committed state.)
