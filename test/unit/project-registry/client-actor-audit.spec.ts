/**
 * F-104 / D-103-write-path round 14 — ClientService actor-audit.
 * Source-shape assertions.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — Client actor-audit (source-shape)', () => {
  const src = readFileSync(
    'src/modules/project-registry/application/client.service.ts',
    'utf-8',
  );

  it('create: data block includes createdByPersonId + updatedByPersonId', () => {
    const section = src.slice(
      src.indexOf('public async create'),
      src.indexOf('public async update'),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('update: data block sets updatedByPersonId', () => {
    const section = src.slice(src.indexOf('public async update'), src.length);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });
});
