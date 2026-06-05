/**
 * LEAN-P4c-2 — UnifiedCandidateQueueService unit tests.
 *
 * Stubs prisma.projectPositionCandidate.findMany + count and asserts:
 *   - rows aggregated across multiple positions (OPEN + PROPOSED).
 *   - rows sorted by createdAt asc (oldest first).
 *   - pagination (page/pageSize) maps to skip/take and is capped at 200.
 *   - timeInQueueHours computed against the supplied asOf.
 */
import { UnifiedCandidateQueueService } from '@src/modules/staffing-requests/application/unified-candidate-queue.service';

import { createPrismaServiceStub } from '../../helpers/db/mock-prisma-client';

interface CandidateRowOverrides {
  id?: string;
  candidatePersonId?: string;
  rank?: number;
  decision?: string;
  decidedAt?: Date | null;
  createdAt?: Date;
  candidateDisplayName?: string;
  positionId?: string;
  positionPublicId?: string | null;
  positionRole?: string;
  projectId?: string;
  projectName?: string;
}

function makeCandidateRow(overrides: CandidateRowOverrides = {}): Record<string, unknown> {
  return {
    id: overrides.id ?? 'cand-1',
    candidatePersonId: overrides.candidatePersonId ?? 'person-1',
    rank: overrides.rank ?? 1,
    decision: overrides.decision ?? 'PENDING',
    decidedAt: overrides.decidedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-06-01T10:00:00.000Z'),
    candidate: { displayName: overrides.candidateDisplayName ?? 'Alice Adams' },
    position: {
      id: overrides.positionId ?? 'pos-1',
      publicId: overrides.positionPublicId ?? 'ppo_abc123',
      role: overrides.positionRole ?? 'Senior Engineer',
      project: {
        id: overrides.projectId ?? 'proj-1',
        name: overrides.projectName ?? 'Apollo',
      },
    },
  };
}

describe('UnifiedCandidateQueueService (LEAN-P4c-2)', () => {
  it('aggregates candidates across positions, sorted oldest-first, with time-in-queue', async () => {
    const findMany = jest.fn().mockResolvedValue([
      makeCandidateRow({
        id: 'cand-old',
        candidatePersonId: 'person-old',
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        candidateDisplayName: 'Old Candidate',
        positionId: 'pos-1',
        projectName: 'Apollo',
        positionRole: 'Senior Engineer',
      }),
      makeCandidateRow({
        id: 'cand-mid',
        candidatePersonId: 'person-mid',
        createdAt: new Date('2026-06-02T10:00:00.000Z'),
        candidateDisplayName: 'Mid Candidate',
        positionId: 'pos-2',
        projectName: 'Beacon',
        positionRole: 'Tech Lead',
      }),
      makeCandidateRow({
        id: 'cand-new',
        candidatePersonId: 'person-new',
        createdAt: new Date('2026-06-04T10:00:00.000Z'),
        candidateDisplayName: 'New Candidate',
        positionId: 'pos-3',
        projectName: 'Cypress',
        positionRole: 'QA Engineer',
      }),
    ]);
    const count = jest.fn().mockResolvedValue(3);
    const prisma = createPrismaServiceStub({
      projectPositionCandidate: { findMany, count },
    });
    const svc = new UnifiedCandidateQueueService(prisma);

    const result = await svc.list({ asOf: new Date('2026-06-05T10:00:00.000Z') });

    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.rows).toHaveLength(3);

    // Filters target OPEN/PROPOSED positions only.
    const whereArg = (findMany.mock.calls[0][0] as { where: { position: { fillStatus: { in: string[] } } } }).where;
    expect(whereArg.position.fillStatus.in.sort()).toEqual(['OPEN', 'PROPOSED'].sort());

    // Sort is asc on createdAt.
    const orderBy = (findMany.mock.calls[0][0] as { orderBy: { createdAt: string }[] }).orderBy;
    expect(orderBy).toEqual([{ createdAt: 'asc' }]);

    // Oldest row first; project + role joined; time-in-queue computed.
    expect(result.rows[0].candidateName).toBe('Old Candidate');
    expect(result.rows[0].projectName).toBe('Apollo');
    expect(result.rows[0].role).toBe('Senior Engineer');
    expect(result.rows[0].timeInQueueHours).toBe(96); // 4 days
    expect(result.rows[1].candidateName).toBe('Mid Candidate');
    expect(result.rows[1].timeInQueueHours).toBe(72);
    expect(result.rows[2].timeInQueueHours).toBe(24);
  });

  it('maps page/pageSize to skip/take and caps pageSize at 200', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = createPrismaServiceStub({
      projectPositionCandidate: { findMany, count },
    });
    const svc = new UnifiedCandidateQueueService(prisma);

    await svc.list({ page: 3, pageSize: 500 });

    const args = findMany.mock.calls[0][0] as { skip: number; take: number };
    expect(args.take).toBe(200);
    expect(args.skip).toBe(2 * 200);
  });

  it('returns empty rows + zero total when no candidates exist', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = createPrismaServiceStub({
      projectPositionCandidate: { findMany, count },
    });
    const svc = new UnifiedCandidateQueueService(prisma);

    const result = await svc.list();

    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it('exposes decision + decidedAt verbatim when present', async () => {
    const decidedAt = new Date('2026-06-03T12:30:00.000Z');
    const findMany = jest.fn().mockResolvedValue([
      makeCandidateRow({ decision: 'PICKED', decidedAt }),
    ]);
    const count = jest.fn().mockResolvedValue(1);
    const prisma = createPrismaServiceStub({
      projectPositionCandidate: { findMany, count },
    });
    const svc = new UnifiedCandidateQueueService(prisma);

    const result = await svc.list({ asOf: new Date('2026-06-05T10:00:00.000Z') });

    expect(result.rows[0].decision).toBe('PICKED');
    expect(result.rows[0].decidedAt).toBe(decidedAt.toISOString());
  });
});
