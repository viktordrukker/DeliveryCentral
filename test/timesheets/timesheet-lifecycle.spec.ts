import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { TimesheetsService } from '@src/modules/timesheets/application/timesheets.service';
import { TimesheetRepository } from '@src/modules/timesheets/infrastructure/timesheet.repository';

function makeWeek(overrides: Partial<{
  id: string;
  personId: string;
  weekStart: Date;
  status: string;
  submittedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedReason: string | null;
  entries: unknown[];
}> = {}) {
  return {
    id: 'week-1',
    personId: 'person-1',
    weekStart: new Date('2026-01-05'),
    status: 'DRAFT',
    submittedAt: null,
    approvedBy: null,
    approvedAt: null,
    rejectedReason: null,
    entries: [],
    ...overrides,
  };
}

function makeEntry() {
  return {
    id: 'entry-1',
    projectId: 'proj-1',
    assignmentId: null,
    date: new Date('2026-01-06'),
    hours: new Prisma.Decimal(8),
    capex: false,
    description: null,
  };
}

function buildMockRepo(overrides: Partial<TimesheetRepository> = {}): TimesheetRepository {
  return {
    findWeekWithEntries: jest.fn(),
    createWeek: jest.fn(),
    findWeekById: jest.fn(),
    updateWeek: jest.fn(),
    upsertEntry: jest.fn(),
    findLocksForDate: jest.fn().mockResolvedValue([]),
    findApprovalQueue: jest.fn(),
    findHistory: jest.fn(),
    findApprovedEntries: jest.fn(),
    ...overrides,
  } as unknown as TimesheetRepository;
}

