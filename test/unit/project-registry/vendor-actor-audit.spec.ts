/**
 * F-105 / D-103-write-path round 15 — Vendor actor-audit (source-shape).
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — Vendor actor-audit (source-shape)', () => {
  const src = readFileSync(
    'src/modules/project-registry/application/vendor.service.ts',
    'utf-8',
  );

  it('createVendor: data block includes createdByPersonId + updatedByPersonId', () => {
    const section = src.slice(
      src.indexOf('public async createVendor'),
      src.indexOf('public async updateVendor'),
    );
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('updateVendor: data block sets updatedByPersonId', () => {
    const section = src.slice(
      src.indexOf('public async updateVendor'),
      src.indexOf('public async listProjectVendors'),
    );
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });
});
