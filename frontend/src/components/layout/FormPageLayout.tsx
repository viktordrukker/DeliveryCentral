import { ReactNode } from 'react';

import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';

interface FormPageLayoutProps {
  /** Optional eyebrow above the title (typically the entity-type label, e.g. "Projects"). */
  eyebrow?: string;
  /** Page title. Required. */
  title: string;
  /** Optional one-line subtitle / description. */
  subtitle?: string;
  /** Optional header actions (typically a "Back to …" link). */
  actions?: ReactNode;
  /** Optional banners rendered above the form (loading / error / success). */
  banners?: ReactNode;
  /** Form sections — typically `<SectionCard>` instances. */
  children: ReactNode;
  /**
   * Optional sticky footer for submit/cancel actions. Sticks to the bottom of
   * the viewport (or the page-container) so long forms keep the primary
   * action reachable without scrolling.
   */
  stickyFooter?: ReactNode;
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
}

/**
 * Phase DS-5-1 — compound layout for the Create/Edit Form grammar (Grammar 4
 * per `docs/planning/phase18-page-grammars.md`).
 *
 * Composes:
 *   `<PageContainer>` → `<PageHeader>` → optional `banners` → children → optional sticky footer
 *
 * Most form pages have their submit/cancel inside the form itself (the wizard
 * pattern in `ProjectLifecycleForm`, the inline footer in `LeaveRequestPage`
 * etc.) — those don't need `stickyFooter`. It's there for long forms where
 * the action would scroll out of reach.
 */
export function FormPageLayout({
  eyebrow,
  title,
  subtitle,
  actions,
  banners,
  children,
  stickyFooter,
  testId,
}: FormPageLayoutProps): JSX.Element {
  return (
    <PageContainer testId={testId}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={actions}
      />
      {banners}
      {children}
      {stickyFooter ? (
        <div className="form-page-layout__sticky-footer" role="region" aria-label="Form actions">
          {stickyFooter}
        </div>
      ) : null}
    </PageContainer>
  );
}
