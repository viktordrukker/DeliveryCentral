import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Breadcrumb } from './Breadcrumb';

function renderBreadcrumb(items: Array<{ label: string; href?: string }>): void {
  render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>,
  );
}

describe('Breadcrumb', () => {
  it('renders all labels', () => {
    renderBreadcrumb([
      { label: 'Home', href: '/' },
      { label: 'Projects', href: '/projects' },
      { label: 'My Project' },
    ]);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders intermediate items as links', () => {
    renderBreadcrumb([
      { label: 'Home', href: '/' },
      { label: 'Details' },
    ]);
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders last item without link', () => {
    renderBreadcrumb([
      { label: 'Home', href: '/' },
      { label: 'Current Page' },
    ]);
    expect(screen.queryByRole('link', { name: 'Current Page' })).not.toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('renders separators between items', () => {
    renderBreadcrumb([
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
      { label: 'C' },
    ]);
    const separators = screen.getAllByText('›');
    expect(separators).toHaveLength(2);
  });

  it('renders single item without separator', () => {
    renderBreadcrumb([{ label: 'Only' }]);
    expect(screen.queryByText('›')).not.toBeInTheDocument();
    expect(screen.getByText('Only')).toBeInTheDocument();
  });
});
