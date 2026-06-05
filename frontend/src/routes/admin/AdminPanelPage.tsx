import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { isFeatureEnabled } from '@/lib/feature-flags';

import { useImpersonation } from '@/app/impersonation-context';

import { AdminConfigViewer } from '@/components/admin/AdminConfigViewer';
import { SystemFlagsSettingsList } from '@/components/admin/SystemFlagsSettingsList';
import { AdminList, AdminListItem } from '@/components/admin/AdminList';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { AssignmentWorkflowSettings } from '@/components/admin/AssignmentWorkflowSettings';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format-date';
import { useAdminPanel } from '@/features/admin/useAdminPanel';
import {
  AdminAccountItem,
  createLocalAccount,
  deleteAdminAccount,
  fetchAdminAccounts,
  updateAdminAccount,
} from '@/lib/api/admin';
import { formatFeatureFlag } from '@/lib/labels';
import { Button, FormField, Input, Table, type Column } from '@/components/ds';
import { DictionariesAdminContent } from './DictionariesPage';
import { SettingsAdminContent } from './SettingsPage';
import { IntegrationsAdminContent } from './IntegrationsAdminPage';
import { FeatureFlagsAdminContent } from './FeatureFlagsAdminPage';
import { RolePermissionAdminContent } from './RolePermissionAdminPage';
import { BusinessAuditAdminContent } from './BusinessAuditPage';
import { OrganizationConfigAdminContent } from './OrganizationConfigPage';

type AdminSectionKey =
  | 'accounts'
  | 'dictionaries'
  | 'integrations'
  | 'notifications'
  | 'settings'
  | 'assignment-workflow';

// V2 LEAN-P4d-1 — 5-tab Admin Control Surface grammar (Phase 18).
// Each tab inline-mounts the relevant admin sub-page content so deep-link
// friction disappears. Standalone routes continue to work as deep links.
type AdminTabKey =
  | 'general'
  | 'integrations'
  | 'governance'
  | 'people-config'
  | 'feature-flags';

interface AdminSectionDefinition {
  description: string;
  key: AdminSectionKey;
  title: string;
}

interface AdminTabDefinition {
  description: string;
  key: AdminTabKey;
  title: string;
}

const adminSections: AdminSectionDefinition[] = [
  {
    description: 'Create local authentication accounts linked to people records.',
    key: 'accounts',
    title: 'User Accounts',
  },
  {
    description: 'Metadata-driven controlled vocabularies and dictionary coverage.',
    key: 'dictionaries',
    title: 'Dictionaries',
  },
  {
    description: 'Provider health, sync status, and supported integration capabilities.',
    key: 'integrations',
    title: 'Integrations',
  },
  {
    description: 'Configured outbound channels and template coverage.',
    key: 'notifications',
    title: 'Notifications',
  },
  {
    description: 'Environment-driven flags and operational system settings.',
    key: 'settings',
    title: 'System Settings',
  },
  {
    description: 'SLA budgets, Director-approval thresholds, slate bounds, SLOs, matching weights, sweep cadence.',
    key: 'assignment-workflow',
    title: 'Assignment Workflow',
  },
];

const adminTabs: AdminTabDefinition[] = [
  {
    description: 'Platform-wide behaviour: timesheets, capitalisation, pulse, notifications, security.',
    key: 'general',
    title: 'General',
  },
  {
    description: 'Provider health, sync status, retry/test controls for JSM, M365, LDAP, Jira PPM.',
    key: 'integrations',
    title: 'Integrations',
  },
  {
    description: 'RBAC matrix, role permissions, audit log viewer.',
    key: 'governance',
    title: 'Governance',
  },
  {
    description: 'Dictionaries, organization config, leave policies, org structure.',
    key: 'people-config',
    title: 'People Config',
  },
  {
    description: 'Toggle platform features per tenant; maturity, ownership, and dependency metadata.',
    key: 'feature-flags',
    title: 'Feature Flags',
  },
];

