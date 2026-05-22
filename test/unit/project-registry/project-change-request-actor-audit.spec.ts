import { ProjectChangeRequestService } from '@src/modules/project-registry/application/project-change-request.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-98 / D-103-write-path round 8 — asserts that ProjectChangeRequest's
 * create / update / approve / reject methods all populate canonical
 * actor-audit cols.
 */
describe('D-103 write-path — ProjectChangeRequest actor-audit', () => {
  function buildStub(captureCreate: (d: Record<string, unknown>) => void, captureUpdate: (d: Record<string, unknown>) => void): PrismaService {
    return {
      projectChangeRequest: {
        create: async (args: { data: Record<string, unknown> }) => {
          captureCreate(args.data);
          return { id: 'cr-1', ...args.data, createdAt: new Date(), updatedAt: new Date() };
        },
        update: async (args: { data: Record<string, unknown> }) => {
          captureUpdate(args.data);
          return { id: 'cr-1', ...args.data, createdAt: new Date(), updatedAt: new Date() };
        },
        findUnique: async () => ({
          id: 'cr-1',
          title: 'existing',
          description: null,
          severity: 'MEDIUM',
          outOfBaseline: false,
          impactScope: null,
          impactSchedule: null,
          impactBudget: null,
          status: 'PROPOSED',
        }),
      },
    } as unknown as PrismaService;
  }

  it('create() populates createdByPersonId + updatedByPersonId when actor supplied', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new ProjectChangeRequestService(buildStub((d) => (captured = d), () => undefined));
    await svc.create('proj-1', { title: 'Scope change' }, 'pm-actor-1');
    expect(captured.createdByPersonId).toBe('pm-actor-1');
    expect(captured.updatedByPersonId).toBe('pm-actor-1');
  });

  it('update() populates updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new ProjectChangeRequestService(buildStub(() => undefined, (d) => (captured = d)));
    await svc.update('cr-1', { title: 'new title' }, 'pm-actor-2');
    expect(captured.updatedByPersonId).toBe('pm-actor-2');
  });

  it('approve() sets updatedByPersonId to the decider', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new ProjectChangeRequestService(buildStub(() => undefined, (d) => (captured = d)));
    await svc.approve('cr-1', 'director-7');
    expect(captured.updatedByPersonId).toBe('director-7');
    expect(captured.decidedByPersonId).toBe('director-7');
  });

  it('reject() sets updatedByPersonId to the decider', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new ProjectChangeRequestService(buildStub(() => undefined, (d) => (captured = d)));
    await svc.reject('cr-1', 'director-7');
    expect(captured.updatedByPersonId).toBe('director-7');
    expect(captured.decidedByPersonId).toBe('director-7');
  });

  it('legacy create() without actorId leaves cols NULL', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new ProjectChangeRequestService(buildStub((d) => (captured = d), () => undefined));
    await svc.create('proj-1', { title: 'CR' });
    expect(captured.createdByPersonId).toBeNull();
    expect(captured.updatedByPersonId).toBeNull();
  });
});
