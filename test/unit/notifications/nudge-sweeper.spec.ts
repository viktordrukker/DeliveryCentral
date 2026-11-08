import { NudgeSweeperService } from '@src/modules/notifications/application/nudge-sweeper.service';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeProposal {
  id: string;
  staffingRequestId: string;
  proposedAt: Date;
  proposedByPersonId: string;
  status: 'OPEN' | 'CLOSED';
  candidateDecisions: ('PENDING' | 'APPROVED' | 'REJECTED')[];
}

interface FakeTimesheet {
  id: string;
  personId: string;
  weekStart: Date;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
}

interface FakeNotifReq {
  eventName: string;
  recipient: string;
  requestedAt: Date;
  payload: Record<string, unknown>;
}

interface FakeOutboxRow {
  eventName: string;
  aggregateId: string;
  createdAt: Date;
}

interface FakePerson {
  id: string;
  primaryEmail: string | null;
}

interface FakeStack {
  prisma: PrismaService;
  proposals: FakeProposal[];
  timesheets: FakeTimesheet[];
  notificationRequests: FakeNotifReq[];
  outboxRows: FakeOutboxRow[];
  people: FakePerson[];
  settings: Record<string, unknown>;
}

function buildPrisma(initial: Partial<FakeStack> = {}): FakeStack {
  const proposals = initial.proposals ?? [];
  const timesheets = initial.timesheets ?? [];
  const notificationRequests = initial.notificationRequests ?? [];
  const outboxRows = initial.outboxRows ?? [];
  const people = initial.people ?? [];
  const settings = initial.settings ?? {};

  const prisma = {
    // SoT PR 16b — the StaffingRequestProposalSlate table was dropped
    // with the legacy staffing schema; the sweeper now reads
    // `projectPositionCandidate` rows directly. Each FakeProposal
    // fixture is interpreted as the candidate row for its proposer:
    // its `status` maps to the parent position's `fillStatus`, and a
    // slate is treated as "fully resolved" (so no PENDING candidate
    // row to return) once any candidate decision is non-PENDING.
    projectPositionCandidate: {
      findMany: async (args: {
        where: {
          decision: string;
          createdAt: { lt: Date };
          position: { fillStatus: { in: string[] } };
        };
        select?: unknown;
      }): Promise<Array<{
        id: string;
        positionId: string;
        createdAt: Date;
        createdByPersonId: string;
      }>> => {
        const allowedFillStatuses = new Set(args.where.position.fillStatus.in);
        return proposals
          .filter((p) => allowedFillStatuses.has(p.status === 'OPEN' ? 'PROPOSED' : 'CLOSED'))
          .filter((p) => p.proposedAt < args.where.createdAt.lt)
          .filter((p) => !p.candidateDecisions.some((d) => d !== args.where.decision))
          .map((p) => ({
            id: p.id,
            positionId: p.staffingRequestId,
            createdAt: p.proposedAt,
            createdByPersonId: p.proposedByPersonId,
          }));
      },
    },
    timesheetWeek: {
      findMany: async (args: {
        where: { status: string; weekStart: { lt: Date } };
        select?: unknown;
      }): Promise<Array<Pick<FakeTimesheet, 'id' | 'personId' | 'weekStart'>>> => {
        return timesheets
          .filter((t) => t.status === args.where.status)
          .filter((t) => t.weekStart < args.where.weekStart.lt)
          .map((t) => ({ id: t.id, personId: t.personId, weekStart: t.weekStart }));
      },
    },
    person: {
      findUnique: async (args: { where: { id: string } }): Promise<{ primaryEmail: string | null } | null> => {
        const p = people.find((x) => x.id === args.where.id);
        return p ? { primaryEmail: p.primaryEmail } : null;
      },
    },
    notificationRequest: {
      // legacy stub kept for any future test that wants to assert the
      // nudge code never queries this table. Sweeper now uses outboxEvent.
      findFirst: async (): Promise<null> => null,
    },
    outboxEvent: {
      findFirst: async (args: {
        where: { eventName: string; aggregateId: string; createdAt: { gte: Date } };
      }): Promise<{ id: string } | null> => {
        const found = outboxRows.find(
          (r) =>
            r.eventName === args.where.eventName &&
            r.aggregateId === args.where.aggregateId &&
            r.createdAt >= args.where.createdAt.gte,
        );
        return found ? { id: 'ob-existing' } : null;
      },
    },
    platformSetting: {
      findUnique: async (args: { where: { key: string } }): Promise<{ value: unknown } | null> => {
        if (!(args.where.key in settings)) return null;
        return { value: settings[args.where.key] };
      },
    },
  } as unknown as PrismaService;

  return {
    prisma,
    proposals,
    timesheets,
    notificationRequests,
    outboxRows,
    people,
    settings,
  };
}

