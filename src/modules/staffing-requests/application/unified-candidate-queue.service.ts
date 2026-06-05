import { Injectable } from '@nestjs/common';
import { ProjectPositionFillStatus } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P4c-2 — unified candidate queue across all open project positions.
 *
 * Today RM/PM see one slate at a time, scoped to a single position. This
 * service aggregates every `ProjectPositionCandidate` whose parent
 * `ProjectPosition.fillStatus` is `OPEN` or `PROPOSED`, then surfaces the
 * candidates as a single queue sorted by `proposedAt` ascending (oldest
 * first) so the RM works the FIFO surface and never loses a slow-moving
 * candidate behind a fresh slate.
 */

export interface UnifiedCandidateQueueRow {
  candidateId: string;
  candidatePersonId: string;
  candidateName: string;
  positionId: string;
  positionPublicId: string | null;
  projectId: string;
  projectName: string;
  role: string;
  decision: string;
  decidedAt: string | null;
  proposedAt: string;
  timeInQueueHours: number;
  rank: number;
}

export interface UnifiedCandidateQueueResult {
  rows: UnifiedCandidateQueueRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UnifiedCandidateQueueQuery {
  page?: number;
  pageSize?: number;
  /**
   * Optional now-override for deterministic time-in-queue tests. Defaults
   * to `new Date()` at request time.
   */
  asOf?: Date;
}

const OPEN_FILL_STATUSES: ProjectPositionFillStatus[] = [
  ProjectPositionFillStatus.OPEN,
  ProjectPositionFillStatus.PROPOSED,
];

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

@Injectable()
export class UnifiedCandidateQueueService {
  public constructor(private readonly prisma: PrismaService) {}

  public async list(query: UnifiedCandidateQueueQuery = {}): Promise<UnifiedCandidateQueueResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * pageSize;
    const now = query.asOf ?? new Date();

    const where = {
      position: { fillStatus: { in: OPEN_FILL_STATUSES } },
    };

    const [rows, total] = await Promise.all([
      this.prisma.projectPositionCandidate.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          candidatePersonId: true,
          rank: true,
          decision: true,
          decidedAt: true,
          createdAt: true,
          candidate: { select: { displayName: true } },
          position: {
            select: {
              id: true,
              publicId: true,
              role: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.projectPositionCandidate.count({ where }),
    ]);

    return {
      rows: rows.map((r) => ({
        candidateId: r.id,
        candidatePersonId: r.candidatePersonId,
        candidateName: r.candidate.displayName,
        positionId: r.position.id,
        positionPublicId: r.position.publicId,
        projectId: r.position.project.id,
        projectName: r.position.project.name,
        role: r.position.role,
        decision: r.decision,
        decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
        proposedAt: r.createdAt.toISOString(),
        timeInQueueHours:
          Math.round(((now.getTime() - r.createdAt.getTime()) / 3_600_000) * 100) / 100,
        rank: r.rank,
      })),
      total,
      page,
      pageSize,
    };
  }
}
