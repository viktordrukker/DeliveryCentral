import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import {
  CreateHelpArticleDto,
  CreateHelpFeedbackDto,
  CreateHelpTipDto,
  HelpArticleDto,
  HelpFeedbackDto,
  HelpTipDto,
  OnboardingTourProgressDto,
  UpdateHelpArticleDto,
  UpsertTourProgressDto,
} from './contracts/help.dto';

// F-31 / 20c-11 — drop the 12 `as unknown as XxxRow[]` casts that
// previously lived here. The local row interfaces are now derived
// straight from Prisma's generated client via `GetPayload`, so query
// return types line up with consumers without a coercion step.

const ARTICLE_AUTHOR_INCLUDE = {
  author: { select: { displayName: true } },
} as const;

type ArticleRow = Prisma.HelpArticleGetPayload<{ include: typeof ARTICLE_AUTHOR_INCLUDE }>;
// `TipRow` and `FeedbackRow` were folded into local inference at the
// callsite (no payload-shape variance) and aren't aliased; lint
// complains about unused exports otherwise.
type ProgressRow = Prisma.OnboardingTourProgressGetPayload<Record<string, never>>;

// HD-9 — Help Center service. Centralizes the read + write paths so
// the controllers stay thin. Article lookup is by slug or id; tips
// are scoped to a route path; feedback rows accumulate per article;
// progress rows are upserted per (person, tourKey).
@Injectable()
export class HelpService {
  private readonly logger = new Logger(HelpService.name);

  public constructor(private readonly prisma: PrismaService) {}

  /* ── Articles (read) ──────────────────────────────────────── */

