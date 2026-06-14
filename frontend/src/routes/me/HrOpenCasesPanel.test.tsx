import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { fetchCases } from '@/lib/api/cases';
import { HrOpenCasesPanel } from './HrOpenCasesPanel';

vi.mock('@/lib/api/cases', () => ({ fetchCases: vi.fn() }));
const mockFetch = vi.mocked(fetchCases);

function row(over: Record<string, unknown>) {
  return {
    caseNumber: 'C', caseTypeDisplayName: 'X', caseTypeKey: 'PERFORMANCE', id: Math.random().toString(),
    openedAt: '2026-01-01', ownerPersonId: 'o', participants: [], status: 'OPEN',
    subjectPersonId: 's', ...over,
  };
}

describe('HrOpenCasesPanel (#712 on /me workspace)', () => {
  it('renders open-case subject names as /people links (not UUIDs); excludes closed', async () => {
    mockFetch.mockResolvedValue({ items: [
      row({ status: 'OPEN', subjectPersonId: 'aaaa1111-2222-3333-4444-555566667777', subjectPersonName: 'Sofia Ellis' }),
      row({ status: 'IN_PROGRESS', subjectPersonId: 'bbbb1111-2222-3333-4444-555566667777', subjectPersonName: 'Liam Davis' }),
      row({ status: 'CLOSED', subjectPersonId: 'cccc1111-2222-3333-4444-555566667777', subjectPersonName: 'Closed Person' }),
    ] } as never);

    render(<MemoryRouter><HrOpenCasesPanel /></MemoryRouter>);

    const link = await screen.findByRole('link', { name: 'Sofia Ellis' });
    expect(link).toHaveAttribute('href', '/people/aaaa1111-2222-3333-4444-555566667777');
    expect(screen.getByRole('link', { name: 'Liam Davis' })).toBeInTheDocument();
    expect(screen.queryByText('Closed Person')).not.toBeInTheDocument();
    expect(screen.queryByText(/aaaa1111/)).not.toBeInTheDocument();
    expect(screen.getByText(/People with Open Cases \(2\)/)).toBeInTheDocument();
  });

  it('renders nothing when there are no open cases', async () => {
    mockFetch.mockResolvedValue({ items: [row({ status: 'CLOSED' })] } as never);
    const { container } = render(<MemoryRouter><HrOpenCasesPanel /></MemoryRouter>);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
