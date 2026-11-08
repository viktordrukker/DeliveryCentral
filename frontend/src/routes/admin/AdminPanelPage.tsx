import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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

// V2 SoT PR 12 — deep-link card descriptors per tab. Each entry surfaces an
// existing /admin/* route from the centralized route manifest so users
// land at /admin and reach every admin sub-page without round-tripping
// through the sidebar. Routes remain deep-linkable individually.
interface AdminDeepLink {
  description: string;
  label: string;
  to: string;
}

const PLATFORM_DEEP_LINKS: AdminDeepLink[] = [
  { description: 'Lock past periods so timesheets and capitalisation cannot be edited retroactively.', label: 'Manage period locks →', to: '/admin/period-locks' },
  { description: 'Bill-rate cards and per-(role × grade × skill) hourly rates used by the J2 resolver.', label: 'Manage rate cards →', to: '/admin/rate-cards' },
  { description: 'Re-run install steps, inspect setup state, and reach diagnostic surfaces.', label: 'Open setup operations →', to: '/admin/setup' },
  { description: 'Author and publish Help Center articles end users see from the in-app help button.', label: 'Manage help articles →', to: '/admin/help' },
];

const INTEGRATIONS_DEEP_LINKS: AdminDeepLink[] = [
  { description: 'Uniform registry of every adapter (Jira, M365, RADIUS, JSM, LDAP, LLM) with status and last-sync.', label: 'Open integrations registry →', to: '/admin/integrations/registry' },
  { description: 'Configure single sign-on (OIDC) provider, client credentials, and auto-provisioning.', label: 'Configure SSO →', to: '/admin/integrations/sso' },
  { description: 'Manage outbound webhook subscriptions with HMAC-SHA256 signed delivery.', label: 'Manage webhooks →', to: '/admin/webhooks' },
  { description: 'Configure BambooHR or Workday HRIS integration for automated employee sync.', label: 'Configure HRIS →', to: '/admin/hris' },
  { description: 'Read-only health, readiness, and diagnostics visibility.', label: 'Open monitoring view →', to: '/admin/monitoring' },
];

const ROLES_DEEP_LINKS: AdminDeepLink[] = [
  { description: 'View and manage ABAC policies per role and resource.', label: 'Manage access policies →', to: '/admin/access-policies' },
  { description: 'Configure who approves each governed action (activation, budget change, person release).', label: 'Open responsibility matrix →', to: '/admin/responsibility-matrix' },
  { description: 'Tenant-defined custom roles (Squad Lead, Tribe Lead, IT Service Owner).', label: 'Manage custom roles →', to: '/admin/governance/roles' },
  { description: 'Admin matrix of 30 V2 journeys × 8 roles — staging soak gate.', label: 'Open V2 soak checklist →', to: '/admin/v2-soak-checklist' },
  { description: 'Notification channel and template management.', label: 'Manage notifications →', to: '/admin/notifications' },
];

const DICTS_DEEP_LINKS: AdminDeepLink[] = [
  { description: 'Per-leave-type accrual, max carry-over, and approval chains.', label: 'Manage leave policies →', to: '/admin/leave-policies' },
  { description: 'Bulk import people from a CSV file — up to 200+ records at once.', label: 'Open bulk import →', to: '/admin/people/import' },
  { description: 'Manage external vendors and subcontractors for project staffing.', label: 'Manage vendors →', to: '/admin/vendors' },
  { description: 'Configure scoring thresholds for the 16-axis project radiator.', label: 'Manage radiator thresholds →', to: '/admin/radiator-thresholds' },
];

const MONITOR_DEEP_LINKS: AdminDeepLink[] = [
  { description: 'Read-only health, readiness, and diagnostics visibility.', label: 'Open monitoring view →', to: '/admin/monitoring' },
  { description: 'Browse the immutable business audit log of governed actions.', label: 'Browse business audit →', to: '/admin/audit' },
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

function AdminDeepLinkCards({ links }: { links: AdminDeepLink[] }): JSX.Element {
  return (
    <SectionCard title="More admin surfaces">
      <div className="admin-panel__deep-links" data-testid="admin-deep-links">
        {links.map((link) => (
          <div className="admin-panel__deep-link-row" key={link.to}>
            <p className="admin-section-card__description">{link.description}</p>
            <Button as={Link} variant="secondary" to={link.to}>
              {link.label}
            </Button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
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
          <AdminDeepLinkCards links={PLATFORM_DEEP_LINKS} />
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
          <AdminDeepLinkCards links={ROLES_DEEP_LINKS} />
        </div>
      );
    case 'integrations':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-integrations">
          <IntegrationsAdminContent />
          <AdminDeepLinkCards links={INTEGRATIONS_DEEP_LINKS} />
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
          <AdminDeepLinkCards links={DICTS_DEEP_LINKS} />
        </div>
      );
    case 'monitor':
      return (
        <div className="admin-panel__cards" data-testid="admin-tab-monitor">
          <FeatureFlagsAdminContent />
          <AdminDeepLinkCards links={MONITOR_DEEP_LINKS} />
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
