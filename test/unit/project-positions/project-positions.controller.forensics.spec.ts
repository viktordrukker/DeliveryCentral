import { NotFoundException } from '@nestjs/common';

import type {
  PositionForensicsDto,
  PositionForensicsService,
} from '@src/modules/project-positions/application/position-forensics.service';
import { ProjectPositionsController } from '@src/modules/project-positions/presentation/project-positions.controller';

function makeController(opts: {
  forensicsResult?: PositionForensicsDto;
  forensicsThrows?: Error;
}): { controller: ProjectPositionsController; svc: jest.Mocked<PositionForensicsService> } {
  const forensicsService = {
    execute: opts.forensicsThrows
      ? jest.fn().mockRejectedValue(opts.forensicsThrows)
      : jest.fn().mockResolvedValue(opts.forensicsResult ?? {
          positionId: 'pos-1',
          projectId: 'proj-1',
          role: 'Engineer',
          currentStatus: 'OPEN',
          events: [],
          asOf: '2026-06-05T00:00:00.000Z',
        }),
  } as unknown as jest.Mocked<PositionForensicsService>;

  // Build the controller with no-op stubs for unrelated deps — the forensics
  // endpoint only touches forensicsService.
  const noop = {} as never;
  const controller = new ProjectPositionsController(
    noop, // createService
    noop, // createAndBookService
    noop, // transitionService
    noop, // listService
    noop, // getService
    noop, // suggestFillsService
    forensicsService,
    noop, // historyService
    noop, // bulkReassignService
  );

  return { controller, svc: forensicsService };
}

describe('ProjectPositionsController.forensics (LEAN-P4b-2)', () => {
  it('propagates NotFoundException when the position does not exist', async () => {
    const { controller, svc } = makeController({
      forensicsThrows: new NotFoundException('ProjectPosition pos-missing not found.'),
    });
    await expect(controller.forensics('pos-missing')).rejects.toThrow(NotFoundException);
    expect(svc.execute).toHaveBeenCalledWith('pos-missing');
  });

  it('returns the service result when the position exists', async () => {
    const result: PositionForensicsDto = {
      positionId: 'pos-1',
      projectId: 'proj-1',
      role: 'PM',
      currentStatus: 'PROPOSED',
      events: [
        {
          id: 'h1',
          changeType: 'OPENED',
          previousStatus: 'DRAFT',
          newStatus: 'OPEN',
          previousPersonId: null,
          newPersonId: null,
          changedByPersonId: 'pm-1',
          changeReason: null,
          occurredAt: '2026-06-01T00:00:00.000Z',
          dwellMs: 86_400_000,
          longDwell: false,
        },
        {
          id: 'h2',
          changeType: 'PROPOSED',
          previousStatus: 'OPEN',
          newStatus: 'PROPOSED',
          previousPersonId: null,
          newPersonId: 'person-1',
          changedByPersonId: 'pm-1',
          changeReason: 'Initial slate',
          occurredAt: '2026-06-02T00:00:00.000Z',
          dwellMs: 4 * 86_400_000,
          longDwell: true,
        },
      ],
      asOf: '2026-06-06T00:00:00.000Z',
    };
    const { controller, svc } = makeController({ forensicsResult: result });
    const out = await controller.forensics('pos-1');
    expect(svc.execute).toHaveBeenCalledWith('pos-1');
    expect(out).toEqual(result);
  });
});
