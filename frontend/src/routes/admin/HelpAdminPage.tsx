import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Button,
  FormField,
  FormModal,
  Input,
  SearchInput,
  Switch,
  Table,
  Textarea,
  type Column,
} from '@/components/ds';
import {
  archiveHelpArticle,
  createHelpArticle,
  fetchAdminArticle,
  listAdminArticles,
  updateHelpArticle,
  type CreateHelpArticleRequest,
  type HelpArticle,
  type UpdateHelpArticleRequest,
} from '@/lib/api/help';

interface ArticleFormState {
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string;
  isPublished: boolean;
}

function emptyForm(): ArticleFormState {
  return {
    slug: '',
    title: '',
    summary: '',
    body: '',
    tags: '',
    isPublished: false,
  };
}

function articleToForm(a: HelpArticle): ArticleFormState {
  return {
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    body: a.body,
    tags: a.tags.join(', '),
    isPublished: a.isPublished,
  };
}

function parseTags(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

// Slug validator: lowercase letters, numbers, hyphens, 1-200 chars.
function isValidSlug(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,199}$/.test(s);
}

export function HelpAdminPage(): JSX.Element {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<HelpArticle | null>(null);
  const [form, setForm] = useState<ArticleFormState>(emptyForm);
  const [archivingArticle, setArchivingArticle] = useState<HelpArticle | null>(null);

  async function reload(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const next = await listAdminArticles({
        search: search.trim() || undefined,
        includeArchived,
      });
      setArticles(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load Help articles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload is stable
  }, [includeArchived]);

  // Debounce search to one call per 300ms.
  useEffect(() => {
    const id = setTimeout(() => {
      void reload();
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate(): void {
    setForm(emptyForm());
    setCreating(true);
  }

  async function openEdit(article: HelpArticle): Promise<void> {
    // Fetch fresh body in case the list is stale.
    try {
      const fresh = await fetchAdminArticle(article.id);
      setForm(articleToForm(fresh));
      setEditing(fresh);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load article.');
    }
  }

  function closeForm(): void {
    setCreating(false);
    setEditing(null);
  }

  function validateForm(state: ArticleFormState): string | null {
    if (!state.slug.trim()) return 'Slug is required.';
    if (!isValidSlug(state.slug.trim()))
      return 'Slug must be lowercase letters/numbers/hyphens (1-200 chars), starting with a letter or number.';
    if (!state.title.trim()) return 'Title is required.';
    if (!state.summary.trim()) return 'Summary is required.';
    if (!state.body.trim()) return 'Body is required.';
    return null;
  }

  async function handleCreate(): Promise<void> {
    const err = validateForm(form);
    if (err) {
      toast.error(err);
      throw new Error(err);
    }
    const payload: CreateHelpArticleRequest = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      summary: form.summary.trim(),
      body: form.body,
      tags: parseTags(form.tags),
      isPublished: form.isPublished,
    };
    try {
      await createHelpArticle(payload);
      toast.success(`Article "${form.title.trim()}" created.`);
      closeForm();
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Create failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleUpdate(): Promise<void> {
    if (!editing) return;
    const err = validateForm(form);
    if (err) {
      toast.error(err);
      throw new Error(err);
    }
    // Slug is immutable post-create (used as the public URL key) — drop
    // it from the patch payload.
    const payload: UpdateHelpArticleRequest = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      body: form.body,
      tags: parseTags(form.tags),
      isPublished: form.isPublished,
    };
    try {
      await updateHelpArticle(editing.id, payload);
      toast.success('Article updated.');
      closeForm();
      await reload();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed.';
      toast.error(msg);
      throw e;
    }
  }

  async function handleTogglePublish(article: HelpArticle): Promise<void> {
    try {
      await updateHelpArticle(article.id, { isPublished: !article.isPublished });
      toast.success(article.isPublished ? 'Unpublished.' : 'Published.');
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Toggle failed.');
    }
  }

  async function handleArchive(): Promise<void> {
    if (!archivingArticle) return;
    try {
      await archiveHelpArticle(archivingArticle.id);
      toast.success('Article archived.');
      setArchivingArticle(null);
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Archive failed.');
    }
  }

  const formOpen = creating || editing !== null;

  const columns = useMemo<Column<HelpArticle>[]>(
    () => [
      {
        key: 'title',
        title: 'Title',
        render: (r) => (
          <div>
            <div style={{ fontWeight: 500 }}>{r.title}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{r.slug}</div>
          </div>
        ),
      },
      {
        key: 'summary',
        title: 'Summary',
        render: (r) => (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            {r.summary.length > 110 ? `${r.summary.slice(0, 107)}…` : r.summary}
          </span>
        ),
      },
      {
        key: 'tags',
        title: 'Tags',
        width: 180,
        render: (r) =>
          r.tags.length === 0 ? (
            <span style={{ color: 'var(--color-text-subtle)' }}>—</span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
              {r.tags.join(', ')}
            </span>
          ),
      },
      {
        key: 'author',
        title: 'Author',
        width: 140,
        render: (r) => (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            {r.authorDisplayName ?? '—'}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        width: 100,
        render: (r) =>
          r.isPublished ? (
            <StatusBadge tone="active" variant="chip" label="Published" />
          ) : (
            <StatusBadge tone="warning" variant="chip" label="Draft" />
          ),
      },
      {
        key: 'updatedAt',
        title: 'Updated',
        width: 120,
        render: (r) => (
          <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
            {new Date(r.updatedAt).toISOString().slice(0, 10)}
          </span>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'right',
        width: 280,
        render: (r) => (
          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
            <Button size="sm" variant="secondary" type="button" onClick={() => void handleTogglePublish(r)}>
              {r.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => void openEdit(r)}>
              Edit
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => setArchivingArticle(r)}>
              Archive
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (loading && articles.length === 0)
    return (
      <PageContainer testId="help-admin-page">
        <PageHeader eyebrow="Admin" title="Help Center" />
        <LoadingState label="Loading articles…" skeletonType="table" variant="skeleton" />
      </PageContainer>
    );

  if (error)
    return (
      <PageContainer testId="help-admin-page">
        <PageHeader eyebrow="Admin" title="Help Center" />
        <ErrorState description={error} />
      </PageContainer>
    );

  return (
    <PageContainer testId="help-admin-page">
      <PageHeader
        eyebrow="Admin"
        subtitle="Author and publish Help articles. Drafts are invisible to end users until you toggle Publish."
        title="Help Center"
      />

      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <FormField label="Search">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search title, summary, slug…"
          />
        </FormField>
        <FormField label="Include archived">
          <Switch checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
        </FormField>
        <div style={{ marginLeft: 'auto' }}>
          <Button variant="primary" type="button" onClick={openCreate}>
            + New article
          </Button>
        </div>
      </div>

      {articles.length === 0 ? (
        <SectionCard>
          <EmptyState
            description="No Help articles match the current filters. Author the first article so end users have somewhere to land from the in-app `?` button."
            title="No articles"
            actions={[{ label: 'Create article', onClick: openCreate, variant: 'primary' }]}
          />
        </SectionCard>
      ) : (
        <SectionCard title={`Articles (${articles.length})`}>
          <Table
            variant="compact"
            columns={columns}
            rows={articles}
            getRowKey={(r) => r.id}
          />
        </SectionCard>
      )}

      <FormModal
        open={formOpen}
        onCancel={closeForm}
        onSubmit={creating ? handleCreate : handleUpdate}
        title={creating ? 'New Help article' : 'Edit Help article'}
        submitLabel={creating ? 'Create' : 'Save changes'}
        size="lg"
      >
        <FormField
          label="Slug (URL key)"
          hint="Lowercase letters, numbers, hyphens. Used as the public URL — immutable post-create."
        >
          <Input
            disabled={!creating}
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
            placeholder="getting-started"
          />
        </FormField>
        <FormField label="Title">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </FormField>
        <FormField label="Summary" hint="One-line teaser shown in the article list.">
          <Input
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
          />
        </FormField>
        <FormField label="Body (Markdown)" hint="Supports CommonMark; rendered on the public page.">
          <Textarea
            rows={12}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}
          />
        </FormField>
        <FormField label="Tags" hint="Comma-separated. Used as filters on the public list.">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        </FormField>
        <FormField label="Publish">
          <Switch
            checked={form.isPublished}
            onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
          />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={archivingArticle !== null}
        title="Archive Help article"
        message={
          archivingArticle
            ? `Archive "${archivingArticle.title}"? It will disappear from the public list immediately. Existing deep links will return 404.`
            : ''
        }
        confirmLabel="Archive"
        tone="danger"
        onCancel={() => setArchivingArticle(null)}
        onConfirm={() => void handleArchive()}
      />
    </PageContainer>
  );
}
