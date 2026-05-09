import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, Textarea } from '@/components/ds';
import { MarkdownBody } from '@/components/help/MarkdownBody';
import { ApiError } from '@/lib/api/http-client';
import {
  fetchPublicArticleBySlug,
  submitHelpFeedback,
  type HelpArticle,
} from '@/lib/api/help';

// HD-9 Chunk 4 — public Help article detail at /help/:slug. Renders
// the markdown body via MarkdownBody (sanitized; safe-by-default per
// react-markdown + url/element guards). Feedback widget posts to
// `submitHelpFeedback`. 404 path renders an EmptyState that links back
// to the list.

type FeedbackState = 'idle' | 'submitting' | 'submitted';

export function HelpArticleDetailPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();

  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Feedback widget state.
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('idle');

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setNotFound(false);
    void fetchPublicArticleBySlug(slug)
      .then((row) => {
        if (!active) return;
        setArticle(row);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load article.');
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  async function handleVerdict(wasHelpful: boolean): Promise<void> {
    if (!article) return;
    setVerdict(wasHelpful);
  }

  async function handleSubmitFeedback(): Promise<void> {
    if (!article || verdict === null) return;
    setFeedbackState('submitting');
    try {
      await submitHelpFeedback(article.id, {
        wasHelpful: verdict,
        comment: comment.trim() || undefined,
      });
      setFeedbackState('submitted');
      toast.success('Thanks for the feedback.');
    } catch (e: unknown) {
      setFeedbackState('idle');
      toast.error(e instanceof Error ? e.message : 'Failed to submit feedback.');
    }
  }

  if (loading)
    return (
      <PageContainer testId="help-article-detail-page">
        <PageHeader eyebrow="Help" title="Loading…" />
        <LoadingState label="Loading article…" skeletonType="detail" variant="skeleton" />
      </PageContainer>
    );

  if (notFound)
    return (
      <PageContainer testId="help-article-detail-page">
        <PageHeader eyebrow="Help" title="Article not found" />
        <SectionCard>
          <EmptyState
            description={`We couldn't find a published Help article at "${slug ?? ''}". It may have been archived or unpublished. Browse the article list to find what you need.`}
            title="Article not found"
            actions={[{ label: 'Back to Help Center', href: '/help', variant: 'primary' }]}
          />
        </SectionCard>
      </PageContainer>
    );

  if (error)
    return (
      <PageContainer testId="help-article-detail-page">
        <PageHeader eyebrow="Help" title="Help" />
        <ErrorState description={error} />
      </PageContainer>
    );

  if (!article)
    return (
      <PageContainer testId="help-article-detail-page">
        <PageHeader eyebrow="Help" title="Help" />
      </PageContainer>
    );

  return (
    <PageContainer testId="help-article-detail-page">
      <PageHeader
        eyebrow="Help"
        subtitle={article.summary}
        title={article.title}
      />

      <div
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 12,
          marginBottom: 'var(--space-3)',
        }}
      >
        {article.authorDisplayName ? `By ${article.authorDisplayName} · ` : ''}
        Updated {new Date(article.updatedAt).toISOString().slice(0, 10)}
        {article.tags.length > 0 ? ` · ${article.tags.join(', ')}` : ''}
        {' · '}
        <Link to="/help" style={{ color: 'var(--color-accent)' }}>
          Back to Help Center
        </Link>
      </div>

      <SectionCard>
        <MarkdownBody source={article.body} />
      </SectionCard>

      <SectionCard title="Was this article helpful?">
        {feedbackState === 'submitted' ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, margin: 0 }}>
            Thanks — your feedback was recorded.
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Button
                size="sm"
                variant={verdict === true ? 'primary' : 'secondary'}
                type="button"
                onClick={() => void handleVerdict(true)}
              >
                Yes
              </Button>
              <Button
                size="sm"
                variant={verdict === false ? 'primary' : 'secondary'}
                type="button"
                onClick={() => void handleVerdict(false)}
              >
                No
              </Button>
            </div>
            {verdict !== null ? (
              <>
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    verdict
                      ? 'What worked well? (optional)'
                      : 'What was missing or unclear? (optional)'
                  }
                  style={{ marginBottom: 'var(--space-2)' }}
                />
                <Button
                  variant="primary"
                  type="button"
                  disabled={feedbackState === 'submitting'}
                  onClick={() => void handleSubmitFeedback()}
                >
                  {feedbackState === 'submitting' ? 'Submitting…' : 'Submit feedback'}
                </Button>
              </>
            ) : null}
          </>
        )}
      </SectionCard>
    </PageContainer>
  );
}
