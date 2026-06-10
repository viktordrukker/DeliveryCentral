import { INestApplication, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { PublicIdService } from '@src/infrastructure/public-id';
import { BulkReassignPositionsService } from '@src/modules/project-positions/application/bulk-reassign-positions.service';
import { CreateProjectPositionService } from '@src/modules/project-positions/application/create-project-position.service';
import { GetProjectPositionByIdService } from '@src/modules/project-positions/application/get-project-position-by-id.service';
import { ListPositionHistoryService } from '@src/modules/project-positions/application/list-position-history.service';
import { ListProjectPositionsService } from '@src/modules/project-positions/application/list-project-positions.service';
import { PositionForensicsService } from '@src/modules/project-positions/application/position-forensics.service';
import { SuggestFillsService } from '@src/modules/project-positions/application/suggest-fills.service';
import { TransitionProjectPositionFillService } from '@src/modules/project-positions/application/transition-project-position-fill.service';
import { OptimisticConcurrencyConflictError } from '@src/modules/project-positions/domain/repositories/project-position-repository.port';
import { InvalidPositionFillTransitionError } from '@src/modules/project-positions/domain/value-objects/position-fill-status';
import { ProjectPositionsController } from '@src/modules/project-positions/presentation/project-positions.controller';

const POSITION_ID = '0b9f7a3e-1d2c-4e5f-8a6b-7c8d9e0f1a2b';

/**
 * PositionDomainExceptionFilter — verifies each domain failure class maps to
 * its HTTP status (instead of the pre-fix opaque 500) and that the original
 * domain error message passes through to the response body.
 */
describe('ProjectPositionsController transition error mapping', () => {
  let app: INestApplication;
  const transitionService = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProjectPositionsController],
      providers: [
        { provide: CreateProjectPositionService, useValue: {} },
        { provide: TransitionProjectPositionFillService, useValue: transitionService },
        { provide: ListProjectPositionsService, useValue: {} },
        { provide: GetProjectPositionByIdService, useValue: {} },
        { provide: SuggestFillsService, useValue: {} },
        { provide: PositionForensicsService, useValue: {} },
        { provide: ListPositionHistoryService, useValue: {} },
        { provide: BulkReassignPositionsService, useValue: {} },
        {
          provide: PublicIdService,
          useValue: { looksLikeUuid: () => true, isValidShape: () => true },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function postTransition(): request.Test {
    return request(app.getHttpServer())
      .post(`/project-positions/${POSITION_ID}/transition`)
      .send({ toStatus: 'ASSIGNED' });
  }

  it('maps a missing state-machine edge to 409 with the domain message', async () => {
    const message =
      'No transition from RELEASED to ASSIGNED exists in the position fill state machine.';
    transitionService.execute.mockRejectedValueOnce(
      new InvalidPositionFillTransitionError(message, 'MISSING_EDGE'),
    );

    const response = await postTransition().expect(409);
    expect(response.body).toEqual({
      error: 'InvalidPositionFillTransitionError',
      message,
      statusCode: 409,
    });
  });

  it('maps a role rejection to 403 with the domain message', async () => {
    const message =
      'Actor roles [employee] cannot transition position from OPEN to PROPOSED.';
    transitionService.execute.mockRejectedValueOnce(
      new InvalidPositionFillTransitionError(message, 'ROLE_FORBIDDEN'),
    );

    const response = await postTransition().expect(403);
    expect(response.body).toEqual({
      error: 'InvalidPositionFillTransitionError',
      message,
      statusCode: 403,
    });
  });

  it('maps a missing required reason to 400 with the domain message', async () => {
    const message = 'Transition from ASSIGNED to ON_HOLD requires a non-empty reason.';
    transitionService.execute.mockRejectedValueOnce(
      new InvalidPositionFillTransitionError(message, 'MISSING_REASON'),
    );

    const response = await postTransition().expect(400);
    expect(response.body).toEqual({
      error: 'InvalidPositionFillTransitionError',
      message,
      statusCode: 400,
    });
  });

  it('maps an optimistic-concurrency version conflict to 409 with the domain message', async () => {
    const message = `Optimistic concurrency conflict on ProjectPosition ${POSITION_ID} (expected version 3).`;
    transitionService.execute.mockRejectedValueOnce(
      new OptimisticConcurrencyConflictError(message),
    );

    const response = await postTransition().expect(409);
    expect(response.body).toEqual({
      error: 'OptimisticConcurrencyConflictError',
      message,
      statusCode: 409,
    });
  });

  it('does not intercept HttpExceptions — NotFoundException still surfaces as 404', async () => {
    transitionService.execute.mockRejectedValueOnce(
      new NotFoundException(`ProjectPosition ${POSITION_ID} not found.`),
    );

    const response = await postTransition().expect(404);
    expect(response.body.message).toBe(`ProjectPosition ${POSITION_ID} not found.`);
  });
});
