import { existsSync } from 'node:fs';
import { join } from 'node:path';

const expectedPaths = [
  join(process.cwd(), 'src', 'modules', 'project-registry', 'application', 'contracts'),
  join(process.cwd(), 'src', 'modules', 'integrations', 'jira', 'contracts'),
];

const missing = expectedPaths.filter((path) => !existsSync(path));

if (missing.length > 0) {
  throw new Error(`Contract validation failed. Missing paths: ${missing.join(', ')}`);
}

// eslint-disable-next-line no-console
console.log('Contract validation passed.');
