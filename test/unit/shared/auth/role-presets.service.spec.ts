import { RolePresetsService } from '@src/shared/auth/role-presets.service';
import {
  DEFAULT_ROLE_PRESETS,
  ROLE_PRESET_NAMES,
  platformSettingKeyForPreset,
} from '@src/shared/auth/role-presets';

describe('RolePresetsService (F-5.2 / D-130 step 2)', () => {
  function makePrismaMock(rows: Array<{ key: string; value: unknown }>) {
    return {
      platformSetting: {
        findMany: jest.fn(async () => rows),
      },
    } as unknown as ConstructorParameters<typeof RolePresetsService>[0];
  }

  it('returns compile-time defaults when no overrides exist', async () => {
    const svc = new RolePresetsService(makePrismaMock([]));
    for (const name of ROLE_PRESET_NAMES) {
      const live = await svc.resolve(name);
      expect(live).toEqual([...DEFAULT_ROLE_PRESETS[name]]);
    }
  });

  it('returns override for a single preset when set', async () => {
    const svc = new RolePresetsService(
      makePrismaMock([
        {
          key: platformSettingKeyForPreset('EXEC_ROLES'),
          value: ['director', 'admin', 'delivery_manager'],
        },
      ]),
    );
    const live = await svc.resolve('EXEC_ROLES');
    expect(new Set(live)).toEqual(new Set(['director', 'admin', 'delivery_manager']));
    // Other presets remain default
    const hrLive = await svc.resolve('HR_GOVERNANCE_ROLES');
    expect(hrLive).toEqual([...DEFAULT_ROLE_PRESETS.HR_GOVERNANCE_ROLES]);
  });

  it('ignores override with a non-array value', async () => {
    const svc = new RolePresetsService(
      makePrismaMock([
        { key: platformSettingKeyForPreset('EXEC_ROLES'), value: 'director,admin' },
      ]),
    );
    const live = await svc.resolve('EXEC_ROLES');
    expect(live).toEqual([...DEFAULT_ROLE_PRESETS.EXEC_ROLES]);
  });

  it('ignores override containing an invalid PlatformRole', async () => {
    const svc = new RolePresetsService(
      makePrismaMock([
        { key: platformSettingKeyForPreset('EXEC_ROLES'), value: ['director', 'wizard'] },
      ]),
    );
    const live = await svc.resolve('EXEC_ROLES');
    expect(live).toEqual([...DEFAULT_ROLE_PRESETS.EXEC_ROLES]);
  });

  it('ignores override for an unknown preset name', async () => {
    const svc = new RolePresetsService(
      makePrismaMock([
        { key: 'responsibilityMatrix.UNKNOWN_PRESET.roles', value: ['admin'] },
      ]),
    );
    const live = await svc.resolve('EXEC_ROLES');
    expect(live).toEqual([...DEFAULT_ROLE_PRESETS.EXEC_ROLES]);
  });

  it('invalidate() forces a fresh DB read on next resolve', async () => {
    let rows: Array<{ key: string; value: unknown }> = [];
    const prismaMock = {
      platformSetting: {
        findMany: jest.fn(async () => rows),
      },
    } as unknown as ConstructorParameters<typeof RolePresetsService>[0];
    const svc = new RolePresetsService(prismaMock);

    expect(await svc.resolve('EXEC_ROLES')).toEqual([...DEFAULT_ROLE_PRESETS.EXEC_ROLES]);

    rows = [
      {
        key: platformSettingKeyForPreset('EXEC_ROLES'),
        value: ['admin', 'director', 'project_manager'],
      },
    ];
    // Without invalidate, cache still serves the old (default) value
    expect(await svc.resolve('EXEC_ROLES')).toEqual([...DEFAULT_ROLE_PRESETS.EXEC_ROLES]);

    svc.invalidate();
    const live = await svc.resolve('EXEC_ROLES');
    expect(new Set(live)).toEqual(new Set(['admin', 'director', 'project_manager']));
  });

  it('resolveAll() returns every preset', async () => {
    const svc = new RolePresetsService(makePrismaMock([]));
    const all = await svc.resolveAll();
    for (const name of ROLE_PRESET_NAMES) {
      expect(all[name]).toEqual([...DEFAULT_ROLE_PRESETS[name]]);
    }
  });
});
