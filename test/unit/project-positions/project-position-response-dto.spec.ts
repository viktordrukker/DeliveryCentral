/**
 * LEAN-P4-missing-2 — verifies `ProjectPositionResponseDto.from` surfaces
 * the new `createdAt` field that drives the FE "Time in queue" column on
 * the approval surfaces.
 */
import { ProjectPositionResponseDto } from '@src/modules/project-positions/application/contracts/project-position-responses';
import { ProjectPosition } from '@src/modules/project-positions/domain/entities/project-position.entity';
import { PositionFillStatus } from '@src/modules/project-positions/domain/value-objects/position-fill-status';
import { PositionId } from '@src/modules/project-positions/domain/value-objects/position-id';

const POSITION_ID = '11111111-1111-4111-8111-111111111111';
const PROJECT_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_AT = new Date('2026-06-01T10:00:00.000Z');

function buildPosition(props: Partial<{ createdAt: Date }> = {}): ProjectPosition {
  return ProjectPosition.create(
    {
      projectId: PROJECT_ID,
      role: 'Engineer',
      requiredAllocationPercent: 80,
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-09-10'),
      fillStatus: PositionFillStatus.from('PROPOSED'),
      ...props,
    },
    PositionId.from(POSITION_ID),
  );
}

describe('ProjectPositionResponseDto.from — createdAt (LEAN-P4-missing-2)', () => {
  it('emits createdAt as an ISO string when the aggregate carries one', () => {
    const dto = ProjectPositionResponseDto.from(buildPosition({ createdAt: CREATED_AT }));
    expect(dto.createdAt).toBe('2026-06-01T10:00:00.000Z');
  });

  it('omits createdAt when the aggregate has no timestamp (pre-persist state)', () => {
    const dto = ProjectPositionResponseDto.from(buildPosition());
    expect(dto.createdAt).toBeUndefined();
  });
});
