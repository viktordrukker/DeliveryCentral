import '@testing-library/jest-dom';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Default @testing-library `asyncUtilTimeout` is 1000 ms. Pages that chain
// 3+ API fetches on mount (dashboards, project detail) can't always settle
// in one second on CI. Bump to 3000 ms globally; individual tests can still
// override with `{ timeout: N }`.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
