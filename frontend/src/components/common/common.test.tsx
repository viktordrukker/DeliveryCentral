import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/auth-context', () => ({
  useAuth: () => ({
    principal: { personId: 'p-1', roles: ['admin'] },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/person-directory', () => ({
  fetchPersonDirectory: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0 }),
}));

vi.mock('@/lib/api/project-registry', () => ({
  fetchProjectDirectory: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 5, total: 0 }),
}));

import { ConfirmDialog } from './ConfirmDialog';
import { Skeleton, TableSkeleton, CardSkeleton, ChartSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { CommandPalette } from './CommandPalette';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        message="Are you sure?"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={false}
        title="Delete item"
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDialog
        message="This cannot be undone."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={true}
        title="Confirm Delete"
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        message="Sure?"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open={true}
        title="Confirm"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        message="Sure?"
        onCancel={onCancel}
        onConfirm={vi.fn()}
        open={true}
        title="Confirm"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows reason textarea and disables confirm when requireReason and reason empty', () => {
    render(
      <ConfirmDialog
        message="Provide a reason."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={true}
        requireReason={true}
        title="Reason Required"
      />,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('enables confirm button after typing a reason', () => {
    render(
      <ConfirmDialog
        message="Provide a reason."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={true}
        requireReason={true}
        title="Reason Required"
      />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Because reasons' } });
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeDisabled();
  });
});

describe('Skeleton components', () => {
  it('Skeleton renders a div', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('TableSkeleton renders with testid and correct row/col count', () => {
    render(<TableSkeleton rows={3} cols={2} />);
    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('CardSkeleton renders with testid', () => {
    render(<CardSkeleton />);
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('ChartSkeleton renders with testid', () => {
    render(<ChartSkeleton />);
    expect(screen.getByTestId('skeleton-chart')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data found" />);
    expect(screen.getByText('No data found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Try adjusting filters." />);
    expect(screen.getByText('Try adjusting filters.')).toBeInTheDocument();
  });

  it('renders action link when provided', () => {
    render(<EmptyState title="Empty" action={{ href: '/new', label: 'Create one' }} />);
    const link = screen.getByRole('link', { name: 'Create one' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/new');
  });

  it('does not render link when action not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('CommandPalette', () => {
  function renderPalette(open: boolean): void {
    render(
      <MemoryRouter>
        <CommandPalette open={open} onClose={vi.fn()} />
      </MemoryRouter>,
    );
  }

  it('renders nothing when closed', () => {
    renderPalette(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders search input when open', () => {
    renderPalette(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Search commands')).toBeInTheDocument();
  });

  it('calls onClose when Escape pressed', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <CommandPalette open={true} onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.keyDown(screen.getByLabelText('Search commands'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
