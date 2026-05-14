import { BadRequestException } from '@nestjs/common';

import { RolePresetsAdminController } from '@src/modules/admin/presentation/role-presets-admin.controller';
import { RolePresetsService } from '@src/shared/auth/role-presets.service';
import {
  DEFAULT_ROLE_PRESETS,
  ROLE_PRESET_NAMES,
  platformSettingKeyForPreset,
} from '@src/shared/auth/role-presets';

interface SettingsRow {
  key: string;
  value: unknown;
}

describe('RolePresetsAdminController (F-5.2 / D-130 step 2)', () => {
  function makeFixture() {
    const settings: SettingsRow[] = [];
    const settingsMock = {
      updateKey: jest.fn(async (key: string, value: unknown) => {
        const idx = settings.findIndex((s) => s.key === key);
        if (idx >= 0) settings[idx] = { key, value };
        else settings.push({ key, value });
        return { key, value };
      }),
      getRawValue: jest.fn(async (key: string) => {
        const row = settings.find((s) => s.key === key);
        return row ? row.value : null;
      }),
    } as unknown as ConstructorParameters<typeof RolePresetsAdminController>[0];

    const prismaMock = {
      platformSetting: {
        findMany: jest.fn(async () => settings.filter((s) => s.value !== null)),
      },
    } as unknown as ConstructorParameters<typeof RolePresetsService>[0];
    const svc = new RolePresetsService(prismaMock);
    const controller = new RolePresetsAdminController(settingsMock, svc);
    return { controller, svc, settings, settingsMock };
  }

  const noPrincipal = { principal: undefined };

  it('list() returns every preset with defaults + effective', async () => {
    const { controller } = makeFixture();
    const rows = await controller.list();
    expect(rows.length).toBe(ROLE_PRESET_NAMES.length);
    for (const row of rows) {
      expect(row.defaults).toEqual([...DEFAULT_ROLE_PRESETS[row.preset]]);
      expect(row.effective).toEqual([...DEFAULT_ROLE_PRESETS[row.preset]]);
      expect(row.overridden).toBe(false);
    }
  });

  it('getOne() rejects an unknown preset name', async () => {
    const { controller } = makeFixture();
    await expect(controller.getOne('NOT_A_PRESET')).rejects.toThrow(BadRequestException);
  });

  it('setOverride() rejects a non-array roles value', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.setOverride('EXEC_ROLES', { roles: 'admin' as unknown as string[] }, noPrincipal),
    ).rejects.toThrow(BadRequestException);
  });

  it('setOverride() rejects an empty roles array', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.setOverride('EXEC_ROLES', { roles: [] }, noPrincipal),
    ).rejects.toThrow(BadRequestException);
  });

  it('setOverride() rejects an invalid PlatformRole', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.setOverride('EXEC_ROLES', { roles: ['admin', 'wizard'] }, noPrincipal),
    ).rejects.toThrow(BadRequestException);
  });

  it('setOverride() rejects a roles array missing "admin"', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.setOverride('EXEC_ROLES', { roles: ['director'] }, noPrincipal),
    ).rejects.toThrow(BadRequestException);
  });

  it('setOverride() persists, deduplicates, and flips overridden=true', async () => {
    const { controller, settingsMock } = makeFixture();
    const result = await controller.setOverride(
      'EXEC_ROLES',
      { roles: ['admin', 'admin', 'director', 'delivery_manager'] },
      noPrincipal,
    );
    expect(new Set(result.effective)).toEqual(
      new Set(['admin', 'director', 'delivery_manager']),
    );
    expect(result.overridden).toBe(true);
    expect(settingsMock.updateKey).toHaveBeenCalledWith(
      platformSettingKeyForPreset('EXEC_ROLES'),
      expect.arrayContaining(['admin', 'director', 'delivery_manager']),
      undefined,
    );
  });

  it('setOverride() with roles=null clears the override and returns defaults', async () => {
    const { controller } = makeFixture();
    await controller.setOverride(
      'EXEC_ROLES',
      { roles: ['admin', 'director', 'delivery_manager'] },
      noPrincipal,
    );
    const cleared = await controller.setOverride('EXEC_ROLES', { roles: null }, noPrincipal);
    expect(cleared.effective).toEqual([...DEFAULT_ROLE_PRESETS.EXEC_ROLES]);
    expect(cleared.overridden).toBe(false);
  });
});
