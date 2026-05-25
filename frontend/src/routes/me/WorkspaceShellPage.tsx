import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, Tabs } from '@/components/ds';

import { AccountSettingsPage } from '@/routes/settings/AccountSettingsPage';
import { InboxPage } from '@/routes/notifications/InboxPage';

import { LeaveTab } from './LeaveTab';
import { OverviewTab } from './OverviewTab';
import { ProjectsTab } from './ProjectsTab';
import { TimeTab } from './TimeTab';

export type WorkspaceTab = 'overview' | 'time' | 'leave' | 'projects' | 'inbox' | 'settings';

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'time', label: 'Time' },
  { id: 'leave', label: 'Leave' },
  { id: 'projects', label: 'Projects' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'settings', label: 'Settings' },
];

const LAST_TAB_STORAGE_KEY = 'dc:me:last-tab';

function readLastTab(): WorkspaceTab | null {
  if (typeof window === 'undefined') return null;
  const v = window.sessionStorage.getItem(LAST_TAB_STORAGE_KEY);
  return TABS.some((t) => t.id === v) ? (v as WorkspaceTab) : null;
}

function writeLastTab(t: WorkspaceTab): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(LAST_TAB_STORAGE_KEY, t);
}

/**
 * /me Employee Workspace — single shell that hosts the six self-service
 * surfaces under one route. Tab selection is URL-driven (`?tab=...`) so
 * deep-linking works; sessionStorage remembers the last tab for re-entry
 * within a session (UX Law 10).
 *
 * Tabs that are NOT yet redesigned simply mount their pre-existing page
 * inside the shell — no rewrite needed. Overview/Leave/Projects are
 * redesigned in subsequent PRs.
 *
 * Gated by `flag.workspaceMe`. The router wraps this in FeatureGuard,
 * so this component renders only when the flag is ON for the viewer.
 */
export function WorkspaceShellPage(): JSX.Element {
  const { principal } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedTab = (params.get('tab') as WorkspaceTab | null) ?? null;
  const activeTab: WorkspaceTab = useMemo(() => {
    if (requestedTab && TABS.some((t) => t.id === requestedTab)) return requestedTab;
    return readLastTab() ?? 'overview';
  }, [requestedTab]);

  // Mirror the resolved tab back to the URL so deep-links and sessionStorage agree.
  useEffect(() => {
    if (requestedTab !== activeTab) {
      const next = new URLSearchParams(params);
      next.set('tab', activeTab);
      setParams(next, { replace: true });
    }
  }, [activeTab, params, requestedTab, setParams]);

  // Workspace-continuity: remember last tab.
  useEffect(() => {
    writeLastTab(activeTab);
  }, [activeTab]);

  const selectTab = (id: WorkspaceTab): void => {
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next, { replace: false });
  };

  if (!principal) {
    return (
      <PageContainer testId="me-workspace-loading">
        <PageHeader eyebrow="Workspace" title="Loading…" />
      </PageContainer>
    );
  }

  const displayName = principal.displayName ?? principal.email ?? 'You';
  const roleLabels = (principal.roles ?? [])
    .map((r) => r.replace(/_/g, ' '))
    .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
    .join(' · ');

  return (
    <PageContainer testId="me-workspace">
      <PageHeader
        eyebrow="Workspace"
        title={displayName}
        subtitle={roleLabels}
        actions={
          principal.personId ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/people/${principal.personId}`)}
            >
              View profile
            </Button>
          ) : undefined
        }
      />
      <Tabs
        tabs={TABS}
        value={activeTab}
        onValueChange={(id) => selectTab(id as WorkspaceTab)}
        ariaLabel="Workspace tabs"
        idPrefix="me-tab"
        className="me-tab-strip"
        style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-4)' }}
      />

      <div
        role="tabpanel"
        id={`me-tabpanel-${activeTab}`}
        aria-labelledby={`me-tab-${activeTab}`}
        data-testid={`me-tabpanel-${activeTab}`}
      >
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'time' && <TimeTab />}
        {activeTab === 'leave' && <LeaveTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'inbox' && <InboxPage />}
        {activeTab === 'settings' && <AccountSettingsPage />}
      </div>
    </PageContainer>
  );
}

/**
 * Lightweight default export — keeps router import-shape consistent with
 * sibling pages.
 */
export default WorkspaceShellPage;
