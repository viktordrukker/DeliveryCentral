import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { confirmBulkImport, previewBulkImport } from '@/lib/api/bulk-import';
import { BulkImportPage } from './BulkImportPage';

vi.mock('@/lib/api/bulk-import', () => ({
  confirmBulkImport: vi.fn(),
  previewBulkImport: vi.fn(),
}));

const mockedPreview = vi.mocked(previewBulkImport);
const mockedConfirm = vi.mocked(confirmBulkImport);

const SAMPLE_CSV = 'givenName,familyName,email\nJane,Smith,jane@example.com';

function renderPage(): void {
  render(
    <MemoryRouter>
      <BulkImportPage />
    </MemoryRouter>,
  );
}

async function runImport(failed: { email: string; reason: string }[] = []): Promise<void> {
  mockedPreview.mockResolvedValue({
    invalid: [],
    valid: [{ email: 'jane@example.com', familyName: 'Smith', givenName: 'Jane' }],
  });
  mockedConfirm.mockResolvedValue({
    created: 1,
    failed,
    skipped: 0,
  });
  renderPage();
  const textarea = screen.getByPlaceholderText(/givenName,familyName/);
  await userEvent.type(textarea, SAMPLE_CSV);
  await userEvent.click(screen.getByRole('button', { name: /Validate & Preview/ }));
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /Confirm Import/ })).toBeInTheDocument();
  });
  await userEvent.click(screen.getByRole('button', { name: /Confirm Import/ }));
  await waitFor(() => {
    expect(screen.getByText('Import Complete')).toBeInTheDocument();
  });
}

describe('BulkImportPage — W2-14 polish', () => {
  beforeEach(() => {
    mockedPreview.mockReset();
    mockedConfirm.mockReset();
  });

  it('renders "View imported people" CTA after a successful import', async () => {
    await runImport();

    const link = screen.getByTestId('view-imported-people-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/people');
  });

  it('does not render the error CSV download when there are no failures', async () => {
    await runImport();
    expect(screen.queryByTestId('download-error-csv')).not.toBeInTheDocument();
  });

  it('renders "Download error CSV" when there are failures and triggers a download', async () => {
    const createObjectURL = vi.fn(() => 'blob:fake');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await runImport([
      { email: 'broken@example.com', reason: 'Email already exists' },
      { email: 'comma,user@example.com', reason: 'Something, with comma' },
    ]);

    const button = screen.getByTestId('download-error-csv');
    expect(button).toBeInTheDocument();
    await userEvent.click(button);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');

    clickSpy.mockRestore();
  });
});
