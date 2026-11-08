#!/usr/bin/env node
/**
 * D-103 actor-audit write-path coverage check.
 *
 * Walks src/modules/ for every `prisma.<model>.{create,update,upsert}(...)`
 * call site, looks up whether the model has actor-audit columns in
 * prisma/schema.prisma, and asserts the call writes the actor field(s)
 * into the Prisma data {} object.
 *
 * Coverage = compliant call sites / call sites against an actor-aware
 * model. We require >= 98%.
 *
 * Conventions handled:
 *   - createdByPersonId stamped on .create() / .upsert()->.create
 *   - updatedByPersonId stamped on .update() / .upsert()->.update
 *   - changedByPersonId / actorPersonId stamped on history rows
 *
 * System-generated mutations (cron / webhook receivers / sequence helpers)
 * are exempted via `docs/planning/d-103-system-mutations.md` plus the
 * EXEMPT_PATTERNS allowlist below.
 *
 * Wire-up: `npm run actor-audit:check`.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = path.join(ROOT, 'prisma', 'schema.prisma');
const MODULES = path.join(ROOT, 'src', 'modules');

const ACTOR_FIELDS = [
  'createdByPersonId',
  'updatedByPersonId',
  'changedByPersonId',
  'actorPersonId',
  'deletedByPersonId',
  'recordedByPersonId',
  'submittedByPersonId',
  'approvedByPersonId',
  'rejectedByPersonId',
];

const CREATE_FIELDS = new Set([
  'createdByPersonId',
  'changedByPersonId',
  'actorPersonId',
  'recordedByPersonId',
  'submittedByPersonId',
]);
const UPDATE_FIELDS = new Set([
  'updatedByPersonId',
  'changedByPersonId',
  'actorPersonId',
  'approvedByPersonId',
  'rejectedByPersonId',
]);

// System-generated mutation patterns — exempt from actor stamping.
// Cron jobs, webhook receivers, sequence helpers, idempotency, telemetry.
const EXEMPT_FILES = [
  // cron / scheduled / background producers
  /\/audit-retention\.service\.ts$/,
  /\/audit-log\.service\.ts$/,
  /\/audit-export-cron\.service\.ts$/,
  /\/outbox\.producer\.ts$/,
  /\/outbox\.service\.ts$/,
  /\/case-sla\.cron\.ts$/,
  /\/notification\.cron\.ts$/,
  /\/event-bus\.ts$/,
  // webhook receivers (external system writes)
  /\/jira-webhook\.service\.ts$/,
  /\/jira-importer\.service\.ts$/,
  /\/jsm-cloud-connector\.service\.ts$/,
  /\/m365-directory-adapter\.service\.ts$/,
  /\/m365-webhook\.service\.ts$/,
  /\/ldap-directory-adapter\.service\.ts$/,
  /\/ldap\.adapter\.ts$/,
  /\/radius-adapter\.service\.ts$/,
  // auth-token plumbing (not human writes)
  /\/auth\.service\.ts$/,
  /\/oidc\.service\.ts$/,
  /\/token\.service\.ts$/,
  /\/refresh-token\.service\.ts$/,
  /\/password\.service\.ts$/,
  /\/two-factor\.service\.ts$/,
  /\/setup-token\.service\.ts$/,
  // sweep-style cron services (actor='system')
  /\/assignment-sla-sweep\.service\.ts$/,
  // status derivation (system recompute, no human actor)
  /\/derive-staffing-request-status\.service\.ts$/,
  // notification dispatch / translation (system → user, not user-driven)
  /\/notification-event-translator\.service\.ts$/,
  /\/nudge\.service\.ts$/,
  /\/in-app-notification\.repository\.ts$/,
  // notification dispatch (system-generated)
  /\/notification-dispatch\.service\.ts$/,
  /\/notification-template\.service\.ts$/,
  // health / setup wizard (bootstrap)
  /\/setup-wizard\.service\.ts$/,
  /\/health\.service\.ts$/,
  // shadow-CI replay
  /\/shadow-ci-recorder\.service\.ts$/,
];

// Per-call exemption regexes — when the surrounding statement matches,
// we skip the actor check. Tighter than file-level exemption.
const EXEMPT_STATEMENT_PATTERNS = [
  /\/\/\s*D-103-exempt:/,
  /actor-audit-exempt/i,
];

function readSchema() {
  return fs.readFileSync(SCHEMA, 'utf-8');
}

/** Build map of model -> set of actor field names declared. */
function buildModelActorMap(schemaText) {
  const map = new Map();
  const blocks = schemaText.split(/^model\s+(\w+)\s*\{/m);
  // blocks: ['<head>', 'ModelA', 'bodyA', 'ModelB', 'bodyB', ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const name = blocks[i];
    const body = blocks[i + 1] ?? '';
    const cutoff = body.indexOf('\n}');
    const block = cutoff >= 0 ? body.slice(0, cutoff) : body;
    const fields = new Set();
    for (const f of ACTOR_FIELDS) {
      if (new RegExp(`^\\s+${f}\\s+`, 'm').test(block)) fields.add(f);
    }
    if (fields.size > 0) map.set(name, fields);
  }
  return map;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (full.endsWith('.ts') && !full.endsWith('.spec.ts') && !full.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

function isExempt(file) {
  return EXEMPT_FILES.some((re) => re.test(file));
}

/**
 * Extract the .create/.update/.upsert call expression starting at index i.
 * Returns { op, model, body, end } or null.
 */
function extractCall(src, m) {
  // m.index is at the start of `prisma.<model>.<op>(`
  const op = m[2];
  const model = m[1];
  // Body starts after `(`
  let depth = 0;
  let start = -1;
  for (let i = m.index; i < src.length; i++) {
    const c = src[i];
    if (c === '(') {
      if (start < 0) start = i + 1;
      depth++;
    } else if (c === ')') {
      depth--;
      if (depth === 0) {
        return { op, model, body: src.slice(start, i), end: i };
      }
    }
  }
  return null;
}

function bodyHasActorField(body, fieldNames) {
  for (const f of fieldNames) {
    // Allow `createdByPersonId: <expr>` anywhere in the call body.
    if (new RegExp(`\\b${f}\\s*:`).test(body)) return true;
  }
  return false;
}

/**
 * When the Prisma call uses a variable for `data` (e.g. `data,` or
 * `data: payload`), search the enclosing function for that variable
 * being assigned a property `createdByPersonId` / `updatedByPersonId`
 * before the call. This covers the common pattern:
 *
 *     const data: Record<string, unknown> = { updatedByPersonId: actorId };
 *     data.x = ...;
 *     await this.prisma.foo.update({ where: { id }, data });
 */
function scopeHasActorField(src, callIndex, body, fieldNames) {
  // Identify the variable used for `data` in the call body.
  // Patterns covered:
  //   data,                        -> shorthand
  //   data }                       -> shorthand at tail
  //   data: someVar,               -> aliased
  //   data: someVar }              -> aliased at tail
  let varName = null;
  const shorthand = body.match(/\bdata\s*(?:[,}\n]|$)/);
  const aliased = body.match(/\bdata\s*:\s*(\w+)\b/);
  if (aliased) varName = aliased[1];
  else if (shorthand) varName = 'data';
  if (!varName) return false;

  // Walk backwards from callIndex to find the enclosing function/method.
  // Naive heuristic: 2000 chars window is more than enough for any local var.
  const start = Math.max(0, callIndex - 2500);
  const window = src.slice(start, callIndex);
  for (const f of fieldNames) {
    // Object-literal initialiser:  `<varName>... { ... <f>: ... }`
    if (new RegExp(`\\b${varName}\\b[^;]*\\b${f}\\s*:`).test(window)) return true;
    // Property assignment:        `<varName>.<f> = ...`
    if (new RegExp(`\\b${varName}\\.${f}\\s*=`).test(window)) return true;
  }
  return false;
}

function checkCall(call, actorFields, srcText, callIndex) {
  // op is in { 'create', 'update', 'upsert' }
  const { op, body } = call;
  const inline = (expected) =>
    bodyHasActorField(body, expected) ||
    scopeHasActorField(srcText, callIndex, body, expected);
  if (op === 'create') {
    const expected = ACTOR_FIELDS.filter((f) => CREATE_FIELDS.has(f) && actorFields.has(f));
    if (expected.length === 0) return { ok: true, exempt: true };
    return { ok: inline(expected), expected };
  }
  if (op === 'update') {
    const expected = ACTOR_FIELDS.filter((f) => UPDATE_FIELDS.has(f) && actorFields.has(f));
    if (expected.length === 0) return { ok: true, exempt: true };
    return { ok: inline(expected), expected };
  }
  // upsert — body contains create: {...} and update: {...}
  const expectedC = ACTOR_FIELDS.filter((f) => CREATE_FIELDS.has(f) && actorFields.has(f));
  const expectedU = ACTOR_FIELDS.filter((f) => UPDATE_FIELDS.has(f) && actorFields.has(f));
  if (expectedC.length === 0 && expectedU.length === 0) return { ok: true, exempt: true };
  // approximate: require any of the expected fields anywhere in body
  const expected = Array.from(new Set([...expectedC, ...expectedU]));
  return { ok: inline(expected), expected };
}

function locOf(src, i) {
  const upto = src.slice(0, i);
  const line = (upto.match(/\n/g) ?? []).length + 1;
  return line;
}

function main() {
  const schema = readSchema();
  const modelActorMap = buildModelActorMap(schema);

  // model name in TS uses camelCase. Schema uses PascalCase. Build lookup.
  // Most fields in JS client use the lower-first-char of model name.
  const tsName = (m) => m.charAt(0).toLowerCase() + m.slice(1);
  const actorByTsName = new Map();
  for (const [m, f] of modelActorMap) actorByTsName.set(tsName(m), { model: m, fields: f });

  const files = walk(MODULES);
  let total = 0;
  let compliant = 0;
  let exemptCalls = 0;
  let modelNotActor = 0;
  const gaps = [];

  // Match any of: this.prisma | prisma | tx | client | db dot model dot op.
  // Use a single regex with alternation so we don't double-count call sites.
  const CALL_RE = /\b(?:this\.prisma|prisma|tx|client|db)\.(\w+)\.(create|update|upsert)\b/g;

  for (const file of files) {
    const exemptFile = isExempt(file);
    const rawSrc = fs.readFileSync(file, 'utf-8');
    // Strip block comments and line comments so example-only call sites in
    // docstrings don't get counted. Preserve length-equivalent whitespace
    // so reported line numbers stay accurate.
    let src = rawSrc
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
    {
      const re = CALL_RE;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src)) !== null) {
        const modelTs = m[1];
        const op = m[2];
        // Filter noise: the regex picks up many non-model words like
        // `enableShutdownHooks`, `$connect`, etc. We only count when the
        // identifier matches a known prisma model.
        const info = actorByTsName.get(modelTs);
        if (!info) {
          modelNotActor++;
          continue;
        }
        const call = extractCall(src, m);
        if (!call) continue;
        total++;
        const line = locOf(src, m.index);
        // Use rawSrc (with comments intact) so D-103-exempt markers are seen.
        const stmtSlice = rawSrc.slice(Math.max(0, m.index - 400), m.index + 200);
        const exemptStmt = EXEMPT_STATEMENT_PATTERNS.some((re2) => re2.test(stmtSlice));
        if (exemptFile || exemptStmt) {
          exemptCalls++;
          compliant++;
          continue;
        }
        const result = checkCall(call, info.fields, src, m.index);
        if (result.exempt) {
          exemptCalls++;
          compliant++;
          continue;
        }
        if (result.ok) {
          compliant++;
        } else {
          gaps.push({
            file: path.relative(ROOT, file),
            line,
            model: info.model,
            op,
            expected: result.expected,
          });
        }
      }
    }
  }

  const coverage = total === 0 ? 1 : compliant / total;
  const pct = (coverage * 100).toFixed(2);

  console.log(`actor-audit coverage: ${compliant}/${total} = ${pct}%`);
  console.log(`  exempt calls: ${exemptCalls}`);
  if (gaps.length > 0) {
    console.log(`  ${gaps.length} gap(s):`);
    for (const g of gaps) {
      console.log(`    ${g.file}:${g.line}  ${g.model}.${g.op}  needs ${g.expected.join(' / ')}`);
    }
  }

  const threshold = parseFloat(process.env.ACTOR_AUDIT_THRESHOLD ?? '0.98');
  if (coverage + 1e-9 < threshold) {
    console.error(`\nactor-audit coverage ${pct}% is below threshold ${(threshold * 100).toFixed(2)}%`);
    process.exit(1);
  }
}

main();
