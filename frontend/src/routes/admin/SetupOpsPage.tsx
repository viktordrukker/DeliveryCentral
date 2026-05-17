import { Link } from 'react-router-dom';

import { Button } from '@/components/ds';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';

/**
 * F-13.7 / D-117 — `/admin/setup` post-install control surface.
 *
 * Pairs with the one-shot install wizard at `/setup`. Where the wizard
 * is "stand up a new tenant", this page is "operate the running one":
 * a single landing surface admins reach when they need to re-run a
 * setup step, check current install state, or get to the diagnostic
 * surfaces. Renders deep links to the existing admin pages instead of
 * embedding their UI — keeps this page small and surface-only.
 */
export function SetupOpsPage(): JSX.Element {
  return (
    <PageContainer testId="setup-ops-page">
      <PageHeader
        eyebrow="Administration"
        title="Setup Operations"
        subtitle="Post-install control surface — re-run setup steps, inspect install state, and reach diagnostic surfaces."
        actions={
          <Button as={Link} to="/admin" variant="secondary">
            Back to admin panel
          </Button>
        }
      />

      <SectionCard title="Re-run setup">
        <p style={{ marginTop: 0, color: 'var(--color-text-muted)' }}>
          The install wizard at <code>/setup</code> can be re-entered to re-apply
          migrations or re-seed the database when needed.
        </p>
        <Button as={Link} to="/setup" variant="primary" data-testid="setup-ops-rerun-wizard">
          Open setup wizard
        </Button>
      </SectionCard>

      <SectionCard title="Install state &amp; diagnostics">
        <p style={{ marginTop: 0, color: 'var(--color-text-muted)' }}>
          Diagnostic surfaces are split across the admin section — these
          links jump straight to the most-asked-for pages.
        </p>
        <ul style={{ paddingLeft: 'var(--space-4)', margin: 0 }}>
          <li>
            <Link to="/admin/monitoring">Monitoring</Link> — health, readiness,
            diagnostics, audit visibility
          </li>
          <li>
            <Link to="/admin/integrations/registry">Integrations registry</Link> —
            adapter status, last-sync metadata
          </li>
          <li>
            <Link to="/admin/settings">Platform settings</Link> — every tunable knob
            (timesheets, capitalisation, pulse, notifications, security)
          </li>
          <li>
            <Link to="/admin/feature-flags">Feature flags</Link> — per-tenant flag
            registry with enable/disable
          </li>
          <li>
            <Link to="/admin/audit">Business audit</Link> — append-only business
            event stream
          </li>
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