describe('TimesheetsService — lifecycle', () => {
  describe('getMyWeek', () => {
    it('returns existing week when found', async () => {
      const week = makeWeek();
      const repo = buildMockRepo({
        findWeekWithEntries: jest.fn().mockResolvedValue(week),
      });
      const svc = new TimesheetsService(repo);

      const result = await svc.getMyWeek('person-1', '2026-01-05');

      expect(result.id).toBe('week-1');
      expect(result.status).toBe('DRAFT');
    });

    it('creates a new week when none exists', async () => {
      const week = makeWeek();
      const repo = buildMockRepo({
        findWeekWithEntries: jest.fn().mockResolvedValue(null),
        createWeek: jest.fn().mockResolvedValue(week),
      });
      const svc = new TimesheetsService(repo);

      await svc.getMyWeek('person-1', '2026-01-05');

      expect(repo.createWeek).toHaveBeenCalledWith('person-1', new Date('2026-01-05'));
    });

    it('throws BadRequestException for an invalid weekStart', async () => {
      const svc = new TimesheetsService(buildMockRepo());

      await expect(svc.getMyWeek('person-1', 'not-a-date')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('upsertEntry', () => {
    it('saves entry to an existing DRAFT week', async () => {
      const week = makeWeek();
      const entry = makeEntry();
      const repo = buildMockRepo({
        findWeekWithEntries: jest.fn().mockResolvedValue(week),
        upsertEntry: jest.fn().mockResolvedValue(entry),
      });
      const svc = new TimesheetsService(repo);

      const result = await svc.upsertEntry('person-1', {
        weekStart: '2026-01-05',
        projectId: 'proj-1',
        date: '2026-01-06',
        hours: 8,
      });

      expect(result.hours).toBe(8);
      expect(result.capex).toBe(false);
    });

    it('throws BadRequestException when week is APPROVED', async () => {
      const week = makeWeek({ status: 'APPROVED' });
      const repo = buildMockRepo({
        findWeekWithEntries: jest.fn().mockResolvedValue(week),
      });
      const svc = new TimesheetsService(repo);

      await expect(
        svc.upsertEntry('person-1', { weekStart: '2026-01-05', projectId: 'p', date: '2026-01-06', hours: 4 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when week is SUBMITTED', async () => {
      const week = makeWeek({ status: 'SUBMITTED' });
      const repo = buildMockRepo({
        findWeekWithEntries: jest.fn().mockResolvedValue(week),
      });
      const svc = new TimesheetsService(repo);

      await expect(
        svc.upsertEntry('person-1', { weekStart: '2026-01-05', projectId: 'p', date: '2026-01-06', hours: 4 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when period is locked', async () => {
      const week = makeWeek();
      const repo = buildMockRepo({
        findWeekWithEntries: jest.fn().mockResolvedValue(week),
        findLocksForDate: jest.fn().mockResolvedValue([{ id: 'lock-1' }]),
      });
      const svc = new TimesheetsService(repo);

      await expect(
        svc.upsertEntry('person-1', { weekStart: '2026-01-05', projectId: 'p', date: '2026-01-06', hours: 4 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('submitWeek', () => {
    it('transitions DRAFT → SUBMITTED', async () => {
      const week = makeWeek();
      const submitted = makeWeek({ status: 'SUBMITTED', submittedAt: new Date() });
      const repo = buildMockRepo({
        findWeekWithEntries: jest.fn().mockResolvedValue(week),
        updateWeek: jest.fn().mockResolvedValue(submitted),
      });
      const svc = new TimesheetsService(repo);

      const result = await svc.submitWeek('person-1', '2026-01-05');

      expect(result.status).toBe('SUBMITTED');
    });

    it('throws NotFoundException when week does not exist', async () => {
      const repo = buildMockRepo({ findWeekWithEntries: jest.fn().mockResolvedValue(null) });
      const svc = new TimesheetsService(repo);

      await expect(svc.submitWeek('person-1', '2026-01-05')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when week is not DRAFT', async () => {
      const week = makeWeek({ status: 'SUBMITTED' });
      const repo = buildMockRepo({ findWeekWithEntries: jest.fn().mockResolvedValue(week) });
      const svc = new TimesheetsService(repo);

      await expect(svc.submitWeek('person-1', '2026-01-05')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('approveWeek', () => {
    it('transitions SUBMITTED → APPROVED', async () => {
      const week = makeWeek({ status: 'SUBMITTED' });
      const approved = makeWeek({ status: 'APPROVED', approvedBy: 'mgr-1', approvedAt: new Date() });
      const repo = buildMockRepo({
        findWeekById: jest.fn().mockResolvedValue(week),
        updateWeek: jest.fn().mockResolvedValue(approved),
      });
      const svc = new TimesheetsService(repo);

      const result = await svc.approveWeek('week-1', 'mgr-1');

      expect(result.status).toBe('APPROVED');
      expect(result.approvedBy).toBe('mgr-1');
    });

    it('throws NotFoundException when week does not exist', async () => {
      const repo = buildMockRepo({ findWeekById: jest.fn().mockResolvedValue(null) });
      const svc = new TimesheetsService(repo);

      await expect(svc.approveWeek('week-999', 'mgr-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequestException when week is not SUBMITTED', async () => {
      const week = makeWeek({ status: 'DRAFT' });
      const repo = buildMockRepo({ findWeekById: jest.fn().mockResolvedValue(week) });
      const svc = new TimesheetsService(repo);

      await expect(svc.approveWeek('week-1', 'mgr-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('rejectWeek', () => {
    it('transitions SUBMITTED → REJECTED with reason', async () => {
      const week = makeWeek({ status: 'SUBMITTED' });
      const rejected = makeWeek({ status: 'REJECTED', rejectedReason: 'Missing project code' });
      const repo = buildMockRepo({
        findWeekById: jest.fn().mockResolvedValue(week),
        updateWeek: jest.fn().mockResolvedValue(rejected),
      });
      const svc = new TimesheetsService(repo);

      const result = await svc.rejectWeek('week-1', { reason: 'Missing project code' });

      expect(result.status).toBe('REJECTED');
      expect(result.rejectedReason).toBe('Missing project code');
    });

    it('throws BadRequestException when week is not SUBMITTED', async () => {
      const week = makeWeek({ status: 'APPROVED' });
      const repo = buildMockRepo({ findWeekById: jest.fn().mockResolvedValue(week) });
      const svc = new TimesheetsService(repo);

      await expect(svc.rejectWeek('week-1', { reason: 'bad' })).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
