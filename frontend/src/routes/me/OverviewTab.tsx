import { useNavigate } from 'react-router-dom';

import { SectionCard } from '@/components/common/SectionCard';

/**
 * /me?tab=overview — placeholder for the redesigned dashboard content.
 *
 * Final design (per the employee-workspace amendment, surface #1) ships in
 * ds-trunk-6: KPI strip (hours / leave / inbox / projects) + hero Timeline
 * (this week's logged time) + upcoming-approvals queue + recent-activity rail.
 *
 * For now this is the minimal "shell is wired" surface — a SectionCard with
 * navigation back to existing dashboard.
 */
export function OverviewTab(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <SectionCard title="Your workspace">
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-body)' }}>
          A unified self-service surface combining your time entries, leave balance, projects, inbox, and account settings.
        </p>
        <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-compact)' }}>
          Tip: switch tabs above. The redesigned dashboard ships in the next phase.
        </p>
      </SectionCard>

      <SectionCard title="Need the legacy dashboard?">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="button button--secondary"
          style={{ padding: '8px 14px' }}
        >
          Go to Workload Overview
        </button>
      </SectionCard>
    </div>
  );
}
