# Test Taxonomy

## Layer definitions

### Unit
Fast, isolated checks for helpers and pure functions.
- Example: fixture loader behavior
- Folder: `test/unit`

### Domain
Business invariants inside entities, aggregates, value objects, and domain services.
- Example: effective date range rules
- Folder: `test/domain`

### Repository
Persistence adapter behavior independent from HTTP and UI.
- Example: in-memory metadata repository persistence semantics
- Folder: `test/repository`

### Integration
Application slices tested through Nest dependency wiring and HTTP endpoints.
- Example: `GET /health`
- Folder: `test/integration`

### Contract
Stable API shape assertions for consumers.
- Example: metadata dictionary response fields consumed by admin UI
- Folder: `test/contracts`

### UI Component
Reusable visual primitive behavior with mocked inputs.
- Location: `frontend/src/components/**`

### UI Page / Integration
Route-level behavior with API mocks and navigation.
- Location: `frontend/src/routes/**`

### End-to-End
Smoke or workflow tests through full application boundaries.
- Folder: `test/e2e`

### Seed / Fixture Validation
Checks that demo datasets and named scenarios remain deterministic.
- Existing coverage: `test/fixtures`
- Scenario assertions: `test/scenarios`

### Resilience / Performance
Baseline timing, outage handling, and scenario-oriented limits.
- Folder: `test/performance`

## Placement rules
- If a rule is purely domain logic, keep it out of integration tests.
- If a consumer relies on exact response fields, add a contract test.
- If a UI page needs only mocked APIs, keep it in frontend route tests rather than backend e2e.
- If a fixture or seed shape is reused across layers, validate it once in fixture or scenario coverage.

## Naming guidance
- `*.unit.spec.ts`
- `*.domain.spec.ts`
- `*.repository.spec.ts`
- `*.integration.spec.ts`
- `*.contract.spec.ts`
- `*.e2e-spec.ts`
- `*.performance.spec.ts`
- `*.scenario.spec.ts`

## Anti-patterns
- Asserting internal private implementation details
- Rebuilding large object graphs inline instead of using factories or fixtures
- Mixing domain assertions and HTTP assertions in the same test unless the goal is wiring coverage
- Using random or time-sensitive data without explicit control
