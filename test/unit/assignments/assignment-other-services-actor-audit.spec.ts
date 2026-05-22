/**
 * F-127 / D-103-write-path round 37 — ProjectAssignment actor-audit
 * coverage for the remaining write services that previously relied on
 * repository.save() without stamping `setUpdatedBy()`.
 * Covers approve / reject / end / cancel-undo.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ProjectAssignment other-services actor-audit (source-shape)', () => {
  const approveSrc = readFileSync(
    'src/modules/assignments/application/approve-project-assignment.service.ts',
    'utf-8',
  );
  const rejectSrc = readFileSync(
    'src/modules/assignments/application/reject-project-assignment.service.ts',
    'utf-8',
  );
  const endSrc = readFileSync(
    'src/modules/assignments/application/end-project-assignment.service.ts',
    'utf-8',
  );
  const undoSrc = readFileSync(
    'src/modules/assignments/application/assignment-cancel-undo.executor.ts',
    'utf-8',
  );

  it('approve: calls assignment.setUpdatedBy(command.actorId) before save', () => {
    expect(approveSrc).toMatch(/assignment\.setUpdatedBy\(command\.actorId\)/);
    const idx = approveSrc.indexOf('assignment.setUpdatedBy');
    const saveIdx = approveSrc.indexOf('projectAssignmentRepository.save');
    expect(idx).toBeLessThan(saveIdx);
  });

  it('reject: calls assignment.setUpdatedBy(command.actorId) before save', () => {
    expect(rejectSrc).toMatch(/assignment\.setUpdatedBy\(command\.actorId\)/);
    const idx = rejectSrc.indexOf('assignment.setUpdatedBy');
    const saveIdx = rejectSrc.indexOf('projectAssignmentRepository.save');
    expect(idx).toBeLessThan(saveIdx);
  });

  it('end: calls assignment.setUpdatedBy(command.actorId) before save', () => {
    expect(endSrc).toMatch(/assignment\.setUpdatedBy\(command\.actorId\)/);
    const idx = endSrc.indexOf('assignment.setUpdatedBy');
    const saveIdx = endSrc.indexOf('projectAssignmentRepository.save');
    expect(idx).toBeLessThan(saveIdx);
  });

  it('cancel-undo executor: calls assignment.setUpdatedBy(row.actorId) before save', () => {
    expect(undoSrc).toMatch(/assignment\.setUpdatedBy\(row\.actorId\)/);
    const idx = undoSrc.indexOf('assignment.setUpdatedBy');
    const saveIdx = undoSrc.indexOf('projectAssignmentRepository.save');
    expect(idx).toBeLessThan(saveIdx);
  });
});
