# Test Data Policy

## Principles
- Prefer deterministic fixtures over ad hoc object literals.
- Use factories for focused overrides, not for inventing whole business scenarios repeatedly.
- Keep cross-context scenarios explicit and named.
- Do not couple tests to incidental persistence fields unless the test is intentionally repository-level.

## Approved sources
- `test/fixtures/demo-dataset.fixture.ts`
- `prisma/seeds/demo-dataset.ts`
- factories under `test/factories`

## Usage guidance
- Use fixtures when the scenario should stay globally stable across backend and frontend.
- Use factories when only one or two fields differ from a canonical fixture.
- Use scenario tests when a named enterprise condition matters, such as:
  - approved assignment without evidence
  - evidence without assignment
  - dotted-line visibility
  - project with no staffing

## Database reset policy
- Repository or integration tests that use Prisma should reset state explicitly through shared helpers.
- `test/helpers/db-reset.helper.ts` is the entry point for future disposable database cleanup.
- Do not hide database resets inside unrelated test utilities.

## Data ownership rules
- Business dictionaries must come from metadata fixtures or API responses, not inline constants in test code.
- Jira-linked examples must preserve the rule that Jira does not mutate authoritative staffing truth.
- Project identity must remain internal even in test fixtures with external links.

## Time handling
- Use explicit timestamps.
- Avoid `new Date()` inside assertions unless the test is specifically about current-time handling.
- When testing effective dating, state the exact `asOf` value.
