#!/usr/bin/env node

/**
 * ROLLBACK-DRILL — automated C0 flip + revert simulator.
 *
 * Five times in a row, this script:
 *   1. Flips a target PlatformSetting (default: `flag.dsRefresh`) to `true`
 *      via PATCH /api/admin/platform-settings/:key.
 *   2. Polls GET /api/_internal/runtime-flags?key=<key> until the resolved
 *      value reflects `true` (or until the timeout budget is exhausted).
 *   3. Flips the same key back to `false` and starts a stopwatch.
 *   4. Polls again until the resolved value reads `false` — this is the
 *      "rollback latency" we care about.
 *   5. Records P50/P95/MAX across the 5 iterations and exits non-zero if
 *      any single rollback exceeded the threshold (default: 30 000 ms).
 *
 * Safety rails:
 *   - Hard-refuses to run unless ROLLBACK_DRILL_TARGET is set or `--target`
 *     is passed. Defaults to v2-staging. The check is also content-based:
 *     a base URL containing the substrings "prod", "production", or
 *     "deliverit.agentic.uz" (sans `test-v2`) trips an abort.
 *   - Requires ROLLBACK_DRILL_ADMIN_TOKEN. Token is sent as the
 *     `Authorization: Bearer …` header. Never logged.
 *   - On startup, snapshots the current value of the key so the final
 *     state is always restored even if a poll times out mid-iteration.
 *
 * Usage:
 *   ROLLBACK_DRILL_TARGET=https://deliverit-test-v2.agentic.uz \
 *   ROLLBACK_DRILL_ADMIN_TOKEN=… \
 *   node scripts/rollback-drill.cjs
 *
 *   # JSON-only output (for CI step summary):
 *   node scripts/rollback-drill.cjs --json
 *
 *   # Override the target key (must be a boolean PlatformSetting):
 *   node scripts/rollback-drill.cjs --key flag.workspaceMe
 *
 *   # Adjust budgets:
 *   node scripts/rollback-drill.cjs --iterations 5 --max-rollback-ms 30000 \
 *     --poll-interval-ms 500 --poll-timeout-ms 60000
 */

const DEFAULT_KEY = 'flag.dsRefresh';
const DEFAULT_TARGET = 'https://deliverit-test-v2.agentic.uz';
const DEFAULT_ITERATIONS = 5;
const DEFAULT_MAX_ROLLBACK_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 500;
const DEFAULT_POLL_TIMEOUT_MS = 60_000;

function parseArgs(argv) {
  const args = {
    json: false,
    key: DEFAULT_KEY,
    iterations: DEFAULT_ITERATIONS,
    maxRollbackMs: DEFAULT_MAX_ROLLBACK_MS,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    pollTimeoutMs: DEFAULT_POLL_TIMEOUT_MS,
    target: process.env.ROLLBACK_DRILL_TARGET || DEFAULT_TARGET,
    token: process.env.ROLLBACK_DRILL_ADMIN_TOKEN || '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--json':
        args.json = true;
        break;
      case '--key':
        args.key = next;
        i += 1;
        break;
      case '--iterations':
        args.iterations = Number(next);
        i += 1;
        break;
      case '--max-rollback-ms':
        args.maxRollbackMs = Number(next);
        i += 1;
        break;
      case '--poll-interval-ms':
        args.pollIntervalMs = Number(next);
        i += 1;
        break;
      case '--poll-timeout-ms':
        args.pollTimeoutMs = Number(next);
        i += 1;
        break;
      case '--target':
        args.target = next;
        i += 1;
        break;
      case '--token':
        args.token = next;
        i += 1;
        break;
      default:
        break;
    }
  }
  return args;
}

function assertSafeTarget(target) {
  if (!target || typeof target !== 'string') {
    throw new Error('ROLLBACK_DRILL_TARGET (or --target) must be set.');
  }
  const lower = target.toLowerCase();
  const looksLikeProd =
    lower.includes('://prod') ||
    lower.includes('production') ||
    /\bdeliverit\.agentic\.uz\b/.test(lower); // prod host shape
  const looksLikeStaging =
    lower.includes('test-v2') ||
    lower.includes('staging') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1');
  if (looksLikeProd && !looksLikeStaging) {
    throw new Error(
      `Refusing to run rollback drill against what looks like a production URL: ${target}. ` +
        'Set ROLLBACK_DRILL_TARGET to a v2-staging or localhost URL.',
    );
  }
}

function quantile(sortedAsc, q) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((sortedAsc.length - 1) * q));
  return sortedAsc[idx];
}

