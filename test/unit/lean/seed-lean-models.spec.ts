import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';

import {
  itCompanyDatasetSummary,
  itCompanyProjectPositionFillHistory,
  itCompanyProjectPositions,
  itCompanyProjects,
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
});
