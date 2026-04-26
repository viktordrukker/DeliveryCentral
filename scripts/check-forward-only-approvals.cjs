#!/usr/bin/env node

/**
 * DM-R-29 — two-person rule for FORWARD_ONLY migrations.
 *
 * A PR that introduces (or edits the marker of) any FORWARD_ONLY.md
 * migration must carry at least TWO distinct `Approved-By:` trailers in
 * the merge-commit message, and neither approver may equal the commit
 * author. Forces genuine two-person review for destructive migrations.
 *
 * Scope:
 *   - PR adds a new FORWARD_ONLY.md anywhere under prisma/migrations, OR
 *   - PR modifies an existing FORWARD_ONLY.md, OR
 *   - PR flips a REVERSIBLE.md to FORWARD_ONLY.md (detected as a rename
 *     via git diff --name-status --find-renames).
 *
 * REVERSIBLE-only PRs are not subject to this gate.
 *
 * Inputs:
 *   BASE_SHA + HEAD_SHA  — PR range, from GH Actions pull_request event.
 *   Falls back to HEAD commit if unset (local dry-run).
 *
 * Trailer format:
 *   Approved-By: alice@example.com
 *   Approved-By: Bob Smith <bob@example.com>
 *
 * Exit code 0 on pass, 1 on missing approvals.
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', cwd: rootDir }).trim();
}

function die(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

function main() {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || 'HEAD';
  const range = base ? `${base}..${head}` : head;

  // Find all FORWARD_ONLY-related changes in the range.
  let diff;
  try {
    diff = base
      ? git('diff', '--name-status', '--find-renames', `${base}...${head}`)
      : git('show', '--name-status', '--find-renames', '--format=', head);
  } catch (_err) {
    console.log(`\x1b[32m✓\x1b[0m DM-R-29: no git range to inspect; skipping.`);
    process.exit(0);
  }

  const lines = diff.split('\n').filter(Boolean);
  const affected = [];
  for (const line of lines) {
    const parts = line.split('\t');
    const status = parts[0];
    const files = parts.slice(1);
    const finalFile = files[files.length - 1];

    if (/^prisma\/migrations\/[^/]+\/FORWARD_ONLY\.md$/.test(finalFile)) {
      if (status.startsWith('A') || status.startsWith('M') || status.startsWith('R')) {
        affected.push({ status, file: finalFile });
      }
    }
  }

  if (affected.length === 0) {
    console.log(`\x1b[32m✓\x1b[0m DM-R-29: no FORWARD_ONLY changes in this PR; gate not engaged.`);
    process.exit(0);
  }

  // Two-person check on the HEAD commit (merge commit for squash/merge flows).
  const headMsg = execFileSync('git', ['log', '-1', '--format=%B', head], {
    encoding: 'utf8',
    cwd: rootDir,
  });
  const headAuthorEmail = git('log', '-1', '--format=%ae', head).toLowerCase();

  const approvers = new Set();
  const trailerRe = /^Approved-By:\s*(.+?)\s*$/gim;
  let m;
  while ((m = trailerRe.exec(headMsg)) !== null) {
    // Extract email if present; else use raw identifier.
    const raw = m[1];
    const emailMatch = raw.match(/<([^>]+)>/);
    const key = (emailMatch ? emailMatch[1] : raw).toLowerCase().trim();
    if (key && key !== headAuthorEmail) {
      approvers.add(key);
    }
  }

  if (approvers.size < 2) {
    die(`DM-R-29: FORWARD_ONLY migration(s) require ≥2 distinct Approved-By: trailers (author excluded).`);
    for (const a of affected) {
      console.error(`   ✗ ${a.file}  [${a.status}]`);
    }
    console.error('');
    console.error(`   Found ${approvers.size} approver(s) (author ${headAuthorEmail} excluded).`);
    console.error(`   Add two reviewers' trailers to the merge commit:`);
    console.error(`      Approved-By: alice@example.com`);
    console.error(`      Approved-By: bob@example.com`);
    process.exit(1);
  }

  console.log(
    `\x1b[32m✓\x1b[0m DM-R-29: ${affected.length} FORWARD_ONLY change(s) approved by ${approvers.size} reviewers.`,
  );
  process.exit(0);
}

main();
