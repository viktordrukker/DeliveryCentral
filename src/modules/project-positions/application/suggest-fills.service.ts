import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PositionCandidateDto, PositionCandidatesResponseDto } from './contracts/position-candidate.dto';
import {
  PersonSuggestedPositionDto,
  PersonSuggestedPositionsResponseDto,
} from './contracts/person-suggested-position.dto';

const ACTIVE_FILL_STATUSES = ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] as const;
const DEFAULT_LIMIT = 5;
const BENCH_AVAILABILITY_HOURS_14D = 80;

interface ScoredCandidate {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

/**
 * NEW-LGL-7 / action A-02 (suggestForPosition) — ranked fill suggestions for a
 * single position, scored off the lean `ProjectPosition` aggregate. Reads only
 * `ProjectPosition` (demand + active-fill anti-join) and `Person`/`PersonSkill`
 * (supply) — no legacy `ProjectAssignment`/`StaffingRequest`. The batch variant
 * (suggestForBatch, backing the planner) is a follow-up; this degenerate
 * single-position path backs the Find-Candidates flow on the position detail
 * page (action B-02/B-03).
 *
 * Deterministic: candidates sort by (score desc, matched-skill count desc,
 * name asc) so a fixed dataset always yields the same ranking.
 */
@Injectable()
export class SuggestFillsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async suggestForPosition(
    idOrPublicId: string,
    limit: number = DEFAULT_LIMIT,
    asOf: Date = new Date(),
  ): Promise<PositionCandidatesResponseDto> {
    // W1-11 — accept both legacy uuid and `pos_…` publicId.
    const where = /^pos_[A-Za-z0-9]{10,}$/.test(idOrPublicId)
      ? { publicId: idOrPublicId }
      : { id: idOrPublicId };
    const position = await this.prisma.projectPosition.findUnique({
      where,
      select: { id: true, role: true, skills: true },
    });
    if (!position) {
      throw new NotFoundException(`Project position ${idOrPublicId} not found`);
    }
    const positionId = position.id;

    const requiredSkills = position.skills ?? [];

    // Supply pool: active employees + their skills.
    const people = await this.prisma.person.findMany({
      where: {
        deletedAt: null,
        archivedAt: null,
        terminatedAt: null,
        employmentStatus: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        role: true,
        grade: true,
        personSkills: {
          select: { proficiency: true, skill: { select: { name: true } } },
        },
      },
      take: 1000,
    });
    if (people.length === 0) {
      return { positionId, requiredSkills, candidates: [] };
    }

    // Anti-join: drop anyone with an active fill on the as-of date (busy → not a
    // bench candidate). Mirrors ListEnrichedBenchService.
    const activeFills = await this.prisma.projectPosition.findMany({
      where: {
        activePersonId: { in: people.map((p) => p.id) },
        fillStatus: { in: [...ACTIVE_FILL_STATUSES] },
        activeValidFrom: { lte: asOf },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: asOf } }],
      },
      select: { activePersonId: true },
    });
    const busy = new Set(activeFills.map((f) => f.activePersonId).filter((id): id is string => !!id));

    const scored = people
      .filter((p) => !busy.has(p.id))
      .map((p) => {
        const personSkills = new Map<string, number>();
        for (const ps of p.personSkills) {
          const name = ps.skill?.name?.trim().toLowerCase();
          if (!name) continue;
          personSkills.set(name, Math.max(personSkills.get(name) ?? 0, ps.proficiency));
        }
        const s = SuggestFillsService.score(requiredSkills, position.role, personSkills, p.role);
        const candidate: PositionCandidateDto = {
          personId: p.id,
          name: p.displayName,
          role: p.role ?? '',
          grade: p.grade,
          matchScore: s.matchScore,
          matchedSkills: s.matchedSkills,
          missingSkills: s.missingSkills,
          availabilityHours14d: BENCH_AVAILABILITY_HOURS_14D,
        };
        return candidate;
      });

    scored.sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        b.matchedSkills.length - a.matchedSkills.length ||
        a.name.localeCompare(b.name),
    );

    return { positionId, requiredSkills, candidates: scored.slice(0, Math.max(1, limit)) };
  }

  /**
   * Inverse of {@link suggestForPosition}: given a person, ranked OPEN positions
   * they match. Reuses the static {@link score} (skill + role + availability) so
   * a (person, position) pair scores identically from either direction. Backs
   * the bench inspector's "Suggested fills" list.
   */
  public async suggestForPerson(
    personId: string,
    limit: number = DEFAULT_LIMIT,
    _asOf: Date = new Date(),
  ): Promise<PersonSuggestedPositionsResponseDto> {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        role: true,
        personSkills: {
          select: { proficiency: true, skill: { select: { name: true } } },
        },
      },
    });
    if (!person) {
      throw new NotFoundException(`Person ${personId} not found`);
    }

    const personSkills = new Map<string, number>();
    for (const ps of person.personSkills) {
      const name = ps.skill?.name?.trim().toLowerCase();
      if (!name) continue;
      personSkills.set(name, Math.max(personSkills.get(name) ?? 0, ps.proficiency));
    }

    const positions = await this.prisma.projectPosition.findMany({
      where: { fillStatus: 'OPEN' },
      select: {
        id: true,
        publicId: true,
        projectId: true,
        role: true,
        skills: true,
        project: { select: { name: true } },
      },
      take: 1000,
    });

    const scored: PersonSuggestedPositionDto[] = positions.map((pos) => {
      const required = pos.skills ?? [];
      const s = SuggestFillsService.score(required, pos.role, personSkills, person.role);
      return {
        positionId: pos.id,
        positionPublicId: pos.publicId ?? null,
        projectId: pos.projectId,
        projectName: pos.project?.name ?? '',
        role: pos.role,
        matchScore: s.matchScore,
        matchedSkills: s.matchedSkills,
        missingSkills: s.missingSkills,
      };
    });

    scored.sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        b.matchedSkills.length - a.matchedSkills.length ||
        a.role.localeCompare(b.role),
    );

    return { personId, candidates: scored.slice(0, Math.max(1, limit)) };
  }

  /**
   * Pure scoring: 0.6·skillFit + 0.3·roleMatch + 0.1·availability (bench → 1).
   * skillFit = Σ(proficiency/5 for each matched required skill) / requiredCount;
   * neutral 0.5 when the position lists no required skills (role-only signal).
   */
  public static score(
    requiredSkills: readonly string[],
    positionRole: string | null | undefined,
    personSkills: ReadonlyMap<string, number>,
    personRole: string | null | undefined,
  ): ScoredCandidate {
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    let proficiencySum = 0;
    for (const raw of requiredSkills) {
      const key = raw.trim().toLowerCase();
      const prof = personSkills.get(key);
      if (prof !== undefined) {
        matchedSkills.push(raw);
        proficiencySum += Math.min(5, Math.max(0, prof)) / 5;
      } else {
        missingSkills.push(raw);
      }
    }

    const skillFit = requiredSkills.length === 0 ? 0.5 : proficiencySum / requiredSkills.length;
    const roleMatch =
      positionRole && personRole && positionRole.trim().toLowerCase() === personRole.trim().toLowerCase()
        ? 1
        : 0;
    const raw = 0.6 * skillFit + 0.3 * roleMatch + 0.1 * 1;
    const matchScore = Math.round(raw * 100) / 100;
    return { matchScore, matchedSkills, missingSkills };
  }
}