interface AccountFormState {
  email: string;
  error: string | null;
  isSubmitting: boolean;
  password: string;
  personId: string;
  roles: string;
  success: string | null;
}

export function AdminPanelPage(): JSX.Element {
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const [searchParams, setSearchParams] = useSearchParams();

  // V2 LEAN-P4d-1 — under dsRefresh the URL is driven by ?tab=<AdminTabKey>.
  // Legacy ?section=<AdminSectionKey> still works in the sidebar shell.
  const tabParam = searchParams.get('tab');
  const sectionParam = searchParams.get('section');
  const isValidTab = (key: string | null): key is AdminTabKey =>
    !!key && adminTabs.some((t) => t.key === key);
  const isValidSection = (key: string | null): key is AdminSectionKey =>
    !!key && adminSections.some((s) => s.key === key);

  const initialTab: AdminTabKey = isValidTab(tabParam) ? tabParam : 'general';
  const initialSection: AdminSectionKey = isValidSection(sectionParam) ? sectionParam : 'accounts';

  const [selectedTab, setSelectedTabState] = useState<AdminTabKey>(initialTab);
  const [selectedSection, setSelectedSectionState] = useState<AdminSectionKey>(initialSection);

  const setSelectedTab = (key: AdminTabKey): void => {
    setSelectedTabState(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    }, { replace: true });
  };

  const setSelectedSection = (key: AdminSectionKey): void => {
    setSelectedSectionState(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('section', key);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (isValidTab(tabParam) && tabParam !== selectedTab) {
      setSelectedTabState(tabParam);
    }
  }, [tabParam]);
  useEffect(() => {
    if (isValidSection(sectionParam) && sectionParam !== selectedSection) {
      setSelectedSectionState(sectionParam);
    }
  }, [sectionParam]);

  const state = useAdminPanel();
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    email: '',
    error: null,
    isSubmitting: false,
    password: '',
    personId: '',
    roles: 'delivery_manager',
    success: null,
  });

  async function handleCreateAccount(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setAccountForm((prev) => ({ ...prev, error: null, isSubmitting: true, success: null }));

    try {
      const roles = accountForm.roles
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      const result = await createLocalAccount({
        email: accountForm.email,
        password: accountForm.password,
        personId: accountForm.personId,
        roles,
      });
      setAccountForm((prev) => ({
        ...prev,
        email: '',
        isSubmitting: false,
        password: '',
        personId: '',
        success: `Account created: ${result.email} (${result.id})`,
      }));
    } catch (error) {
      setAccountForm((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create account.',
        isSubmitting: false,
      }));
    }
  }

  const activeSection = useMemo(
    () => adminSections.find((section) => section.key === selectedSection) ?? adminSections[0],
    [selectedSection],
  );
  const activeTab = useMemo(
    () => adminTabs.find((tab) => tab.key === selectedTab) ?? adminTabs[0],
    [selectedTab],
  );

  const totalItemCount = state.data
    ? state.data.config.dictionaries.length +
      state.data.integrations.integrations.length +
      state.data.notifications.channels.length +
      state.data.notifications.templates.length +
      state.data.settings.systemFlags.length
    : 0;

  const sidebarSectionBody = (
    <>
      {selectedSection === 'accounts'
        ? <AdminAccountsSection
            accountForm={accountForm}
            onFormChange={setAccountForm}
            onCreateAccount={handleCreateAccount}
          />
        : state.data
          ? renderSection(selectedSection, state.data, dsRefreshEnabled)
          : null}
    </>
  );

  const tabBody = (
    <AdminTabContent
      accountForm={accountForm}
      onFormChange={setAccountForm}
      onCreateAccount={handleCreateAccount}
      tab={selectedTab}
    />
  );

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Administration"
        subtitle="Consolidate metadata, integrations, notifications, and runtime settings behind explicit admin aggregation endpoints. The UI stays config-driven and avoids embedding business-specific entities."
        title="Admin Panel"
        tabs={dsRefreshEnabled ? adminTabs.map((t) => ({ id: t.key, label: t.title })) : undefined}
        activeTab={dsRefreshEnabled ? selectedTab : undefined}
        onTabChange={dsRefreshEnabled ? (id) => setSelectedTab(id as AdminTabKey) : undefined}
      />

      {dsRefreshEnabled ? (
        <section className="admin-panel admin-panel--tabbed" data-testid="admin-tabbed">
          <header className="admin-panel__main-header">
            <h2>{activeTab.title}</h2>
            <p>{activeTab.description}</p>
          </header>
          {tabBody}
        </section>
      ) : (
        <>
          {state.isLoading ? <LoadingState label="Loading admin panel..." variant="skeleton" skeletonType="page" /> : null}
          {state.error ? <ErrorState description={state.error} /> : null}

          {!state.isLoading && !state.error && state.data ? (
            totalItemCount === 0 ? (
              <EmptyState
                description="Admin aggregation endpoints returned no data for dictionaries, integrations, notifications, or system settings."
                title="No admin configuration available"
              />
            ) : (
              <div className="admin-panel">
                <aside className="admin-panel__sidebar">
                  <div className="admin-panel__sidebar-title">Sections</div>
                  <div className="admin-panel__sidebar-list">
                    {adminSections.map((section) => (
                      <Button
                        variant="secondary"
                        className={`admin-panel__sidebar-item${
                          section.key === selectedSection ? ' admin-panel__sidebar-item--active' : ''
                        }`}
                        key={section.key}
                        onClick={() => setSelectedSection(section.key)}
                        type="button"
                      >
                        <span className="admin-panel__sidebar-item-title">{section.title}</span>
                        <span className="admin-panel__sidebar-item-description">{section.description}</span>
                      </Button>
                    ))}
                  </div>
                </aside>

                <section className="admin-panel__main">
                  <header className="admin-panel__main-header">
                    <h2>{activeSection.title}</h2>
                    <p>{activeSection.description}</p>
                  </header>
                  {sidebarSectionBody}
                </section>
              </div>
            )
          ) : null}
        </>
      )}
    </PageContainer>
  );
}

