import type { ProjectPosition as PrismaProjectPosition } from '@prisma/client';

import { ProjectPositionPrismaMapper } from '@src/modules/project-positions/infrastructure/repositories/prisma/project-position-prisma.mapper';

const POSITION_ID = '44444444-4444-4444-4444-444444444444';
const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID = '22222222-2222-2222-2222-222222222222';

function buildRow(overrides: Partial<PrismaProjectPosition> = {}): PrismaProjectPosition {
  return {
    id: POSITION_ID,
    publicId: 'pos_abcdef1234',
    projectId: PROJECT_ID,
    role: 'Backend Engineer',
    skills: ['TypeScript', 'PostgreSQL'],
    summary: 'Replace contractor on the payments squad',
    priority: 'HIGH',
    requiredAllocationPercent: '75',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-12-31'),
    fillStatus: 'PROPOSED',
    activePersonId: PERSON_ID,
    activeAllocationPercent: '50',
    activeValidFrom: new Date('2026-07-01T00:00:00Z'),
    activeValidTo: new Date('2026-12-31T00:00:00Z'),
    releaseReason: null,
    rejectionReason: 'previous candidate declined',
    cancellationReason: 'scope cut in Q3 replan',
    onHoldReason: null,
    onHoldCaseId: null,
    requestedByPersonId: PERSON_ID,
    createdByPersonId: PERSON_ID,
    updatedByPersonId: PERSON_ID,
    version: 3,
    ...overrides,
  } as unknown as PrismaProjectPosition;
}

describe('ProjectPositionPrismaMapper — round-trip field fidelity (PR-7)', () => {
  it('round-trips skills, summary, priority, and both reason fields through toDomain → toPersistence', () => {
    const entity = ProjectPositionPrismaMapper.toDomain(buildRow());

    expect(entity.skills).toEqual(['TypeScript', 'PostgreSQL']);
    expect(entity.summary).toBe('Replace contractor on the payments squad');
    expect(entity.priority).toBe('HIGH');
    expect(entity.rejectionReason).toBe('previous candidate declined');
    expect(entity.cancellationReason).toBe('scope cut in Q3 replan');

    const persisted = ProjectPositionPrismaMapper.toPersistence(entity);
    expect(persisted).toMatchObject({
      id: POSITION_ID,
      projectId: PROJECT_ID,
      role: 'Backend Engineer',
      skills: ['TypeScript', 'PostgreSQL'],
      summary: 'Replace contractor on the payments squad',
      priority: 'HIGH',
      fillStatus: 'PROPOSED',
      activePersonId: PERSON_ID,
      rejectionReason: 'previous candidate declined',
      cancellationReason: 'scope cut in Q3 replan',
      requestedByPersonId: PERSON_ID,
      version: 3,
    });
  });

  it('maps null optionals to safe defaults (skills [], priority preserved, reasons null)', () => {
    const entity = ProjectPositionPrismaMapper.toDomain(
      buildRow({
        skills: [],
        summary: null,
        priority: 'MEDIUM',
        rejectionReason: null,
        cancellationReason: null,
      }),
    );

    expect(entity.skills).toEqual([]);
    expect(entity.summary).toBeUndefined();
    expect(entity.priority).toBe('MEDIUM');

    expect(ProjectPositionPrismaMapper.toPersistence(entity)).toMatchObject({
      skills: [],
      summary: null,
      priority: 'MEDIUM',
      rejectionReason: null,
      cancellationReason: null,
    });
  });

  it('persists the rejectionReason written by a PROPOSED → OPEN candidate rejection', () => {
    const entity = ProjectPositionPrismaMapper.toDomain(
      buildRow({ rejectionReason: null, cancellationReason: null }),
    );

    entity.transitionFill('OPEN', {
      actorRoles: ['project_manager'],
      reason: 'candidate failed client interview',
    });

    const persisted = ProjectPositionPrismaMapper.toPersistence(entity);
    expect(persisted).toMatchObject({
      fillStatus: 'OPEN',
      rejectionReason: 'candidate failed client interview',
      activePersonId: null,
      version: 4,
    });
  });
});