async function patchSetting({ target, token, key, value, fetchImpl }) {
  const res = await fetchImpl(`${target}/api/admin/platform-settings/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `PATCH /admin/platform-settings/${key} returned HTTP ${res.status}: ${text.slice(0, 200)}`,
    );
  }
  return res.json();
}

async function readFlag({ target, token, key, fetchImpl }) {
  const url = `${target}/api/_internal/runtime-flags?key=${encodeURIComponent(key)}`;
  const res = await fetchImpl(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `GET /_internal/runtime-flags?key=${key} returned HTTP ${res.status}: ${text.slice(0, 200)}`,
    );
  }
  return res.json();
}

async function pollUntil({ target, token, key, expected, pollIntervalMs, pollTimeoutMs, fetchImpl, clock }) {
  const startedAt = clock.now();
  const deadline = startedAt + pollTimeoutMs;
  let lastValue = null;
  while (clock.now() < deadline) {
    const snap = await readFlag({ target, token, key, fetchImpl });
    lastValue = snap.value;
    if (Object.is(lastValue, expected) || lastValue === expected) {
      return { reachedAt: clock.now(), elapsedMs: clock.now() - startedAt, lastValue };
    }
    await clock.sleep(pollIntervalMs);
  }
  throw new Error(
    `Timed out waiting for ${key} to become ${JSON.stringify(expected)} ` +
      `(last value: ${JSON.stringify(lastValue)}, budget ${pollTimeoutMs}ms).`,
  );
}

async function runDrill(args, deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const clock = deps.clock ?? {
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
  const logger = deps.logger ?? console;

  if (typeof fetchImpl !== 'function') {
    throw new Error('global fetch is not available — run on Node 18+ or supply deps.fetch.');
  }
  if (!args.token) {
    throw new Error('ROLLBACK_DRILL_ADMIN_TOKEN (or --token) must be set.');
  }
  assertSafeTarget(args.target);

  const initial = await readFlag({
    target: args.target,
    token: args.token,
    key: args.key,
    fetchImpl,
  });
  if (!args.json) {
    logger.log(`[drill] initial value of ${args.key}: ${JSON.stringify(initial.value)}`);
  }

  const iterations = [];
  let exitCode = 0;

  try {
    for (let i = 1; i <= args.iterations; i += 1) {
      if (!args.json) logger.log(`[drill] iteration ${i}/${args.iterations} — flipping ON`);
      const flipOnStart = clock.now();
      await patchSetting({ target: args.target, token: args.token, key: args.key, value: true, fetchImpl });
      const onPropagated = await pollUntil({
        target: args.target,
        token: args.token,
        key: args.key,
        expected: true,
        pollIntervalMs: args.pollIntervalMs,
        pollTimeoutMs: args.pollTimeoutMs,
        fetchImpl,
        clock,
      });
      const flipOnLatencyMs = onPropagated.reachedAt - flipOnStart;

      if (!args.json) logger.log(`[drill] iteration ${i} — flipping OFF (rollback)`);
      const rollbackStart = clock.now();
      await patchSetting({ target: args.target, token: args.token, key: args.key, value: false, fetchImpl });
      const offPropagated = await pollUntil({
        target: args.target,
        token: args.token,
        key: args.key,
        expected: false,
        pollIntervalMs: args.pollIntervalMs,
        pollTimeoutMs: args.pollTimeoutMs,
        fetchImpl,
        clock,
      });
      const rollbackMs = offPropagated.reachedAt - rollbackStart;
      iterations.push({ iteration: i, flipOnLatencyMs, rollbackMs });

      if (!args.json) {
        logger.log(
          `[drill] iteration ${i} done — flipOn=${flipOnLatencyMs}ms rollback=${rollbackMs}ms`,
        );
      }
    }
  } finally {
    try {
      await patchSetting({
        target: args.target,
        token: args.token,
        key: args.key,
        value: initial.value === true,
        fetchImpl,
      });
    } catch (err) {
      logger.error(`[drill] WARNING — failed to restore initial value: ${err.message}`);
    }
  }

  const rollbacks = iterations.map((it) => it.rollbackMs).sort((a, b) => a - b);
  const summary = {
    target: args.target,
    key: args.key,
    iterations: iterations.length,
    maxRollbackMs: args.maxRollbackMs,
    p50RollbackMs: quantile(rollbacks, 0.5),
    p95RollbackMs: quantile(rollbacks, 0.95),
    maxObservedRollbackMs: rollbacks[rollbacks.length - 1] ?? 0,
    pass: rollbacks.every((ms) => ms <= args.maxRollbackMs),
    samples: iterations,
  };

  if (!summary.pass) exitCode = 1;

  if (args.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    logger.log('');
    logger.log('[drill] === summary ===');
    logger.log(`[drill] iterations: ${summary.iterations}`);
    logger.log(`[drill] P50 rollback: ${summary.p50RollbackMs} ms`);
    logger.log(`[drill] P95 rollback: ${summary.p95RollbackMs} ms`);
    logger.log(`[drill] MAX rollback: ${summary.maxObservedRollbackMs} ms`);
    logger.log(`[drill] budget:       ${summary.maxRollbackMs} ms`);
    logger.log(`[drill] verdict:      ${summary.pass ? 'PASS' : 'FAIL'}`);
  }

  return { summary, exitCode };
}

module.exports = {
  parseArgs,
  assertSafeTarget,
  quantile,
  patchSetting,
  readFlag,
  pollUntil,
  runDrill,
};

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runDrill(args)
    .then(({ exitCode }) => {
      process.exit(exitCode);
    })
    .catch((err) => {
      process.stderr.write(`[drill] error: ${err.message}\n`);
      process.exit(2);
    });
}
