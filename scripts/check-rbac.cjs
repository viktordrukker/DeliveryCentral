#!/usr/bin/env node

// HD-0.5 — RBAC ratchet. Every controller method that mutates
// (@Post / @Put / @Patch / @Delete) MUST carry one of:
//   - @RequireRoles(...)          (class- or method-level)
//   - @Public()                    (class- or method-level)
//   - @AllowSelfScope({ ... })     (method-level)
//
// Without one of these, NestJS would still run our RbacGuard, but the
// guard's behavior on a missing role list (= deny by default if the
// principal is unauthenticated, otherwise pass) makes "forgot the
// decorator" silently dependent on whether the caller happens to be
// logged in — exactly the kind of drift we don't want.
//
// Scope: src/modules/**/presentation/*.controller.ts
//
// Exits non-zero with a list of offending file:line entries when
// violations are found; otherwise prints the count and exits 0.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

function listControllerFiles() {
  const out = execSync(
    'find src -type f -name "*.controller.ts" -path "*/presentation/*"',
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  return out.split('\n').filter(Boolean);
}

const HTTP_METHOD_RE = /^\s*@(Post|Put|Patch|Delete)\s*\(/;
const REQUIRE_ROLES_RE = /@RequireRoles\s*\(/;
const PUBLIC_RE = /@Public\s*\(\s*\)/;
const ALLOW_SELF_SCOPE_RE = /@AllowSelfScope\s*\(/;
const CONTROLLER_DECORATOR_RE = /^\s*@Controller\s*\(/;
const METHOD_DEF_RE = /^\s*(public\s+|private\s+|protected\s+)?(async\s+)?[a-zA-Z_][a-zA-Z0-9_]*\s*\(/;

function parenDelta(line) {
  let d = 0;
  for (const ch of line) {
    if (ch === '(' || ch === '{' || ch === '[') d++;
    else if (ch === ')' || ch === '}' || ch === ']') d--;
  }
  return d;
}

function classLevelGuards(lines) {
  const flags = { requireRoles: false, isPublic: false };
  let inClassDecorators = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (CONTROLLER_DECORATOR_RE.test(line)) inClassDecorators = true;
    if (inClassDecorators) {
      if (REQUIRE_ROLES_RE.test(line)) flags.requireRoles = true;
      if (PUBLIC_RE.test(line)) flags.isPublic = true;
      if (/^\s*export\s+class\s+/.test(line)) break;
    }
  }
  return flags;
}

function checkFile(filePath) {
  const violations = [];
  const text = fs.readFileSync(path.join(REPO_ROOT, filePath), 'utf8');
  const lines = text.split('\n');
  const classGuards = classLevelGuards(lines);

  for (let i = 0; i < lines.length; i++) {
    const m = HTTP_METHOD_RE.exec(lines[i]);
    if (!m) continue;
    const httpVerb = m[1];

    // Walk forward over the decorator block. A decorator is a line that
    // starts with `@` PLUS any continuation lines while paren/brace
    // depth is non-zero. Stop when we reach the method definition.
    const collected = [lines[i]];
    let j = i + 1;
    let depth = parenDelta(lines[i]);
    while (j < lines.length) {
      const next = lines[j];
      if (depth > 0) {
        collected.push(next);
        depth += parenDelta(next);
        j++;
        continue;
      }
      if (next.trim() === '') { j++; continue; }
      if (next.trim().startsWith('@')) {
        collected.push(next);
        depth += parenDelta(next);
        j++;
        continue;
      }
      break;
    }

    const block = collected.join('\n');
    const hasRoles = REQUIRE_ROLES_RE.test(block);
    const hasPublic = PUBLIC_RE.test(block);
    const hasSelfScope = ALLOW_SELF_SCOPE_RE.test(block);

    const allowed =
      hasRoles ||
      hasPublic ||
      hasSelfScope ||
      classGuards.requireRoles ||
      classGuards.isPublic;

    if (!allowed) {
      violations.push({
        file: filePath,
        line: i + 1,
        verb: httpVerb,
      });
    }
  }
  return violations;
}

function main() {
  const files = listControllerFiles();
  let all = [];
  for (const f of files) {
    all = all.concat(checkFile(f));
  }
  if (all.length > 0) {
    console.error(
      `RBAC ratchet violation: ${all.length} mutation endpoint(s) lack any access decorator.`,
    );
    console.error(
      'Each must carry @RequireRoles(...), @Public(), or @AllowSelfScope(...).',
    );
    for (const v of all) {
      console.error(`  ${v.file}:${v.line}  @${v.verb}`);
    }
    process.exit(1);
  }
  console.log(`OK — checked ${files.length} controller file(s); 0 RBAC violations.`);
}

main();
