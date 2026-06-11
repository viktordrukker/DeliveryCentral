import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import {
  itCompanyDatasetSummary,
  itCompanyOverAllocatedPersonIds,
  itCompanyPeople,
  itCompanyPersonSkillAssignments,
  itCompanyProjectPositionCandidates,
  itCompanyProjectPositionFillHistory,
  itCompanyProjectPositions,
  itCompanyProjects,
  itCompanySeedNow,
} from '../../../prisma/seeds/it-company-profile';

/**
 * PR-2 (lean migration P0) — the seed must run green on the lean schema.
 *
 * The `20260609_lean_p3_2_drop_legacy_tables` migration dropped
 * ProjectAssignment / AssignmentApproval / AssignmentHistory /
 * StaffingRequest / StaffingRequestFulfilment (plus the person-release
 * tables). Any `prisma.<droppedModel>` accessor in seed.ts is `undefined`
 * at runtime, so a fresh CLI seed or setup-wizard install throws TypeError
 * and DM-R-10 rolls the DB back to empty.
 *
 * This spec proves, without a live database:
 *   1. every Prisma model accessor referenced by prisma/seed.ts exists on
 *      the generated PrismaClient (static scan of the seed source), and
 *   2. the re-mapped lean dataset satisfies the invariants its readers
 *      depend on (fillStatus enum values, required fields, and the
 *      bench-aging contract on RELEASED fill-history rows).
 */
