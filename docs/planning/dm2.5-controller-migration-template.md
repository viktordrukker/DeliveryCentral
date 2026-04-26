# DM-2.5-8 — Per-Aggregate Controller Migration Template

**Status:** v1.0 · 2026-04-18
**Scope:** one aggregate at a time, following the order Tenant → Person → Project → ProjectAssignment → Case → StaffingRequest → TimesheetWeek → Notification → Skill → PeriodLock → PersonCostRate → ProjectBudget → LeaveRequest.
**Prerequisite:** the aggregate's DM-2 expand migration must be applied in production **before** release N+1 of this template ships (so `publicId` is populated on every row the serializer might return).

The whole programme runs this template once per aggregate. Never bundle two aggregates in one PR — blast radius multiplies.

---

## 1. Make sure the aggregate is registered

Each of these must be in place before any controller code flips:

1. **`MODEL_TO_AGGREGATE_TYPE`** in [src/infrastructure/public-id/aggregate-type.ts](../../src/infrastructure/public-id/aggregate-type.ts) contains an entry `<ModelName>: AggregateType.<X>`.
2. **`AGGREGATE_ROOTS_REQUIRING_PUBLIC_ID`** in [scripts/check-schema-conventions.cjs](../../scripts/check-schema-conventions.cjs) contains the model name — the `public-id-missing` lint then enforces that the Prisma model has a `publicId` field.
3. The aggregate's Prisma model declares `publicId String? @unique @db.VarChar(32)`.
4. The production DB has the `publicId` column + backfill in place (via the DM-2 expand migration).

If any of the above is missing, fix it **before** touching controllers.

---

## 2. Sub-phase A — Expose `publicId` in DTOs (additive, release N)

Non-breaking. Existing clients keep working; new clients can start using `publicId`.

### DTO changes

For every DTO that currently exposes `id: string` for this aggregate:
- Add `publicId!: string` (required on responses, forbidden on requests).
- Keep `id: string` for now — the runtime `PublicIdSerializerInterceptor` (DM-2.5-5) will rewrite `id` to the publicId value when both fields are present. Once DM-2.5-11 drops UUID acceptance we remove `id`.
- For any foreign-key `<name>Id` field, add a sibling `<name>PublicId` string. The serializer rewrites `<name>Id` to the foreign entity's `publicId`.

The `controller-uuid-leak` lint (DM-2.5-7) then drops the DTO's entry from the baseline.

### Service changes

Wherever the service `.select()`s or maps rows for this aggregate:
- `select: { id: true, publicId: true, ... }` — always include `publicId`.
- When mapping rows to DTOs, include both `id: r.id` and `publicId: r.publicId!`.
- For sibling FK entities included in the payload, join + select their `publicId`:
  ```ts
  include: { project: { select: { id: true, publicId: true, name: true } } }
  ```
  and emit both `projectId` and `projectPublicId` in the DTO (the serializer merges them on egress).

### Validators

Request DTOs whose fields take an identifier:
- If the field names an identifier for **this** aggregate, type it as `publicId: string` and validate with the shape `/^<prefix>_[A-Za-z0-9]{10,}$/` via `@Matches`.
- If the field names a foreign-aggregate identifier, same pattern but with that aggregate's prefix.
- Remove any `@Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-…/)` UUID regex. UUIDs are not valid inputs.

### Runtime wiring (first migrated aggregate only)

The **first aggregate to migrate** also wires the two global pieces:

**a.** Register `PublicIdSerializerInterceptor` as `APP_INTERCEPTOR` in `src/app.module.ts`:

```ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PublicIdSerializerInterceptor } from '@src/infrastructure/public-id';

@Module({
  // ...
  providers: [
    { provide: APP_INTERCEPTOR, useClass: PublicIdSerializerInterceptor },
  ],
})
export class AppModule {}
```

The interceptor is a no-op on objects without a sibling `publicId`, so turning it on does not break existing endpoints. In test mode it **throws** on any residual UUID in a response — fix those tests by updating DTOs/services to return publicId.

**b.** Install the Prisma middleware. Two equally acceptable options:

Option (b.1) — constructor-injection in `PrismaService`:
```ts
public constructor(appConfig: AppConfig, publicIdService: PublicIdService) {
  super({ /* ... */ });
  registerPublicIdMiddleware(this, publicIdService);
}
```

Option (b.2) — a separate `@Injectable() PublicIdBootstrapService` with `onModuleInit` that calls `registerPublicIdMiddleware`:
```ts
@Injectable()
export class PublicIdBootstrapService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicIdService: PublicIdService,
  ) {}
  onModuleInit() {
    registerPublicIdMiddleware(this.prisma, this.publicIdService);
  }
}
```
Pick (b.2) if we want zero changes to `PrismaService`.

From this point on, every `prisma.<model>.create` that targets a model in `MODEL_TO_AGGREGATE_TYPE` auto-populates `publicId`.

