import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PageHeader } from './PageHeader';

function renderWith(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('PageHeader', () => {
  // ---- Backwards compatibility for existing 58 call sites ----

  it('renders only the title row when no optional props are supplied', () => {
    const { container } = renderWith(<PageHeader title="Hello" />);
    expect(container.querySelector('.page-header')).not.toBeNull();
    expect(container.querySelector('.page-header__title')?.textContent).toBe('Hello');
    expect(container.querySelector('.breadcrumb')).toBeNull();
    expect(container.querySelector('.tab-bar')).toBeNull();
  });

  it('renders eyebrow + subtitle + filterControls + actions (existing API)', () => {
    renderWith(
      <PageHeader
        eyebrow="Project"
        title="Apollo"
        subtitle="Active engagement"
        filterControls={<span data-testid="fc">f</span>}
        actions={<button>Edit</button>}
      />,
    );
    expect(screen.getByText('Project')).toBeTruthy();
    expect(screen.getByText('Apollo')).toBeTruthy();
    expect(screen.getByTestId('fc')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    const info = document.querySelector('.page-header__info');
    expect(info?.getAttribute('title')).toBe('Active engagement');
  });

  // ---- New optional props ----

  it('renders breadcrumbs when supplied', () => {
    renderWith(
      <PageHeader
        title="Project"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/projects' },
          { label: 'Apollo' },
        ]}
      />,
    );
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('does not render breadcrumb container when array is empty', () => {
    const { container } = renderWith(<PageHeader title="X" breadcrumbs={[]} />);
    expect(container.querySelector('.breadcrumb')).toBeNull();
  });

  it('renders badges inline next to the title', () => {
    renderWith(
      <PageHeader title="Apollo" badges={<span data-testid="badge">Active</span>} />,
    );
    const badge = screen.getByTestId('badge');
    expect(badge).toBeTruthy();
    expect(badge.closest('.page-header__badges')).not.toBeNull();
  });

  it('renders tabs and calls onTabChange', async () => {
    const onTabChange = vi.fn();
    renderWith(
      <PageHeader
        title="Apollo"
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'plan', label: 'Plan' },
        ]}
        activeTab="overview"
        onTabChange={onTabChange}
      />,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Plan' }));
    expect(onTabChange).toHaveBeenCalledWith('plan');
  });

  it('does not render tabs when activeTab + onTabChange are omitted', () => {
    const { container } = renderWith(
      <PageHeader title="X" tabs={[{ id: 'a', label: 'A' }]} />,
    );
    expect(container.querySelector('.tab-bar')).toBeNull();
  });

  it('does not render tabs when array is empty', () => {
    const { container } = renderWith(
      <PageHeader
        title="X"
        tabs={[]}
        activeTab="a"
        onTabChange={() => {}}
      />,
    );
    expect(container.querySelector('.tab-bar')).toBeNull();
  });
});