  public async listPublishedArticles(query: {
    search?: string;
    tag?: string;
  }): Promise<HelpArticleDto[]> {
    const rows = await this.prisma.helpArticle.findMany({
      where: {
        isPublished: true,
        archivedAt: null,
        ...(query.tag ? { tags: { has: query.tag } } : {}),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' as const } },
                { summary: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: ARTICLE_AUTHOR_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return rows.map((r) => this.toArticleDto(r));
  }

  public async getArticleBySlug(slug: string): Promise<HelpArticleDto> {
    const row = await this.prisma.helpArticle.findFirst({
      where: { slug, isPublished: true, archivedAt: null },
      include: ARTICLE_AUTHOR_INCLUDE,
    });
    if (!row) throw new NotFoundException(`Help article '${slug}' not found.`);
    return this.toArticleDto(row);
  }

  // HD-9 Chunk 2 — admin-only lister. Surfaces drafts + archived rows
  // alongside published, ordered most-recently-updated-first. Powers
  // the `/admin/help` editor.
  public async listAllArticlesForAdmin(query: {
    search?: string;
    includeArchived?: boolean;
  } = {}): Promise<HelpArticleDto[]> {
    const rows = await this.prisma.helpArticle.findMany({
      where: {
        ...(query.includeArchived ? {} : { archivedAt: null }),
        ...(query.search
          ? {
              OR: [
                { title: { contains: query.search, mode: 'insensitive' as const } },
                { summary: { contains: query.search, mode: 'insensitive' as const } },
                { slug: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: ARTICLE_AUTHOR_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }],
    });
    return rows.map((r) => this.toArticleDto(r));
  }

  // HD-9 Chunk 2 — admin-only get-by-id. Returns drafts + archived for
  // the admin editor; the public `getArticleBySlug` continues to filter.
  public async getArticleByIdForAdmin(id: string): Promise<HelpArticleDto> {
    const row = await this.prisma.helpArticle.findUnique({
      where: { id },
      include: ARTICLE_AUTHOR_INCLUDE,
    });
    if (!row) throw new NotFoundException(`Help article ${id} not found.`);
    return this.toArticleDto(row);
  }

  /* ── Articles (write — admin) ─────────────────────────────── */

  public async createArticle(
    actorId: string | null,
    dto: CreateHelpArticleDto,
  ): Promise<HelpArticleDto> {
    try {
      const row = await this.prisma.helpArticle.create({
        data: {
          slug: dto.slug,
          title: dto.title,
          summary: dto.summary,
          body: dto.body,
          tags: dto.tags ?? [],
          isPublished: dto.isPublished ?? false,
          authorPersonId: actorId,
        },
        include: ARTICLE_AUTHOR_INCLUDE,
      });
      return this.toArticleDto(row);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        throw new ConflictException(`A help article with slug '${dto.slug}' already exists.`);
      }
      throw err;
    }
  }

  public async updateArticle(
    id: string,
    dto: UpdateHelpArticleDto,
  ): Promise<HelpArticleDto> {
    // Existence check only — the row body isn't read, so a `select`
    // is cheaper than fetching all columns plus the author include.
    const existing = await this.prisma.helpArticle.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Help article ${id} not found.`);

    const data: Prisma.HelpArticleUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.summary !== undefined) data.summary = dto.summary;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.archive !== undefined) {
      data.archivedAt = dto.archive ? new Date() : null;
    }

    const row = await this.prisma.helpArticle.update({
      where: { id },
      data,
      include: ARTICLE_AUTHOR_INCLUDE,
    });
    return this.toArticleDto(row);
  }

  /* ── Tips ─────────────────────────────────────────────────── */

  public async listTipsForRoute(routePath: string): Promise<HelpTipDto[]> {
    const rows = await this.prisma.helpTip.findMany({
      where: { routePath, isActive: true, archivedAt: null },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      routePath: r.routePath,
      title: r.title,
      body: r.body,
      articleId: r.articleId,
      displayOrder: r.displayOrder,
    }));
  }

  public async createTip(dto: CreateHelpTipDto): Promise<HelpTipDto> {
    try {
      const row = await this.prisma.helpTip.create({
        data: {
          key: dto.key,
          routePath: dto.routePath,
          title: dto.title,
          body: dto.body,
          articleId: dto.articleId ?? null,
        },
      });
      return {
        id: row.id,
        key: row.key,
        routePath: row.routePath,
        title: row.title,
        body: row.body,
        articleId: row.articleId,
        displayOrder: row.displayOrder,
      };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        throw new ConflictException(`A help tip with key '${dto.key}' already exists.`);
      }
      throw err;
    }
  }

  /* ── Feedback ─────────────────────────────────────────────── */

  public async submitFeedback(
    articleId: string,
    actorId: string | null,
    dto: CreateHelpFeedbackDto,
  ): Promise<HelpFeedbackDto> {
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
      select: { id: true, archivedAt: true },
    });
    if (!article || article.archivedAt) {
      throw new NotFoundException(`Help article ${articleId} not found.`);
    }
    const row = await this.prisma.helpFeedback.create({
      data: {
        articleId,
        actorPersonId: actorId,
        wasHelpful: dto.wasHelpful,
        comment: dto.comment ?? null,
      },
    });
    return {
      id: row.id,
      articleId: row.articleId,
      actorPersonId: row.actorPersonId,
      wasHelpful: row.wasHelpful,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /* ── Onboarding tour progress ─────────────────────────────── */

  public async getTourProgress(
    personId: string,
    tourKey: string,
  ): Promise<OnboardingTourProgressDto | null> {
    const row = await this.prisma.onboardingTourProgress.findUnique({
      where: { personId_tourKey: { personId, tourKey } },
    });
    if (!row) return null;
    return this.toProgressDto(row);
  }

  public async upsertTourProgress(
    personId: string,
    tourKey: string,
    dto: UpsertTourProgressDto,
  ): Promise<OnboardingTourProgressDto> {
    const now = new Date();
    const dismissedAt = dto.dismissed === true ? now : dto.dismissed === false ? null : undefined;
    const completedAt = dto.completed === true ? now : dto.completed === false ? null : undefined;

    const row = await this.prisma.onboardingTourProgress.upsert({
      where: { personId_tourKey: { personId, tourKey } },
      create: {
        personId,
        tourKey,
        completedSteps: dto.completedSteps ?? [],
        dismissedAt: dismissedAt ?? null,
        completedAt: completedAt ?? null,
      },
      update: {
        ...(dto.completedSteps !== undefined ? { completedSteps: dto.completedSteps } : {}),
        ...(dismissedAt !== undefined ? { dismissedAt } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    });
    return this.toProgressDto(row);
  }

  /* ── Mappers ──────────────────────────────────────────────── */

  private toArticleDto(row: ArticleRow): HelpArticleDto {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      body: row.body,
      tags: row.tags,
      isPublished: row.isPublished,
      authorPersonId: row.authorPersonId,
      authorDisplayName: row.author?.displayName ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toProgressDto(row: ProgressRow): OnboardingTourProgressDto {
    // F-20 / D-109 — schema column is nullable (FK SetNull on person
    // delete) but every call site here goes through a
    // `where: { personId_tourKey: ... }` lookup, so the row's
    // `personId` always matches the input personId. The empty-string
    // fallback is a defensive guard against an orphan row sneaking in
    // through a future query path.
    return {
      personId: row.personId ?? '',
      tourKey: row.tourKey,
      completedSteps: row.completedSteps,
      dismissedAt: row.dismissedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