---

## 3. Sub-phase B — Accept `publicId` on path params (release N+1)

Flip every controller route that today does `@Param('<x>Id') id: string` over to the pipe:

```ts
@Get(':skillId')
public async getOne(
  @Param('skillId', ParsePublicId(AggregateType.Skill)) skillPublicId: string,
) {
  return this.service.getByPublicId(skillPublicId);
}
```

The service method resolves publicId → internal uuid once, at the repository boundary:

```ts
public async getByPublicId(publicId: string): Promise<SkillDto> {
  const skill = await this.prisma.skill.findUnique({ where: { publicId } });
  if (!skill) throw new NotFoundException(`Skill ${publicId} not found`);
  return this.toDto(skill);
}
```

**Two-release backwards compatibility:** during release N+1 you may want a transitional helper that accepts either UUID or publicId. Keep it tight: one helper, used only while frontend catches up. Remove in release N+2.

```ts
// transitional; removed in DM-2.5-11
public async getByIdOrPublicId(idOrPublicId: string): Promise<SkillDto> {
  const where = publicIdService.isValidShape(idOrPublicId, AggregateType.Skill)
    ? { publicId: idOrPublicId }
    : { id: idOrPublicId };
  const skill = await this.prisma.skill.findUnique({ where });
  if (!skill) throw new NotFoundException();
  return this.toDto(skill);
}
```

### Frontend changes (parallel PR)

- Route patterns switch from `/<resource>/:<id>` (UUID) to `/<resource>/:<publicId>` (opaque prefixed).
- Link components and URL builders emit `entity.publicId` — never `entity.id`.
- Tests that asserted UUID-shape URLs are updated to assert publicId shape `^<prefix>_[A-Za-z0-9]{8,}$`.

---

## 4. Sub-phase C — Drop UUID acceptance (release N+2)

When all known callers are on publicId:

- Remove the transitional `getByIdOrPublicId` helpers.
- Remove the `id: string` field from response DTOs; only `publicId` remains (by convention, the serializer rewrites `publicId` to `id` on egress if both were present — now only publicId is emitted).
- Wait — that's not quite right. The contract with clients is `id: <publicId>` (so callers see `{ id: "prj_…" }`). Achieve this by keeping `id: string` in the response DTO but assigning it the publicId value from the service. The serializer's `id ↔ publicId` swap becomes idempotent.
- `controller-uuid-leak` baseline shrinks to zero for this aggregate's DTOs.

---

## 5. Verification checklist (every aggregate PR)

- [ ] `MODEL_TO_AGGREGATE_TYPE` + `AGGREGATE_ROOTS_REQUIRING_PUBLIC_ID` updated.
- [ ] DTO declares `publicId: string`; no `@Matches(uuid regex)` on inputs.
- [ ] Service `.select`s and emits `publicId`.
- [ ] Controller uses `ParsePublicId(<Type>)` on any path param.
- [ ] Integration test asserts: request with publicId → 200 + response contains publicId. Request with UUID → 400 (after release N+2) or 200 + deprecation warning header (release N+1).
- [ ] E2E test asserts URL shape `^/<resource>/[a-z]+_[A-Za-z0-9]{8,}$`.
- [ ] `npm run schema:check` ✓
- [ ] `npm run publicid:check` ✓ and the aggregate's DTOs removed from the baseline.
- [ ] Backend `tsc --noEmit` clean.
- [ ] `npm run test:fast` green.
- [ ] Frontend `test` green.
- [ ] Manual browser smoke: list → detail → action on this aggregate, URL shape is publicId only, no UUIDs in the browser devtools Network tab response bodies.

---

## 6. Recommended first-migration sequence

1. **Skill** — smallest surface (6 endpoints, 2 controllers). Proves the wiring end-to-end. Also migrates `PersonSkill` / `PersonSkillsController` incidentally.
2. **StaffingRequest** — one aggregate root, sub-entity `StaffingRequestFulfilment` accessed through it.
3. **TimesheetWeek** — root + `TimesheetEntry` sub-entity.
4. **Project** — large surface but well-contained; high-value first "big" migration.
5. **Person** — touches many integrations; do after Project so the template is mature.
6. **ProjectAssignment** — depends on Person and Project being done.
7. Remaining roots in any order.

## 7. Anti-patterns to avoid

- **Bundling two aggregates in one PR.** Blast radius doubles. Always one aggregate per PR.
- **Keeping UUID `@Matches` on request DTOs.** Active bug — blocks publicId inputs.
- **Returning `id: uuid` in any DTO.** Fails `controller-uuid-leak` lint; caught by runtime serializer in non-prod.
- **Skipping the migration checklist.** Every item is a past footgun. Run through them.
- **Migrating frontend routes before backend accepts publicId on both forms.** Strands traffic mid-rollout.
