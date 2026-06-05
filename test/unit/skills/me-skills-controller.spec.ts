import { BadRequestException } from '@nestjs/common';

import { MeSkillsController } from '@src/modules/skills/presentation/skills.controller';
import { SelfEndorseSkillService } from '@src/modules/skills/application/self-endorse-skill.service';
import type { RequestPrincipal } from '@src/modules/identity-access/application/request-principal';

/**
 * LEAN-P4d-4 — `POST /api/me/skills` route surface tests.
 *
 * Covers:
 *   1. Happy path resolves personId from `req.principal` and calls the
 *      service with the body's skillId + proficiency.
 *   2. Missing principal raises BadRequestException (no silent NULL).
 *   3. Falls back to `principal.userId` when `personId` is absent
 *      (parity with PulseController.resolvePersonId).
 */
describe('MeSkillsController', () => {
  function makeFixture() {
    const calls: Array<{ personId: string; skillId: string; proficiency: number }> = [];
    const svc = {
      endorse: jest.fn(async (personId: string, skillId: string, proficiency: number) => {
        calls.push({ personId, skillId, proficiency });
        return {
          id: 'ps-1',
          personId,
          skillId,
          skillName: 'TypeScript',
          skillCategory: 'Engineering',
          proficiency,
          certified: false,
          updatedAt: '2026-06-05T00:00:00.000Z',
        };
      }),
    } as unknown as SelfEndorseSkillService;

    const controller = new MeSkillsController(svc);
    return { controller, calls };
  }

  function req(principal: Partial<RequestPrincipal> | undefined): { principal?: RequestPrincipal } {
    return {
      principal: principal as RequestPrincipal | undefined,
    };
  }

  it('endorses using personId from principal', async () => {
    const { controller, calls } = makeFixture();
    const result = await controller.endorse(
      { skillId: 'sk-1', proficiency: 3 },
      req({ authSource: 'bearer_token', personId: 'p-7', roles: ['employee'] }),
    );

    expect(calls).toEqual([{ personId: 'p-7', skillId: 'sk-1', proficiency: 3 }]);
    expect(result.proficiency).toBe(3);
  });

  it('falls back to userId when personId is missing', async () => {
    const { controller, calls } = makeFixture();
    await controller.endorse(
      { skillId: 'sk-1', proficiency: 2 },
      req({ authSource: 'bearer_token', userId: 'u-9', roles: ['employee'] }),
    );

    expect(calls[0]?.personId).toBe('u-9');
  });

  it('rejects when neither personId nor userId is present', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.endorse(
        { skillId: 'sk-1', proficiency: 2 },
        req({ authSource: 'bearer_token', roles: ['employee'] }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when principal is entirely absent', async () => {
    const { controller } = makeFixture();
    await expect(
      controller.endorse({ skillId: 'sk-1', proficiency: 2 }, req(undefined)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
