import { NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CpiWhatIfService, CpiWhatIfResponse } from '@src/modules/financial-governance/application/cpi-what-if.service';
import { EvmComputationService } from '@src/modules/financial-governance/application/evm-computation.service';
import { ProjectEvmController } from '@src/modules/financial-governance/presentation/evm.controller';
import { REQUIRED_ROLES_KEY } from '@src/modules/identity-access/application/roles.decorator';
import { PROJECT_DELIVERY_ROLES } from '@src/shared/auth/role-presets';

function makeController(
  cpiResponse?: CpiWhatIfResponse,
  rejectWith?: Error,
): ProjectEvmController {
  const evm = {} as EvmComputationService;
  const cpi = {
    project: async (): Promise<CpiWhatIfResponse> => {
      if (rejectWith) throw rejectWith;
      return cpiResponse!;
    },
  } as unknown as CpiWhatIfService;
  return new ProjectEvmController(evm, cpi);
}

describe('ProjectEvmController.cpiWhatIfProject (LEAN-P4-missing-7)', () => {
  describe('RBAC', () => {
    it('POST /projects/:id/cpi-what-if is gated to PROJECT_DELIVERY_ROLES', () => {
      const reflector = new Reflector();
      const roles = reflector.get<readonly string[]>(
        REQUIRED_ROLES_KEY,
        ProjectEvmController.prototype.cpiWhatIfProject,
      );
      expect(roles).toBeDefined();
      expect([...roles!].sort()).toEqual([...PROJECT_DELIVERY_ROLES].sort());
    });

    it('includes director + admin via PROJECT_DELIVERY_ROLES', () => {
      const reflector = new Reflector();
      const roles = reflector.get<readonly string[]>(
        REQUIRED_ROLES_KEY,
        ProjectEvmController.prototype.cpiWhatIfProject,
      );
      expect(roles).toContain('director');
      expect(roles).toContain('admin');
      expect(roles).toContain('project_manager');
      expect(roles).toContain('delivery_manager');
    });
  });

  describe('happy path', () => {
    it('returns the projection from the service', async () => {
      const response: CpiWhatIfResponse = {
        baselineCPI: 0.95,
        projectedCPI: 0.87,
        deltaACWP: 60000,
        warningThreshold: 'AMBER',
        explanation: 'Scenario adds 2 people ($60,000 cost). CPI 0.95 → 0.87 (AMBER).',
      };
      const ctrl = makeController(response);
      const out = await ctrl.cpiWhatIfProject(
        '00000000-0000-0000-0000-000000000001',
        {
          scenarioPeople: [
            { role: 'Senior FE', monthlyRate: 10000, monthsRemaining: 3, quantity: 2 },
          ],
        } as never,
      );
      expect(out).toEqual(response);
    });
  });

  describe('error mapping', () => {
    it('re-throws NotFoundException (project missing)', async () => {
      const ctrl = makeController(undefined, new NotFoundException('Project x not found.'));
      await expect(
        ctrl.cpiWhatIfProject(
          '00000000-0000-0000-0000-000000000001',
          { scenarioPeople: [] } as never,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('wraps non-NotFound errors in BadRequestException', async () => {
      const ctrl = makeController(undefined, new Error('boom'));
      await expect(
        ctrl.cpiWhatIfProject(
          '00000000-0000-0000-0000-000000000001',
          { scenarioPeople: [] } as never,
        ),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
