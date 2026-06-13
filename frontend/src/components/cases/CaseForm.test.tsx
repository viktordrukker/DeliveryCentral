import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PersonDirectoryItem } from '@/lib/api/person-directory';
import type { ProjectPosition } from '@/lib/api/project-positions';
import type { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { CaseForm } from './CaseForm';

describe('CaseForm — Related Position label resolution (SC-7)', () => {
  it('renders the assignment option with person + project NAMES, never raw UUIDs', () => {
    // Simulate the BE gap: the positions list omits activePersonName/projectName,
    // so labels must resolve from the loaded directory instead of leaking UUIDs.
    const assignments = [
      { id: 'asn-1', activePersonId: 'usr_abc123', projectId: 'prj_xyz789', role: 'Senior Engineer' },
    ] as unknown as ProjectPosition[];
    const people = [{ id: 'usr_abc123', displayName: 'Alice Smith' }] as unknown as PersonDirectoryItem[];
    const projects = [{ id: 'prj_xyz789', name: 'Atlas ERP' }] as unknown as ProjectDirectoryItem[];

    render(
      <CaseForm
        assignments={assignments}
        errors={{}}
        isSubmitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        people={people}
        projects={projects}
        values={{
          caseTypeKey: 'ONBOARDING',
          ownerPersonId: '',
          relatedAssignmentId: '',
          relatedProjectId: '',
          subjectPersonId: '',
          summary: '',
        }}
      />,
    );

    expect(
      screen.getByRole('option', { name: /Alice Smith -> Atlas ERP · Senior Engineer/ }),
    ).toBeInTheDocument();
    // No raw UUIDs anywhere in the rendered labels.
    expect(screen.queryByText(/usr_abc123|prj_xyz789/)).not.toBeInTheDocument();
  });

  it('falls back to a non-UUID label when the person/project is not in the directory', () => {
    const assignments = [
      { id: 'asn-1', activePersonId: 'usr_unknown', projectId: 'prj_unknown', projectCode: 'PRJ-9', role: 'PM' },
    ] as unknown as ProjectPosition[];

    render(
      <CaseForm
        assignments={assignments}
        errors={{}}
        isSubmitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        people={[]}
        projects={[]}
        values={{
          caseTypeKey: 'ONBOARDING',
          ownerPersonId: '',
          relatedAssignmentId: '',
          relatedProjectId: '',
          subjectPersonId: '',
          summary: '',
        }}
      />,
    );

    // Person → "Unassigned"; project → its code (PRJ-9), never the UUID.
    expect(screen.getByRole('option', { name: /Unassigned -> PRJ-9 · PM/ })).toBeInTheDocument();
    expect(screen.queryByText(/usr_unknown|prj_unknown/)).not.toBeInTheDocument();
  });
});
