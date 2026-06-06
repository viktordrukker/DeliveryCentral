import 'reflect-metadata';

import { BadRequestException } from '@nestjs/common';

import {
  SoakChecklistService,
  type SoakChecklistCell,
  type SoakChecklistState,
} from '@src/modules/admin/application/soak-checklist.service';
import { SoakChecklistController } from '@src/modules/admin/presentation/soak-checklist.controller';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import type { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

describe('SoakChecklistController (MANUAL-CLICK-THROUGH-30)', () => {
  function makeService() {
    const store = new Map<string, unknown>();
    const settings = {
      getRawValue: jest.fn(async (key: string) => store.get(key) ?? null),
      updateKey: jest.fn(async (key: string, value: unknown) => {
        store.set(key, value);
        return { key, value, updatedBy: null, updatedAt: new Date().toISOString() };
      }),
    } as unknown as PlatformSettingsService;
    const service = new SoakChecklistService(settings);
    return { service, settings, store };
  }

  function makeController() {
    const { service } = makeService();
    return { controller: new SoakChecklistController(service), service };
  }

  function cell(
    journeyId: string,
    role: string,
    observation: SoakChecklistCell['observation'],
  ): SoakChecklistCell {
    return { journeyId, role, observation, observedAt: '2026-06-06T12:00:00.000Z' };
  }

  it('GET returns an empty session for an unknown sessionId', async () => {
    const { controller } = makeController();
    const result = await controller.get('2026-06-08-pre-c0');
    expect(result.state.sessionId).toBe('2026-06-08-pre-c0');
    expect(result.state.cells).toEqual([]);
  });

  it('PUT persists cells and GET returns them', async () => {
    const { controller } = makeController();
    const cells = [cell('J-01', 'employee', 'PASS'), cell('J-02', 'employee', 'FAIL')];
    await controller.put('s1', { cells }, { principal: { personId: 'p1', authSource: 'bearer_token', roles: ['admin'] } });
    const result = await controller.get('s1');
    expect(result.state.cells).toHaveLength(2);
    expect(result.state.cells.find((c) => c.journeyId === 'J-02')?.observation).toBe('FAIL');
  });

  it('PUT dedupes by (journeyId, role) — last write wins', async () => {
    const { controller } = makeController();
    const cells = [
      cell('J-01', 'employee', 'PASS'),
      cell('J-01', 'employee', 'FAIL'),
    ];
    const result = await controller.put('s2', { cells }, { principal: { personId: 'p1', authSource: 'bearer_token', roles: ['admin'] } });
    expect(result.state.cells).toHaveLength(1);
    expect(result.state.cells[0]?.observation).toBe('FAIL');
  });

  it('PUT rejects an invalid observation', async () => {
    const { controller } = makeController();
    const cells = [
      { journeyId: 'J-01', role: 'admin', observation: 'GREAT' as never, observedAt: '2026-06-06T12:00:00.000Z' },
    ];
    await expect(
      controller.put('s3', { cells }, { principal: { personId: 'p1', authSource: 'bearer_token', roles: ['admin'] } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PUT rejects an invalid sessionId', async () => {
    const { controller } = makeController();
    await expect(
      controller.put('not/allowed', { cells: [] }, { principal: { personId: 'p1', authSource: 'bearer_token', roles: ['admin'] } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PUT rejects missing cells array', async () => {
    const { controller } = makeController();
    await expect(
      controller.put('s4', {} as never, { principal: { personId: 'p1', authSource: 'bearer_token', roles: ['admin'] } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PUT returns a summary when `expected` is provided', async () => {
    const { controller } = makeController();
    const cells = [
      cell('J-01', 'employee', 'PASS'),
      cell('J-01', 'admin', 'PASS'),
    ];
    const expected = {
      'J-01': { admin: 'PASS', employee: 'PASS' },
    };
    const result = await controller.put(
      's5',
      { cells, expected },
      { principal: { personId: 'p1', authSource: 'bearer_token', roles: ['admin'] } },
    );
    expect(result.summary).toBeDefined();
    expect(result.summary?.totalGated).toBe(2);
    expect(result.summary?.pass).toBe(2);
    expect(result.summary?.cutoverReady).toBe(true);
  });

  it('summary flags a FAIL_EXPECTED cell observed as PASS as a regression', async () => {
    const { controller, service } = makeController();
    const cells = [cell('J-07', 'employee', 'PASS')];
    const expected = { 'J-07': { employee: 'FAIL_EXPECTED' } };
    const result = await controller.put(
      's6',
      { cells, expected },
      { principal: { personId: 'p1', authSource: 'bearer_token', roles: ['admin'] } },
    );
    expect(result.summary?.regressions).toBe(1);
    expect(result.summary?.cutoverReady).toBe(false);

    // Direct service call too — covers the summarise path standalone.
    const state: SoakChecklistState = {
      sessionId: 's6',
      startedAt: '2026-06-06T12:00:00.000Z',
      updatedAt: '2026-06-06T12:00:00.000Z',
      cells: [cell('J-07', 'employee', 'FAIL')],
    };
    const summary = service.summarise(state, expected);
    expect(summary.regressions).toBe(0);
    expect(summary.fail).toBe(0); // FAIL on a FAIL_EXPECTED is the desired outcome
    expect(summary.pass).toBe(1); // observed FAIL on FAIL_EXPECTED counts as a pass
    expect(summary.cutoverReady).toBe(true);
  });

  it('summary excludes NOT_APPLICABLE cells from the gate', async () => {
    const { service } = makeController();
    const state: SoakChecklistState = {
      sessionId: 's7',
      startedAt: '2026-06-06T12:00:00.000Z',
      updatedAt: '2026-06-06T12:00:00.000Z',
      cells: [cell('J-21', 'admin', 'PASS')],
    };
    const expected = {
      'J-21': {
        admin: 'PASS',
        director: 'NOT_APPLICABLE',
        employee: 'NOT_APPLICABLE',
      },
    };
    const summary = service.summarise(state, expected);
    expect(summary.totalGated).toBe(1);
    expect(summary.pass).toBe(1);
    expect(summary.cutoverReady).toBe(true);
  });

  it.each(['get', 'put'])('%s is gated by @RequireRoles("admin")', (method) => {
    const proto = SoakChecklistController.prototype as unknown as Record<string, unknown>;
    const handler = proto[method];
    const meta = Reflect.getMetadata(REQUIRED_ROLES_KEY, handler as object);
    expect(meta).toBeDefined();
    expect(Array.isArray(meta) ? meta : [meta]).toContain('admin');
  });
});
