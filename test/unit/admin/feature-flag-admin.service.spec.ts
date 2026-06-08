import { ForbiddenException, NotFoundException } from '@nestjs/common';

import {
  FeatureFlagAdminService,
  ROLLOUT_LOCKED_FLAGS,
} from '@src/modules/admin-feature-flags/application/feature-flag-admin.service';
import { PLATFORM_FLAGS } from '@src/shared/config/platform-flags.service';

/**
 * LEAN-P4d-2 — unit coverage for the toggle + list service that backs the
 * inline `/admin?tab=feature-flags` UI.
 */
describe('FeatureFlagAdminService (LEAN-P4d-2)', () => {
  function makeFixture(opts: { initialResolved?: boolean } = {}) {
    const upsertCalls: Array<{
      where: { key: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }> = [];
    const invalidate = jest.fn();
    const isEnabledByKey = jest.fn(async () => opts.initialResolved ?? false);

    const flagsMock = {
      listAll: jest.fn(async () => [
        {
          id: 'flagA',
          key: 'flag.A.enabled',
          description: 'A',
          category: 'ui',
          maturityLevel: 'beta',
          owner: 'team',
          default: false,
          currentValue: opts.initialResolved ?? false,
        },
      ]),
      isEnabledByKey,
      invalidate,
    };

    const prismaMock = {
      platformSetting: {
        upsert: jest.fn(async (args: typeof upsertCalls[number]) => {
          upsertCalls.push(args);
          return { key: args.where.key };
        }),
      },
    };

    const svc = new FeatureFlagAdminService(
      flagsMock as unknown as ConstructorParameters<typeof FeatureFlagAdminService>[0],
      prismaMock as unknown as ConstructorParameters<typeof FeatureFlagAdminService>[1],
    );
    return { svc, flagsMock, prismaMock, upsertCalls, invalidate, isEnabledByKey };
  }

  it('list() delegates to PlatformFlagsService.listAll()', async () => {
    const { svc, flagsMock } = makeFixture();
    const rows = await svc.list();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('flagA');
    expect(flagsMock.listAll).toHaveBeenCalledTimes(1);
  });

  it('toggle() rejects an unknown flag id with NotFoundException', async () => {
    const { svc } = makeFixture();
    await expect(svc.toggle('not-a-real-flag-id', true, 'actor-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('toggle() upserts PlatformSetting with the new value + actorId, then invalidates the cache', async () => {
    const { svc, upsertCalls, invalidate, isEnabledByKey } = makeFixture({
      initialResolved: false,
    });
    // Pick a real registered flag id so the lookup resolves.
    const flagId = Object.keys(PLATFORM_FLAGS)[0]!;
    const expectedKey = (PLATFORM_FLAGS as Record<string, { key: string }>)[flagId]!.key;

    const result = await svc.toggle(flagId, true, 'actor-1');

    expect(isEnabledByKey).toHaveBeenCalledWith(expectedKey, expect.any(Boolean));
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].where.key).toBe(expectedKey);
    expect(upsertCalls[0].create).toMatchObject({
      key: expectedKey,
      value: true,
      createdByPersonId: 'actor-1',
      updatedByPersonId: 'actor-1',
    });
    expect(upsertCalls[0].update).toMatchObject({
      value: true,
      updatedByPersonId: 'actor-1',
    });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(flagId);
    expect(result.key).toBe(expectedKey);
    expect(result.previousValue).toBe(false);
    expect(result.currentValue).toBe(true);
  });

  it('toggle() persists null actorId when the caller has no principal', async () => {
    const { svc, upsertCalls } = makeFixture();
    const flagId = Object.keys(PLATFORM_FLAGS)[0]!;
    await svc.toggle(flagId, false, null);
    expect(upsertCalls[0].create.createdByPersonId).toBeNull();
    expect(upsertCalls[0].update.updatedByPersonId).toBeNull();
  });

  // W4-07 — backend enforcement of ROLLOUT_LOCKED_FLAGS. The
  // /admin/feature-flags FE already renders these as locked chips; the BE
  // must also reject direct PATCH calls so a controlled v2 rollout cannot
  // be bypassed.
  it('toggle() rejects rollout-locked flags with ForbiddenException and does NOT write to PlatformSetting', async () => {
    const { svc, upsertCalls, invalidate } = makeFixture();
    expect(ROLLOUT_LOCKED_FLAGS.has('dsRefresh')).toBe(true);
    expect(ROLLOUT_LOCKED_FLAGS.has('workspaceMe')).toBe(true);

    await expect(svc.toggle('dsRefresh', true, 'actor-1')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(svc.toggle('workspaceMe', false, 'actor-1')).rejects.toThrow(
      ForbiddenException,
    );

    expect(upsertCalls).toHaveLength(0);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
