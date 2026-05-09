import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import {
  archiveHelpArticle,
  createHelpArticle,
  fetchAdminArticle,
  listAdminArticles,
  updateHelpArticle,
  type HelpArticle,
} from '@/lib/api/help';
import { HelpAdminPage } from './HelpAdminPage';

vi.mock('@/lib/api/help', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/help')>();
  return {
    ...actual,
    listAdminArticles: vi.fn(),
    fetchAdminArticle: vi.fn(),
    createHelpArticle: vi.fn(),
    updateHelpArticle: vi.fn(),
    archiveHelpArticle: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedList = vi.mocked(listAdminArticles);
const mockedFetch = vi.mocked(fetchAdminArticle);
const mockedCreate = vi.mocked(createHelpArticle);
const mockedUpdate = vi.mocked(updateHelpArticle);
const mockedArchive = vi.mocked(archiveHelpArticle);

const draft: HelpArticle = {
  id: 'a-1',
  slug: 'getting-started',
  title: 'Getting started',
  summary: 'A short tour of the platform.',
  body: '# Hello',
  tags: ['onboarding'],
  isPublished: false,
  authorPersonId: 'admin-1',
  authorDisplayName: 'Admin User',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
};

const published: HelpArticle = {
  ...draft,
  id: 'a-2',
  slug: 'how-to-book',
  title: 'How to book an assignment',
  summary: 'Walkthrough of the staffing flow.',
  isPublished: true,
  tags: ['staffing', 'how-to'],
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <HelpAdminPage />
    </MemoryRouter>,
  );
}

describe('HelpAdminPage', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedFetch.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedArchive.mockReset();
  });

  it('lists articles with title, slug, tag chips, and status badges', async () => {
    mockedList.mockResolvedValue([draft, published]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Getting started')).toBeInTheDocument();
    });
    expect(screen.getByText('How to book an assignment')).toBeInTheDocument();
    // Slugs render under titles.
    expect(screen.getByText('getting-started')).toBeInTheDocument();
    expect(screen.getByText('how-to-book')).toBeInTheDocument();
    // Status badges visible (draft + published).
    expect(screen.getByText(/Draft/i)).toBeInTheDocument();
    expect(screen.getByText(/Published/i)).toBeInTheDocument();
  });

  it('shows the EmptyState with a "Create article" CTA when there are no articles', async () => {
    mockedList.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No articles/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Create article/i })).toBeInTheDocument();
  });

  it('toggles publish state on a draft via the Publish action', async () => {
    mockedList.mockResolvedValue([draft]);
    mockedUpdate.mockResolvedValue({ ...draft, isPublished: true });
    renderPage();

    await waitFor(() => expect(screen.getByText('Getting started')).toBeInTheDocument());
    const table = screen.getByRole('table');
    await userEvent.click(within(table).getByRole('button', { name: /Publish/i }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith('a-1', { isPublished: true });
    });
  });

  it('archives an article via the confirmation dialog', async () => {
    mockedList.mockResolvedValue([draft]);
    mockedArchive.mockResolvedValue({ ...draft });
    renderPage();

    await waitFor(() => expect(screen.getByText('Getting started')).toBeInTheDocument());
    const table = screen.getByRole('table');
    await userEvent.click(within(table).getByRole('button', { name: /Archive/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /Archive/i }));

    await waitFor(() => {
      expect(mockedArchive).toHaveBeenCalledWith('a-1');
    });
  });
});
