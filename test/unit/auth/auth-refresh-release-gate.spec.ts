import * as fs from 'fs';
import * as path from 'path';

/**
 * F-16.20 / CC-9 — release-gate test for `/auth/refresh` semantics.
 *
 * CC-7 changed the no-cookie response from 401 → 204 because a 401
 * floods the browser console with auth-probe noise on every page
 * load. This test guards against a regression that would silently
 * revert the controller back to throwing 401 / `UnauthorizedException`
 * on the no-cookie branch.
 *
 * Static grep instead of a Nest container test — the regression we're
 * guarding is a one-line change in `auth.controller.ts`, and a
 * deterministic grep is cheaper than booting Nest just to assert a
 * status code.
 */

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const AUTH_CONTROLLER = path.join(REPO_ROOT, 'src/modules/auth/auth.controller.ts');

describe('CC-9 — /auth/refresh release-gate', () => {
  let source: string;

  beforeAll(() => {
    expect(fs.existsSync(AUTH_CONTROLLER)).toBe(true);
    source = fs.readFileSync(AUTH_CONTROLLER, 'utf8');
  });

  it('exposes the @Post("refresh") endpoint', () => {
    expect(source).toMatch(/@Post\(['"]refresh['"]\)/);
  });

  it('returns 204 NO_CONTENT (not 401) when the refresh cookie is missing', () => {
    // Locate the `refresh()` method body via the @Post('refresh') anchor.
    const startIdx = source.search(/@Post\(['"]refresh['"]\)[\s\S]*?public async refresh\b/);
    expect(startIdx).toBeGreaterThan(-1);
    // Read the next ~600 chars (covers the small method body).
    const body = source.slice(startIdx, startIdx + 600);

    // The no-cookie branch must set 204 NO_CONTENT and return undefined.
    expect(body).toMatch(/HttpStatus\.NO_CONTENT/);
    expect(body).toMatch(/res\.status\(\s*HttpStatus\.NO_CONTENT\s*\)/);

    // Negative assertion: must NOT throw 401 / UnauthorizedException on missing cookie.
    expect(body).not.toMatch(/throw\s+new\s+UnauthorizedException/);
    expect(body).not.toMatch(/HttpStatus\.UNAUTHORIZED/);
  });
});
