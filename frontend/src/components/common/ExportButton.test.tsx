import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { exportToXlsx } from '@/lib/export';
import { ExportButton } from './ExportButton';

vi.mock('@/lib/export', () => ({
  exportToXlsx: vi.fn().mockResolvedValue(undefined),
}));

interface Row {
  id: string;
  name: string;
  count: number;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Alpha', count: 1 },
  { id: 'b', name: 'Bravo, with comma', count: 2 },
];

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'count', label: 'Count' },
];

describe('ExportButton', () => {
  beforeEach(() => {
    (exportToXlsx as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('disables the trigger when data is empty', () => {
    render(<ExportButton data={[]} columns={COLUMNS} filename="empty" />);
    const button = screen.getByRole('button', { name: /Export/ });
    expect(button).toBeDisabled();
  });

  it('opens a menu with XLSX and CSV options when clicked', async () => {
    const user = userEvent.setup();
    render(<ExportButton data={ROWS} columns={COLUMNS} filename="rows" />);

    await user.click(screen.getByRole('button', { name: /Export/ }));

    expect(await screen.findByRole('menuitem', { name: /Download XLSX/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Download CSV/ })).toBeInTheDocument();
  });

  it('calls exportToXlsx with the labelled rows when XLSX is clicked', async () => {
    const user = userEvent.setup();
    render(<ExportButton data={ROWS} columns={COLUMNS} filename="rows" />);

    await user.click(screen.getByRole('button', { name: /Export/ }));
    await user.click(screen.getByRole('menuitem', { name: /Download XLSX/ }));

    await waitFor(() => expect(exportToXlsx).toHaveBeenCalledTimes(1));
    const [labelledRows, filename] = (
      exportToXlsx as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(filename).toBe('rows');
    // Rows are mapped to column LABELS, not raw keys.
    expect(labelledRows).toEqual([
      { Name: 'Alpha', Count: 1 },
      { Name: 'Bravo, with comma', Count: 2 },
    ]);
  });

  it('triggers a CSV download with quote-escaped values when CSV is clicked', async () => {
    // jsdom doesn't implement createObjectURL/revokeObjectURL by default,
    // and Blob.text() is missing too — capture the constructor args directly.
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    const blobParts: BlobPart[][] = [];
    const RealBlob = global.Blob;
    const BlobSpy = vi.fn().mockImplementation(function (parts: BlobPart[], options?: BlobPropertyBag) {
      blobParts.push(parts);
      return new RealBlob(parts, options);
    });
    global.Blob = BlobSpy as unknown as typeof Blob;

    try {
      const user = userEvent.setup();
      render(<ExportButton data={ROWS} columns={COLUMNS} filename="rows" />);

      await user.click(screen.getByRole('button', { name: /Export/ }));
      await user.click(screen.getByRole('menuitem', { name: /Download CSV/ }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(blobParts).toHaveLength(1);
      const text = blobParts[0].join('');
      expect(text.split('\n')).toHaveLength(3); // header + 2 data rows
      expect(text).toContain('"Bravo, with comma"'); // comma escaped
      expect(text).toContain('Name,Count');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    } finally {
      global.Blob = RealBlob;
    }
  });

  it('uses an accessor function when provided', async () => {
    const user = userEvent.setup();
    render(
      <ExportButton
        data={ROWS}
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'derived', label: 'Doubled', accessor: (r) => r.count * 2 },
        ]}
        filename="rows"
      />,
    );

    await user.click(screen.getByRole('button', { name: /Export/ }));
    await user.click(screen.getByRole('menuitem', { name: /Download XLSX/ }));

    await waitFor(() => expect(exportToXlsx).toHaveBeenCalledTimes(1));
    const [labelledRows] = (exportToXlsx as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(labelledRows).toEqual([
      { Name: 'Alpha', Doubled: 2 },
      { Name: 'Bravo, with comma', Doubled: 4 },
    ]);
  });
});
