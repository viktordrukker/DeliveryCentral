import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useTitleBarActions } from '@/app/title-bar-context';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { TipTrigger } from '@/components/common/TipBalloon';
import { ExportButton } from '@/components/common/ExportButton';
import { CasesPanel } from '@/components/cases/CasesPanel';
import { useCasesList } from '@/features/cases/useCasesList';
import { Button } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';

const PENDING_STATUSES = new Set(['OPEN', 'IN_PROGRESS']);

export function CasesPage(): JSX.Element {
  const navigate = useNavigate();
  const { setActions } = useTitleBarActions();
  // Title-bar export pulls the same hook data the panel renders; safe because
  // useCasesList is referentially-stable across hook callers in this tree.
  const state = useCasesList();

  useEffect(() => {
    setActions(
      <>
        <ExportButton
          data={state.data}
          columns={[
            { key: 'caseNumber', label: 'Case #' },
            { key: 'caseTypeDisplayName', label: 'Type' },
            { key: 'subjectPersonName', label: 'Subject' },
            { key: 'ownerPersonName', label: 'Owner' },
            { key: 'status', label: 'Status' },
            { key: 'summary', label: 'Summary' },
            { key: 'openedAt', label: 'Opened' },
            { key: 'closedAt', label: 'Closed' },
          ]}
          filename="cases"
        />
        <Button variant="primary" onClick={() => navigate('/cases/new')} type="button">
          Create case
        </Button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, navigate, state.data]);

  // ds-trunk-185 — page chrome is dsRefresh-gated so the legacy surface is unchanged.
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');

  if (dsRefreshEnabled) {
    const openCount = state.data.filter((c) => PENDING_STATUSES.has(c.status)).length;
    // SLA fields are not yet exposed on CaseRecord, so the SLA tiles render
    // placeholder values until the case list payload includes SLA status
    // (tracked alongside the deferred CaseInspector follow-up).
    const breachedCount = 0;
    const dueTodayCount = 0;

    return (
      <PageContainer testId="cases-page" viewport>
        <PageHeader
          eyebrow="Operational Queue"
          title="Cases"
          subtitle="Triage open cases, watch SLA aging, and drive each one to resolution."
          breadcrumbs={[{ href: '/', label: 'Home' }, { label: 'Cases' }]}
        />

        <div className="kpi-strip" aria-label="Cases queue summary">
          <Link
            className="kpi-strip__item"
            to="/cases"
            style={{ borderLeft: `3px solid ${openCount > 0 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}
          >
            <span className="kpi-strip__value">{openCount}</span>
            <span className="kpi-strip__label">Open cases</span>
          </Link>
          <Link
            className="kpi-strip__item"
            to="/cases?slaStatus=BREACHED"
            style={{ borderLeft: `3px solid ${breachedCount > 0 ? 'var(--color-status-danger)' : 'var(--color-border-strong)'}`, opacity: breachedCount > 0 ? 1 : 0.6 }}
          >
            <span className="kpi-strip__value">{breachedCount}</span>
            <span className="kpi-strip__label">Breached SLA</span>
          </Link>
          <Link
            className="kpi-strip__item"
            to="/cases?slaStatus=DUE_TODAY"
            style={{ borderLeft: `3px solid ${dueTodayCount > 0 ? 'var(--color-status-warning)' : 'var(--color-border-strong)'}`, opacity: dueTodayCount > 0 ? 1 : 0.6 }}
          >
            <span className="kpi-strip__value">{dueTodayCount}</span>
            <span className="kpi-strip__label">Due today</span>
          </Link>
        </div>

        <CasesPanel />
      </PageContainer>
    );
  }

  return (
    <PageContainer testId="cases-page" viewport>
      <CasesPanel />
    </PageContainer>
  );
}
