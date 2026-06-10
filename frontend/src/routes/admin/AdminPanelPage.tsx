import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useImpersonation } from '@/app/impersonation-context';

import { AssignmentWorkflowSettings } from '@/components/admin/AssignmentWorkflowSettings';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { PersonSelect } from '@/components/common/PersonSelect';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  AdminAccountItem,
  createLocalAccount,
  deleteAdminAccount,
  fetchAdminAccounts,
  updateAdminAccount,
} from '@/lib/api/admin';
import { Button, FormField, Input, Table, type Column } from '@/components/ds';
import { AdminRightRail } from './AdminRightRail';
import { BusinessAuditAdminContent } from './BusinessAuditPage';
import { DictionariesAdminContent } from './DictionariesPage';
import { FeatureFlagsAdminContent } from './FeatureFlagsAdminPage';
import { IntegrationsAdminContent } from './IntegrationsAdminPage';
import { OrganizationConfigAdminContent } from './OrganizationConfigPage';
import { RolePermissionAdminContent } from './RolePermissionAdminPage';
import { SettingsAdminContent } from './SettingsPage';

// V2 SoT PR 12 — Admin Settings DS canvas conformance (page-admin-setup.jsx).
//
// 5 DS tabs (Platform / Roles & RBAC / Integrations / Dictionaries / Monitoring)
// over a 1fr/280px split. Right rail surfaces System + Backups + Service health
// + Recent operator actions. All legacy AdminSectionCard ribbons removed.
type AdminTabKey =
  | 'platform'
  | 'roles'
  | 'integrations'
  | 'dicts'
  | 'monitor';

interface AdminTabDefinition {
  description: string;
  key: AdminTabKey;
  title: string;
}

const adminTabs: AdminTabDefinition[] = [
  {
    description: 'Tenant-wide behaviour: timesheets, capitalisation, pulse, notifications, security, position workflow.',
    key: 'platform',
    title: 'Platform',
  },
  {
    description: 'RBAC matrix, role-preset overrides, local accounts, business audit log viewer.',
    key: 'roles',
    title: 'Roles & RBAC',
  },
  {
    description: 'Provider health, sync status, retry/test controls for JSM, M365, LDAP, Jira PPM.',
    key: 'integrations',
    title: 'Integrations',
  },
  {
    description: 'Controlled vocabularies, organization configuration, leave policies, vendors.',
    key: 'dicts',
    title: 'Dictionaries',
  },
  {
    description: 'Feature flags, monitoring, webhooks, V2 soak checklist, system diagnostics.',
    key: 'monitor',
    title: 'Monitoring',
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
  const [searchParams, setSearchParams] = useSearchParams();

  // V2 SoT PR 12 — single URL driver: ?tab=<AdminTabKey>.
  const tabParam = searchParams.get('tab');
  const isValidTab = (key: string | null): key is AdminTabKey =>
    !!key && adminTabs.some((t) => t.key === key);

  const initialTab: AdminTabKey = isValidTab(tabParam) ? tabParam : 'platform';
  const [selectedTab, setSelectedTabState] = useState<AdminTabKey>(initialTab);

  const setSelectedTab = (key: AdminTabKey): void => {
    setSelectedTabState(key);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', key);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (isValidTab(tabParam) && tabParam !== selectedTab) {
      setSelectedTabState(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

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

  const activeTab = useMemo(
    () => adminTabs.find((tab) => tab.key === selectedTab) ?? adminTabs[0],
    [selectedTab],
  );

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Administration"
        subtitle="Platform settings, RBAC, integrations, dictionaries, and monitoring — config-driven and audit-logged."
        title="Admin"
        tabs={adminTabs.map((t) => ({ id: t.key, label: t.title }))}
        activeTab={selectedTab}
        onTabChange={(id) => setSelectedTab(id as AdminTabKey)}
      />

      <section className="admin-panel admin-panel--ds" data-testid="admin-tabbed">
        <main className="admin-panel__main">
          <header className="admin-panel__main-header">
            <h2>{activeTab.title}</h2>
            <p>{activeTab.description}</p>
          </header>
          <AdminTabContent
            accountForm={accountForm}
            onCreateAccount={handleCreateAccount}
            onFormChange={setAccountForm}
            tab={selectedTab}
          />
        </main>
        <AdminRightRail />
      </section>
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
    case 'platform':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-platform">
          <SettingsAdminContent />
          <SectionCard title="Position Workflow">
            <AssignmentWorkflowSettings />
          </SectionCard>
        </div>
      );
    case 'roles':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-roles">
          <SectionCard title="Roles & permissions">
            <RolePermissionAdminContent />
          </SectionCard>
          <SectionCard title="User accounts">
            <AdminAccountsSection
              accountForm={accountForm}
              onCreateAccount={onCreateAccount}
              onFormChange={onFormChange}
            />
          </SectionCard>
          <SectionCard title="Business audit">
            <BusinessAuditAdminContent />
          </SectionCard>
        </div>
      );
    case 'integrations':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-integrations">
          <IntegrationsAdminContent />
        </div>
      );
    case 'dicts':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-dicts">
          <SectionCard title="Organization configuration">
            <OrganizationConfigAdminContent />
          </SectionCard>
          <SectionCard title="Dictionaries">
            <DictionariesAdminContent />
          </SectionCard>
        </div>
      );
    case 'monitor':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-monitor">
          <FeatureFlagsAdminContent />
        </div>
      );
    default:
      return <></>;
  }
}

interface AdminAccountsSectionProps {
  accountForm: AccountFormState;
  onCreateAccount: (e: React.FormEvent) => Promise<void>;
  onFormChange: React.Dispatch<React.SetStateAction<AccountFormState>>;
}

function AdminAccountsSection({
  accountForm,
  onCreateAccount,
  onFormChange,
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
    <>
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

      <div style={{ marginTop: 'var(--space-4)' }}>
        <p className="admin-section-card__description">
          Create a local authentication account linked to an existing person record.
          Use person IDs from the People directory.
        </p>
        {accountForm.error ? <ErrorState description={accountForm.error} /> : null}
        {accountForm.success ? <div className="success-banner">{accountForm.success}</div> : null}
        <form
          className="entity-form"
          onSubmit={(e) => { void onCreateAccount(e); }}
          style={{ maxWidth: '480px' }}
        >
          <PersonSelect
            label="Person"
            onChange={(value) => { onFormChange((prev) => ({ ...prev, personId: value })); }}
            required
            value={accountForm.personId}
          />
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
      </div>
    </>
  );
}
