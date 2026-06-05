import { BadRequestException } from '@nestjs/common';

import { FeatureFlagAdminService } from '@src/modules/admin-feature-flags/application/feature-flag-admin.service';
import { FeatureFlagsAdminController } from '@src/modules/admin-feature-flags/feature-flags.controller';

/**
 * LEAN-P4d-2 — covers the dual-shape body (`value` legacy + `enabled` new)
 * and the actorId stamping on every flip (D-103 pattern).
 */
describe('FeatureFlagsAdminController (LEAN-P4d-2)', () => {
  function makeFixture() {
    const toggleCalls: Array<{ id: string; next: boolean; actorId: string | null }> = [];
    const serviceMock = {
      list: jest.fn(async () => [{ id: 'flagA', key: 'flag.A.enabled', currentValue: false }]),
      toggle: jest.fn(async (id: string, next: boolean, actorId: string | null) => {
        toggleCalls.push({ id, next, actorId });
        return { id, key: `flag.${id}.enabled`, previousValue: !next, currentValue: next };
      }),
    } as unknown as FeatureFlagAdminService;
    const controller = new FeatureFlagsAdminController(serviceMock);
    return { controller, serviceMock, toggleCalls };
  }

  it('list() proxies to the service', async () => {
    const { controller, serviceMock } = makeFixture();
    const rows = await controller.list();
    expect(rows).toHaveLength(1);
    expect((serviceMock.list as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it('update() accepts the legacy { value } body shape', async () => {
    const { controller, toggleCalls } = makeFixture();
    await controller.update(
      'flagA',
      { value: true },
      { principal: { personId: 'actor-1' } },
    );
    expect(toggleCalls).toEqual([{ id: 'flagA', next: true, actorId: 'actor-1' }]);
  });

  it('update() accepts the new { enabled } body shape', async () => {
    const { controller, toggleCalls } = makeFixture();
    await controller.update(
      'flagA',
      { enabled: false },
      { principal: { personId: 'actor-2' } },
    );
    expect(toggleCalls).toEqual([{ id: 'flagA', next: false, actorId: 'actor-2' }]);
  });

  it('update() prefers `enabled` over `value` when both are present', async () => {
    const { controller, toggleCalls } = makeFixture();
    await controller.update(
      'flagA',
      { enabled: true, value: false },
      { principal: { personId: 'actor-3' } },
    );
    expect(toggleCalls[0].next).toBe(true);
  });

  it('update() rejects when neither value nor enabled is supplied', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.update('flagA', {}, { principal: { personId: 'actor-1' } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('update() stamps actorId from principal.personId', async () => {
    const { controller, toggleCalls } = makeFixture();
    await controller.update(
      'flagA',
      { enabled: true },
      { principal: { personId: 'person-123' } },
    );
    expect(toggleCalls[0].actorId).toBe('person-123');
  });

  it('update() falls back to principal.userId when personId is missing', async () => {
    const { controller, toggleCalls } = makeFixture();
    await controller.update(
      'flagA',
      { enabled: true },
      { principal: { userId: 'user-xyz' } },
    );
    expect(toggleCalls[0].actorId).toBe('user-xyz');
  });

  it('update() stamps null actorId when no principal is attached', async () => {
    const { controller, toggleCalls } = makeFixture();
    await controller.update('flagA', { enabled: true }, {});
    expect(toggleCalls[0].actorId).toBeNull();
  });
});
