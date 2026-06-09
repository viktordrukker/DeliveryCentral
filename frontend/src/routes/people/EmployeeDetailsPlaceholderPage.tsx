import { useEffect, useState } from 'react';

import { ORG_DATA_CHANGED_EVENT } from '@/features/org-chart/useOrgChart';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { PersonProfilePanel } from '@/components/people/PersonProfilePanel';
import { useAuth } from '@/app/auth-context';
import { useDrilldown } from '@/app/drilldown-context';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { AuditTimeline } from '@/components/common/AuditTimeline';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { TabBar } from '@/components/common/TabBar';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDate, formatDateShort } from '@/lib/format-date';
import { ReportingLineForm } from '@/components/people/ReportingLineForm';
import { PersonSkillsTab } from '@/components/people/PersonSkillsTab';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { useEmployeeDetails } from '@/features/people/useEmployeeDetails';
import { useReportingLineManagement } from '@/features/people/useReportingLineManagement';
import { deactivateEmployee, terminateEmployee } from '@/lib/api/person-directory';
import { showUndoToast } from '@/lib/undo-toast';
import { terminateReportingLine } from '@/lib/api/reporting-lines';
import { fetchBusinessAudit, BusinessAuditRecord } from '@/lib/api/business-audit';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { humanizeEnum, EMPLOYMENT_STATUS_LABELS } from '@/lib/labels';
import { PersonActivityFeed } from '@/components/people/PersonActivityFeed';
import { Person360Tab } from '@/components/people/Person360Tab';
import { HR_DIRECTOR_ADMIN_ROLES, THREESIXTY_REVIEW_ROLES, SKILL_EDIT_ROLES, hasAnyRole } from '@/app/route-manifest';
import { getDashboardPath } from '@/app/role-routing';
// V2-A.11 (2026-05-25) — removed `import LockOutlinedIcon from '@mui/icons-material/LockOutlined'`.
// EmptyState's default icon now renders for the forbidden-profile case.
// EmptyState/LoadingState/ErrorState themselves still depend on MUI (transitively);
// removing that is a macro task tracked separately (39-file footprint).
import { Button, DatePicker } from '@/components/ds';

