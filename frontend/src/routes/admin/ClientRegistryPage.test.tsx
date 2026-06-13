import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientDto, createClient, fetchClients, updateClient } from '@/lib/api/clients';
import { ClientRegistryPage } from './ClientRegistryPage';

vi.mock('@/lib/api/clients', () => ({
  fetchClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
}));

// PersonSelect fetches the directory internally — stub it for the form.
vi.mock('@/components/common/PersonSelect', () => ({
  PersonSelect: ({ label }: { label: string }) => <div data-testid="person-select">{label}</div>,
}));

const mockFetch = vi.mocked(fetchClients);
const mockCreate = vi.mocked(createClient);
const mockUpdate = vi.mocked(updateClient);

const client = (over: Partial<ClientDto> = {}): ClientDto => ({ ...base(), ...over });
function base(): ClientDto {
  return {
    id: 'cli-1',
    name: 'Acme Bank',
    industry: 'Banking',
    accountManagerPersonId: 'p1',
    accountManagerDisplayName: 'Jane Doe',
    notes: null,
    isActive: true,
    projectCount: 4,
  };
}

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ClientRegistryPage />
    </MemoryRouter>,
  );
}

describe('ClientRegistryPage (EPIC B)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockFetch.mockResolvedValue([client()]);
  });

  it('lists clients with name, industry, account-manager name (not a UUID), and project count', async () => {
    renderPage();
    expect(await screen.findByText('Acme Bank')).toBeInTheDocument();
    expect(screen.getByText('Banking')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    // fetchClients(false) — include inactive so the registry can reactivate them.
    expect(mockFetch).toHaveBeenCalledWith(false);
  });

  it('shows an empty state when there are no clients', async () => {
    mockFetch.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No clients')).toBeInTheDocument();
  });

  it('creates a client through the inline form', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue(
      client({ id: 'cli-2', name: 'New Corp', industry: 'Retail', accountManagerDisplayName: null, projectCount: 0 }),
    );
    renderPage();
    await screen.findByText('Acme Bank');

    await user.click(screen.getByRole('button', { name: 'Add Client' }));
    await user.type(screen.getByLabelText(/Name/), 'New Corp');
    await user.click(screen.getByRole('button', { name: 'Create Client' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Corp' })));
    expect(await screen.findByText('New Corp')).toBeInTheDocument();
  });

  it('toggles a client active → inactive via the row action', async () => {
    const user = userEvent.setup();
    mockUpdate.mockResolvedValue(client({ isActive: false }));
    renderPage();
    await screen.findByText('Acme Bank');

    await user.click(screen.getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('cli-1', { isActive: false }));
  });
});
