import {
  LEGACY_PATH_MAP,
  canonicalisePath,
  pathsAreEquivalent,
} from '@src/shared/audit/legacy-path-map';

describe('LEGACY_PATH_MAP (FE-#312)', () => {
  it('covers all 5 Phase E redirect pairs', () => {
    expect(Object.keys(LEGACY_PATH_MAP).sort()).toEqual([
      '/assignments/queue',
      '/dashboard/employee',
      '/dashboard/exec',
      '/dashboard/manager',
      '/projects/:id/dashboard',
    ]);
  });

  it('canonicalisePath resolves known legacy paths', () => {
    expect(canonicalisePath('/dashboard/employee')).toBe('/me');
    expect(canonicalisePath('/dashboard/manager')).toBe('/me');
    expect(canonicalisePath('/dashboard/exec')).toBe('/dashboard/director');
    expect(canonicalisePath('/assignments/queue')).toBe('/approvals');
  });

  it('canonicalisePath returns null for unknown paths', () => {
    expect(canonicalisePath('/me')).toBeNull();
    expect(canonicalisePath('/random')).toBeNull();
  });

  it('pathsAreEquivalent matches direct equality', () => {
    expect(pathsAreEquivalent('/me', '/me')).toBe(true);
  });

  it('pathsAreEquivalent matches legacy → canonical', () => {
    expect(pathsAreEquivalent('/dashboard/employee', '/me')).toBe(true);
  });

  it('pathsAreEquivalent matches canonical → legacy (reverse lookup)', () => {
    expect(pathsAreEquivalent('/me', '/dashboard/employee')).toBe(true);
  });

  it('pathsAreEquivalent returns false for unrelated paths', () => {
    expect(pathsAreEquivalent('/me', '/projects')).toBe(false);
  });
});