describe('it-company seed — lean model re-map', () => {
  const seedSource = readFileSync(join(__dirname, '../../../prisma/seed.ts'), 'utf8');
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('seed.ts references only models that exist on PrismaClient', () => {
    const deleteManyModels = [...seedSource.matchAll(/\bt\.([a-zA-Z]+)\.deleteMany/g)].map(
      (m) => m[1],
    );
    const createManyModels = [...seedSource.matchAll(/createManyInChunks\('([a-zA-Z]+)'/g)].map(
      (m) => m[1],
    );
    const referencedModels = [...new Set([...deleteManyModels, ...createManyModels])].sort();

    it('finds the model accessors used by the clear + insert paths', () => {
      expect(referencedModels.length).toBeGreaterThan(30);
      expect(referencedModels).toContain('projectPosition');
      expect(referencedModels).toContain('projectPositionFillHistory');
    });

    it.each(referencedModels)('prisma.%s is a live model delegate', (model) => {
      expect((prisma as unknown as Record<string, unknown>)[model]).toBeDefined();
    });

    it('no longer references the dropped legacy models', () => {
      const dropped = [
        'projectAssignment',
        'assignmentApproval',
        'assignmentHistory',
        'staffingRequest',
        'staffingRequestFulfilment',
        'personReleaseApproval',
        'personReleaseRequest',
      ];
      for (const model of dropped) {
        expect(referencedModels).not.toContain(model);
      }
    });
  });

  describe('ProjectPosition rows', () => {
    const VALID_FILL_STATUSES = [
      'DRAFT',
      'OPEN',
      'PROPOSED',
      'BOOKED',
      'ONBOARDING',
      'ASSIGNED',
      'ON_HOLD',
      'RELEASED',
    ];
    const projectIds = new Set(itCompanyProjects.map((p) => p.id));

    it('re-maps the full assignment factory output (one position per legacy row)', () => {
      expect(itCompanyProjectPositions.length).toBeGreaterThan(300);
      expect(itCompanyDatasetSummary.projectPositionCount).toBe(itCompanyProjectPositions.length);
    });

    it('every position carries the required lean fields', () => {
      for (const pos of itCompanyProjectPositions) {
        expect(projectIds.has(pos.projectId)).toBe(true);
        expect(VALID_FILL_STATUSES).toContain(pos.fillStatus);
        expect(typeof pos.role).toBe('string');
        expect(pos.requiredAllocationPercent).toBeGreaterThan(0);
        expect(pos.startDate).toBeInstanceOf(Date);
        expect(pos.endDate).toBeInstanceOf(Date);
      }
    });

    it('seeds OPEN demand (was: open staffing requests) for the staffing desk', () => {
      const open = itCompanyProjectPositions.filter((p) => p.fillStatus === 'OPEN');
      expect(open.length).toBeGreaterThanOrEqual(4);
      for (const pos of open) {
        expect(pos.activePersonId ?? null).toBeNull();
      }
    });

    it('seeds filled positions with an active person', () => {
      const assigned = itCompanyProjectPositions.filter((p) => p.fillStatus === 'ASSIGNED');
      expect(assigned.length).toBeGreaterThan(50);
      for (const pos of assigned) {
        expect(pos.activePersonId).toBeTruthy();
      }
    });
  });

  describe('ProjectPositionFillHistory rows (bench-aging contract)', () => {
    const positionIds = new Set(itCompanyProjectPositions.map((p) => p.id));

    it('every history row points at a seeded position', () => {
      expect(itCompanyProjectPositionFillHistory.length).toBeGreaterThan(500);
      for (const row of itCompanyProjectPositionFillHistory) {
        expect(positionIds.has(row.positionId as string)).toBe(true);
      }
    });

    it('RELEASED rows carry previousPersonId + occurredAt so daysOnBench has data', () => {
      const released = itCompanyProjectPositionFillHistory.filter(
        (row) => row.changeType === 'RELEASED',
      );
      expect(released.length).toBeGreaterThan(100);
      for (const row of released) {
        expect(row.previousPersonId).toBeTruthy();
        expect(row.occurredAt).toBeInstanceOf(Date);
      }
    });

    it('every RELEASED position has a RELEASED history row', () => {
      const releasedHistoryPositionIds = new Set(
        itCompanyProjectPositionFillHistory
          .filter((row) => row.changeType === 'RELEASED')
          .map((row) => row.positionId as string),
      );
      const releasedFills = itCompanyProjectPositions.filter(
        (p) => p.fillStatus === 'RELEASED' && p.activePersonId,
      );
      expect(releasedFills.length).toBeGreaterThan(100);
      for (const pos of releasedFills) {
        expect(releasedHistoryPositionIds.has(pos.id)).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // PR-3 seed realism invariants
  // -------------------------------------------------------------------------

  type PositionLike = {
    fillStatus: string;
    activePersonId: string | null;
    activeValidTo?: Date | null;
    activeAllocationPercent?: number;
  };
  const positionRows = itCompanyProjectPositions as unknown as PositionLike[];

  describe('Σ-allocation cap', () => {
    // Mirrors the backend "staffed" definition (bench-management.service.ts):
    // concurrent fills are BOOKED/ONBOARDING/ASSIGNED/ON_HOLD with no validTo.
    const STAFFED = new Set(['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD']);
    const sumByPerson = new Map<string, number>();
    for (const pos of positionRows) {
      if (!STAFFED.has(pos.fillStatus) || !pos.activePersonId) continue;
      if (pos.activeValidTo != null) continue;
      sumByPerson.set(
        pos.activePersonId,
        (sumByPerson.get(pos.activePersonId) ?? 0) + (pos.activeAllocationPercent ?? 0),
      );
    }

    it('caps every person at ≤100% concurrent allocation except the labeled pair', () => {
      const overAllocated = new Set(itCompanyOverAllocatedPersonIds);
      for (const [personId, sum] of sumByPerson) {
        if (overAllocated.has(personId)) continue;
        expect(sum).toBeLessThanOrEqual(100);
      }
    });

    it('keeps exactly 2 deliberately over-allocated people above 100%', () => {
      expect(itCompanyOverAllocatedPersonIds).toHaveLength(2);
      for (const personId of itCompanyOverAllocatedPersonIds) {
        expect(sumByPerson.get(personId) ?? 0).toBeGreaterThan(100);
      }
    });
  });

  describe('PersonSkill coverage', () => {
    const skillCountByPerson = new Map<string, number>();
    for (const row of itCompanyPersonSkillAssignments) {
      skillCountByPerson.set(row.personId, (skillCountByPerson.get(row.personId) ?? 0) + 1);
    }

    it('every active person has 3-6 role-consistent PersonSkill rows', () => {
      const activePeople = itCompanyPeople.filter((p) => p.employmentStatus === 'ACTIVE');
      expect(activePeople.length).toBeGreaterThan(150);
      for (const person of activePeople) {
        const count = skillCountByPerson.get(person.id) ?? 0;
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(6);
      }
    });

    it('every generated skill name resolves against the seedSkills() catalog', () => {
      const catalog = new Set(
        [...seedSource.matchAll(/name: '([^']+)',\s+category: '/g)].map((m) => m[1].toLowerCase()),
      );
      expect(catalog.size).toBeGreaterThanOrEqual(33);
      for (const row of itCompanyPersonSkillAssignments) {
        expect(catalog.has(row.skillName.toLowerCase())).toBe(true);
      }
    });
  });

  describe('ProjectPositionCandidate slates', () => {
    const proposedIds = new Set(
      itCompanyProjectPositions.filter((p) => p.fillStatus === 'PROPOSED').map((p) => p.id),
    );

    it('seeds 2-3 PENDING candidates on ~half the PROPOSED positions', () => {
      expect(proposedIds.size).toBeGreaterThanOrEqual(4);
      const byPosition = new Map<string, number>();
      for (const cand of itCompanyProjectPositionCandidates) {
        expect(proposedIds.has(cand.positionId as string)).toBe(true);
        expect(cand.decision).toBe('PENDING');
        expect(cand.candidatePersonId).toBeTruthy();
        expect(cand.rank as number).toBeGreaterThanOrEqual(1);
        expect(cand.matchScore as number).toBeGreaterThan(0);
        expect(cand.matchScore as number).toBeLessThanOrEqual(1);
        byPosition.set(
          cand.positionId as string,
          (byPosition.get(cand.positionId as string) ?? 0) + 1,
        );
      }
      expect(byPosition.size).toBeGreaterThanOrEqual(2);
      for (const count of byPosition.values()) {
        expect(count).toBeGreaterThanOrEqual(2);
        expect(count).toBeLessThanOrEqual(3);
      }
    });

    it('never duplicates a candidate within a slate', () => {
      const seen = new Set<string>();
      for (const cand of itCompanyProjectPositionCandidates) {
        const key = `${cand.positionId}:${cand.candidatePersonId}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  describe('bench realism', () => {
    it('benched people have their latest RELEASED row 1-180 days old', () => {
      const staffedNow = new Set(
        positionRows
          .filter(
            (p) =>
              (p.fillStatus === 'BOOKED' || p.fillStatus === 'ASSIGNED') &&
              p.activeValidTo == null &&
              p.activePersonId,
          )
          .map((p) => p.activePersonId as string),
      );
      const activePersonIds = new Set(
        itCompanyPeople.filter((p) => p.employmentStatus === 'ACTIVE').map((p) => p.id),
      );
      const latestReleasedByPerson = new Map<string, Date>();
      for (const row of itCompanyProjectPositionFillHistory) {
        if (row.changeType !== 'RELEASED') continue;
        const personId = row.previousPersonId as string;
        const occurredAt = row.occurredAt as Date;
        const prev = latestReleasedByPerson.get(personId);
        if (!prev || occurredAt > prev) latestReleasedByPerson.set(personId, occurredAt);
      }

      const dayMs = 24 * 60 * 60 * 1000;
      let benched = 0;
      for (const [personId, occurredAt] of latestReleasedByPerson) {
        if (staffedNow.has(personId) || !activePersonIds.has(personId)) continue;
        benched += 1;
        const daysOnBench = (itCompanySeedNow.getTime() - occurredAt.getTime()) / dayMs;
        expect(daysOnBench).toBeGreaterThanOrEqual(1);
        expect(daysOnBench).toBeLessThanOrEqual(180);
      }
      expect(benched).toBeGreaterThan(10);
    });
  });
});
