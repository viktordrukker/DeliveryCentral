import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, FormField, SearchInput } from '@/components/ds';
import { useTourTrigger } from '@/components/onboarding/OnboardingTourProvider';
import { listPublicArticles, type HelpArticle } from '@/lib/api/help';

// HD-9 Chunk 3 — public Help article list. All 7 authenticated roles can
// access. Reuses the existing public BE endpoint (returns published-only).
// Tag filter chips are derived client-side from the response so adding
// new tags doesn't require a schema or BE change.

export function HelpArticleListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState<string>(searchParams.get('q') ?? '');
  const activeTag = searchParams.get('tag') ?? '';
  const { startWelcomeTour, alreadySeenWelcome } = useTourTrigger();

  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever the URL-scoped search/tag changes. The SearchInput
  // debounce (300ms) handles per-keystroke rate-limiting upstream of this.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void listPublicArticles({
      search: search.trim() || undefined,
      tag: activeTag || undefined,
    })
      .then((rows) => {
        if (!active) return;
        setArticles(rows);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load Help articles.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, activeTag]);

  // Persist the search term in the URL so deep links + Back button work
  // (Law 5 — filter persistence via URL).
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (search.trim()) params.set('q', search.trim());
    else params.delete('q');
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
    // Only react to local search changes; tag changes flow the other way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Derive available tags client-side from the response.
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of articles) {
      for (const t of a.tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [articles]);

  function setTag(next: string): void {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('tag', next);
    else params.delete('tag');
    setSearchParams(params, { replace: true });
  }

  return (
    <PageContainer testId="help-article-list-page">
      <PageHeader
        eyebrow="Help"
        subtitle="Browse Help articles published by your platform admins. Use search or pick a tag to narrow."
        title="Help Center"
        actions={
          <Button variant="secondary" type="button" onClick={startWelcomeTour}>
            {alreadySeenWelcome ? 'Replay welcome tour' : 'Take the welcome tour'}
          </Button>
        }
      />

      <div
        style={{
          alignItems: 'flex-end',
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
            debounceMs={300}
            placeholder="Search title or summary…"
          />
        </FormField>
        {availableTags.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
            <Button
              size="sm"
              variant={activeTag === '' ? 'primary' : 'secondary'}
              type="button"
              onClick={() => setTag('')}
            >
              All
            </Button>
            {availableTags.map((tag) => (
              <Button
                key={tag}
                size="sm"
                variant={activeTag === tag ? 'primary' : 'secondary'}
                type="button"
                onClick={() => setTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {loading && articles.length === 0 ? (
        <LoadingState label="Loading articles…" skeletonType="table" variant="skeleton" />
      ) : null}
      {error ? <ErrorState description={error} /> : null}

      {!loading && !error && articles.length === 0 ? (
        <SectionCard>
          <EmptyState
            description={
              search.trim() || activeTag
                ? 'No published Help articles match your filters. Clear them to see all articles.'
                : 'No published Help articles yet. Check back later — your admin team is curating content.'
            }
            title="No articles"
            actions={
              search.trim() || activeTag
                ? [
                    {
                      label: 'Clear filters',
                      variant: 'primary',
                      onClick: () => {
                        setSearch('');
                        setTag('');
                      },
                    },
                  ]
                : undefined
            }
          />
        </SectionCard>
      ) : null}

      {!loading && !error && articles.length > 0 ? (
        <SectionCard title={`Articles (${articles.length})`}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {articles.map((a) => (
              <li
                key={a.id}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  padding: 'var(--space-3) 0',
                }}
              >
                <Link
                  to={`/help/${encodeURIComponent(a.slug)}`}
                  style={{
                    color: 'var(--color-text)',
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  <div
                    style={{
                      alignItems: 'baseline',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--space-2)',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{a.title}</span>
                    {a.tags.length > 0 ? (
                      <span
                        style={{
                          color: 'var(--color-text-muted)',
                          fontSize: 11,
                        }}
                      >
                        {a.tags.join(' · ')}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{
                      color: 'var(--color-text-muted)',
                      fontSize: 13,
                    }}
                  >
                    {a.summary}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
