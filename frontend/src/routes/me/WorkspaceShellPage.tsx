import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Button, Tabs } from '@/components/ds';
import { fetchInbox } from '@/lib/api/inbox';
import { fetchMyLeaveRequests } from '@/lib/api/leaveRequests';
import { listProjectPositions } from '@/lib/api/project-positions';
import { mapListResponseToDirectory } from '@/features/lean-migration/position-to-assignment-mapper';

import { LeaveTab } from './LeaveTab';
import { MeCasesTab } from './MeCasesTab';
import { OverviewTab } from './OverviewTab';
import { ProjectsTab } from './ProjectsTab';
import { SkillsTab } from './SkillsTab';
import { TimeTab } from './TimeTab';

export type WorkspaceTab =
  | 'overview'
  | 'time'
  | 'leave'
  | 'projects'
  | 'skills'
  | 'cases'
  | 'inbox'
  | 'settings';

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'time', label: 'Time' },
  { id: 'leave', label: 'Leave' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'cases', label: 'Cases' },
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

  // V2-B.2 — per-tab live counts: unread Inbox / pending Leave / active
  // Projects. Counts come from the same endpoints the sub-tabs already use;
  // the duplicate fetch is one-time on shell mount and gated by a personId.
  const [inboxCount, setInboxCount] = useState<number | null>(null);
  const [leaveCount, setLeaveCount] = useState<number | null>(null);
  const [projectsCount, setProjectsCount] = useState<number | null>(null);
  useEffect(() => {
    if (!principal?.personId) return;
    const personId = principal.personId;
    let active = true;
    Promise.all([
      fetchInbox({ limit: 100 }).catch(() => null),
      fetchMyLeaveRequests().catch(() => null),
      listProjectPositions({ activePersonId: personId, take: 200 })
        .then(mapListResponseToDirectory)
        .catch(() => null),
    ]).then(([inbox, leave, assignments]) => {
      if (!active) return;
      if (inbox) setInboxCount(inbox.filter((n) => !n.readAt).length);
      if (leave) setLeaveCount(leave.filter((l) => l.status === 'PENDING').length);
      if (assignments) {
        const now = Date.now();
        setProjectsCount(
          assignments.items.filter((a) => !a.endDate || new Date(a.endDate).getTime() >= now).length,
        );
      }
    });
    return () => {
      active = false;
    };
  }, [principal?.personId]);

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

  // V2-B.2 — tab labels with live counts where the data is genuinely useful.
  const countBadge = (n: number): ReactNode => (
    <span style={{ marginLeft: 6, fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
      ({n})
    </span>
  );
  const labeledTabs: { id: WorkspaceTab; label: ReactNode }[] = TABS.map((t) => {
    if (t.id === 'inbox' && inboxCount != null && inboxCount > 0) {
      return { id: t.id, label: <>Inbox {countBadge(inboxCount)}</> };
    }
    if (t.id === 'leave' && leaveCount != null && leaveCount > 0) {
      return { id: t.id, label: <>Leave {countBadge(leaveCount)}</> };
    }
    if (t.id === 'projects' && projectsCount != null && projectsCount > 0) {
      return { id: t.id, label: <>Projects {countBadge(projectsCount)}</> };
    }
    return t;
  });

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
        tabs={labeledTabs}
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
        {activeTab === 'skills' && <SkillsTab />}
        {activeTab === 'cases' && <MeCasesTab />}
        {activeTab === 'inbox' && (
          <SectionCard title="Inbox">
            <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-compact)' }}>
              All in-app notifications for your account — approvals, mentions, and assignment changes.
            </p>
            <Link
              to="/notifications"
              data-testid="me-inbox-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-alt)',
                color: 'var(--color-accent)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Open inbox →
            </Link>
          </SectionCard>
        )}
        {activeTab === 'settings' && (
          <SectionCard title="Account settings">
            <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-compact)' }}>
              Manage your account credentials, notification preferences, locale, and password.
            </p>
            <Link
              to="/settings/account"
              data-testid="me-settings-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-alt)',
                color: 'var(--color-accent)',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Open account settings →
            </Link>
          </SectionCard>
        )}
      </div>
    </PageContainer>
  );
}

/**
 * Lightweight default export — keeps router import-shape consistent with
 * sibling pages.
 */
export default WorkspaceShellPage;
