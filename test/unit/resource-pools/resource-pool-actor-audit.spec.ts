/**
 * F-119 / D-103-write-path round 29 — ResourcePool actor-audit.
 * Source-shape assertions across Prisma + in-memory + controller.
 */
import { readFileSync } from 'node:fs';

describe('D-103 write-path — ResourcePool actor-audit (source-shape)', () => {
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

  it('Prisma adapter create: data block populates both cols from actorId', () => {
    const section = prismaSrc.slice(
      prismaSrc.indexOf('public async create'),
      prismaSrc.indexOf('public async update'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/createdByPersonId:\s*data\.actorId\s*\?\?\s*null/);
    expect(section).toMatch(/updatedByPersonId:\s*data\.actorId\s*\?\?\s*null/);
  });

  it('Prisma adapter update: data block populates updatedByPersonId', () => {
    const section = prismaSrc.slice(
      prismaSrc.indexOf('public async update'),
      prismaSrc.indexOf('public async addMember'),
    );
    expect(section).toMatch(/actorId\?:\s*string/);
    expect(section).toMatch(/updatedByPersonId:\s*changes\.actorId\s*\?\?\s*null/);
  });

  it('In-memory adapter: create + update signatures expose actorId for interface parity', () => {
    expect(inMemorySrc).toMatch(/public create\([^)]*actorId\?:\s*string/);
    expect(inMemorySrc).toMatch(/public update\([^)]*actorId\?:\s*string/);
  });

  it('Controller: createResourcePool + updateResourcePool resolve actor from @Req', () => {
    const createSection = controllerSrc.slice(
      controllerSrc.indexOf('public async createResourcePool'),
      controllerSrc.indexOf('public async updateResourcePool'),
    );
    expect(createSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(createSection).toMatch(/this\.repository\.create\(/);
    expect(createSection).toMatch(/actorId,\s*\}\);/);
    const updateSection = controllerSrc.slice(
      controllerSrc.indexOf('public async updateResourcePool'),
      controllerSrc.indexOf('public async addMember'),
    );
    expect(updateSection).toMatch(/principal\?\.personId\s*\?\?\s*httpRequest\.principal\?\.userId/);
    expect(updateSection).toMatch(/this\.repository\.update\(id,\s*\{/);
    expect(updateSection).toMatch(/actorId,\s*\}\);/);
  });
});
