import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { fetchHrisConfig } from '@/lib/api/hris';

import { HrisConfigPage } from './HrisConfigPage';

vi.mock('@/lib/api/hris', () => ({
  fetchHrisConfig: vi.fn(),
  updateHrisConfig: vi.fn(),
  triggerHrisSync: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchHrisConfig);

const MOCK_CONFIG = {
  activeAdapter: 'none' as const,
  bamboohr: { apiKey: '', subdomain: '' },
  workday: { tenantUrl: '', clientId: '', clientSecret: '' },
  fieldMapping: {},
};

describe('HrisConfigPage — W3-01 grammar conformance', () => {
  it('renders inside the admin tabbed shell with PageContainer + PageHeader + tab strip', async () => {
    mockedFetch.mockResolvedValue(MOCK_CONFIG);
    render(
      <MemoryRouter initialEntries={['/admin/hris']}>
        <HrisConfigPage />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('hris-config-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'HRIS Integration' })).toBeInTheDocument();
    expect(screen.getByTestId('tab-settings')).toBeInTheDocument();
    expect(screen.getByTestId('tab-organization-config')).toBeInTheDocument();
    expect(screen.getByTestId('tab-hris')).toBeInTheDocument();
    expect(screen.getByTestId('tab-webhooks')).toBeInTheDocument();
    expect(screen.getByTestId('tab-hris')).toHaveAttribute('aria-selected', 'true');
  });
});
