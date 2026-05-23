/**
 * WO-4.12 — StaffingRequestDetailPage redesign source-shape assertions.
 *
 * Verifies the page now uses the Detail Surface grammar (DS-5):
 *   <DetailLayout> with WorkflowStages banner + stage-specific action card.
 *
 * Replaces the old `<PageContainer>` + `<PageHeader>` composition.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('WO-4.12 — StaffingRequestDetailPage redesign (source-shape)', () => {
  const src = readFileSync(
    'src/routes/staffing-requests/StaffingRequestDetailPage.tsx',
    'utf-8',
  );

  it('imports DetailLayout from @/components/layout', () => {
    expect(src).toMatch(/import\s*\{\s*DetailLayout\s*\}\s*from\s*'@\/components\/layout\/DetailLayout'/);
  });

  it('top-level body wraps in <DetailLayout>', () => {
    // Detect the JSX open tag and matching close tag.
    expect(src).toMatch(/<DetailLayout\b/);
    expect(src).toMatch(/<\/DetailLayout>/);
  });

  it('promotes WorkflowStages into DetailLayout banners (top-of-page strip)', () => {
    // Workflow strip appears inside the banners prop.
    expect(src).toMatch(/banners=\{[\s\S]+WorkflowStages stages=\{stages\}/);
  });

  it('renders a stage-specific action card via renderStageActionCard helper', () => {
    expect(src).toMatch(/renderStageActionCard/);
    // Helper exposes branch coverage for every derivedStatus value.
    expect(src).toMatch(/derivedStatus === 'Cancelled'/);
    expect(src).toMatch(/derivedStatus === 'Filled'/);
    expect(src).toMatch(/derivedStatus === 'Closed'/);
    // RM path → build-slate CTA.
    expect(src).toMatch(/isRM && showBuildSlateCta/);
    // PM path with open slate → pick CTA prompt.
    expect(src).toMatch(/isPM && hasOpenSlate/);
    // Open / In progress → nudge CTA.
    expect(src).toMatch(/derivedStatus === 'Open' \|\| derivedStatus === 'In progress'/);
  });

  it('drops the duplicated inline WorkflowStages SectionCard (moved to banners)', () => {
    // Only one WorkflowStages render — the one in banners.
    const matches = src.match(/<WorkflowStages\b/g);
    expect(matches?.length).toBe(1);
  });

  it('drops the legacy PageHeader wrapper (now satisfied by DetailLayout)', () => {
    expect(src).not.toMatch(/<PageHeader\b/);
  });
});
