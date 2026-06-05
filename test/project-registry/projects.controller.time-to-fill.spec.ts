import { NotFoundException } from '@nestjs/common';

import { ProjectsController } from '@src/modules/project-registry/presentation/projects.controller';
import type {
  ProjectTimeToFillDto,
  TimeToFillService,
} from '@src/modules/project-registry/application/time-to-fill.service';

function makeController(opts: {
  projectExists?: boolean;
  serviceResult?: ProjectTimeToFillDto;
}): { controller: ProjectsController; svc: jest.Mocked<TimeToFillService> } {
  const projectExists = opts.projectExists ?? true;

  const getProjectByIdService = {
    execute: jest.fn().mockResolvedValue(projectExists ? { id: 'proj-1' } : null),
  };

  const serviceResult: ProjectTimeToFillDto = opts.serviceResult ?? {
    projectId: 'proj-1',
    positionCount: 0,
    filledCount: 0,
    medianDays: null,
    positions: [],
  };

  const timeToFillService = {
    execute: jest.fn().mockResolvedValue(serviceResult),
  } as unknown as jest.Mocked<TimeToFillService>;

  // Build the controller with no-op stubs for unrelated deps — the time-to-fill
  // endpoint only touches getProjectByIdService + timeToFillService.
  const noop = {} as any;
  const controller = new ProjectsController(
    noop, // projectDirectoryQueryService
    noop, // projectDashboardQueryService
    getProjectByIdService as any,
    noop, // createProjectService
    noop, // activateProjectService
    noop, // submitProjectForApprovalService
    noop, // decideProjectActivationService
    noop, // closeProjectService
    noop, // assignProjectTeamService
    noop, // updateProjectService
    noop, // projectHealthQueryService
    noop, // closureReadinessService
    timeToFillService,
  );

  return { controller, svc: timeToFillService };
}

describe('ProjectsController.getProjectTimeToFill (LEAN-P4b-1)', () => {
  it('throws NotFoundException when the project does not exist', async () => {
    const { controller, svc } = makeController({ projectExists: false });
    await expect(controller.getProjectTimeToFill('proj-1')).rejects.toThrow(NotFoundException);
    expect(svc.execute).not.toHaveBeenCalled();
  });

  it('returns the service result when the project exists', async () => {
    const result: ProjectTimeToFillDto = {
      projectId: 'proj-1',
      positionCount: 2,
      filledCount: 1,
      medianDays: 12,
      positions: [
        {
          positionId: 'pp-1',
          role: 'ENGINEER',
          fillStatus: 'BOOKED',
          firstOpenedAt: '2026-01-01T00:00:00.000Z',
          firstBookedAt: '2026-01-13T00:00:00.000Z',
          timeToFillDays: 12,
        },
        {
          positionId: 'pp-2',
          role: 'PM',
          fillStatus: 'OPEN',
          firstOpenedAt: '2026-02-01T00:00:00.000Z',
          firstBookedAt: null,
          timeToFillDays: null,
        },
      ],
    };
    const { controller, svc } = makeController({ serviceResult: result });
    const out = await controller.getProjectTimeToFill('proj-1');
    expect(svc.execute).toHaveBeenCalledWith('proj-1');
    expect(out).toEqual(result);
  });
});
