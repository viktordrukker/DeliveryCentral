import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { listPublicArticles, type HelpArticle } from '@/lib/api/help';
import { HelpArticleListPage } from './HelpArticleListPage';

vi.mock('@/lib/api/help', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/help')>();
  return {
    ...actual,
    listPublicArticles: vi.fn(),
  };
});

const mockedList = vi.mocked(listPublicArticles);

function makeArticle(overrides: Partial<HelpArticle> = {}): HelpArticle {
  return {
    id: 'a-1',
    slug: 'getting-started',
    title: 'Getting started',
    summary: 'A short tour of the platform.',
    body: '# Hello',
    tags: ['onboarding'],
    isPublished: true,
    authorPersonId: 'admin-1',
    authorDisplayName: 'Admin User',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/help']}>
      <HelpArticleListPage />
    </MemoryRouter>,
  );
}

describe('HelpArticleListPage', () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it('renders published articles + tag chips derived from the response', async () => {
    mockedList.mockResolvedValue([
      makeArticle({ id: 'a-1', title: 'Getting started', tags: ['onboarding'] }),
      makeArticle({ id: 'a-2', title: 'How to book', slug: 'how-to-book', tags: ['staffing', 'how-to'] }),
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Getting started')).toBeInTheDocument();
    });
    expect(screen.getByText('How to book')).toBeInTheDocument();
    // Tag chip buttons (one per derived tag + 'All').
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'onboarding' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'staffing' })).toBeInTheDocument();
  });

  it('shows EmptyState (no articles) when the response is empty', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No articles/)).toBeInTheDocument();
    });
    expect(screen.getByText(/admin team is curating/)).toBeInTheDocument();
  });

  it('clicking a tag chip re-fetches with that tag filter', async () => {
    mockedList.mockResolvedValue([
      makeArticle({ id: 'a-1', tags: ['onboarding'] }),
      makeArticle({ id: 'a-2', slug: 'a2', tags: ['staffing'] }),
    ]);
    renderPage();

    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    const onboardingChip = await screen.findByRole('button', { name: 'onboarding' });
    await userEvent.click(onboardingChip);

    await waitFor(() => {
      expect(mockedList).toHaveBeenLastCalledWith({ search: undefined, tag: 'onboarding' });
    });
  });

  it('clears filters via the EmptyState CTA when search yields no results', async () => {
    // First load returns one article so tag chip 'onboarding' is available.
    mockedList.mockResolvedValueOnce([makeArticle({ tags: ['onboarding'] })]);
    // Second load (after the tag click) returns empty.
    mockedList.mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Getting started')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'onboarding' }));

    await waitFor(() => {
      expect(screen.getByText(/No articles/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Clear filters/i })).toBeInTheDocument();
  });
});
