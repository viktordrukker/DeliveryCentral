import 'reflect-metadata';

import { BadRequestException } from '@nestjs/common';

import { RuntimeFlagDebugController } from '@src/modules/admin/presentation/runtime-flag-debug.controller';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

describe('RuntimeFlagDebugController (ROLLBACK-DRILL)', () => {
  function makeFixture(stored: Record<string, unknown> = {}) {
    const settingsMock = {
      getRawValue: jest.fn(async (key: string) => stored[key] ?? null),
    } as unknown as PlatformSettingsService;

    return {
      controller: new RuntimeFlagDebugController(settingsMock),
      settingsMock,
    };
  }

  it('returns the resolved value + cachedAt timestamp for a known key', async () => {
    const { controller, settingsMock } = makeFixture({
      'flag.dsRefresh': true,
    });

    const out = await controller.getFlag('flag.dsRefresh');

    expect(out.key).toBe('flag.dsRefresh');
    expect(out.value).toBe(true);
    expect(out.cachedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(settingsMock.getRawValue).toHaveBeenCalledWith('flag.dsRefresh');
  });

  it('returns null value when the key has no override and no default', async () => {
    const { controller } = makeFixture({});
    const out = await controller.getFlag('flag.workspaceMe');
    expect(out.value).toBeNull();
  });

  it('throws BadRequest when key is missing or empty', async () => {
    const { controller } = makeFixture();
    await expect(controller.getFlag(undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.getFlag('')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('controller method is gated by @RequireRoles("admin")', () => {
    const proto = RuntimeFlagDebugController.prototype as unknown as Record<
      string,
      unknown
    >;
    const handler = proto.getFlag;
    const meta = Reflect.getMetadata(REQUIRED_ROLES_KEY, handler as object);
    expect(meta).toBeDefined();
    const roles = Array.isArray(meta) ? meta : [meta];
    expect(roles).toContain('admin');
  });
});
