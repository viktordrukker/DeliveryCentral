import { ConflictException, NotFoundException } from '@nestjs/common';

import { HelpService } from '@src/modules/help-center/application/help.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  isPublished: boolean;
  authorPersonId: string | null;
  author: { displayName: string } | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

interface FakeTip {
  id: string;
  key: string;
  routePath: string;
  title: string;
  body: string;
  articleId: string | null;
  displayOrder: number;
  isActive: boolean;
  archivedAt: Date | null;
  createdAt: Date;
}

interface FakeFeedback {
  id: string;
  articleId: string;
  actorPersonId: string | null;
  wasHelpful: boolean;
  comment: string | null;
  createdAt: Date;
}

interface FakeProgress {
  personId: string;
  tourKey: string;
  completedSteps: string[];
  dismissedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}

function buildPrisma(state: {
  articles?: FakeArticle[];
  tips?: FakeTip[];
  feedback?: FakeFeedback[];
  progress?: FakeProgress[];
}): { prisma: PrismaService; state: Required<typeof state> } {
  const articles = state.articles ?? [];
  const tips = state.tips ?? [];
  const feedback = state.feedback ?? [];
  const progress = state.progress ?? [];

  const prisma = {
    helpArticle: {
      findMany: async (args: {
        where: {
          isPublished?: boolean;
          archivedAt?: null;
          tags?: { has: string };
          OR?: Array<{ title?: object; summary?: object }>;
        };
      }) => {
        return articles.filter((a) => {
          if (args.where.isPublished && !a.isPublished) return false;
          if (args.where.archivedAt === null && a.archivedAt !== null) return false;
          if (args.where.tags?.has && !a.tags.includes(args.where.tags.has)) return false;
          if (args.where.OR) {
            const search = (args.where.OR[0]?.title as { contains?: string })?.contains;
            if (
              search &&
              !a.title.toLowerCase().includes(search.toLowerCase()) &&
              !a.summary.toLowerCase().includes(search.toLowerCase())
            )
              return false;
          }
          return true;
        });
      },
      findFirst: async (args: { where: { slug: string; isPublished: boolean } }) => {
        return (
          articles.find(
            (a) =>
              a.slug === args.where.slug &&
              a.isPublished &&
              a.archivedAt === null,
          ) ?? null
        );
      },
      findUnique: async (args: { where: { id: string } }) => {
        return articles.find((a) => a.id === args.where.id) ?? null;
      },
      create: async (args: { data: Partial<FakeArticle> & { slug: string } }): Promise<FakeArticle> => {
        if (articles.some((a) => a.slug === args.data.slug)) {
          const err = new Error('Unique constraint failed') as Error & { code: string };
          err.code = 'P2002';
          throw err;
        }
        const row: FakeArticle = {
          id: `art-${articles.length + 1}`,
          slug: args.data.slug,
          title: args.data.title ?? '',
          summary: args.data.summary ?? '',
          body: args.data.body ?? '',
          tags: args.data.tags ?? [],
          isPublished: args.data.isPublished ?? false,
          authorPersonId: args.data.authorPersonId ?? null,
          author: args.data.authorPersonId ? { displayName: 'Author Stub' } : null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        };
        articles.push(row);
        return row;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<FakeArticle>;
      }): Promise<FakeArticle> => {
        const row = articles.find((a) => a.id === args.where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, args.data, { updatedAt: new Date() });
        return row;
      },
    },
    helpTip: {
      findMany: async (args: {
        where: { routePath: string; isActive: boolean; archivedAt: null };
      }) => {
        return tips
          .filter(
            (t) =>
              t.routePath === args.where.routePath &&
              t.isActive &&
              t.archivedAt === null,
          )
          .sort((a, b) => a.displayOrder - b.displayOrder);
      },
      create: async (args: { data: Partial<FakeTip> & { key: string } }): Promise<FakeTip> => {
        if (tips.some((t) => t.key === args.data.key)) {
          const err = new Error('Unique constraint failed') as Error & { code: string };
          err.code = 'P2002';
          throw err;
        }
        const row: FakeTip = {
          id: `tip-${tips.length + 1}`,
          key: args.data.key,
          routePath: args.data.routePath ?? '/',
          title: args.data.title ?? '',
          body: args.data.body ?? '',
          articleId: args.data.articleId ?? null,
          displayOrder: args.data.displayOrder ?? 100,
          isActive: true,
          archivedAt: null,
          createdAt: new Date(),
        };
        tips.push(row);
        return row;
      },
    },
    helpFeedback: {
      create: async (args: {
        data: Partial<FakeFeedback> & { articleId: string };
      }): Promise<FakeFeedback> => {
        const row: FakeFeedback = {
          id: `fb-${feedback.length + 1}`,
          articleId: args.data.articleId,
          actorPersonId: args.data.actorPersonId ?? null,
          wasHelpful: args.data.wasHelpful ?? false,
          comment: args.data.comment ?? null,
          createdAt: new Date(),
        };
        feedback.push(row);
        return row;
      },
    },
    onboardingTourProgress: {
      findUnique: async (args: { where: { personId_tourKey: { personId: string; tourKey: string } } }) => {
        return (
          progress.find(
            (p) =>
              p.personId === args.where.personId_tourKey.personId &&
              p.tourKey === args.where.personId_tourKey.tourKey,
          ) ?? null
        );
      },
      upsert: async (args: {
        where: { personId_tourKey: { personId: string; tourKey: string } };
        create: Partial<FakeProgress> & { personId: string; tourKey: string };
        update: Partial<FakeProgress>;
      }): Promise<FakeProgress> => {
        const existing = progress.find(
          (p) =>
            p.personId === args.where.personId_tourKey.personId &&
            p.tourKey === args.where.personId_tourKey.tourKey,
        );
        if (existing) {
          Object.assign(existing, args.update, { updatedAt: new Date() });
          return existing;
        }
        const row: FakeProgress = {
          personId: args.create.personId,
          tourKey: args.create.tourKey,
          completedSteps: args.create.completedSteps ?? [],
          dismissedAt: args.create.dismissedAt ?? null,
          completedAt: args.create.completedAt ?? null,
          updatedAt: new Date(),
        };
        progress.push(row);
        return row;
      },
    },
  } as unknown as PrismaService;

  return { prisma, state: { articles, tips, feedback, progress } };
}

