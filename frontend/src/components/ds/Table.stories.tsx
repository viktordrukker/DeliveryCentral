import type { Story } from '@ladle/react';

import { Table, type Column } from './Table';

export default { title: 'DS / Tables / Table' };

interface Project { id: string; name: string; status: string; assignments: number; health: number }

const ROWS: Project[] = [
  { id: 'p1', name: 'Phoenix migration', status: 'Active', assignments: 8, health: 82 },
  { id: 'p2', name: 'Atlas integration', status: 'Active', assignments: 12, health: 64 },
  { id: 'p3', name: 'Beacon rollout', status: 'Paused', assignments: 3, health: 45 },
  { id: 'p4', name: 'Cypress retro', status: 'Closed', assignments: 0, health: 92 },
];

const columns: Column<Project>[] = [
  { key: 'name', title: 'Project', render: (r) => <strong>{r.name}</strong>, getValue: (r) => r.name },
  { key: 'status', title: 'Status', getValue: (r) => r.status },
  { key: 'assignments', title: 'Active', align: 'right', getValue: (r) => r.assignments },
  { key: 'health', title: 'Health', align: 'right', getValue: (r) => r.health, render: (r) => `${r.health}%` },
];

export const Default: Story = () => (
  <div style={{ maxWidth: 720 }}>
    <Table columns={columns} rows={ROWS} getRowKey={(r) => r.id} />
  </div>
);

export const Compact: Story = () => (
  <div style={{ maxWidth: 720 }}>
    <Table columns={columns} rows={ROWS} getRowKey={(r) => r.id} variant="compact" />
  </div>
);

export const Embedded: Story = () => (
  <div style={{ maxWidth: 720, padding: 24, background: 'var(--color-surface-alt)' }}>
    <Table columns={columns} rows={ROWS} getRowKey={(r) => r.id} variant="embedded" />
  </div>
);

export const Empty: Story = () => (
  <div style={{ maxWidth: 720 }}>
    <Table
      columns={columns}
      rows={[]}
      getRowKey={(r) => r.id}
      emptyState={<div style={{ color: 'var(--color-text-muted)' }}>No projects yet</div>}
    />
  </div>
);

export const Clickable: Story = () => (
  <div style={{ maxWidth: 720 }}>
    <Table
      columns={columns}
      rows={ROWS}
      getRowKey={(r) => r.id}
      onRowClick={(row) => alert(`Clicked ${row.name}`)}
    />
  </div>
);
