import type { Story } from '@ladle/react';
import { useMemo } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { Button, DataView, type Column } from '@/components/ds';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';

import { ListLayout } from './ListLayout';

export default { title: 'DS / Layout / ListLayout' };

interface Project {
  id: string;
  code: string;
  name: string;
  status: 'Active' | 'Closed';
  assignmentCount: number;
}

function generateProjects(count: number): Project[] {
  const out: Project[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `prj-${i}`,
      code: `PRJ-${String(1000 + i)}`,
      name: `Project ${i + 1}`,
      status: i % 4 === 0 ? 'Closed' : 'Active',
      assignmentCount: Math.floor(Math.random() * 20),
    });
  }
  return out;
}

const COLUMNS: Column<Project>[] = [
  { key: 'code', title: 'Code', width: 120, getValue: (r) => r.code },
  { key: 'name', title: 'Project', getValue: (r) => r.name, render: (r) => <strong>{r.name}</strong> },
  { key: 'status', title: 'Status', width: 100, getValue: (r) => r.status },
  { key: 'count', title: 'Assignments', width: 110, align: 'right', getValue: (r) => r.assignmentCount },
];

export const Basic: Story = () => {
  const rows = useMemo(() => generateProjects(20), []);
  return (
    <MemoryRouter>
      <ListLayout>
        <DataView
          columns={COLUMNS}
          rows={rows}
          getRowKey={(r) => r.id}
          variant="compact"
          pageSizeOptions={[20]}
        />
      </ListLayout>
    </MemoryRouter>
  );
};

export const WithHeader: Story = () => {
  const rows = useMemo(() => generateProjects(20), []);
  return (
    <MemoryRouter>
      <ListLayout
        header={
          <PageHeader
            eyebrow="Admin"
            title="System users"
            subtitle="Operator accounts with elevated permissions"
            actions={<Button variant="primary" size="sm">+ New user</Button>}
          />
        }
      >
        <DataView
          columns={COLUMNS}
          rows={rows}
          getRowKey={(r) => r.id}
          variant="compact"
          pageSizeOptions={[20]}
        />
      </ListLayout>
    </MemoryRouter>
  );
};

export const EmptyAndBanners: Story = () => (
  <MemoryRouter>
    <ListLayout
      banners={
        <SectionCard>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
            ⓘ Banners slot — typically loading / error / not-found states.
          </p>
        </SectionCard>
      }
    >
      <DataView
        columns={COLUMNS}
        rows={[]}
        getRowKey={(r) => r.id}
        variant="compact"
        emptyState={
          <EmptyState
            title="No projects yet"
            description="Create your first project to get started."
            action={{ label: 'Create Project', href: '/projects/new' }}
          />
        }
      />
    </ListLayout>
  </MemoryRouter>
);

export const WithFilterBar: Story = () => {
  const rows = useMemo(() => generateProjects(15), []);
  return (
    <MemoryRouter>
      <ListLayout
        filterBar={
          <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
            <Button variant="secondary" size="sm">All</Button>
            <Button variant="primary" size="sm">Active</Button>
            <Button variant="secondary" size="sm">Closed</Button>
          </div>
        }
      >
        <DataView
          columns={COLUMNS}
          rows={rows}
          getRowKey={(r) => r.id}
          variant="compact"
          pageSizeOptions={[20]}
        />
      </ListLayout>
    </MemoryRouter>
  );
};
