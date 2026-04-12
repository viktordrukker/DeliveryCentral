# Business Audit

## Purpose

Business audit records capture meaningful operational actions separately from
technical request logging.

These records answer questions like:

- who changed a business object
- what workflow action occurred
- which entity was affected
- when the change happened
- what concise business summary or metadata should be preserved

## Record shape

Business audit records store:

- `actorId`
- `actionType`
- `targetEntityType`
- `targetEntityId`
- `occurredAt`
- `changeSummary`
- `metadata`
- `correlationId`

## Covered workflows

Current coverage includes:

- employee created
- employee deactivated
- reporting line changed
- project created
- project activated
- project closed
- assignment created
- assignment approved
- assignment rejected
- assignment ended
- team member changes through team-to-project expansion
- metadata dictionary changes
- integration sync runs
- notification send results

## Query access

Business audit records are exposed through:

- `GET /audit/business`

Supported query filters:

- `actorId`
- `actionType`
- `targetEntityType`
- `targetEntityId`
- `limit`

## Guardrails

- business audit is not a duplicate of technical request logs
- audit metadata should stay meaningful and queryable
- secrets and excessive payloads should not be stored
- records preserve operational traceability without mutating business state
