// Sprint F-2.2 — concurrent-user perf probe.
//
// Walks the 10 representative v1 endpoints (same set as
// docs/testing/perf-baseline-2026-05-11.md) under 10 concurrent VUs for
// 5 minutes (configurable via `DURATION` env var). Captures P95 latency
// + error rate per endpoint via k6's built-in URL-grouped stats.
//
// Run (via docker, against the dev stack):
//
//   docker run --rm -i --network=host -v "$PWD/tests/perf:/scripts" \
//     -e BASE_URL=http://localhost:3000 \
//     -e API_TOKEN=$TOKEN \
//     grafana/k6 run /scripts/k6-10-concurrent.js
//
// where $TOKEN comes from a fresh `/api/auth/login` call as admin.
//
// SLO budgets per endpoint come from docs/testing/perf-baseline-2026-05-11.md
// (single-user baseline column). k6's built-in `Thresholds` block fails
// the run if any threshold trips.

import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.API_TOKEN || '';
const DURATION = __ENV.DURATION || '5m';
const VUS = parseInt(__ENV.VUS || '10', 10);

if (!TOKEN) {
  throw new Error('API_TOKEN env var is required — get one via /api/auth/login');
}

const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

// SLO budgets from perf-baseline-2026-05-11.md — abuse of k6 group tagging
// to attach per-endpoint thresholds.
export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    // Global error budget — 0 5xx tolerated.
    http_req_failed: ['rate<0.005'],

    // Per-endpoint P95 budgets (ms). Tagged via group() below.
    'http_req_duration{endpoint:health}': ['p(95)<100'],
    'http_req_duration{endpoint:health-deep}': ['p(95)<500'],
    'http_req_duration{endpoint:unread-count}': ['p(95)<200'],
    'http_req_duration{endpoint:projects-list}': ['p(95)<1000'],
    'http_req_duration{endpoint:project-detail}': ['p(95)<500'],
    'http_req_duration{endpoint:projects-health-batch}': ['p(95)<500'],
    'http_req_duration{endpoint:org-people}': ['p(95)<500'],
    'http_req_duration{endpoint:feature-flags}': ['p(95)<300'],
    'http_req_duration{endpoint:workload-summary}': ['p(95)<1000'],
    'http_req_duration{endpoint:assignments-list}': ['p(95)<1000'],
  },
};

// Pulled once before VUs start — project ids for the batch + detail
// endpoints. Stays under 200 (the chunk limit) so we hit the no-chunking
// path of fetchProjectHealthBatch.
export function setup() {
  const r = http.get(`${BASE_URL}/api/projects?limit=20`, { headers: HEADERS });
  const projectIds = (r.json()?.items || []).map((p) => p.id);
  return {
    projectIdsCsv: projectIds.join(','),
    sampleProjectId: projectIds[0] || '',
  };
}

export default function (data) {
  const { projectIdsCsv, sampleProjectId } = data;
  group('health', () => {
    const r = http.get(`${BASE_URL}/api/health`, {
      headers: HEADERS,
      tags: { endpoint: 'health' },
    });
    check(r, { 'health 200': (res) => res.status === 200 });
  });

  group('health-deep', () => {
    const r = http.get(`${BASE_URL}/api/health/deep`, {
      headers: HEADERS,
      tags: { endpoint: 'health-deep' },
    });
    check(r, { 'health-deep 200': (res) => res.status === 200 });
  });

  group('unread-count', () => {
    const r = http.get(`${BASE_URL}/api/notifications/inbox/unread-count`, {
      headers: HEADERS,
      tags: { endpoint: 'unread-count' },
    });
    check(r, { 'unread-count 200': (res) => res.status === 200 });
  });

  group('projects-list', () => {
    const r = http.get(`${BASE_URL}/api/projects`, {
      headers: HEADERS,
      tags: { endpoint: 'projects-list' },
    });
    check(r, { 'projects 200': (res) => res.status === 200 });
  });

  if (sampleProjectId) {
    group('project-detail', () => {
      const r = http.get(`${BASE_URL}/api/projects/${sampleProjectId}`, {
        headers: HEADERS,
        tags: { endpoint: 'project-detail' },
      });
      check(r, { 'project-detail 200': (res) => res.status === 200 });
    });
  }

  if (projectIdsCsv) {
    group('projects-health-batch', () => {
      const r = http.get(
        `${BASE_URL}/api/projects/health?ids=${encodeURIComponent(projectIdsCsv)}`,
        {
          headers: HEADERS,
          tags: { endpoint: 'projects-health-batch' },
        },
      );
      check(r, { 'projects-health batch 200': (res) => res.status === 200 });
    });
  }

  group('org-people', () => {
    const r = http.get(`${BASE_URL}/api/org/people?limit=20`, {
      headers: HEADERS,
      tags: { endpoint: 'org-people' },
    });
    check(r, { 'org-people 200': (res) => res.status === 200 });
  });

  group('feature-flags', () => {
    const r = http.get(`${BASE_URL}/api/admin/feature-flags`, {
      headers: HEADERS,
      tags: { endpoint: 'feature-flags' },
    });
    check(r, { 'feature-flags 200': (res) => res.status === 200 });
  });

  group('workload-summary', () => {
    const r = http.get(`${BASE_URL}/api/dashboard/workload/summary`, {
      headers: HEADERS,
      tags: { endpoint: 'workload-summary' },
    });
    check(r, { 'workload-summary 200': (res) => res.status === 200 });
  });

  group('assignments-list', () => {
    const r = http.get(`${BASE_URL}/api/assignments?limit=20`, {
      headers: HEADERS,
      tags: { endpoint: 'assignments-list' },
    });
    check(r, { 'assignments 200': (res) => res.status === 200 });
  });

  // Pace each VU at ~1 iteration/sec so the 10-VU run lands at ~10 RPS
  // per VU × 10 endpoints = ~100 RPS total — matches a realistic user
  // session cadence and stays under the per-IP rate limit. Override via
  // ITER_SLEEP env var.
  sleep(parseFloat(__ENV.ITER_SLEEP || '1'));
}
