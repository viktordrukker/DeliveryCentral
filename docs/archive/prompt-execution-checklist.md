# Prompt Execution Checklist

## Execution checklist

- searched the repository for existing implementations, schemas, tests, and docs
- reused existing code where possible
- kept changes inside the owning bounded context
- avoided hardcoded business constants unless config-owned
- added or updated tests
- updated docs for architectural or behavioral changes
- checked for boundary violations
- left the repo with runnable scripts or explicit placeholders

## Definition of done

- code created
- tests added or updated
- docs updated
- no boundary violation introduced
- no hardcoded business constants unless config-owned

## Reusable prompt footer template

Use this footer in future Codex prompts when implementation quality matters:

```text
Before making changes:
1. Search the repository for existing implementations, interfaces, schemas, tests, and docs.
2. Reuse or extend existing code instead of duplicating logic.
3. Do not modify unrelated files.
4. Respect bounded context boundaries and forbidden dependency rules.
5. Keep all values configuration-driven.
6. Write or update tests first where feasible.
7. Update relevant docs and ADRs if architectural implications arise.
8. Preserve backward compatibility of contracts unless explicitly instructed otherwise.

Definition of done:
- code created
- tests added or updated
- docs updated
- no boundary violation
- no hardcoded business constants unless config-owned
```
