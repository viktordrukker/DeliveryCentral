import type { Config } from 'jest';

const configuredMaxWorkers = process.env['JEST_MAX_WORKERS']?.trim();
const defaultMaxWorkers = process.env['CI'] ? '50%' : '75%';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@scure/base|@noble/hashes|@otplib/plugin-crypto-noble)/)'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  maxWorkers: configuredMaxWorkers && configuredMaxWorkers.length > 0 ? configuredMaxWorkers : defaultMaxWorkers,
  // Default Jest testTimeout is 5000 ms, which is too short for the NestJS
  // integration-test bootstrap (AppModule.compile() + Prisma $connect typically
  // takes 7–15 s in CI/Docker). Bump to 30 s globally; fast unit tests will
  // never approach this ceiling.
  testTimeout: 30000,
};

export default config;
