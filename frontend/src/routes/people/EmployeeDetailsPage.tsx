import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

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
import { formatDate } from '@/lib/format-date';
import { ReportingLineForm } from '@/components/people/ReportingLineForm';
import { PersonSkillsTab } from '@/components/people/PersonSkillsTab';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { useEmployeeDetails } from '@/features/people/useEmployeeDetails';
import { useReportingLineManagement } from '@/features/people/useReportingLineManagement';
import { deactivateEmployee, terminateEmployee } from '@/lib/api/person-directory';
import { showUndoToast } from '@/lib/undo-toast';
import { terminateReportingLine } from '@/lib/api/reporting-lines';
import { fetchBusinessAudit, BusinessAuditRecord } from '@/lib/api/business-audit';
import { humanizeEnum, EMPLOYMENT_STATUS_LABELS } from '@/lib/labels';
import { PersonActivityFeed } from '@/components/people/PersonActivityFeed';
import { Person360Tab } from '@/components/people/Person360Tab';
import {
  HR_DIRECTOR_ADMIN_ROLES,
  THREESIXTY_REVIEW_ROLES,
  SKILL_EDIT_ROLES,
  hasAnyRole,
} from '@/app/route-manifest';
import { getDashboardPath } from '@/app/role-routing';
import { Button, DatePicker } from '@/components/ds';

type EmployeeTabId =
  | 'overview'
  | 'positions'
  | 'skills'
  | 'cost'
  | 'time'
  | 'activity';

const EMPLOYEE_TABS: EmployeeTabId[] = [
  'overview',
  'positions',
  'skills',
  'cost',
  'time',
  'activity',
];

/**
 * SoT PR 17h-employee — DS-canvas 6-tab Employee Detail surface.
 *
 * Spec: DS/page-profile.jsx (PeopleProfile). Six tabs (Overview / Positions /
 * Skills / Cost rates / Time & leave / Activity) plus a 320px right rail with
 * Quick actions, Linked entities, and Recent activity. The dsRefresh-ON branch
 * still delegates to PersonProfilePanel which renders the canvas-conformant
 * surface; this page owns the lifecycle action header (Deactivate / Terminate),
 * the reporting-line scheduler, and the dsRefresh-OFF fallback that mirrors the
 * same 6-tab grammar.
 *
 * Renamed from EmployeeDetailsPlaceholderPage — the page is no longer a stub.
 */
