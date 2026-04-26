#!/usr/bin/env node

/**
 * DM-R-12 — agent-ownership CI checker.
 *
 * Reads the `Agent-Id:` trailer from every commit in the target range,
 * resolves the active agent per commit, compares touched paths against
 * the `.agent-ownership.json` registry, and fails if the commit's agent
 * is DIFFERENT from the path's declared owner.
 *
 * Rules:
 *   - No `Agent-Id:` trailer → treat as a human commit; the agent-
 *     ownership gate does not apply (CODEOWNERS covers humans).
 *   - Trailer present, path matched to an agent, active agent == path's
 *     owner → pass.
 *   - Trailer present, path matched, active agent != path's owner →
 *     fail with a pointer to the registry entry.
 *   - Trailer present, path un-owned → pass (any agent may edit).
 *
 * Commit range:
 *   - `BASE_SHA` + `HEAD_SHA` env — CI pull_request event provides
 *     `${{ github.event.pull_request.base.sha }}` and `.head.sha`.
 *   - No env → inspect HEAD commit only (local pre-push or dry-run).
 *
 * Exit code: 0 on clean, 1 on any unauthorised modification.
 *
 * Design notes:
 *   - Glob matching uses a minimal implementation (minimatch would add
 *     a dep just for this). Supports double-star, single-star, and
 *     exact literals.
 *   - Registry comment keys (_description, _policy, _how_to_use,
 *     _trailer_format) are ignored.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const registryPath = path.join(rootDir, '.agent-ownership.json');

function die(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', cwd: rootDir }).trim();
}

/** Minimal minimatch-style glob → RegExp. Handles `**`, `*`, literals. */
function globToRegex(glob) {
  let re = '^';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      // '**' — match any number of path segments including slashes.
      re += '.*';
      i += 2;
      // Consume optional trailing slash so 'prisma/**' matches 'prisma/foo' and 'prisma/foo/bar'.
      if (glob[i] === '/') i += 1;
    } else if (c === '*') {
      // Single '*' — match within a segment (no slash).
      re += '[^/]*';
      i += 1;
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else if ('.+^$(){}[]|\\'.includes(c)) {
      re += `\\${c}`;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  re += '$';
  return new RegExp(re);
}

function loadRegistry() {
  if (!fs.existsSync(registryPath)) {
    die(`registry missing: ${registryPath}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const agents = raw.agents || {};
  // Build ordered list of (glob, regex, agentId). Last match wins → walk in reverse.
  const entries = [];
  for (const [agentId, body] of Object.entries(agents)) {
    for (const glob of body.owns || []) {
      entries.push({ agentId, glob, regex: globToRegex(glob) });
    }
  }
  return { agents, entries };
}

function ownerFor(filePath, entries) {
  // Last-matching wins (later entries are more specific if the registry author orders them that way).
  let winner = null;
  for (const entry of entries) {
    if (entry.regex.test(filePath)) {
      winner = entry;
    }
  }
  return winner ? winner.agentId : null;
}

function commitRange() {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;
  if (base && head) {
    return { mode: 'range', base, head };
  }
  return { mode: 'head' };
}

function commitsInRange({ mode, base, head }) {
  if (mode === 'head') {
    return [git('rev-parse', 'HEAD')];
  }
  // Note: use `<base>...<head>` for PR comparisons; `..` could miss merge commits.
  const out = execFileSync('git', ['log', '--no-merges', '--format=%H', `${base}..${head}`], {
    encoding: 'utf8',
    cwd: rootDir,
  }).trim();
  return out ? out.split('\n') : [];
}

function agentIdForCommit(sha) {
  const body = execFileSync('git', ['log', '-1', '--format=%B', sha], {
    encoding: 'utf8',
    cwd: rootDir,
  });
  const trailerMatch = body.match(/^Agent-Id:\s*([A-Za-z0-9_\-.]+)\s*$/m);
  return trailerMatch ? trailerMatch[1].toLowerCase() : null;
}

function filesChangedInCommit(sha) {
  const out = execFileSync('git', ['show', '--name-only', '--format=', sha], {
    encoding: 'utf8',
    cwd: rootDir,
  });
  return out.split('\n').filter(Boolean);
}

function main() {
  const { agents, entries } = loadRegistry();
  const range = commitRange();
  const commits = commitsInRange(range);

  if (commits.length === 0) {
    ok(`DM-R-12: no commits in range to inspect.`);
    process.exit(0);
  }

  const violations = [];
  let agentCommits = 0;

  for (const sha of commits) {
    const agentId = agentIdForCommit(sha);
    if (!agentId) continue; // human commit — not subject to this gate.
    agentCommits += 1;

    if (!(agentId in agents)) {
      violations.push(`${sha.slice(0, 8)}: Agent-Id "${agentId}" is not registered in .agent-ownership.json`);
      continue;
    }

    const files = filesChangedInCommit(sha);
    for (const file of files) {
      const owner = ownerFor(file, entries);
      if (owner && owner !== agentId) {
        violations.push(
          `${sha.slice(0, 8)}: agent "${agentId}" touched "${file}" owned by "${owner}"`,
        );
      }
    }
  }

  if (agentCommits === 0) {
    ok(`DM-R-12: no Agent-Id trailers in ${commits.length} commit(s); nothing to gate.`);
    process.exit(0);
  }

  if (violations.length > 0) {
    console.error(`\nDM-R-12: ${violations.length} agent-ownership violation(s):\n`);
    for (const v of violations) die(v);
    console.error(`\nRegister the agent or move the edit to a different commit.`);
    process.exit(1);
  }

  ok(`DM-R-12: ${agentCommits} agent-tagged commit(s) respect .agent-ownership.json.`);
  process.exit(0);
}

main();
