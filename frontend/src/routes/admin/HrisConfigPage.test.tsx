import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import {
  fetchHrisConfig,
  testHrisConnection,
  triggerHrisSync,
  updateHrisConfig,
} from '@/lib/api/hris';

import { HrisConfigPage } from './HrisConfigPage';

vi.mock('@/lib/api/hris', () => ({
  fetchHrisConfig: vi.fn(),
  updateHrisConfig: vi.fn(),
  triggerHrisSync: vi.fn(),
  testHrisConnection: vi.fn(),
}));

const mockedFetchHrisConfig = vi.mocked(fetchHrisConfig);
const mockedUpdateHrisConfig = vi.mocked(updateHrisConfig);
const mockedTriggerHrisSync = vi.mocked(triggerHrisSync);
const mockedTestHrisConnection = vi.mocked(testHrisConnection);

describe('HrisConfigPage — Test Connection (W2-11)', () => {
  beforeEach(() => {
    mockedFetchHrisConfig.mockReset();
    mockedUpdateHrisConfig.mockReset();
    mockedTriggerHrisSync.mockReset();
    mockedTestHrisConnection.mockReset();

    mockedFetchHrisConfig.mockResolvedValue({
      activeAdapter: 'bamboohr',
      bamboohr: { apiKey: 'k', subdomain: 'acme' },
      workday: { tenantUrl: '', clientId: '', clientSecret: '' },
      fieldMapping: {},
    });
  });

  it('renders a Test Connection button when an adapter is active', async () => {
    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Test Connection' }),
    ).toBeInTheDocument();
  });

  it('disables Test Connection when adapter is none', async () => {
    mockedFetchHrisConfig.mockResolvedValue({
      activeAdapter: 'none',
      bamboohr: { apiKey: '', subdomain: '' },
      workday: { tenantUrl: '', clientId: '', clientSecret: '' },
      fieldMapping: {},
    });

    renderPage();

    const btn = await screen.findByRole('button', { name: 'Test Connection' });
    expect(btn).toBeDisabled();
  });

  it('calls testHrisConnection and renders the reachable result with latency', async () => {
    mockedTestHrisConnection.mockResolvedValue({
      adapter: 'bamboohr',
      reachable: true,
      latencyMs: 37,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Test Connection' }),
    );

    await waitFor(() => {
      expect(mockedTestHrisConnection).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByTestId('hris-test-connection-result'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('bamboohr reachable in 37 ms.'),
    ).toBeInTheDocument();
  });

  it('renders the unreachable result with errorMessage when the probe fails', async () => {
    mockedTestHrisConnection.mockResolvedValue({
      adapter: 'bamboohr',
      reachable: false,
      latencyMs: 12,
      errorMessage: 'BambooHR auth rejected',
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Test Connection' }),
    );

    expect(
      await screen.findByTestId('hris-test-connection-result'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('bamboohr unreachable (12 ms).'),
    ).toBeInTheDocument();
    expect(screen.getByText('BambooHR auth rejected')).toBeInTheDocument();
  });
});

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/admin/hris']}>
      <Routes>
        <Route element={<HrisConfigPage />} path="/admin/hris" />
      </Routes>
    </MemoryRouter>,
  );
}
