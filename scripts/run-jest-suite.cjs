#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const defaultFastWorkers = process.env.CI ? '50%' : '75%';
const defaultDbWorkers = '1';
const defaultSlowWorkers = process.env.CI ? '50%' : '50%';

const suites = {
  unit: [
    {
      args: ['--testPathPattern=test/unit/'],
      maxWorkers: process.env.JEST_UNIT_MAX_WORKERS ?? defaultFastWorkers,
    },
  ],
  domain: [
    {
      args: ['--testPathPattern=test/domain(?:/|-)'],
      maxWorkers: process.env.JEST_DOMAIN_MAX_WORKERS ?? defaultFastWorkers,
    },
  ],
  contracts: [
    {
      args: ['--testPathPattern=test/contracts/'],
      maxWorkers: process.env.JEST_CONTRACTS_MAX_WORKERS ?? defaultFastWorkers,
    },
  ],
  repository: [
    {
      args: ['--testPathPattern=test/repository/'],
      maxWorkers: process.env.JEST_REPOSITORY_MAX_WORKERS ?? defaultDbWorkers,
    },
  ],
  integration: [
    {
      args: ['--testPathPattern=test/integration/'],
      maxWorkers: process.env.JEST_INTEGRATION_MAX_WORKERS ?? defaultDbWorkers,
    },
  ],
  performance: [
    {
      args: ['--testPathPattern=test/performance/'],
      maxWorkers: process.env.JEST_PERFORMANCE_MAX_WORKERS ?? defaultSlowWorkers,
    },
  ],
  'backend-e2e': [
    {
      args: ['--config', './test/jest-e2e.json'],
      maxWorkers: process.env.JEST_E2E_MAX_WORKERS ?? defaultSlowWorkers,
    },
  ],
  fast: [
    {
      args: ['--testPathPattern=test/(?:unit/|domain(?:/|-)|contracts/)'],
      maxWorkers: process.env.JEST_FAST_MAX_WORKERS ?? defaultFastWorkers,
    },
  ],
  db: [
    {
      args: ['--testPathPattern=test/(?:repository/|integration/)'],
      maxWorkers: process.env.JEST_DB_MAX_WORKERS ?? defaultDbWorkers,
    },
  ],
  slow: [
    {
      args: ['--testPathPattern=test/performance/'],
      maxWorkers: process.env.JEST_PERFORMANCE_MAX_WORKERS ?? defaultSlowWorkers,
    },
    {
      args: ['--config', './test/jest-e2e.json'],
      maxWorkers: process.env.JEST_E2E_MAX_WORKERS ?? defaultSlowWorkers,
    },
  ],
};

const suite = process.argv[2];

if (!suite || !suites[suite]) {
  const supportedSuites = Object.keys(suites).join(', ');
  console.error(`Unknown Jest suite "${suite ?? ''}". Supported suites: ${supportedSuites}`);
  process.exit(1);
}

const extraArgs = process.argv.slice(3);
const jestBin = require.resolve('jest/bin/jest');

for (const command of suites[suite]) {
  const result = spawnSync(process.execPath, [jestBin, ...command.args, ...extraArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      JEST_MAX_WORKERS: command.maxWorkers,
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
