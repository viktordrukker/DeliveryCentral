import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { CreatePositionPage } from './CreatePositionPage';

function LocationProbe(): JSX.Element {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function renderAt(url: string): void {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/staffing-requests/new" element={<CreatePositionPage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CreatePositionPage — SoT PR 8 redirect to embedded drawer', () => {
  it('redirects to /projects/:id?openCreatePosition=true when projectId is present', () => {
    renderAt('/staffing-requests/new?projectId=prj-123');
    expect(screen.getByTestId('location').textContent).toBe(
      '/projects/prj-123?openCreatePosition=true',
    );
  });

  it('preserves candidatePersonId on the redirect target', () => {
    renderAt('/staffing-requests/new?projectId=prj-123&candidatePersonId=person-1');
    expect(screen.getByTestId('location').textContent).toBe(
      '/projects/prj-123?openCreatePosition=true&candidatePersonId=person-1',
    );
  });

  it('redirects to /staffing-desk?openCreatePosition=true when projectId is missing', () => {
    renderAt('/staffing-requests/new');
    expect(screen.getByTestId('location').textContent).toBe(
      '/staffing-desk?openCreatePosition=true',
    );
  });

  it('routes bench candidate (no projectId) to /staffing-desk with candidatePersonId', () => {
    renderAt('/staffing-requests/new?candidatePersonId=person-1');
    expect(screen.getByTestId('location').textContent).toBe(
      '/staffing-desk?openCreatePosition=true&candidatePersonId=person-1',
    );
  });
});
