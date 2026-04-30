# DS Conformance Ratchet

**Phase:** DS-7
**Last updated:** 2026-04-27
**Script:** [`scripts/check-ds-conformance.cjs`](../../scripts/check-ds-conformance.cjs)
**Baseline:** [`scripts/ds-conformance-baseline.json`](../../scripts/ds-conformance-baseline.json)

The DS conformance check is a **severity-aware ratchet**: each rule is `'warning'` (allowed via baseline) or `'error'` (zero tolerance). Rules promote from warning → error once their baseline reaches zero, and from then on any new occurrence fails the build.

This document is the operational playbook for that ratchet.

## Rule status (snapshot 2026-04-27)

```
🔒 ERROR  no-link-button-className     total=  0  baseline=  0
🔒 ERROR  no-window-confirm            total=  0  baseline=  0
🔒 ERROR  no-window-alert              total=  0  baseline=  0
⚠️  warn  no-raw-button                total= 92  baseline= 92
⚠️  warn  no-button-className          total= 25  baseline= 25
⚠️  warn  no-raw-table                 total=112  baseline=112
```

Total baseline: **229 entries** across 3 warning-tier rules. 3 error-tier rules locked at zero.

Run the report any time: `node scripts/check-ds-conformance.cjs --report`.

## Workflow

### Adding a new rule

1. Add a rule object to the `RULES` array in [`scripts/check-ds-conformance.cjs`](../../scripts/check-ds-conformance.cjs):
   ```js
   {
     id: 'no-raw-input',
     severity: 'warning',
     pattern: /<input\b/g,
     message: 'Raw <input>. Use <Input> from @/components/ds.',
   },
   ```
2. Run `node scripts/check-ds-conformance.cjs --report` to see how many existing offenders the rule flags.
3. Decide: is the existing footprint manageable? If yes, run `--write-baseline` to lock it in. If no, narrow the pattern (e.g. exclude form-field-control descendants).
4. Document the rule's promotion target in this doc — what work needs to land before it can flip to error.

### Promoting a rule warning → error

When a warning-tier rule's `baseline` count reaches zero:

1. Edit the rule's `severity` from `'warning'` → `'error'` in `check-ds-conformance.cjs`.
2. Add a comment with the promotion date — e.g. `severity: 'error', // promoted 2026-04-27 — baseline reached zero`.
3. Run `node scripts/check-ds-conformance.cjs --write-baseline` — the script refuses to baseline error-tier violations and confirms zero entries.
4. Update this doc's "Rule status" snapshot.

After promotion, **any new occurrence fails the build immediately**, regardless of context. There's no escape hatch except demoting the rule back to warning.

### Reducing a baseline (sweeping work)

Most DS work reduces a warning-tier baseline. The flow:

1. Make your changes (migrate offenders to DS components).
2. Run `node scripts/check-ds-conformance.cjs --report`.
3. The report shows "Stale baseline entries" for ones you fixed and any new violations introduced (line drift on baselined entries shows up as both stale + new).
4. Run `--write-baseline` to clear stale entries and capture line-drift updates.
5. Confirm the baseline shrunk by the expected amount.

A migration that **adds** a violation (deliberately, e.g. an unavoidable carve-out) requires `--write-baseline` to accept it. The reviewer should question whether the carve-out is justified.

## Promotion targets per rule

| Rule | Current count | Path to zero |
|---|---:|---|
| `no-raw-button` | 92 | Group H aftermath progressed (4 orphan files deleted) but the long tail is concentrated in dashboard pages, lifecycle controls, custom popover triggers. **Sweep policy**: incremental — touch + sweep when each file is in scope for other DS work. |
| `no-button-className` | 25 | Most are computed-tone or template-literal patterns ([`ds-1-7-codemod-residuals.md`](ds-1-7-codemod-residuals.md) Group F). **Sweep policy**: codemod-resistant; per-file when touched. |
| `no-raw-table` | 112 | dash-compact-table sweep — playbook at [`ds-dash-compact-table-playbook.md`](ds-dash-compact-table-playbook.md). 3 dashboards already migrated; remainder gated behind incremental "touch + sweep". |

## CI integration

The check runs as part of CI via `npm run ds:check` in the frontend pipeline (failure exits 1).

The script's exit codes:
- **0**: no error-tier violations + no new warning-tier violations (baseline-captured offenders are OK).
- **1**: at least one error-tier violation OR at least one new warning-tier violation.

Stale baseline entries are surfaced but don't cause failure — they just need `--write-baseline` to clean.

## When to add a new rule

A rule is worth adding when:
- The DS has a clear replacement.
- The replacement is in widespread use (not still being designed).
- The legacy pattern has a stable, regex-detectable signature.

Bad rule candidates:
- "No inline style" — too broad, too many legitimate exceptions.
- "Use FormField for every input" — the wrapping pattern varies; AST-aware lint is needed.
- "No window globals" — too many false positives (window resize, scroll, etc.).

## Why this design over ESLint

ESLint with custom rules is the canonical solution. We chose a standalone script because:
1. Pattern is the same as the existing `scripts/check-design-tokens.cjs` (raw-color guardrail) — consistency.
2. Severity ratchet is bespoke; ESLint's plugin model is heavier than needed.
3. Per-file baseline allowlist is awkward in ESLint's flat config; trivial here.
4. CI run time: regex over 443 files takes <500ms.

If the ruleset grows past ~10 rules or needs AST-level matching, switching to a real ESLint plugin is the right move.
