/**
 * LEAN-P4a-1 — PlannerScenarioService unit tests.
 *
 * Stubs the Prisma surface via createPrismaServiceStub and asserts:
 *   - create() stamps actor on both createdByPersonId + updatedByPersonId.
 *   - update() refuses CANCELLED scenarios.
 *   - update() / cancel() refuse callers that are neither owner nor admin.
 *   - cancel() sets status=CANCELLED + archivedAt + dispatches scenario.cancelled.
 *   - list() filters by ownerId/status.
 *   - All mutations dispatch the matching webhook event.
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PlannerScenarioService } from '@src/modules/planner-scenarios/application/planner-scenario.service';

import { createPrismaServiceStub } from '../../helpers/db/mock-prisma-client';

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = new Date('2026-06-05T12:00:00.000Z');
  return {
    id: 'scenario-1',
    publicId: 'psc_abc12345',
    tenantId: null,
    name: 'Q3 staffing plan',
    description: null,
    status: 'DRAFT',
    createdByPersonId: 'owner-1',
    updatedByPersonId: 'owner-1',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    state: { proposedAssignments: [] },
    summaryAssignments: 0,
    summaryHires: 0,
    summaryReleases: 0,
    summaryExtensions: 0,
    summaryAnomalies: 0,
    ...overrides,
  };
}

function makeTranslator(): {
  translator: NotificationEventTranslatorService;
  scenarioCreated: jest.Mock;
  scenarioUpdated: jest.Mock;
  scenarioCancelled: jest.Mock;
} {
  const scenarioCreated = jest.fn().mockResolvedValue(undefined);
  const scenarioUpdated = jest.fn().mockResolvedValue(undefined);
  const scenarioCancelled = jest.fn().mockResolvedValue(undefined);
  const translator = {
    scenarioCreated,
    scenarioUpdated,
    scenarioCancelled,
  } as unknown as NotificationEventTranslatorService;
  return { translator, scenarioCreated, scenarioUpdated, scenarioCancelled };
}

describe('PlannerScenarioService (LEAN-P4a-1)', () => {
  describe('create', () => {
    it('stamps actor on createdByPersonId + updatedByPersonId and dispatches scenario.created', async () => {
      const created = makeRow();
      const create = jest.fn().mockResolvedValue(created);
      const prisma = createPrismaServiceStub({ plannerScenario: { create } });
      const { translator, scenarioCreated } = makeTranslator();
      const svc = new PlannerScenarioService(prisma, translator);

      const result = await svc.create('owner-1', { name: 'Q3 staffing plan' });

      expect(create).toHaveBeenCalledTimes(1);
      const args = create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(args.data.createdByPersonId).toBe('owner-1');
      expect(args.data.updatedByPersonId).toBe('owner-1');
      expect(args.data.name).toBe('Q3 staffing plan');
      expect(args.data.state).toEqual({ proposedAssignments: [] });
      expect(result.id).toBe('scenario-1');
      expect(result.publicId).toBe('psc_abc12345');
      expect(result.status).toBe('DRAFT');
      expect(scenarioCreated).toHaveBeenCalledWith({
        scenarioId: 'scenario-1',
        actorPersonId: 'owner-1',
        name: 'Q3 staffing plan',
      });
    });

    it('applies the provided summary instead of default zeros', async () => {
      const create = jest.fn().mockResolvedValue(makeRow({ summaryAssignments: 5, summaryHires: 2 }));
      const prisma = createPrismaServiceStub({ plannerScenario: { create } });
      const svc = new PlannerScenarioService(prisma);

      await svc.create('owner-1', {
        name: 'plan',
        summary: { assignments: 5, hires: 2, releases: 0, extensions: 0, anomalies: 0 },
      });

      const args = create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(args.data.summaryAssignments).toBe(5);
      expect(args.data.summaryHires).toBe(2);
    });
  });

  describe('update', () => {
    it('updates fields, threads updatedByPersonId, and dispatches scenario.updated with field list', async () => {
      const existing = makeRow();
      const updated = makeRow({ name: 'renamed', status: 'SUBMITTED' });
      const findUnique = jest.fn().mockResolvedValue(existing);
      const update = jest.fn().mockResolvedValue(updated);
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique, update } });
      const { translator, scenarioUpdated } = makeTranslator();
      const svc = new PlannerScenarioService(prisma, translator);

      const result = await svc.update('scenario-1', 'owner-1', ['employee'], {
        name: 'renamed',
        status: 'SUBMITTED',
      });

      expect(update).toHaveBeenCalledTimes(1);
      const args = update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(args.data.updatedByPersonId).toBe('owner-1');
      expect(args.data.name).toBe('renamed');
      expect(args.data.status).toBe('SUBMITTED');
      expect(result.name).toBe('renamed');
      expect(scenarioUpdated).toHaveBeenCalledWith({
        scenarioId: 'scenario-1',
        actorPersonId: 'owner-1',
        fields: ['name', 'status'],
      });
    });

    it('throws NotFoundException when the scenario does not exist', async () => {
      const findUnique = jest.fn().mockResolvedValue(null);
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique } });
      const svc = new PlannerScenarioService(prisma);

      await expect(svc.update('missing', 'owner-1', ['admin'], { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses non-owner non-admin callers', async () => {
      const findUnique = jest.fn().mockResolvedValue(makeRow());
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique } });
      const svc = new PlannerScenarioService(prisma);

      await expect(
        svc.update('scenario-1', 'someone-else', ['employee'], { name: 'x' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows admin to modify scenarios they do not own', async () => {
      const findUnique = jest.fn().mockResolvedValue(makeRow());
      const update = jest.fn().mockResolvedValue(makeRow({ name: 'admin-edit' }));
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique, update } });
      const svc = new PlannerScenarioService(prisma);

      const result = await svc.update('scenario-1', 'admin-7', ['admin'], { name: 'admin-edit' });

      expect(result.name).toBe('admin-edit');
      const args = update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(args.data.updatedByPersonId).toBe('admin-7');
    });

    it('refuses to mutate a CANCELLED scenario', async () => {
      const findUnique = jest.fn().mockResolvedValue(makeRow({ status: 'CANCELLED' }));
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique } });
      const svc = new PlannerScenarioService(prisma);

      await expect(
        svc.update('scenario-1', 'owner-1', ['admin'], { name: 'late-edit' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('cancel', () => {
    it('soft-cancels by setting status=CANCELLED + archivedAt and dispatches scenario.cancelled', async () => {
      const existing = makeRow();
      const cancelled = makeRow({ status: 'CANCELLED', archivedAt: new Date() });
      const findUnique = jest.fn().mockResolvedValue(existing);
      const update = jest.fn().mockResolvedValue(cancelled);
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique, update } });
      const { translator, scenarioCancelled } = makeTranslator();
      const svc = new PlannerScenarioService(prisma, translator);

      const result = await svc.cancel('scenario-1', 'owner-1', ['employee']);

      const args = update.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(args.data.status).toBe('CANCELLED');
      expect(args.data.archivedAt).toBeInstanceOf(Date);
      expect(args.data.updatedByPersonId).toBe('owner-1');
      expect(result.status).toBe('CANCELLED');
      expect(scenarioCancelled).toHaveBeenCalledWith({
        scenarioId: 'scenario-1',
        actorPersonId: 'owner-1',
      });
    });

    it('is idempotent — already-cancelled scenarios short-circuit and skip the webhook event', async () => {
      const cancelled = makeRow({ status: 'CANCELLED', archivedAt: new Date() });
      const findUnique = jest.fn().mockResolvedValue(cancelled);
      const update = jest.fn();
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique, update } });
      const { translator, scenarioCancelled } = makeTranslator();
      const svc = new PlannerScenarioService(prisma, translator);

      const result = await svc.cancel('scenario-1', 'owner-1', ['employee']);

      expect(update).not.toHaveBeenCalled();
      expect(scenarioCancelled).not.toHaveBeenCalled();
      expect(result.status).toBe('CANCELLED');
    });

    it('refuses non-owner non-admin callers', async () => {
      const findUnique = jest.fn().mockResolvedValue(makeRow());
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique } });
      const svc = new PlannerScenarioService(prisma);

      await expect(svc.cancel('scenario-1', 'other', ['employee'])).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('list', () => {
    it('default excludes CANCELLED rows; with explicit status filters that status', async () => {
      const findMany = jest.fn().mockResolvedValue([makeRow()]);
      const prisma = createPrismaServiceStub({ plannerScenario: { findMany } });
      const svc = new PlannerScenarioService(prisma);

      await svc.list({});
      const defaultArgs = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(defaultArgs.where.status).toEqual({ not: 'CANCELLED' });

      await svc.list({ status: 'SUBMITTED' });
      const filteredArgs = findMany.mock.calls[1][0] as { where: Record<string, unknown> };
      expect(filteredArgs.where.status).toBe('SUBMITTED');
    });

    it('owner=me narrows by createdByPersonId', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = createPrismaServiceStub({ plannerScenario: { findMany } });
      const svc = new PlannerScenarioService(prisma);

      await svc.list({ ownerId: 'owner-1' });

      const args = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(args.where.createdByPersonId).toBe('owner-1');
    });

    it('caps `take` at 500 even if a larger limit is requested', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = createPrismaServiceStub({ plannerScenario: { findMany } });
      const svc = new PlannerScenarioService(prisma);

      await svc.list({ limit: 10000 });
      const args = findMany.mock.calls[0][0] as { take: number };
      expect(args.take).toBe(500);
    });
  });

  describe('getById', () => {
    it('returns the DTO when found; throws NotFoundException otherwise', async () => {
      const findUnique = jest.fn().mockResolvedValueOnce(makeRow()).mockResolvedValueOnce(null);
      const prisma = createPrismaServiceStub({ plannerScenario: { findUnique } });
      const svc = new PlannerScenarioService(prisma);

      const found = await svc.getById('scenario-1');
      expect(found.id).toBe('scenario-1');

      await expect(svc.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