export function EmployeeDetailsPlaceholderPage(): JSX.Element {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal } = useAuth();
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const canManageLifecycle = hasAnyRole(principal?.roles, HR_DIRECTOR_ADMIN_ROLES);
  const canView360 = hasAnyRole(principal?.roles, THREESIXTY_REVIEW_ROLES);
  const canEditSkills = hasAnyRole(principal?.roles, SKILL_EDIT_ROLES);
  const activeTab = searchParams.get('tab') ?? 'overview';

  const [personAuditEvents, setPersonAuditEvents] = useState<BusinessAuditRecord[]>([]);
  const [personAuditLoading, setPersonAuditLoading] = useState(false);
  const [personAuditError, setPersonAuditError] = useState<string | null>(null);

  function setTab(tab: string): void {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }
  const state = useEmployeeDetails(id);
  const { setCurrentLabel } = useDrilldown();
  const authToken = useStoredApiToken();
  const reportingLine = useReportingLineManagement(id);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deactivateSuccess, setDeactivateSuccess] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [lifecycleStatus, setLifecycleStatus] = useState<string | null>(null);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [confirmTerminateOpen, setConfirmTerminateOpen] = useState(false);

  useEffect(() => {
    if (state.data?.displayName) setCurrentLabel(state.data.displayName);
  }, [state.data?.displayName, setCurrentLabel]);

  // Sync lifecycleStatus from server when the person id changes (handle
  // route-param flips between people). For the same person, do NOT re-sync —
  // local-mutation actions (deactivate/terminate) update lifecycleStatus
  // directly, and re-syncing would clobber the optimistic state before the
  // next reload(). When another user changes status server-side, the explicit
  // state.reload() call (e.g. after refresh button) will refetch + re-trigger.
  useEffect(() => {
    if (state.data?.lifecycleStatus !== undefined) {
      setLifecycleStatus(state.data.lifecycleStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data?.id]);

  useEffect(() => {
    if (!id || activeTab !== 'history') return;
    let active = true;
    setPersonAuditLoading(true);
    setPersonAuditError(null);
    void fetchBusinessAudit({ targetEntityType: 'Person', targetEntityId: id, pageSize: 100 })
      .then((data) => {
        if (!active) return;
        setPersonAuditEvents(data.items);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setPersonAuditError(err instanceof Error ? err.message : 'Failed to load history.');
      })
      .finally(() => {
        if (active) setPersonAuditLoading(false);
      });
    return () => { active = false; };
  }, [id, activeTab]);

  const [terminateError, setTerminateError] = useState<string | null>(null);
  const [terminateSuccess, setTerminateSuccess] = useState<string | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateDate, setTerminateDate] = useState('');
  const [showTerminateForm, setShowTerminateForm] = useState(false);
  const [endRelationshipDate, setEndRelationshipDate] = useState('');
  const [endRelationshipError, setEndRelationshipError] = useState<string | null>(null);
  const [endRelationshipSuccess, setEndRelationshipSuccess] = useState<string | null>(null);
  const [isEndingRelationship, setIsEndingRelationship] = useState(false);

  async function handleDeactivate(): Promise<void> {
    if (!id) {
      return;
    }

    setIsDeactivating(true);
    setDeactivateError(null);
    setDeactivateSuccess(null);

    try {
      const response = await deactivateEmployee(id);
      setLifecycleStatus(response.status);
      setDeactivateSuccess(`Employee ${response.name} deactivated.`);
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      showUndoToast({
        undoActionId: response.undoActionId,
        successMessage: `Employee ${response.name} deactivated.`,
        onUndone: () => {
          setLifecycleStatus('ACTIVE');
          window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
        },
      });
    } catch (error) {
      setDeactivateError(
        error instanceof Error ? error.message : 'Failed to deactivate employee.',
      );
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handleTerminate(): Promise<void> {
    if (!id) {
      return;
    }

    setIsTerminating(true);
    setTerminateError(null);
    setTerminateSuccess(null);

    try {
      const response = await terminateEmployee(id, {
        reason: terminateReason || undefined,
        terminatedAt: terminateDate || undefined,
      });
      setLifecycleStatus(response.status);
      setTerminateSuccess(`Employee ${response.name} terminated.`);
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
      setShowTerminateForm(false);
    } catch (error) {
      setTerminateError(
        error instanceof Error ? error.message : 'Failed to terminate employee.',
      );
    } finally {
      setIsTerminating(false);
    }
  }

  async function handleEndRelationship(reportingLineId: string): Promise<void> {
    if (!endRelationshipDate) {
      setEndRelationshipError('End date is required.');
      return;
    }

    setIsEndingRelationship(true);
    setEndRelationshipError(null);
    setEndRelationshipSuccess(null);

    try {
      await terminateReportingLine(reportingLineId, `${endRelationshipDate}T00:00:00.000Z`);
      setEndRelationshipSuccess('Reporting line ended.');
      setEndRelationshipDate('');
    } catch (error) {
      setEndRelationshipError(
        error instanceof Error ? error.message : 'Failed to end reporting relationship.',
      );
    } finally {
      setIsEndingRelationship(false);
    }
  }

  if (state.forbidden) {
    return (
      <PageContainer testId="employee-details-forbidden">
        <PageHeader
          eyebrow="Access denied"
          title="You don't have access to this person's profile"
          subtitle="Your role only lets you see your own profile and the people you manage. Ask your admin if you need broader visibility."
        />
        <SectionCard>
          <EmptyState
            title="Restricted profile"
            description="Head back to your dashboard or jump to the org chart for the directory view."
            actions={[
              { label: 'Go to my dashboard', href: getDashboardPath(principal?.roles ?? []), variant: 'primary' },
              { label: 'View org chart', href: '/org', variant: 'secondary' },
            ]}
          />
        </SectionCard>
      </PageContainer>
    );
  }

  if (dsRefreshEnabled && id) {
    // V2-A.10 — PersonProfilePanel is the page surface. The legacy chrome
    // (lifecycle actions, audit timeline, 4-tab strip) is preserved as a
    // minimal action header so HR/admin can still deactivate or terminate
    // employees without leaving the canvas profile.
    return (
      <PageContainer testId="employee-details-page">
        <ConfirmDialog
          confirmLabel="Deactivate"
          message="Deactivate this employee? They will lose access to the system but their history is preserved."
          onCancel={() => setConfirmDeactivateOpen(false)}
          onConfirm={() => {
            setConfirmDeactivateOpen(false);
            void handleDeactivate();
          }}
          open={confirmDeactivateOpen}
          title="Deactivate Employee"
        />
        <ConfirmDialog
          confirmLabel="Terminate"
          message="Terminate this employee? This action is permanent and cannot be reversed."
          onCancel={() => setConfirmTerminateOpen(false)}
          onConfirm={() => {
            setConfirmTerminateOpen(false);
            void handleTerminate();
          }}
          open={confirmTerminateOpen}
          title="Terminate Employee"
        />

        <PageHeader
          eyebrow="People"
          title={state.data?.displayName ?? 'Employee Details'}
          subtitle={
            lifecycleStatus
              ? `Employment status: ${humanizeEnum(lifecycleStatus, EMPLOYMENT_STATUS_LABELS)}`
              : undefined
          }
          actions={
            canManageLifecycle ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isDeactivating || lifecycleStatus === 'INACTIVE' || lifecycleStatus === 'TERMINATED'}
                  onClick={() => setConfirmDeactivateOpen(true)}
                  type="button"
                >
                  {isDeactivating
                    ? 'Deactivating…'
                    : lifecycleStatus === 'INACTIVE'
                      ? 'Already inactive'
                      : 'Deactivate'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isTerminating || lifecycleStatus === 'TERMINATED'}
                  onClick={() => setConfirmTerminateOpen(true)}
                  type="button"
                >
                  {lifecycleStatus === 'TERMINATED' ? 'Terminated' : 'Terminate'}
                </Button>
              </div>
            ) : null
          }
        />

        {deactivateError ? <ErrorState description={deactivateError} /> : null}
        {deactivateSuccess ? <div className="success-banner" role="status">{deactivateSuccess}</div> : null}
        {terminateError ? <ErrorState description={terminateError} /> : null}
        {terminateSuccess ? <div className="success-banner" role="status">{terminateSuccess}</div> : null}

        <PersonProfilePanel personId={id} />
      </PageContainer>
    );
  }

  return (
    <PageContainer testId="employee-details-page">
      <ConfirmDialog
        confirmLabel="Deactivate"
        message="Deactivate this employee? They will lose access to the system but their history is preserved."
        onCancel={() => setConfirmDeactivateOpen(false)}
        onConfirm={() => {
          setConfirmDeactivateOpen(false);
          void handleDeactivate();
        }}
        open={confirmDeactivateOpen}
        title="Deactivate Employee"
      />
      <ConfirmDialog
        confirmLabel="Terminate"
        message="Terminate this employee? This action is permanent and cannot be reversed."
        onCancel={() => setConfirmTerminateOpen(false)}
        onConfirm={() => {
          setConfirmTerminateOpen(false);
          void handleTerminate();
        }}
        open={confirmTerminateOpen}
        title="Terminate Employee"
      />
      <PageHeader
        actions={
          <>
            {canManageLifecycle ? (
              <Button variant="secondary" disabled={isDeactivating || lifecycleStatus === 'INACTIVE' || lifecycleStatus === 'TERMINATED'} onClick={() => { setConfirmDeactivateOpen(true); }} type="button">
                {isDeactivating
                  ? 'Deactivating...'
                  : lifecycleStatus === 'INACTIVE'
                    ? 'Already inactive'
                    : 'Deactivate employee'}
              </Button>
            ) : null}
            {canManageLifecycle ? (
              <Button variant="danger" disabled={isTerminating || lifecycleStatus === 'TERMINATED'} onClick={() => { setConfirmTerminateOpen(true); }} type="button">
                {lifecycleStatus === 'TERMINATED' ? 'Terminated' : 'Terminate employee'}
              </Button>
            ) : null}
          </>
        }
        badges={
          // W3-05 — replaces the legacy 5-up SummaryCard KPI strip with a
          // single lifecycle StatusBadge per Phase 18 Detail Surface grammar.
          // Org-unit, line-manager, and assignment counts are surfaced inside
          // the section cards below (no duplicate KPI tile row).
          lifecycleStatus || state.data?.lifecycleStatus ? (
            <StatusBadge
              tone={(() => {
                const status = lifecycleStatus ?? state.data?.lifecycleStatus ?? 'ACTIVE';
                if (status === 'ACTIVE') return 'active';
                if (status === 'INACTIVE') return 'warning';
                if (status === 'TERMINATED') return 'danger';
                return 'neutral';
              })()}
              label={humanizeEnum(
                lifecycleStatus ?? state.data?.lifecycleStatus ?? 'ACTIVE',
                EMPLOYMENT_STATUS_LABELS,
              )}
              variant="chip"
            />
          ) : null
        }
        eyebrow="People"
        subtitle="Employee profile foundation for staffing visibility and future portal workflows."
        title={state.data?.displayName ?? 'Employee Details'}
      />

      <div data-testid="person-detail-tabs">
        <TabBar
          activeTab={activeTab}
          onTabChange={(id) => setTab(id as typeof activeTab)}
          tabs={[
            { id: 'overview', label: 'Overview' },
            ...(canView360 ? [{ id: '360', label: '360 View' }] : []),
            { id: 'skills', label: 'Skills' },
            { id: 'history', label: 'History' },
          ]}
        />
      </div>

      {state.isLoading ? <LoadingState label="Loading employee details..." variant="skeleton" skeletonType="detail" /> : null}
      {state.notFound ? (
        <SectionCard>
          <EmptyState
            description={`No employee was found for ${id ?? 'the requested id'}.`}
            title="Employee not found"
            action={{ href: '/people', label: 'Back to people' }}
          />
        </SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {deactivateError ? <ErrorState description={deactivateError} /> : null}
      {deactivateSuccess ? <div className="success-banner">{deactivateSuccess}</div> : null}
      {terminateError ? <ErrorState description={terminateError} /> : null}
      {terminateSuccess ? <div className="success-banner">{terminateSuccess}</div> : null}
      {showTerminateForm ? (
        <SectionCard title="Terminate Employee">
          <div className="details-list">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
              <label>
                <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Reason (optional)</span>
                <input
                  className="input"
                  onChange={(e) => { setTerminateReason(e.target.value); }}
                  placeholder="Reason for termination"
                  type="text"
                  value={terminateReason}
                />
              </label>
              <label>
                <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Termination date (optional)</span>
                <DatePicker
 className="input"
 onValueChange={(value) => { setTerminateDate(value); }} value={terminateDate}
 />
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="danger" disabled={isTerminating} onClick={() => { void handleTerminate(); }} type="button">
                  {isTerminating ? 'Terminating...' : 'Confirm termination'}
                </Button>
                <Button variant="secondary" onClick={() => { setShowTerminateForm(false); }} type="button">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {state.data && activeTab === '360' && canView360 && id ? (
        <Person360Tab personId={id} />
      ) : null}

      {state.data && activeTab === 'skills' && id ? (
        <SectionCard title="Skills">
          <PersonSkillsTab canEdit={canEditSkills} personId={id} />
        </SectionCard>
      ) : null}

      {activeTab === 'history' && id ? (
        <>
          <SectionCard title="Lifecycle Activity" collapsible>
            <PersonActivityFeed personId={id} />
          </SectionCard>
          <SectionCard title="Change History">
            {personAuditLoading ? <LoadingState label="Loading history..." variant="skeleton" skeletonType="detail" /> : null}
            {personAuditError ? <ErrorState description={personAuditError} /> : null}
            {!personAuditLoading && !personAuditError ? (
              <AuditTimeline events={personAuditEvents} />
            ) : null}
          </SectionCard>
        </>
      ) : null}

      {state.data && activeTab !== '360' && activeTab !== 'skills' && activeTab !== 'history' ? (
        <>
          {/* W3-05 — legacy ad-hoc 5-up KPI tile strip removed. Lifecycle is
              now shown as a single StatusBadge in PageHeader; org-unit /
              line-manager / assignment-count remain inside SectionCards per
              Phase 18 Detail Surface grammar. */}
          <div className="dashboard-main-grid">
            <SectionCard title="Employee Summary">
              <dl className="details-list">
                <div>
                  <dt>Name</dt>
                  <dd>{state.data.displayName}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{state.data.primaryEmail ?? 'Not available'}</dd>
                </div>
                <div>
                  <dt>Org Unit</dt>
                  <dd>{state.data.currentOrgUnit?.name ?? 'Not assigned'}</dd>
                </div>
                <div>
                  <dt>Resource Pools</dt>
                  <dd>
                    {state.data.resourcePools && state.data.resourcePools.length > 0
                      ? state.data.resourcePools.map((pool) => pool.name).join(', ')
                      : 'No pool memberships'}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Reporting Relationships">
              <dl className="details-list">
                <div>
                  <dt>Line Manager</dt>
                  <dd>{state.data.currentLineManager?.displayName ?? 'No line manager'}</dd>
                </div>
                <div>
                  <dt>Dotted-Line Summary</dt>
                  <dd>
                    {state.data.dottedLineManagers.length > 0
                      ? state.data.dottedLineManagers
                          .map((manager) => manager.displayName)
                          .join(', ')
                      : 'No dotted-line relationships'}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Reporting Line Management">
              <p className="placeholder-block__copy">
                Use effective dates to schedule manager changes without overwriting historical
                relationships.
              </p>
              {reportingLine.isLoadingManagers ? (
                <LoadingState label="Loading manager options..." variant="skeleton" skeletonType="detail" />
              ) : null}
              {reportingLine.error ? <ErrorState description={reportingLine.error} /> : null}
              {reportingLine.successMessage ? (
                <div className="success-banner">{reportingLine.successMessage}</div>
              ) : null}
              {reportingLine.lastCreatedReportingLine ? (
                <div className="reporting-line-panel">
                  <div className="reporting-line-panel__summary">
                    <span className="reporting-line-panel__label">Latest scheduled change</span>
                    <strong>
                      {reportingLine.lastCreatedReportingLine.type} from{' '}
                      {formatDate(reportingLine.lastCreatedReportingLine.startDate)}
                      {reportingLine.lastCreatedReportingLine.endDate
                        ? ` until ${formatDate(reportingLine.lastCreatedReportingLine.endDate)}`
                        : ''}
                    </strong>
                  </div>
                  <div className="reporting-line-panel__actions">
                    {endRelationshipError ? <p className="field__error">{endRelationshipError}</p> : null}
                    {endRelationshipSuccess ? <p className="field__success">{endRelationshipSuccess}</p> : null}
                    <label className="field">
                      <span className="field__label">End date</span>
                      <DatePicker onValueChange={(value) => { setEndRelationshipDate(value); }} value={endRelationshipDate}
 />
                    </label>
                    <Button variant="secondary" disabled={isEndingRelationship} onClick={() => { void handleEndRelationship(reportingLine.lastCreatedReportingLine!.id); }} type="button">
                      {isEndingRelationship ? 'Ending...' : 'End relationship'}
                    </Button>
                  </div>
                </div>
              ) : null}
              <ReportingLineForm
                currentManagerName={state.data.currentLineManager?.displayName}
                errors={reportingLine.errors}
                isSubmitting={reportingLine.isSubmitting}
                managerOptions={reportingLine.managerOptions}
                onChange={reportingLine.handleChange}
                onSubmit={reportingLine.handleSubmit}
                values={reportingLine.values}
              />
            </SectionCard>

            <SectionCard title="Active Positions Summary">
              {state.data.currentAssignmentCount === 0 ? (
                <EmptyState
                  description="This person has no active positions at this time."
                  title="No active positions"
                  action={{
                    href: `/staffing-desk?view=table&kind=position&personId=${id ?? ''}`,
                    label: 'Open staffing desk',
                  }}
                />
              ) : (
                <dl className="details-list">
                  <div>
                    <dt>Active positions</dt>
                    <dd>{state.data.currentAssignmentCount}</dd>
                  </div>
                </dl>
              )}
            </SectionCard>

            <SectionCard title="Current Workload">
              <EmptyState
                description="Workload calculations are not yet available for this employee."
                title="No workload data"
              />
            </SectionCard>

            <SectionCard title="Lifecycle Actions">
              <p className="placeholder-block__copy">
                Employee deletion is not supported. Use deactivation to preserve assignment and org
                history.
              </p>
              <AuthTokenField
                hasToken={authToken.hasToken}
                onClear={authToken.clearToken}
                onSave={authToken.saveToken}
                token={authToken.token}
              />
            </SectionCard>

            <SectionCard title="Future Workload and History">
              <EmptyState
                description="Future allocations, org history, and employee activity history are not yet available."
                title="No history data"
              />
            </SectionCard>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}

