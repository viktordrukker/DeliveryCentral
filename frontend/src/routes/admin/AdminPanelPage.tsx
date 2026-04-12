import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useImpersonation } from '@/app/impersonation-context';

import { AdminConfigViewer } from '@/components/admin/AdminConfigViewer';
import { AdminList, AdminListItem } from '@/components/admin/AdminList';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useAdminPanel } from '@/features/admin/useAdminPanel';
import {
  AdminAccountItem,
  createLocalAccount,
  deleteAdminAccount,
  fetchAdminAccounts,
  updateAdminAccount,
} from '@/lib/api/admin';
import { formatFeatureFlag } from '@/lib/labels';

type AdminSectionKey = 'accounts' | 'dictionaries' | 'integrations' | 'notifications' | 'settings';

interface AdminSectionDefinition {
  description: string;
  key: AdminSectionKey;
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
  const [selectedSection, setSelectedSection] = useState<AdminSectionKey>('accounts');
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

  const totalItemCount = state.data
    ? state.data.config.dictionaries.length +
      state.data.integrations.integrations.length +
      state.data.notifications.channels.length +
      state.data.notifications.templates.length +
      state.data.settings.systemFlags.length
    : 0;

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Administration"
        subtitle="Consolidate metadata, integrations, notifications, and runtime settings behind explicit admin aggregation endpoints. The UI stays config-driven and avoids embedding business-specific entities."
        title="Admin Panel"
      />

      {state.isLoading ? <LoadingState label="Loading admin panel..." /> : null}
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
                  <button
                    className={`admin-panel__sidebar-item${
                      section.key === selectedSection ? ' admin-panel__sidebar-item--active' : ''
                    }`}
                    key={section.key}
                    onClick={() => setSelectedSection(section.key)}
                    type="button"
                  >
                    <span className="admin-panel__sidebar-item-title">{section.title}</span>
                    <span className="admin-panel__sidebar-item-description">{section.description}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="admin-panel__main">
              <header className="admin-panel__main-header">
                <h2>{activeSection.title}</h2>
                <p>{activeSection.description}</p>
              </header>

              {selectedSection === 'accounts'
                ? <AdminAccountsSection
                    accountForm={accountForm}
                    onFormChange={setAccountForm}
                    onCreateAccount={handleCreateAccount}
                  />
                : state.data
                  ? renderSection(selectedSection, state.data)
                  : null}
            </section>
          </div>
        )
      ) : null}
    </PageContainer>
  );
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
        {accountsLoading ? <LoadingState label="Loading accounts..." /> : null}
        {accountsError ? <ErrorState description={accountsError} /> : null}
        {actionError ? <ErrorState description={actionError} /> : null}
        {!accountsLoading && !accountsError && accounts.length === 0 ? (
          <EmptyState description="No local accounts found." title="No accounts" />
        ) : null}
        {!accountsLoading && accounts.length > 0 ? (
          <div className="data-table" style={{ marginTop: '8px' }}>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr className="data-table__row" key={account.id}>
                    <td>{account.email}</td>
                    <td>{account.roles.join(', ')}</td>
                    <td>
                      <span style={{ color: account.isEnabled ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {account.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="button button--secondary"
                          onClick={() => { void handleToggleEnabled(account); }}
                          style={{ fontSize: '12px', padding: '2px 8px' }}
                          type="button"
                        >
                          {account.isEnabled ? 'Disable' : 'Enable'}
                        </button>
                        {account.personId ? (
                          <button
                            className="button button--secondary"
                            onClick={() => {
                              startImpersonation({
                                displayName: account.displayName,
                                personId: account.personId as string,
                                roles: account.roles,
                              });
                            }}
                            style={{ fontSize: '12px', padding: '2px 8px' }}
                            title="View the application as this user"
                            type="button"
                          >
                            View as
                          </button>
                        ) : null}
                        <button
                          className="button button--danger"
                          onClick={() => handleDelete(account)}
                          style={{ fontSize: '12px', padding: '2px 8px' }}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminSectionCard>

      <SectionCard title="Create Local Account">
        <p style={{ marginBottom: '16px' }}>
          Creates a local authentication account linked to an existing person record.
          Use person IDs from the People directory.
        </p>
        {accountForm.error ? <ErrorState description={accountForm.error} /> : null}
        {accountForm.success ? <div className="success-banner">{accountForm.success}</div> : null}
        <form
          onSubmit={(e) => { void onCreateAccount(e); }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}
        >
          <label>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Person ID</span>
            <input
              className="input"
              onChange={(e) => { onFormChange((prev) => ({ ...prev, personId: e.target.value })); }}
              placeholder="UUID of the person record"
              required
              type="text"
              value={accountForm.personId}
            />
          </label>
          <label>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Email</span>
            <input
              className="input"
              onChange={(e) => { onFormChange((prev) => ({ ...prev, email: e.target.value })); }}
              placeholder="login@example.com"
              required
              type="email"
              value={accountForm.email}
            />
          </label>
          <label>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Password</span>
            <input
              className="input"
              onChange={(e) => { onFormChange((prev) => ({ ...prev, password: e.target.value })); }}
              placeholder="Minimum 8 characters"
              required
              type="password"
              value={accountForm.password}
            />
          </label>
          <label>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>
              Roles (comma-separated)
            </span>
            <input
              className="input"
              onChange={(e) => { onFormChange((prev) => ({ ...prev, roles: e.target.value })); }}
              placeholder="delivery_manager, admin, hr_manager"
              required
              type="text"
              value={accountForm.roles}
            />
            <span style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Available: admin, delivery_manager, project_manager, resource_manager, hr_manager, director, employee
            </span>
          </label>
          <div>
            <button className="button" disabled={accountForm.isSubmitting} type="submit">
              {accountForm.isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}

function renderSection(
  section: AdminSectionKey,
  data: NonNullable<ReturnType<typeof useAdminPanel>['data']>,
): JSX.Element {
  switch (section) {
    case 'dictionaries':
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
              <Link className="button button--secondary" to="/admin/dictionaries">
                Manage dictionary entries
              </Link>
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
              <Link className="button button--secondary" to="/admin/integrations">
                Manage integrations
              </Link>
            </div>
            <AdminList
              emptyMessage="No integration details were returned."
              items={data.integrations.integrations.map<AdminListItem>((item) => ({
                description: item.lastProjectSyncAt
                  ? `Last sync ${new Date(item.lastProjectSyncAt).toLocaleString('en-US')}`
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
              <Link className="button button--secondary" to="/admin/notifications">
                Manage notification templates
              </Link>
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
              <Link className="button button--secondary" to="/admin/monitoring">
                Open monitoring view
              </Link>
              <Link className="button button--secondary" to="/admin/audit">
                Browse business audit
              </Link>
            </div>
            <AdminConfigViewer
              emptyMessage="No system settings were returned."
              entries={data.settings.systemFlags.map((item) => ({
                label: formatFeatureFlag(item.key),
                supportingText: `${item.description} Source: ${item.source}`,
                value: item.enabled ? 'Enabled' : 'Disabled',
              }))}
            />
          </AdminSectionCard>
        </div>
      );
    default:
      return <></>;
  }
}
