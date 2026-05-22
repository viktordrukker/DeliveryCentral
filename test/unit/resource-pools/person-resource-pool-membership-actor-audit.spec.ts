/**
 * F-120 / D-103-write-path round 30 — PersonResourcePoolMembership actor-audit.
 * Source-shape assertions across Prisma adapter + in-memory + controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — PersonResourcePoolMembership actor-audit (source-shape)', () => {
  const prismaSrc = readFileSync(
    'src/modules/resource-pools/infrastructure/prisma-resource-pool.repository.ts',
    'utf-8',
  );
  const inMemorySrc = readFileSync(
    'src/modules/resource-pools/infrastructure/in-memory-resource-pool.repository.ts',
    'utf-8',
  );
  const controllerSrc = readFileSync(
    'src/modules/resource-pools/presentation/resource-pools.controller.ts',
    'utf-8',
  );

  it('Prisma addMember: signature accepts actorId, create populates both cols', () => {
    const section = prismaSrc.slice(
      prismaSrc.indexOf('public async addMember'),
      prismaSrc.indexOf('public async removeMember'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/createdByPersonId:\s*actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('Prisma removeMember: signature accepts actorId, archive update sets updatedByPersonId', () => {
    const section = prismaSrc.slice(prismaSrc.indexOf('public async removeMember'), prismaSrc.length);
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/updatedByPersonId:\s*actorId\s*\?\?\s*null/);
  });

  it('In-memory addMember + removeMember signatures expose actorId for interface parity', () => {
    expect(inMemorySrc).toMatch(/addMember\([^)]*_actorId\?:\s*string/);
    expect(inMemorySrc).toMatch(/removeMember\([^)]*_actorId\?:\s*string/);
  });

  it('Controller addMember + removeMember resolve actor from @Req + pass through', () => {
    const addSection = controllerSrc.slice(
      controllerSrc.indexOf('public async addMember'),
      controllerSrc.indexOf('public async removeMember'),
    );
    expect(addSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(addSection).toMatch(/this\.repository\.addMember\(id,\s*request\.personId\.trim\(\),\s*actorId\)/);
    const removeSection = controllerSrc.slice(controllerSrc.indexOf('public async removeMember'), controllerSrc.length);
    expect(removeSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(removeSection).toMatch(/this\.repository\.removeMember\(id,\s*personId,\s*actorId\)/);
  });
});
