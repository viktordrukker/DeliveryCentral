# Codex Guardrails

## Core execution rules

- Search the repository before changing code.
- Reuse existing ports, entities, and repository patterns before creating new ones.
- Add or update tests first where practical.
- Keep changes scoped to the owning bounded context.
- Do not rewrite unrelated files.

## Domain safety rules

- Keep Jira behind the Integrations Hub and anti-corruption adapters.
- Do not let external providers mutate authoritative staffing aggregates.
- Preserve the separation between `ProjectAssignment` and `WorkEvidence`.
- Preserve the separation between `Project` and `ProjectExternalLink`.
- Keep metadata configuration-driven and entity-type scoped.

## Boundary rules

- Respect dependency-cruiser rules before adding imports.
- Do not import assignment internals from integrations code.
- Do not import organization reporting internals from non-organization contexts.
- Do not place provider-specific fields in core domain entities.
- Do not treat UI layout metadata as business truth.

## Delivery expectations

- Real code, tests, docs, and scaffolding should be created in the same turn when requested.
- If a full implementation is not practical, create interfaces, placeholders, tests, and docs that leave the repo in a coherent state.
- Every prompt should end with updated artifacts, not only explanation.
