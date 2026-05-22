import { SkillsService } from '@src/modules/skills/application/skills.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-101 / D-103-write-path round 11 — asserts SkillsService.createSkill
 * populates createdByPersonId + updatedByPersonId when actor supplied.
 */
describe('D-103 write-path — Skill actor-audit', () => {
  function buildStub(captureCreate: (d: Record<string, unknown>) => void): PrismaService {
    return {
      skill: {
        create: async (args: { data: Record<string, unknown> }) => {
          captureCreate(args.data);
          return {
            id: 'sk-1',
            publicId: 'skl_test',
            name: args.data.name,
            category: args.data.category ?? null,
            createdAt: new Date(),
            ...args.data,
          };
        },
      },
    } as unknown as PrismaService;
  }

  it('createSkill: populates createdByPersonId + updatedByPersonId when actor supplied', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new SkillsService(buildStub((d) => (captured = d)));
    await svc.createSkill({ name: 'Kubernetes' }, 'admin-7');
    expect(captured.createdByPersonId).toBe('admin-7');
    expect(captured.updatedByPersonId).toBe('admin-7');
  });

  it('createSkill: cols NULL when actor omitted (back-compat)', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new SkillsService(buildStub((d) => (captured = d)));
    await svc.createSkill({ name: 'TypeScript' });
    expect(captured.createdByPersonId).toBeNull();
    expect(captured.updatedByPersonId).toBeNull();
  });
});
