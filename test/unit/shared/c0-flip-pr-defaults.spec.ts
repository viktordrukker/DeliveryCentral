import { PLATFORM_FLAGS } from '@src/shared/config/platform-flags.service';

/**
 * C0-FLIP-PR — asserts that the `dsRefresh` + `workspaceMe` registry defaults
 * have been flipped to ON. This is the v2 cutover trigger.
 *
 * IMPORTANT: this test passing means the cutover defaults are armed in code.
 * The PR carrying this change MUST NOT be merged until V2-SOAK sign-off
 * (≥ 1 week green) + the manual click-through is complete. See
 * `docs/runbooks/CUTOVER_RUNBOOK.md` and the 22-gate C0 ledger.
 */
describe('C0-FLIP-PR — dsRefresh + workspaceMe registry defaults', () => {
  it('PLATFORM_FLAGS.dsRefresh.default is true', () => {
    expect(PLATFORM_FLAGS.dsRefresh.default).toBe(true);
  });

  it('PLATFORM_FLAGS.workspaceMe.default is true', () => {
    expect(PLATFORM_FLAGS.workspaceMe.default).toBe(true);
  });
});
