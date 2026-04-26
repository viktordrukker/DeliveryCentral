/* eslint-disable no-console */

/**
 * DM-R-14 — structured drift/half-apply event emitter.
 *
 * Writes one JSON object per line on stdout, prefixed with the literal
 * string `DRIFT_EVENT ` so log drains can filter with a single `grep`.
 * A downstream Sentry / Slack / PagerDuty integration lands by setting
 * `DRIFT_WEBHOOK_URL` — this module will POST every event to that URL
 * (best-effort; a webhook failure never blocks the calling script).
 *
 * Event shape (stable):
 *   {
 *     event:       "<dotted.event.name>",
 *     severity:    "error" | "warn" | "info",
 *     timestamp:   "<ISO-8601 UTC>",
 *     service:     "delivery-central",
 *     hostname:    "<gethostname>",
 *     git_sha:     "<40-char git HEAD>" | "unknown",
 *     agent_id:    "<AGENT_ID env>"  | null,
 *     payload:     { ... event-specific fields ... }
 *   }
 *
 * Known events (register new ones in docs/planning/drift-events.md):
 *   schema.drift.detected              — prisma migrate status failed
 *   migration.half_applied.detected    — half-applied row in _prisma_migrations
 *   migration.name.monotonicity.violation — DB ahead of on-disk latest
 *   schema.hash.mismatch.detected      — pg_dump hash ≠ committed baseline
 */

const { execFileSync } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const os = require('node:os');
const { URL } = require('node:url');

function gitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_err) {
    return 'unknown';
  }
}

function postWebhook(url, body) {
  try {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body);
    const req = mod.request(
      {
        method: 'POST',
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
        timeout: 2000,
      },
      (res) => {
        // Drain & discard — we don't care about the webhook response.
        res.resume();
      },
    );
    req.on('error', () => undefined);
    req.on('timeout', () => req.destroy());
    req.end(payload);
  } catch (_err) {
    // Webhook dispatch failures must never break the caller.
  }
}

function emitEvent(event, payload = {}, severity = 'error') {
  const record = {
    event,
    severity,
    timestamp: new Date().toISOString(),
    service: 'delivery-central',
    hostname: os.hostname(),
    git_sha: gitSha(),
    agent_id: process.env.AGENT_ID || null,
    payload,
  };
  // stdout so log drains / CI runners capture it via their normal pipeline.
  console.log(`DRIFT_EVENT ${JSON.stringify(record)}`);
  if (process.env.DRIFT_WEBHOOK_URL) {
    postWebhook(process.env.DRIFT_WEBHOOK_URL, record);
  }
  return record;
}

module.exports = { emitEvent };