class FakeTranslator {
  public proposalCalls: Array<Record<string, unknown>> = [];
  public timesheetCalls: Array<Record<string, unknown>> = [];

  public async nudgeProposalAcknowledgmentOverdue(payload: Record<string, unknown>): Promise<void> {
    this.proposalCalls.push(payload);
  }

  public async nudgeTimesheetSubmissionOverdue(payload: Record<string, unknown>): Promise<void> {
    this.timesheetCalls.push(payload);
  }

  // The other translator methods aren't called by the sweeper.
}

const NOW = new Date('2026-05-04T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

describe('NudgeSweeperService', () => {
  it('emits a proposal nudge for an OPEN slate older than the SLA with no decided candidates', async () => {
    const stale = new Date(NOW.getTime() - 60 * HOUR); // 60h old, default SLA 48h
    const stack = buildPrisma({
      proposals: [
        {
          id: 'slate-1',
          staffingRequestId: 'sr-1',
          proposedAt: stale,
          proposedByPersonId: 'p-1',
          status: 'OPEN',
          candidateDecisions: ['PENDING', 'PENDING'],
        },
      ],
      people: [{ id: 'p-1', primaryEmail: 'pm@example.test' }],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.proposalsNudged).toBe(1);
    expect(result.proposalsSuppressed).toBe(0);
    expect(translator.proposalCalls).toHaveLength(1);
    expect(translator.proposalCalls[0]).toMatchObject({
      proposalId: 'slate-1',
      staffingRequestId: 'sr-1',
      requesterPersonId: 'p-1',
      recipientPersonIds: ['p-1'],
    });
    expect(translator.proposalCalls[0].overdueByHours).toBe(60);
  });

  it('skips a slate that has at least one candidate already decided', async () => {
    const stale = new Date(NOW.getTime() - 60 * HOUR);
    const stack = buildPrisma({
      proposals: [
        {
          id: 'slate-2',
          staffingRequestId: 'sr-2',
          proposedAt: stale,
          proposedByPersonId: 'p-1',
          status: 'OPEN',
          candidateDecisions: ['PENDING', 'APPROVED'],
        },
      ],
      people: [{ id: 'p-1', primaryEmail: 'pm@example.test' }],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.proposalsNudged).toBe(0);
    expect(translator.proposalCalls).toHaveLength(0);
  });

  it('skips a slate that is fresh (within the SLA)', async () => {
    const fresh = new Date(NOW.getTime() - 12 * HOUR); // 12h old, way under 48h
    const stack = buildPrisma({
      proposals: [
        {
          id: 'slate-3',
          staffingRequestId: 'sr-3',
          proposedAt: fresh,
          proposedByPersonId: 'p-1',
          status: 'OPEN',
          candidateDecisions: ['PENDING'],
        },
      ],
      people: [{ id: 'p-1', primaryEmail: 'pm@example.test' }],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.proposalsNudged).toBe(0);
  });

  it('suppresses a proposal nudge when a recent matching OutboxEvent already exists', async () => {
    const stale = new Date(NOW.getTime() - 60 * HOUR);
    const lastNudge = new Date(NOW.getTime() - 2 * HOUR);
    const stack = buildPrisma({
      proposals: [
        {
          id: 'slate-4',
          staffingRequestId: 'sr-4',
          proposedAt: stale,
          proposedByPersonId: 'p-1',
          status: 'OPEN',
          candidateDecisions: ['PENDING'],
        },
      ],
      people: [{ id: 'p-1', primaryEmail: 'pm@example.test' }],
      outboxRows: [
        {
          eventName: 'nudge.proposal_acknowledgment_overdue',
          aggregateId: 'sr-4',
          createdAt: lastNudge,
        },
      ],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.proposalsNudged).toBe(0);
    expect(result.proposalsSuppressed).toBe(1);
    expect(translator.proposalCalls).toHaveLength(0);
  });

  it('does NOT suppress when the previous nudge is older than the dedup window', async () => {
    const stale = new Date(NOW.getTime() - 60 * HOUR);
    const oldNudge = new Date(NOW.getTime() - 30 * HOUR); // outside the 24h default
    const stack = buildPrisma({
      proposals: [
        {
          id: 'slate-5',
          staffingRequestId: 'sr-5',
          proposedAt: stale,
          proposedByPersonId: 'p-1',
          status: 'OPEN',
          candidateDecisions: ['PENDING'],
        },
      ],
      people: [{ id: 'p-1', primaryEmail: 'pm@example.test' }],
      outboxRows: [
        {
          eventName: 'nudge.proposal_acknowledgment_overdue',
          aggregateId: 'sr-5',
          createdAt: oldNudge,
        },
      ],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.proposalsNudged).toBe(1);
    expect(result.proposalsSuppressed).toBe(0);
  });

  it('emits a timesheet nudge for a DRAFT week past the cutoff', async () => {
    // weekStart 14 days ago; period ends 7 days ago; cutoff for default
    // 72h SLA is now - 7d - 72h = -10d, so 14d-old DRAFT is overdue.
    const fourteenDaysAgo = new Date(NOW.getTime() - 14 * DAY);
    const stack = buildPrisma({
      timesheets: [
        {
          id: 'tw-1',
          personId: 'p-2',
          weekStart: fourteenDaysAgo,
          status: 'DRAFT',
        },
      ],
      people: [{ id: 'p-2', primaryEmail: 'employee@example.test' }],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.timesheetsNudged).toBe(1);
    expect(translator.timesheetCalls).toHaveLength(1);
    expect(translator.timesheetCalls[0]).toMatchObject({
      personId: 'p-2',
    });
    expect(typeof translator.timesheetCalls[0].weekStart).toBe('string');
    expect(translator.timesheetCalls[0].overdueByHours).toBeGreaterThan(0);
  });

  it('does NOT nudge when the timesheet is already SUBMITTED', async () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY);
    const stack = buildPrisma({
      timesheets: [
        {
          id: 'tw-2',
          personId: 'p-2',
          weekStart: tenDaysAgo,
          status: 'SUBMITTED',
        },
      ],
      people: [{ id: 'p-2', primaryEmail: 'employee@example.test' }],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.timesheetsNudged).toBe(0);
  });

  it('skips when the recipient has no email on file', async () => {
    const stale = new Date(NOW.getTime() - 60 * HOUR);
    const stack = buildPrisma({
      proposals: [
        {
          id: 'slate-6',
          staffingRequestId: 'sr-6',
          proposedAt: stale,
          proposedByPersonId: 'no-email',
          status: 'OPEN',
          candidateDecisions: ['PENDING'],
        },
      ],
      people: [{ id: 'no-email', primaryEmail: null }],
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.proposalsNudged).toBe(0);
    expect(translator.proposalCalls).toHaveLength(0);
  });

  it('honors PlatformSetting overrides for SLA + dedup', async () => {
    const fresh = new Date(NOW.getTime() - 25 * HOUR);
    const stack = buildPrisma({
      proposals: [
        {
          id: 'slate-7',
          staffingRequestId: 'sr-7',
          proposedAt: fresh,
          proposedByPersonId: 'p-1',
          status: 'OPEN',
          candidateDecisions: ['PENDING'],
        },
      ],
      people: [{ id: 'p-1', primaryEmail: 'pm@example.test' }],
      // 24h SLA — the slate is "old enough" now even though it's < 48h default.
      settings: { 'staffing.proposalAck.slaHours': 24 },
    });
    const translator = new FakeTranslator();
    const svc = new NudgeSweeperService(
      stack.prisma,
      translator as unknown as NotificationEventTranslatorService,
    );

    const result = await svc.sweep(NOW);
    expect(result.proposalsNudged).toBe(1);
  });
});
