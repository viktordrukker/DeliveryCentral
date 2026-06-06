import { Injectable, NotFoundException } from '@nestjs/common';

import { SuggestFillsService } from '@src/modules/project-positions/application/suggest-fills.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P4-missing-3 — RM auto-match by skill.
 *
 * Given an OPEN/DRAFT/PROPOSED `ProjectPosition`, populate its candidate slate
 * with the top-N skill-matched + available people. The RM still has to review
 * + adjust before transitioning to PROPOSED.
 *
 * Matching logic:
 *   1. Pull scored candidates from SuggestFillsService (skill + role + bench
 *      availability — same scorer used by the Find-Candidates flow).
 *   2. Filter to people whose existing ProjectPosition assignments do not
 *      conflict on the requested date window (date+allocation overlap).
 *   3. Apply the 80% skill-intersection floor — at least
 *      ceil(0.8 * requiredSkills.length) of the position's required skills must
 *      be present on the person (or all matched when there are no required
 *      skills declared).
 *   4. Rank by (matchScore desc, matchedSkillCount desc, name asc); take top-N.
 *   5. Upsert ProjectPositionCandidate rows (decision = PENDING) using a
 *      monotonically increasing `rank` starting at 1.
 */
@Injectable()
export class AutoMatchCandidatesService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly suggestFillsService: SuggestFillsService,
  ) {}

  public async execute(input: {
    actorId: string | null;
    positionId: string;
    topN?: number;
  }): Promise<AutoMatchResult> {
    const topN = input.topN && input.topN > 0 ? Math.min(input.topN, 25) : 5;

    const position = await this.prisma.projectPosition.findUnique({
      where: { id: input.positionId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        skills: true,
        requiredAllocationPercent: true,
      },
    });
    if (!position) {
      throw new NotFoundException(`ProjectPosition ${input.positionId} not found.`);
    }

    const requiredSkills = position.skills ?? [];
    const minMatchCount =
      requiredSkills.length === 0 ? 0 : Math.ceil(requiredSkills.length * 0.8);

    // Pull a generous pool from SuggestFillsService so we have enough candidates
    // after the 80% intersection floor + date overlap filters trim it down.
    const suggestion = await this.suggestFillsService.suggestForPosition(
      input.positionId,
      Math.max(topN * 4, 25),
    );

    const passingSkillFloor = suggestion.candidates.filter(
      (c) => c.matchedSkills.length >= minMatchCount,
    );

    // Date+allocation overlap exclusion. SuggestFillsService already drops
    // people whose `ProjectPosition.activePersonId` covers today; this layer
    // additionally drops anyone with a confirmed assignment that overlaps the
    // position's *requested* date window — which may be in the future.
    const candidateIds = passingSkillFloor.map((c) => c.personId);
    let nonConflicting = passingSkillFloor;
    if (candidateIds.length > 0) {
      const conflicts = await this.prisma.projectPosition.findMany({
        where: {
          activePersonId: { in: candidateIds },
          fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
          // Date window overlap: existing.activeValidFrom <= position.endDate
          //                  AND (existing.activeValidTo is null OR >= position.startDate)
          activeValidFrom: { lte: position.endDate },
          OR: [
            { activeValidTo: null },
            { activeValidTo: { gte: position.startDate } },
          ],
        },
        select: { activePersonId: true },
      });
      const busy = new Set(
        conflicts.map((c) => c.activePersonId).filter((id): id is string => !!id),
      );
      nonConflicting = passingSkillFloor.filter((c) => !busy.has(c.personId));
    }

    const top = nonConflicting.slice(0, topN);

    if (top.length === 0) {
      return { positionId: position.id, created: 0, candidates: [] };
    }

    const slate: AutoMatchSlateRow[] = [];
    await this.prisma.$transaction(async (tx) => {
      let rank = 1;
      for (const c of top) {
        const upserted = await tx.projectPositionCandidate.upsert({
          where: {
            positionId_candidatePersonId: {
              positionId: position.id,
              candidatePersonId: c.personId,
            },
          },
          create: {
            positionId: position.id,
            candidatePersonId: c.personId,
            rank,
            matchScore: c.matchScore,
            availabilityPercent: null,
            mismatchedSkills: c.missingSkills,
            rationale: 'Auto-matched by skill intersection.',
            decision: 'PENDING',
            createdByPersonId: input.actorId ?? undefined,
            updatedByPersonId: input.actorId ?? undefined,
          },
          update: {
            rank,
            matchScore: c.matchScore,
            mismatchedSkills: c.missingSkills,
            rationale: 'Auto-matched by skill intersection.',
            updatedByPersonId: input.actorId ?? undefined,
          },
          select: {
            id: true,
            candidatePersonId: true,
            rank: true,
            matchScore: true,
            decision: true,
          },
        });
        slate.push({
          candidateId: upserted.id,
          personId: upserted.candidatePersonId,
          name: c.name,
          rank: upserted.rank,
          matchScore: Number(upserted.matchScore),
          matchedSkills: c.matchedSkills,
          missingSkills: c.missingSkills,
          decision: upserted.decision,
        });
        rank += 1;
      }
    });

    return { positionId: position.id, created: slate.length, candidates: slate };
  }
}

export interface AutoMatchSlateRow {
  candidateId: string;
  decision: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  name: string;
  personId: string;
  rank: number;
}

export interface AutoMatchResult {
  candidates: AutoMatchSlateRow[];
  created: number;
  positionId: string;
}
