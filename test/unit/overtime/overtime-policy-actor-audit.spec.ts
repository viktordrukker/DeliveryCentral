/**
 * F-103 / D-103-write-path round 13 — OvertimePolicy actor-audit.
 * Source-shape assertions only (service has heavy NestJS dependencies).
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — OvertimePolicy actor-audit (source-shape)', () => {
  const src = readFileSync(
    'src/modules/overtime/application/overtime-policy.service.ts',
    'utf-8',
  );

  it('create: data block includes createdByPersonId + updatedByPersonId = actorId', () => {
    const createSection = src.slice(
      src.indexOf('public async create'),
      src.indexOf('public async remove'),
    );
    expect(createSection).toMatch(/createdByPersonId:\s*actorId/);
    expect(createSection).toMatch(/updatedByPersonId:\s*actorId/);
  });

  it('remove: sets updatedByPersonId on archive', () => {
    const removeSection = src.slice(src.indexOf('public async remove'), src.length);
    expect(removeSection).toMatch(/updatedByPersonId:\s*actorId/);
  });
});