describe('HelpService', () => {
  it('listPublishedArticles — only returns published, non-archived rows', async () => {
    const { prisma } = buildPrisma({
      articles: [
        article({ id: 'a1', slug: 'live', isPublished: true }),
        article({ id: 'a2', slug: 'draft', isPublished: false }),
        article({ id: 'a3', slug: 'archived', isPublished: true, archivedAt: new Date() }),
      ],
    });
    const svc = new HelpService(prisma);
    const out = await svc.listPublishedArticles({});
    expect(out.map((a) => a.slug)).toEqual(['live']);
  });

  it('listPublishedArticles — filters by tag and search', async () => {
    const { prisma } = buildPrisma({
      articles: [
        article({ id: 'a1', slug: 'staffing-101', title: 'Staffing 101', tags: ['staffing'] }),
        article({ id: 'a2', slug: 'budgets-101', title: 'Budgets 101', tags: ['finance'] }),
      ],
    });
    const svc = new HelpService(prisma);
    const byTag = await svc.listPublishedArticles({ tag: 'staffing' });
    expect(byTag).toHaveLength(1);
    expect(byTag[0].slug).toBe('staffing-101');
    const bySearch = await svc.listPublishedArticles({ search: 'budget' });
    expect(bySearch).toHaveLength(1);
    expect(bySearch[0].slug).toBe('budgets-101');
  });

  it('getArticleBySlug — returns the published article and 404s otherwise', async () => {
    const { prisma } = buildPrisma({
      articles: [article({ id: 'a1', slug: 'live', isPublished: true })],
    });
    const svc = new HelpService(prisma);
    const out = await svc.getArticleBySlug('live');
    expect(out.slug).toBe('live');
    await expect(svc.getArticleBySlug('missing')).rejects.toThrow(NotFoundException);
  });

  it('createArticle — rejects duplicate slugs with 409', async () => {
    const { prisma } = buildPrisma({});
    const svc = new HelpService(prisma);
    await svc.createArticle('actor-1', {
      slug: 'one',
      title: 'One',
      summary: 's',
      body: 'b',
    });
    await expect(
      svc.createArticle('actor-1', { slug: 'one', title: 'Two', summary: 's', body: 'b' }),
    ).rejects.toThrow(ConflictException);
  });

  it('updateArticle — applies isPublished and archive together', async () => {
    const { prisma, state } = buildPrisma({
      articles: [article({ id: 'a1', slug: 'live', isPublished: true })],
    });
    const svc = new HelpService(prisma);
    const out = await svc.updateArticle('a1', { isPublished: false, archive: true });
    expect(out.isPublished).toBe(false);
    expect(state.articles[0].archivedAt).not.toBeNull();
  });

  it('listTipsForRoute — returns active tips sorted by displayOrder', async () => {
    const { prisma } = buildPrisma({
      tips: [
        tip({ id: 't1', key: 'k1', routePath: '/staffing', displayOrder: 200 }),
        tip({ id: 't2', key: 'k2', routePath: '/staffing', displayOrder: 100 }),
        tip({ id: 't3', key: 'k3', routePath: '/people', displayOrder: 100 }),
        tip({ id: 't4', key: 'k4', routePath: '/staffing', displayOrder: 50, isActive: false }),
      ],
    });
    const svc = new HelpService(prisma);
    const out = await svc.listTipsForRoute('/staffing');
    expect(out.map((t) => t.key)).toEqual(['k2', 'k1']);
  });

  it('submitFeedback — 404s when the article is missing or archived', async () => {
    const { prisma } = buildPrisma({
      articles: [article({ id: 'a1', slug: 'archived', archivedAt: new Date() })],
    });
    const svc = new HelpService(prisma);
    await expect(
      svc.submitFeedback('a1', 'actor-1', { wasHelpful: true }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      svc.submitFeedback('does-not-exist', 'actor-1', { wasHelpful: true }),
    ).rejects.toThrow(NotFoundException);
  });

  it('submitFeedback — captures actor + comment when present', async () => {
    const { prisma, state } = buildPrisma({
      articles: [article({ id: 'a1', slug: 'live', isPublished: true })],
    });
    const svc = new HelpService(prisma);
    const out = await svc.submitFeedback('a1', 'actor-1', {
      wasHelpful: false,
      comment: 'Needs an example',
    });
    expect(out.wasHelpful).toBe(false);
    expect(out.actorPersonId).toBe('actor-1');
    expect(out.comment).toBe('Needs an example');
    expect(state.feedback).toHaveLength(1);
  });

  it('upsertTourProgress — creates a row on first call, updates on second', async () => {
    const { prisma, state } = buildPrisma({});
    const svc = new HelpService(prisma);
    const first = await svc.upsertTourProgress('p1', 'staffing-desk-101', {
      completedSteps: ['intro'],
    });
    expect(first.completedSteps).toEqual(['intro']);
    expect(state.progress).toHaveLength(1);

    const second = await svc.upsertTourProgress('p1', 'staffing-desk-101', {
      completedSteps: ['intro', 'cell-drop'],
    });
    expect(second.completedSteps).toEqual(['intro', 'cell-drop']);
    expect(state.progress).toHaveLength(1); // single row, not duplicated
  });

  it('upsertTourProgress — sets completedAt and dismissedAt timestamps', async () => {
    const { prisma } = buildPrisma({});
    const svc = new HelpService(prisma);
    const completed = await svc.upsertTourProgress('p1', 'tour-a', { completed: true });
    expect(completed.completedAt).not.toBeNull();
    expect(completed.dismissedAt).toBeNull();
    const dismissed = await svc.upsertTourProgress('p2', 'tour-a', { dismissed: true });
    expect(dismissed.dismissedAt).not.toBeNull();
    expect(dismissed.completedAt).toBeNull();
  });

  it('getTourProgress — returns null when no row exists', async () => {
    const { prisma } = buildPrisma({});
    const svc = new HelpService(prisma);
    const out = await svc.getTourProgress('p1', 'unknown-tour');
    expect(out).toBeNull();
  });
});

function article(props: Partial<FakeArticle> & { id: string; slug: string }): FakeArticle {
  return {
    title: props.slug,
    summary: 'summary',
    body: 'body',
    tags: [],
    isPublished: true,
    authorPersonId: null,
    author: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    ...props,
  };
}

function tip(props: Partial<FakeTip> & { id: string; key: string; routePath: string }): FakeTip {
  return {
    title: props.key,
    body: 'body',
    articleId: null,
    displayOrder: 100,
    isActive: true,
    archivedAt: null,
    createdAt: new Date(),
    ...props,
  };
}