interface AdminTabContentProps {
  accountForm: AccountFormState;
  onCreateAccount: (e: React.FormEvent) => Promise<void>;
  onFormChange: React.Dispatch<React.SetStateAction<AccountFormState>>;
  tab: AdminTabKey;
}

function AdminTabContent({
  accountForm,
  onCreateAccount,
  onFormChange,
  tab,
}: AdminTabContentProps): JSX.Element {
  switch (tab) {
    case 'general':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-general">
          <SettingsAdminContent />
          <SectionCard title="Assignment Workflow">
            <AssignmentWorkflowSettings />
          </SectionCard>
        </div>
      );
    case 'integrations':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-integrations">
          <IntegrationsAdminContent />
        </div>
      );
    case 'governance':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-governance">
          <SectionCard title="User Accounts">
            <AdminAccountsSection
              accountForm={accountForm}
              onFormChange={onFormChange}
              onCreateAccount={onCreateAccount}
            />
          </SectionCard>
          <SectionCard title="Role Permissions">
            <RolePermissionAdminContent />
          </SectionCard>
          <SectionCard title="Business Audit">
            <BusinessAuditAdminContent />
          </SectionCard>
        </div>
      );
    case 'people-config':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-people-config">
          <SectionCard title="Organization Configuration">
            <OrganizationConfigAdminContent />
          </SectionCard>
          <SectionCard title="Dictionaries">
            <DictionariesAdminContent />
          </SectionCard>
        </div>
      );
    case 'feature-flags':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-feature-flags">
          <FeatureFlagsAdminContent />
        </div>
      );
    default:
      return <></>;
  }
}

interface AdminAccountsSectionProps {
  accountForm: AccountFormState;
  onFormChange: React.Dispatch<React.SetStateAction<AccountFormState>>;
  onCreateAccount: (e: React.FormEvent) => Promise<void>;
}

