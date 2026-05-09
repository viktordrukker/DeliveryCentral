import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchPublicArticleBySlug,
  submitHelpFeedback,
  type HelpArticle,
} from '@/lib/api/help';
import { ApiError } from '@/lib/api/http-client';
import { HelpArticleDetailPage } from './HelpArticleDetailPage';

vi.mock('@/lib/api/help', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/help')>();
  return {
    ...actual,
    fetchPublicArticleBySlug: vi.fn(),
    submitHelpFeedback: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedFetch = vi.mocked(fetchPublicArticleBySlug);
const mockedSubmit = vi.mocked(submitHelpFeedback);

const article: HelpArticle = {
  id: 'a-1',
  slug: 'how-to-book',
  title: 'How to book an assignment',
  summary: 'Walkthrough of the staffing flow.',
  body: '# Step 1\n\nFirst, open the project. Then click *Book*.\n\n- Tip 1\n- Tip 2',
  tags: ['staffing', 'how-to'],
  isPublished: true,
  authorPersonId: 'admin-1',
  authorDisplayName: 'Admin User',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-05T00:00:00Z',
};

function renderPage(slug = 'how-to-book'): void {
  render(
    <MemoryRouter initialEntries={[`/help/${slug}`]}>
      <Routes>
        <Route path="/help/:slug" element={<HelpArticleDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HelpArticleDetailPage', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedSubmit.mockReset();
  });

  it('renders the article title, metadata, and markdown body', async () => {
    mockedFetch.mockResolvedValue(article);
    renderPage();

    // PageHeader renders the article title as <h2>, MarkdownBody renders
    // `# Step 1` as <h1>.
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /How to book an assignment/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Step 1' })).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    // Tag listing in metadata line
    expect(screen.getByText(/staffing, how-to/)).toBeInTheDocument();
  });

  it('shows a 404 EmptyState when the BE returns NotFound', async () => {
    mockedFetch.mockRejectedValue(new ApiError('Not found', 404));
    renderPage('missing');

    // PageHeader uses level 2; EmptyState renders its title as a non-h2.
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: /Article not found/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Back to Help Center/i })).toBeInTheDocument();
  });

  it('submits feedback (👍 + comment) and shows the thanks state', async () => {
    mockedFetch.mockResolvedValue(article);
    mockedSubmit.mockResolvedValue({
      id: 'f-1',
      articleId: 'a-1',
      actorPersonId: null,
      wasHelpful: true,
      comment: 'Great article',
      createdAt: '2026-05-08T00:00:00Z',
    });
    renderPage();

    await waitFor(() => expect(screen.getByText('Step 1')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    const textarea = screen.getByPlaceholderText(/What worked well/i);
    await userEvent.type(textarea, 'Great article');
    await userEvent.click(screen.getByRole('button', { name: /Submit feedback/i }));

    await waitFor(() => {
      expect(mockedSubmit).toHaveBeenCalledWith('a-1', {
        wasHelpful: true,
        comment: 'Great article',
      });
    });
    await waitFor(() => {
      expect(screen.getByText(/Thanks — your feedback was recorded/i)).toBeInTheDocument();
    });
  });
});
