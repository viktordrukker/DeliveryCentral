import type { Story } from '@ladle/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { Button, DatePicker, Select } from '@/components/ds';
import { SectionCard } from '@/components/common/SectionCard';

import { AnalysisLayout } from './AnalysisLayout';

export default { title: 'DS / Layout / AnalysisLayout' };

export const Basic: Story = () => {
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-04-29');
  return (
    <MemoryRouter>
      <AnalysisLayout
        eyebrow="Analytics"
        title="Utilization Report"
        subtitle="Available hours vs assigned hours vs actual timesheet hours per person."
        actions={<Button variant="secondary">Export XLSX</Button>}
        filters={
          <>
            <label className="field">
              <span className="field__label">From</span>
              <DatePicker value={from} onValueChange={setFrom} />
            </label>
            <label className="field">
              <span className="field__label">To</span>
              <DatePicker value={to} onValueChange={setTo} />
            </label>
          </>
        }
      >
        <SectionCard title="Utilization by Person — Overview">
          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            [chart placeholder]
          </div>
        </SectionCard>
        <SectionCard title="Detail">
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            Result table goes here.
          </p>
        </SectionCard>
      </AnalysisLayout>
    </MemoryRouter>
  );
};

export const NoFilters: Story = () => (
  <MemoryRouter>
    <AnalysisLayout
      eyebrow="Reports"
      title="Quarterly summary"
      subtitle="Year-to-date snapshot — no filtering needed."
      actions={<Button variant="secondary">Export PDF</Button>}
    >
      <SectionCard title="KPI summary">
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
          Static summary — `filters` slot omitted.
        </p>
      </SectionCard>
    </AnalysisLayout>
  </MemoryRouter>
);

export const ManyFilters: Story = () => {
  const [team, setTeam] = useState('all');
  const [from, setFrom] = useState('2026-01-01');
  const [to, setTo] = useState('2026-04-29');
  return (
    <MemoryRouter>
      <AnalysisLayout
        eyebrow="Analytics"
        title="Project profitability"
        actions={<Button variant="secondary">Export XLSX</Button>}
        filters={
          <>
            <label className="field">
              <span className="field__label">Team</span>
              <Select value={team} onChange={(e) => setTeam(e.target.value)}>
                <option value="all">All teams</option>
                <option value="phoenix">Phoenix</option>
                <option value="atlas">Atlas</option>
                <option value="beacon">Beacon</option>
              </Select>
            </label>
            <label className="field">
              <span className="field__label">From</span>
              <DatePicker value={from} onValueChange={setFrom} />
            </label>
            <label className="field">
              <span className="field__label">To</span>
              <DatePicker value={to} onValueChange={setTo} />
            </label>
          </>
        }
      >
        <SectionCard title="Revenue vs cost">
          <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            [chart placeholder]
          </div>
        </SectionCard>
      </AnalysisLayout>
    </MemoryRouter>
  );
};