export function EmployeeDetailsPage(): JSX.Element {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal } = useAuth();
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const canManageLifecycle = hasAnyRole(principal?.roles, HR_DIRECTOR_ADMIN_ROLES);
  const canView360 = hasAnyRole(principal?.roles, THREESIXTY_REVIEW_ROLES);
  const canEditSkills = hasAnyRole(principal?.roles, SKILL_EDIT_ROLES);
  const rawTab = searchParams.get('tab') ?? 'overview';
  const activeTab: EmployeeTabId = (EMPLOYEE_TABS as string[]).includes(rawTab)
    ? (rawTab as EmployeeTabId)
    : 'overview';

  const [personAuditEvents, setPersonAuditEvents] = useState<BusinessAuditRecord[]>([]);
  const [personAuditLoading, setPersonAuditLoading] = useState(false);
  const [personAuditError, setPersonAuditError] = useState<string | null>(null);

  function setTab(tab: EmployeeTabId): void {
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

  useEffect(() => {
    if (state.data?.lifecycleStatus !== undefined) {
      setLifecycleStatus(state.data.lifecycleStatus);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.data?.id]);

  useEffect(() => {
    if (!id || activeTab !== 'activity') return;
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
    return () => {
      active = false;
    };
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
    // The dsRefresh-ON path uses PersonProfilePanel which already implements
    // the DS canvas 6-tab grammar + 320px right rail (SoT PR 9). We keep the
    // lifecycle action header (Deactivate / Terminate) here so HR/admin can
    // act without leaving the canvas profile.
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

  const positionsCount = state.data?.currentAssignmentCount ?? 0;
  const lifecycleBadge = lifecycleStatus || state.data?.lifecycleStatus ? (
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
  ) : null;

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
        badges={lifecycleBadge}
        eyebrow="People"
        subtitle="Employee profile — staffing, skills, cost, time & leave, and activity."
        title={state.data?.displayName ?? 'Employee Details'}
      />

      <div data-testid="person-detail-tabs">
        <TabBar
          activeTab={activeTab}
          onTabChange={(value) => setTab(value as EmployeeTabId)}
          tabs={[
            { id: 'overview', label: 'Overview' },
            {
              id: 'positions',
              label: (
                <>
                  Positions{' '}
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    ({positionsCount})
                  </span>
                </>
              ),
            },
            { id: 'skills', label: 'Skills' },
            { id: 'cost', label: 'Cost rates' },
            { id: 'time', label: 'Time & leave' },
            { id: 'activity', label: 'Activity' },
          ]}
        />
      </div>

      {state.isLoading ? (
        <LoadingState label="Loading employee details..." variant="skeleton" skeletonType="detail" />
      ) : null}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
              <label>
                <span style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Reason (optional)</span>
                <input
                  className="input"
                  onChange={(e) => { setTerminateReason(e.target.value); }}
                  placeholder="Reason for termination"
                  type="text"
                  value={terminateReason}
                />
              </label>
              <label>
                <span style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Termination date (optional)</span>
                <DatePicker
                  className="input"
                  onValueChange={(value) => { setTerminateDate(value); }}
                  value={terminateDate}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
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

      {state.data && id ? (
        <div
          data-testid="employee-details-body"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 320px',
            gap: 20,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {activeTab === 'overview' ? (
              <>
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
                          <DatePicker
                            onValueChange={(value) => { setEndRelationshipDate(value); }}
                            value={endRelationshipDate}
                          />
                        </label>
                        <Button
                          variant="secondary"
                          disabled={isEndingRelationship}
                          onClick={() => { void handleEndRelationship(reportingLine.lastCreatedReportingLine!.id); }}
                          type="button"
                        >
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

                {canView360 ? (
                  <SectionCard title="360 View">
                    <Person360Tab personId={id} />
                  </SectionCard>
                ) : null}
              </>
            ) : null}

            {activeTab === 'positions' ? (
              <SectionCard title={`Positions (${positionsCount})`}>
                {positionsCount === 0 ? (
                  <EmptyState
                    description="This person has no active positions at this time."
                    title="No active positions"
                    action={{
                      href: `/staffing-desk?view=table&kind=position&personId=${id}`,
                      label: 'Open staffing desk',
                    }}
                  />
                ) : (
                  <EmptyState
                    description="Use the staffing desk to see this person's full position history and active fills."
                    title={`${positionsCount} active position${positionsCount === 1 ? '' : 's'}`}
                    action={{
                      href: `/staffing-desk?view=table&kind=position&personId=${id}`,
                      label: 'Open staffing desk',
                    }}
                  />
                )}
              </SectionCard>
            ) : null}

            {activeTab === 'skills' ? (
              <SectionCard title="Skills">
                <PersonSkillsTab canEdit={canEditSkills} personId={id} />
              </SectionCard>
            ) : null}

            {activeTab === 'cost' ? (
              <SectionCard title="Cost rates">
                <EmptyState
                  description="Cost rates for this person are managed by Finance. The detailed history endpoint is not yet exposed on this profile."
                  title="Cost rate history not available here"
                  action={{
                    href: '/admin/finance/rates',
                    label: 'Open finance rates admin',
                  }}
                />
              </SectionCard>
            ) : null}

            {activeTab === 'time' ? (
              <SectionCard title="Time & leave">
                <EmptyState
                  description="Time and leave for this person are owned by their workspace. Open their My Time view to see weekly hours and leave balance."
                  title="Time & leave lives on the workspace"
                  action={{
                    href: `/me?personId=${id}`,
                    label: 'Open workspace',
                  }}
                />
              </SectionCard>
            ) : null}

            {activeTab === 'activity' ? (
              <>
                <SectionCard title="Lifecycle Activity" collapsible>
                  <PersonActivityFeed personId={id} />
                </SectionCard>
                <SectionCard title="Change History">
                  {personAuditLoading ? (
                    <LoadingState label="Loading history..." variant="skeleton" skeletonType="detail" />
                  ) : null}
                  {personAuditError ? <ErrorState description={personAuditError} /> : null}
                  {!personAuditLoading && !personAuditError ? (
                    <AuditTimeline events={personAuditEvents} />
                  ) : null}
                </SectionCard>
              </>
            ) : null}

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
          </div>

          <aside
            data-testid="employee-details-right-rail"
            style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16 }}
          >
            <SectionCard title="Quick actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Button
                  as="a"
                  variant="secondary"
                  size="md"
                  href={`/messages/new?personId=${id}`}
                  style={{ justifyContent: 'flex-start' }}
                >
                  Message
                </Button>
                <Button
                  as="a"
                  variant="secondary"
                  size="md"
                  href={`/staffing-desk?view=table&kind=position&personId=${id}`}
                  style={{ justifyContent: 'flex-start' }}
                >
                  Manage positions
                </Button>
                {canEditSkills ? (
                  <Button
                    as="a"
                    variant="secondary"
                    size="md"
                    href={`/people/${id}?tab=skills`}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    Edit profile
                  </Button>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard title="Linked entities">
              <dl
                className="details-list"
                style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6 }}
              >
                <dt>Active positions</dt>
                <dd>
                  <a href={`/staffing-desk?view=table&kind=position&personId=${id}`}>
                    {positionsCount}
                  </a>
                </dd>
                <dt>Resource pools</dt>
                <dd>{state.data.resourcePools?.length ?? 0}</dd>
                <dt>Dotted-line</dt>
                <dd>{state.data.dottedLineManagers.length}</dd>
              </dl>
            </SectionCard>

            <SectionCard title="Recent activity">
              <PersonActivityFeed personId={id} limit={5} />
            </SectionCard>
          </aside>
        </div>
      ) : null}
    </PageContainer>
  );
}
