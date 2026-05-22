import { HelpService } from '@src/modules/help-center/application/help.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * F-99 / D-103-write-path round 9 — asserts that HelpService.createArticle,
 * updateArticle, and createTip populate actor-audit columns.
 */
describe('D-103 write-path — HelpArticle + HelpTip actor-audit', () => {
  function buildStub(
    captureArticleCreate: (d: Record<string, unknown>) => void,
    captureArticleUpdate: (d: Record<string, unknown>) => void,
    captureTipCreate: (d: Record<string, unknown>) => void,
  ): PrismaService {
    return {
      helpArticle: {
        create: async (args: { data: Record<string, unknown>; include?: unknown }) => {
          captureArticleCreate(args.data);
          return {
            id: 'a-1',
            slug: 'x',
            title: 't',
            summary: 's',
            body: 'b',
            tags: [],
            isPublished: false,
            authorPersonId: args.data.authorPersonId,
            createdByPerson: null,
            updatedByPerson: null,
            archivedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args.data,
          };
        },
        update: async (args: { data: Record<string, unknown> }) => {
          captureArticleUpdate(args.data);
          return {
            id: 'a-1',
            slug: 'x',
            title: 't',
            summary: 's',
            body: 'b',
            tags: [],
            isPublished: false,
            authorPersonId: null,
            createdByPerson: null,
            updatedByPerson: null,
            archivedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
        findUnique: async () => ({ id: 'a-1' }),
      },
      helpTip: {
        create: async (args: { data: Record<string, unknown> }) => {
          captureTipCreate(args.data);
          return {
            id: 't-1',
            key: 'k',
            routePath: '/',
            title: 't',
            body: 'b',
            articleId: null,
            displayOrder: 100,
            ...args.data,
          };
        },
      },
    } as unknown as PrismaService;
  }

  it('createArticle: sets authorPersonId + createdByPersonId + updatedByPersonId', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new HelpService(buildStub((d) => (captured = d), () => undefined, () => undefined));
    await svc.createArticle('admin-7', {
      slug: 'how-to',
      title: 'Title',
      summary: 'Summary',
      body: 'Body',
    });
    expect(captured.authorPersonId).toBe('admin-7');
    expect(captured.createdByPersonId).toBe('admin-7');
    expect(captured.updatedByPersonId).toBe('admin-7');
  });

  it('updateArticle: connects updatedByPerson when actor supplied', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new HelpService(buildStub(() => undefined, (d) => (captured = d), () => undefined));
    await svc.updateArticle('a-1', { title: 'new' }, 'admin-9');
    expect(captured.updatedByPerson).toEqual({ connect: { id: 'admin-9' } });
  });

  it('updateArticle: disconnects updatedByPerson when no actor', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new HelpService(buildStub(() => undefined, (d) => (captured = d), () => undefined));
    await svc.updateArticle('a-1', { title: 'new' });
    expect(captured.updatedByPerson).toEqual({ disconnect: true });
  });

  it('createTip: sets createdByPersonId + updatedByPersonId when actor supplied', async () => {
    let captured: Record<string, unknown> = {};
    const svc = new HelpService(buildStub(() => undefined, () => undefined, (d) => (captured = d)));
    await svc.createTip(
      { key: 'k', routePath: '/dashboard', title: 'T', body: 'B' },
      'admin-3',
    );
    expect(captured.createdByPersonId).toBe('admin-3');
    expect(captured.updatedByPersonId).toBe('admin-3');
  });
});
