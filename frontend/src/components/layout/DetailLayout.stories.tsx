import type { Story } from '@ladle/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { Button } from '@/components/ds';
import { SectionCard } from '@/components/common/SectionCard';

import { DetailLayout } from './DetailLayout';

export default { title: 'DS / Layout / DetailLayout' };

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'documents', label: 'Documents' },
  { id: 'team', label: 'Team' },
  { id: 'budget', label: 'Budget' },
  { id: 'risks', label: 'Risks' },
];

function MockKpiStrip(): JSX.Element {
  return (
    <div className="kpi-strip" aria-label="Key metrics">
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-accent)' }}>
        <span className="kpi-strip__value">ACTIVE</span>
        <span className="kpi-strip__label">Status</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-chart-5)' }}>
        <span className="kpi-strip__value">12</span>
        <span className="kpi-strip__label">Active Staff</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
        <span className="kpi-strip__value">85%</span>
        <span className="kpi-strip__label">Fill Rate</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-warning)' }}>
        <span className="kpi-strip__value">28d</span>
        <span className="kpi-strip__label">Days Remaining</span>
      </div>
    </div>
  );
}

export const Basic: Story = () => {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <MemoryRouter>
      <DetailLayout
        eyebrow="Projects"
        title="Phoenix Migration"
        subtitle="Migration of legacy CRM to the new platform."
        actions={
          <Button variant="primary" size="sm">Edit project</Button>
        }
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <SectionCard title={`${activeTab} content`}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            Slot for the active tab&apos;s content. Each tab is a sibling here.
          </p>
        </SectionCard>
      </DetailLayout>
    </MemoryRouter>
  );
};

export const WithKpiStrip: Story = () => {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <MemoryRouter>
      <DetailLayout
        eyebrow="Projects"
        title="Phoenix Migration"
        subtitle="Migration of legacy CRM to the new platform."
        kpiStrip={<MockKpiStrip />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <SectionCard title={`${activeTab} content`}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            KPI strip rendered between header and tabs. Resize the viewport
            below 640px — the KPI strip reflows to a 2-up grid (DS-5-4).
          </p>
        </SectionCard>
      </DetailLayout>
    </MemoryRouter>
  );
};

export const WithBreadcrumbs: Story = () => {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <MemoryRouter>
      <DetailLayout
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Active' },
          { label: 'Phoenix Migration' },
        ]}
        eyebrow="Projects"
        title="Phoenix Migration"
        kpiStrip={<MockKpiStrip />}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <SectionCard title={`${activeTab} content`}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            Full DetailLayout: breadcrumbs + header + KPI strip + tabs + content.
            Resize below 640px to see the tab bar become a horizontal scroller (DS-5-3).
          </p>
        </SectionCard>
      </DetailLayout>
    </MemoryRouter>
  );
};

export const NoTabs: Story = () => (
  <MemoryRouter>
    <DetailLayout
      eyebrow="People"
      title="Ethan Brooks"
      subtitle="Senior Engineer · Atlas team"
      actions={<Button variant="secondary" size="sm">Edit profile</Button>}
    >
      <SectionCard title="Profile">
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
          DetailLayout without tabs — `tabs` / `activeTab` / `onTabChange`
          omitted. The tab strip is hidden, header + content compose directly.
        </p>
      </SectionCard>
    </DetailLayout>
  </MemoryRouter>
);
