import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { StaffingRequestProposalCandidate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-candidate.entity';
import { StaffingRequestProposalSlate } from '@src/modules/staffing-requests/domain/entities/staffing-request-proposal-slate.entity';
import { StaffingRequestProposalSlateRepositoryPort } from '@src/modules/staffing-requests/domain/repositories/staffing-request-proposal-slate-repository.port';

interface SlateRow {
  id: string;
  staffingRequestId: string;
  proposedByPersonId: string;
  status: string;
  proposedAt: Date;
  expiresAt: Date | null;
  decidedAt: Date | null;
  candidates?: CandidateRow[];
}

interface CandidateRow {
  id: string;
  slateId: string;
  candidatePersonId: string;
  rank: number;
  matchScore: { toNumber: () => number } | number;
  availabilityPercent: { toNumber: () => number } | number | null;
  mismatchedSkills: string[];
  rationale: string | null;
  decision: string;
  decidedAt: Date | null;
}

function decimalToNumber(
  v: { toNumber: () => number } | number | null | undefined,
): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return v;
  return v.toNumber();
}

function toDomainCandidate(row: CandidateRow): StaffingRequestProposalCandidate {
  const matchScore = decimalToNumber(row.matchScore) ?? 0;
  return StaffingRequestProposalCandidate.create(
    {
      slateId: row.slateId,
      candidatePersonId: row.candidatePersonId,
      rank: row.rank,
      matchScore,
      availabilityPercent: decimalToNumber(row.availabilityPercent),
      mismatchedSkills: row.mismatchedSkills,
      rationale: row.rationale ?? undefined,
      decision: row.decision as StaffingRequestProposalCandidate['decision'],
      decidedAt: row.decidedAt ?? undefined,
    },
    row.id,
  );
}

function toDomainSlate(row: SlateRow): StaffingRequestProposalSlate {
  const candidates = (row.candidates ?? []).map(toDomainCandidate);
  return StaffingRequestProposalSlate.create(
    {
      staffingRequestId: row.staffingRequestId,
      proposedByPersonId: row.proposedByPersonId,
      proposedAt: row.proposedAt,
      expiresAt: row.expiresAt ?? undefined,
      decidedAt: row.decidedAt ?? undefined,
      status: row.status as StaffingRequestProposalSlate['status'],
      candidates,
    },
    row.id,
  );
}

@Injectable()
export class PrismaStaffingRequestProposalSlateRepository
  implements StaffingRequestProposalSlateRepositoryPort
{
  public constructor(private readonly prisma: PrismaService) {}

  public async save(slate: StaffingRequestProposalSlate): Promise<void> {
    const slatePayload = {
      id: slate.id,
      staffingRequestId: slate.staffingRequestId,
      proposedByPersonId: slate.proposedByPersonId,
      status: slate.status,
      proposedAt: slate.proposedAt,
      expiresAt: slate.expiresAt ?? null,
      decidedAt: slate.decidedAt ?? null,
    };

    await this.prisma.$transaction(async (tx) => {
      const slateGateway = (
        tx as unknown as { staffingRequestProposalSlate: Record<string, unknown> }
      ).staffingRequestProposalSlate as {
        upsert: (args: unknown) => Promise<unknown>;
      };
      const candidateGateway = (
        tx as unknown as { staffingRequestProposalCandidate: Record<string, unknown> }
      ).staffingRequestProposalCandidate as {
        upsert: (args: unknown) => Promise<unknown>;
        deleteMany: (args: unknown) => Promise<unknown>;
      };

      await slateGateway.upsert({
        where: { id: slate.id },
        create: slatePayload,
        update: {
          status: slatePayload.status,
          expiresAt: slatePayload.expiresAt,
          decidedAt: slatePayload.decidedAt,
        },
      });

      const keepIds = slate.candidates.map((c) => c.id);
      await candidateGateway.deleteMany({
        where: {
          slateId: slate.id,
          id: {
            notIn: keepIds.length ? keepIds : ['00000000-0000-0000-0000-000000000000'],
          },
        },
      });

      for (const candidate of slate.candidates) {
        await candidateGateway.upsert({
          where: { id: candidate.id },
          create: {
            id: candidate.id,
            slateId: slate.id,
            candidatePersonId: candidate.candidatePersonId,
            rank: candidate.rank,
            matchScore: candidate.matchScore,
            availabilityPercent: candidate.availabilityPercent ?? null,
            mismatchedSkills: [...candidate.mismatchedSkills],
            rationale: candidate.rationale ?? null,
            decision: candidate.decision,
            decidedAt: candidate.decidedAt ?? null,
          },
          update: {
            rank: candidate.rank,
            matchScore: candidate.matchScore,
            availabilityPercent: candidate.availabilityPercent ?? null,
            mismatchedSkills: [...candidate.mismatchedSkills],
            rationale: candidate.rationale ?? null,
            decision: candidate.decision,
            decidedAt: candidate.decidedAt ?? null,
          },
        });
      }
    });
  }

  public async findById(slateId: string): Promise<StaffingRequestProposalSlate | null> {
    const gateway = (
      this.prisma as unknown as {
        staffingRequestProposalSlate: { findUnique: (args: unknown) => Promise<unknown> };
      }
    ).staffingRequestProposalSlate;
    const row = (await gateway.findUnique({
      where: { id: slateId },
      include: { candidates: { orderBy: { rank: 'asc' } } },
    })) as SlateRow | null;
    return row ? toDomainSlate(row) : null;
  }

  public async findByStaffingRequestId(
    staffingRequestId: string,
  ): Promise<StaffingRequestProposalSlate | null> {
    const gateway = (
      this.prisma as unknown as {
        staffingRequestProposalSlate: { findUnique: (args: unknown) => Promise<unknown> };
      }
    ).staffingRequestProposalSlate;
    const row = (await gateway.findUnique({
      where: { staffingRequestId },
      include: { candidates: { orderBy: { rank: 'asc' } } },
    })) as SlateRow | null;
    return row ? toDomainSlate(row) : null;
  }
}
