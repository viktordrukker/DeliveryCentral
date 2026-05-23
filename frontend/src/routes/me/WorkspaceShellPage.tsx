import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';

import { AccountSettingsPage } from '@/routes/settings/AccountSettingsPage';
import { InboxPage } from '@/routes/notifications/InboxPage';
import { MyTimePage } from '@/routes/my-time/MyTimePage';

import { LeaveTab } from './LeaveTab';
import { OverviewTab } from './OverviewTab';
import { ProjectsTab } from './ProjectsTab';

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
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={() => navigate(`/people/${principal.personId}`)}
            >
              View profile
            </button>
          ) : undefined
        }
      />
      <nav
        className="me-tab-strip"
        role="tablist"
        aria-label="Workspace tabs"
        style={{
          display: 'flex',
          gap: 4,
          padding: '0 var(--space-3)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => {
          const selected = t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`me-tab-${t.id}`}
              aria-controls={`me-tabpanel-${t.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(t.id)}
              data-tab={t.id}
              data-active={selected || undefined}
              style={{
                background: 'transparent',
                border: 0,
                padding: '10px 14px',
                cursor: 'pointer',
                color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: selected ? 600 : 400,
                borderBottom: selected ? '2px solid var(--color-accent)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div
        role="tabpanel"
        id={`me-tabpanel-${activeTab}`}
        aria-labelledby={`me-tab-${activeTab}`}
        data-testid={`me-tabpanel-${activeTab}`}
      >
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'time' && <MyTimePage />}
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
