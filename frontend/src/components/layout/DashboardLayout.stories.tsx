import type { Story } from '@ladle/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';
import { DataFreshness } from '@/components/dashboard/DataFreshness';

import { DashboardLayout } from './DashboardLayout';

export default { title: 'DS / Layout / DashboardLayout' };

function MockKpiStrip(): JSX.Element {
  return (
    <div className="kpi-strip" aria-label="Key metrics">
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
        <span className="kpi-strip__value">82%</span>
        <span className="kpi-strip__label">Utilization</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-accent)' }}>
        <span className="kpi-strip__value">42</span>
        <span className="kpi-strip__label">Active Projects</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-chart-5)' }}>
        <span className="kpi-strip__value">120</span>
        <span className="kpi-strip__label">Active Assignments</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-warning)' }}>
        <span className="kpi-strip__value">3</span>
        <span className="kpi-strip__label">Open Issues</span>
      </div>
    </div>
  );
}

function MockHero(): JSX.Element {
  return (
    <div className="dashboard-hero">
      <div className="dashboard-hero__header">
        <div>
          <div className="dashboard-hero__title">Workforce Overview</div>
          <div className="dashboard-hero__subtitle">Headcount &amp; utilization — last 12 weeks</div>
        </div>
      </div>
      <div className="dashboard-hero__chart" style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        [chart placeholder]
      </div>
    </div>
  );
}

export const Basic: Story = () => (
  <MemoryRouter>
    <DashboardLayout>
      <MockKpiStrip />
      <MockHero />
      <SectionCard title="Action items">
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
          Action table goes here.
        </p>
      </SectionCard>
    </DashboardLayout>
  </MemoryRouter>
);

export const WithFreshness: Story = () => {
  const [lastFetch, setLastFetch] = useState(new Date());
  return (
    <MemoryRouter>
      <DashboardLayout
        freshness={
          <DataFreshness lastFetch={lastFetch} onRefresh={() => setLastFetch(new Date())} />
        }
      >
        <MockKpiStrip />
        <MockHero />
      </DashboardLayout>
    </MemoryRouter>
  );
};

export const WithPreludeAndBanners: Story = () => (
  <MemoryRouter>
    <DashboardLayout
      banners={
        <SectionCard>
          <p style={{ margin: 0, fontSize: 12 }}>⚠️ Banner: data may be stale</p>
        </SectionCard>
      }
      prelude={
        <SectionCard title="Onboarding">
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
            Prelude slot — typically `&lt;OnboardingChecklist /&gt;`. Renders above the KPI strip.
          </p>
        </SectionCard>
      }
      freshness={<DataFreshness lastFetch={new Date()} onRefresh={() => undefined} />}
    >
      <MockKpiStrip />
      <MockHero />
    </DashboardLayout>
  </MemoryRouter>
);
