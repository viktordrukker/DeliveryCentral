import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { HrLifecycleTab } from './LifecycleTab';

describe('HrLifecycleTab — open-case subjects (SC-7)', () => {
  it('renders the subject name (not a UUID) and links to the person', () => {
    render(
      <MemoryRouter>
        <HrLifecycleTab
          atRisk={[]}
          openCaseSubjects={[{ personId: '11111111-2222-3333-4444-555555555555', name: 'Alice Smith' }]}
          recentJoinerActivity={[]}
          recentDeactivationActivity={[]}
          onPersonClick={() => undefined}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Alice Smith' });
    expect(link).toHaveAttribute('href', '/people/11111111-2222-3333-4444-555555555555');
    // The raw UUID (or its truncation) must never appear as visible text.
    expect(screen.queryByText(/11111111/)).not.toBeInTheDocument();
  });
});
