import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';

interface AdminTabbedShellProps {
  /** Page title rendered in PageHeader. */
  title: string;
  /** Optional subtitle / description for PageHeader. */
  subtitle?: string;
  /** Optional eyebrow above the title. */
  eyebrow?: string;
  /** Children rendered below the tab strip. */
  children: ReactNode;
  /** data-testid for E2E selectors. */
  testId?: string;
}

interface AdminShellTab {
  id: string;
  label: string;
  path: string;
}

// V2 Wave-3 W3-01 — single nav strip across the four admin pages that are
// most-frequently context-switched between. Each page composes the shell to
// stay grammar-#7 (Admin Control Surface) compliant while giving operators a
// continuity-preserving tab bar instead of bouncing back to /admin to switch.
const ADMIN_SHELL_TABS: AdminShellTab[] = [
  { id: 'settings', label: 'Platform Settings', path: '/admin/settings' },
  { id: 'organization-config', label: 'Organization Config', path: '/admin/organization-config' },
  { id: 'hris', label: 'HRIS Integration', path: '/admin/hris' },
  { id: 'webhooks', label: 'Webhooks', path: '/admin/webhooks' },
];

export function AdminTabbedShell({
  title,
  subtitle,
  eyebrow = 'Admin',
  children,
  testId,
}: AdminTabbedShellProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab =
    ADMIN_SHELL_TABS.find((tab) => location.pathname.startsWith(tab.path))?.id ?? 'settings';

  return (
    <PageContainer testId={testId} viewport>
      <PageHeader
        activeTab={activeTab}
        eyebrow={eyebrow}
        onTabChange={(tabId) => {
          const next = ADMIN_SHELL_TABS.find((tab) => tab.id === tabId);
          if (next && next.path !== location.pathname) {
            navigate(next.path);
          }
        }}
        subtitle={subtitle}
        tabs={ADMIN_SHELL_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        title={title}
      />
      {children}
    </PageContainer>
  );
}
