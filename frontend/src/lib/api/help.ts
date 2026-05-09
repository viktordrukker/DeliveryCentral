import { httpGet, httpPatch, httpPost, httpPut } from './http-client';

// HD-9 — admin client for the Help Center MVP.

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  isPublished: boolean;
  authorPersonId: string | null;
  authorDisplayName: string | null;
  createdAt: string;
  updatedAt: string;
  // archivedAt isn't surfaced by the BE DTO; status is inferred from the
  // archived flag on the row, which the admin list endpoint filters on
  // via the `?includeArchived=true` flag.
}

export interface HelpTip {
  id: string;
  key: string;
  routePath: string;
  title: string;
  body: string;
  articleId: string | null;
  displayOrder: number;
}

export interface CreateHelpArticleRequest {
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface UpdateHelpArticleRequest {
  title?: string;
  summary?: string;
  body?: string;
  tags?: string[];
  isPublished?: boolean;
  // Set archive=true to soft-delete (sets archivedAt); archive=false un-archives.
  archive?: boolean;
}

export interface CreateHelpTipRequest {
  key: string;
  routePath: string;
  title: string;
  body: string;
  articleId?: string;
}

// ── Admin endpoints ───────────────────────────────────────────────

export async function listAdminArticles(filter?: {
  search?: string;
  includeArchived?: boolean;
}): Promise<HelpArticle[]> {
  const params = new URLSearchParams();
  if (filter?.search) params.set('q', filter.search);
  if (filter?.includeArchived) params.set('includeArchived', 'true');
  const qs = params.toString();
  return httpGet<HelpArticle[]>(`/admin/help/articles${qs ? `?${qs}` : ''}`);
}

export async function fetchAdminArticle(id: string): Promise<HelpArticle> {
  return httpGet<HelpArticle>(`/admin/help/articles/${id}`);
}

export async function createHelpArticle(
  data: CreateHelpArticleRequest,
): Promise<HelpArticle> {
  return httpPost<HelpArticle, CreateHelpArticleRequest>('/admin/help/articles', data);
}

export async function updateHelpArticle(
  id: string,
  data: UpdateHelpArticleRequest,
): Promise<HelpArticle> {
  return httpPatch<HelpArticle, UpdateHelpArticleRequest>(`/admin/help/articles/${id}`, data);
}

export async function archiveHelpArticle(id: string): Promise<HelpArticle> {
  return httpPatch<HelpArticle, UpdateHelpArticleRequest>(`/admin/help/articles/${id}`, {
    archive: true,
  });
}

export async function createHelpTip(data: CreateHelpTipRequest): Promise<HelpTip> {
  return httpPost<HelpTip, CreateHelpTipRequest>('/admin/help/tips', data);
}

// ── Public read endpoints (used by chunks 3-5; exposed here so the
// admin "View public" affordance can preview) ─────────────────────

export async function listPublicArticles(filter?: {
  search?: string;
  tag?: string;
}): Promise<HelpArticle[]> {
  const params = new URLSearchParams();
  if (filter?.search) params.set('q', filter.search);
  if (filter?.tag) params.set('tag', filter.tag);
  const qs = params.toString();
  return httpGet<HelpArticle[]>(`/help/articles${qs ? `?${qs}` : ''}`);
}

export async function fetchPublicArticleBySlug(slug: string): Promise<HelpArticle> {
  return httpGet<HelpArticle>(`/help/articles/${encodeURIComponent(slug)}`);
}

// HD-9 Chunk 4 — feedback widget on the article detail page.

export interface SubmitHelpFeedbackRequest {
  wasHelpful: boolean;
  comment?: string;
}

export interface HelpFeedback {
  id: string;
  articleId: string;
  actorPersonId: string | null;
  wasHelpful: boolean;
  comment: string | null;
  createdAt: string;
}

export async function submitHelpFeedback(
  articleId: string,
  data: SubmitHelpFeedbackRequest,
): Promise<HelpFeedback> {
  return httpPost<HelpFeedback, SubmitHelpFeedbackRequest>(
    `/help/articles/${encodeURIComponent(articleId)}/feedback`,
    data,
  );
}

// HD-9 Chunk 5 — onboarding tour progress (consumed by chunk 5; defined
// here so the FE help client surfaces the full Help Center API in one
// module). The BE returns a synthetic empty-progress shape when no row
// exists for the (person, tourKey) pair, so callers can treat the
// response uniformly without a 404.

export interface OnboardingTourProgress {
  // Present on a real DB row; absent on the synthetic empty shape.
  personId?: string;
  tourKey: string;
  completedSteps: string[];
  dismissedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string;
}

export interface UpsertTourProgressRequest {
  completedSteps?: string[];
  dismissed?: boolean;
  completed?: boolean;
}

export async function getTourProgress(tourKey: string): Promise<OnboardingTourProgress> {
  return httpGet<OnboardingTourProgress>(
    `/help/onboarding/${encodeURIComponent(tourKey)}`,
  );
}

export async function upsertTourProgress(
  tourKey: string,
  data: UpsertTourProgressRequest,
): Promise<OnboardingTourProgress> {
  return httpPut<OnboardingTourProgress, UpsertTourProgressRequest>(
    `/help/onboarding/${encodeURIComponent(tourKey)}`,
    data,
  );
}

// Tips for a route — consumed by chunk 5's "?" trigger and the
// per-page TipBalloon affordance once it's wired.

export interface HelpTipForRoute {
  id: string;
  key: string;
  routePath: string;
  title: string;
  body: string;
  articleId: string | null;
  displayOrder: number;
}

export async function listTipsForRoute(routePath: string): Promise<HelpTipForRoute[]> {
  return httpGet<HelpTipForRoute[]>(
    `/help/tips?route=${encodeURIComponent(routePath)}`,
  );
}