function AdminAccountsSection({
  accountForm,
  onFormChange,
  onCreateAccount,
}: AdminAccountsSectionProps): JSX.Element {
  const { startImpersonation } = useImpersonation();
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<AdminAccountItem | null>(null);

  const loadAccounts = useCallback(async (): Promise<void> => {
    setAccountsLoading(true);
    setAccountsError(null);
    try {
      const result = await fetchAdminAccounts();
      setAccounts(result.items);
    } catch (err) {
      setAccountsError(err instanceof Error ? err.message : 'Failed to load accounts.');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function handleToggleEnabled(account: AdminAccountItem): Promise<void> {
    setActionError(null);
    try {
      await updateAdminAccount(account.id, { isEnabled: !account.isEnabled });
      await loadAccounts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update account.');
    }
  }

  function handleDelete(account: AdminAccountItem): void {
    setConfirmDeleteAccount(account);
  }

  async function doDelete(account: AdminAccountItem): Promise<void> {
    setActionError(null);
    try {
      await deleteAdminAccount(account.id);
      await loadAccounts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete account.');
    }
  }

  return (
    <div className="admin-panel__cards">
      <ConfirmDialog
        confirmLabel="Delete account"
        message={confirmDeleteAccount ? `Delete account ${confirmDeleteAccount.email}? This cannot be undone.` : ''}
        onCancel={() => setConfirmDeleteAccount(null)}
        onConfirm={() => {
          const account = confirmDeleteAccount;
          setConfirmDeleteAccount(null);
          if (account) void doDelete(account);
        }}
        open={confirmDeleteAccount !== null}
        title="Delete Account"
      />
      <AdminSectionCard
        description="All local authentication accounts. Enable, disable, or delete accounts as needed."
        title="Account List"
      >
        {accountsLoading ? <LoadingState label="Loading accounts..." variant="skeleton" skeletonType="page" /> : null}
        {accountsError ? <ErrorState description={accountsError} /> : null}
        {actionError ? <ErrorState description={actionError} /> : null}
        {!accountsLoading && !accountsError && accounts.length === 0 ? (
          <EmptyState description="No local accounts found." title="No accounts" />
        ) : null}
        {!accountsLoading && accounts.length > 0 ? (
          <div style={{ marginTop: '8px' }}>
            <Table
              variant="compact"
              columns={[
                { key: 'email', title: 'Email', getValue: (a) => a.email, render: (a) => a.email },
                { key: 'roles', title: 'Roles', getValue: (a) => a.roles.join(', '), render: (a) => a.roles.join(', ') },
                { key: 'status', title: 'Status', getValue: (a) => a.isEnabled ? 'Enabled' : 'Disabled', render: (a) => (
                  <StatusBadge
                    label={a.isEnabled ? 'Enabled' : 'Disabled'}
                    tone={a.isEnabled ? 'active' : 'danger'}
                    variant="text"
                  />
                ) },
                { key: 'actions', title: 'Actions', render: (a) => (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" size="sm" onClick={() => { void handleToggleEnabled(a); }} type="button">
                      {a.isEnabled ? 'Disable' : 'Enable'}
                    </Button>
                    {a.personId ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          startImpersonation({
                            displayName: a.displayName,
                            personId: a.personId as string,
                            roles: a.roles,
                          });
                        }}
                        title="View the application as this user"
                        type="button"
                      >
                        View as
                      </Button>
                    ) : null}
                    <Button variant="danger" size="sm" onClick={() => handleDelete(a)} type="button">
                      Delete
                    </Button>
                  </div>
                ) },
              ] as Column<AdminAccountItem>[]}
              rows={accounts}
              getRowKey={(a) => a.id}
            />
          </div>
        ) : null}
      </AdminSectionCard>

      <SectionCard title="Create Local Account">
        <p className="admin-section-card__description">
          Creates a local authentication account linked to an existing person record.
          Use person IDs from the People directory.
        </p>
        {accountForm.error ? <ErrorState description={accountForm.error} /> : null}
        {accountForm.success ? <div className="success-banner">{accountForm.success}</div> : null}
        <form
          className="entity-form"
          onSubmit={(e) => { void onCreateAccount(e); }}
          style={{ maxWidth: '480px' }}
        >
          <FormField label="Person ID" required>
            {(props) => (
              <Input
                {...props}
                onChange={(e) => { onFormChange((prev) => ({ ...prev, personId: e.target.value })); }}
                placeholder="UUID of the person record"
                required
                value={accountForm.personId}
              />
            )}
          </FormField>
          <FormField label="Email" required>
            {(props) => (
              <Input
                {...props}
                onChange={(e) => { onFormChange((prev) => ({ ...prev, email: e.target.value })); }}
                placeholder="login@example.com"
                required
                type="email"
                value={accountForm.email}
              />
            )}
          </FormField>
          <FormField label="Password" required>
            {(props) => (
              <Input
                {...props}
                onChange={(e) => { onFormChange((prev) => ({ ...prev, password: e.target.value })); }}
                placeholder="Minimum 8 characters"
                required
                type="password"
                value={accountForm.password}
              />
            )}
          </FormField>
          <FormField
            hint="Available: admin, delivery_manager, project_manager, resource_manager, hr_manager, director, employee"
            label="Roles (comma-separated)"
            required
          >
            {(props) => (
              <Input
                {...props}
                onChange={(e) => { onFormChange((prev) => ({ ...prev, roles: e.target.value })); }}
                placeholder="delivery_manager, admin, hr_manager"
                required
                value={accountForm.roles}
              />
            )}
          </FormField>
          <div>
            <Button variant="primary" disabled={accountForm.isSubmitting} type="submit">
              {accountForm.isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function renderSection(
  section: AdminSectionKey,
  data: NonNullable<ReturnType<typeof useAdminPanel>['data']>,
  dsRefreshEnabled: boolean,
): JSX.Element {
  switch (section) {
    case 'dictionaries':
      // V2 Scope §4 item 10 — under dsRefresh, mount the Dictionaries admin
      // content inline instead of deep-linking to /admin/dictionaries. The
      // dsRefresh=OFF path keeps the legacy summary + deep-link UI unchanged.
      if (dsRefreshEnabled) {
        return (
          <div className="admin-panel__cards" data-testid="admin-inline-dictionaries">
            <DictionariesAdminContent />
          </div>
        );
      }
      return (
        <div className="admin-panel__cards">
          <AdminSectionCard
            description="Dictionaries are rendered from the aggregated config endpoint rather than hardcoded into the page."
            title="Dictionary Coverage"
          >
            <AdminConfigViewer
              emptyMessage="No dictionary summary is available."
              entries={[
                { label: 'Dictionaries', value: String(data.config.dictionaries.length) },
                {
                  label: 'System-managed dictionaries',
                  value: String(
                    data.config.dictionaries.filter((item) => item.isSystemManaged).length,
                  ),
                },
                {
                  label: 'Total entries',
                  value: String(
                    data.config.dictionaries.reduce((sum, item) => sum + item.entryCount, 0),
                  ),
                },
              ]}
            />
          </AdminSectionCard>

          <AdminSectionCard
            description="Each dictionary card is mapped from backend metadata rather than page constants."
            title="Available Dictionaries"
          >
            <div className="section-card__actions-row section-card__actions-row--start">
              <Button as={Link} variant="secondary" to="/admin/dictionaries">
                Manage dictionary entries
              </Button>
            </div>
            <AdminList
              emptyMessage="No dictionaries were returned."
              items={data.config.dictionaries.map<AdminListItem>((item) => ({
                description: item.entityType,
                id: item.id,
                metrics: [
                  { label: 'Entries', value: String(item.entryCount) },
                  { label: 'Enabled', value: String(item.enabledEntryCount) },
                  {
                    label: 'Mode',
                    value: item.isSystemManaged ? 'System managed' : 'Admin managed',
                  },
                ],
                title: item.displayName,
              }))}
            />
          </AdminSectionCard>
        </div>
      );
    case 'integrations':
      return (
        <div className="admin-panel__cards">
          <AdminSectionCard
            description="The admin panel consumes integration summaries from the dedicated aggregation endpoint."
            title="Integration Summary"
          >
            <AdminConfigViewer
              emptyMessage="No integrations are configured."
              entries={data.integrations.integrations.map((item) => ({
                label: item.provider.toUpperCase(),
                supportingText: item.lastProjectSyncSummary ?? 'No sync summary available.',
                value: item.status,
              }))}
            />
          </AdminSectionCard>

          <AdminSectionCard
            description="Operational capabilities stay visible without exposing underlying adapter secrets."
            title="Provider Details"
          >
            <div className="section-card__actions-row section-card__actions-row--start">
              <Button as={Link} variant="secondary" to="/admin/integrations">
                Manage integrations
              </Button>
            </div>
            <AdminList
              emptyMessage="No integration details were returned."
              items={data.integrations.integrations.map<AdminListItem>((item) => ({
                description: item.lastProjectSyncAt
                  ? `Last sync ${formatDateTime(item.lastProjectSyncAt)}`
                  : 'No sync recorded yet',
                id: item.provider,
                metrics: [
                  {
                    label: 'Project sync',
                    value: item.supportsProjectSync ? 'Supported' : 'Not supported',
                  },
                  {
                    label: 'Work evidence',
                    value: item.supportsWorkEvidence ? 'Supported' : 'Not supported',
                  },
                  {
                    label: 'Last outcome',
                    value: item.lastProjectSyncOutcome ?? 'Not available',
                  },
                ],
                title: item.provider.toUpperCase(),
              }))}
            />
          </AdminSectionCard>
        </div>
      );
    case 'notifications':
      return (
        <div className="admin-panel__cards">
          <AdminSectionCard
            description="Enabled channels and template inventory are loaded from admin notification aggregation endpoints."
            title="Notification Channels"
          >
            <AdminList
              emptyMessage="No notification channels are enabled."
              items={data.notifications.channels.map<AdminListItem>((item) => ({
                description: item.kind,
                id: item.channelKey,
                metrics: [{ label: 'Enabled', value: item.isEnabled ? 'Yes' : 'No' }],
                title: item.displayName,
              }))}
            />
          </AdminSectionCard>

          <AdminSectionCard
            description="Templates remain the source of message composition. The page only surfaces the configured inventory."
            title="Notification Templates"
          >
            <div className="section-card__actions-row section-card__actions-row--start">
              <Button as={Link} variant="secondary" to="/admin/notifications">
                Manage notification templates
              </Button>
            </div>
            <AdminList
              emptyMessage="No notification templates are configured."
              items={data.notifications.templates.map<AdminListItem>((item) => ({
                description: item.eventName,
                id: item.templateKey,
                metrics: [{ label: 'Channel', value: item.channelKey }],
                title: item.displayName,
              }))}
            />
          </AdminSectionCard>
        </div>
      );
    case 'settings':
      return (
        <div className="admin-panel__cards">
          <AdminSectionCard
            description="System flags are configuration-driven and rendered generically so new flags can appear without UI rewrites."
            title="Runtime Settings"
          >
            <div className="section-card__actions-row section-card__actions-row--start">
              <Button as={Link} variant="secondary" to="/admin/monitoring">
                Open monitoring view
              </Button>
              <Button as={Link} variant="secondary" to="/admin/audit">
                Browse business audit
              </Button>
            </div>
            {isFeatureEnabled('dsRefresh') ? (
              <SystemFlagsSettingsList />
            ) : (
              <AdminConfigViewer
                emptyMessage="No system settings were returned."
                entries={data.settings.systemFlags.map((item) => ({
                  label: formatFeatureFlag(item.key),
                  supportingText: `${item.description} Source: ${item.source}`,
                  value: item.enabled ? 'Enabled' : 'Disabled',
                }))}
              />
            )}
          </AdminSectionCard>
        </div>
      );
    case 'assignment-workflow':
      return (
        <div className="admin-panel__cards">
          <AssignmentWorkflowSettings />
        </div>
      );
    default:
      return <></>;
  }
}
