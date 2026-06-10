/**
 * W2-02 — Project-scoped Cases tab on Project Detail.
 *
 * Source-string assertions verifying:
 *   1. Tab is registered in BASE_TABS on ProjectDetailPage (legacy grammar).
 *      SoT PR 17g — V2_TABS no longer includes Cases; ?tab=cases redirects
 *      to Pulse in v2 (DS canvas grammar is 3 tabs: Pulse / Plan / Money).
 *   2. ProjectCasesTab is rendered when activeTab === 'cases' (legacy only).
 *   3. ProjectCasesTab uses fetchProjectCases(projectId) and DS primitives.
 *   4. cases.ts API exposes fetchProjectCases + the projectId query param.
 *   5. EmptyState forwards to /cases (UX Law 2 — no dead-end screens).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('W2-02 — ProjectDetailPage Cases tab registration', () => {
  const src = readFileSync('src/routes/projects/ProjectDetailPage.tsx', 'utf-8');

  it('registers a Cases tab in BASE_TABS', () => {
    expect(src).toMatch(/{ id: 'cases', label: 'Cases' }/);
  });

  it('does NOT register Cases in V2_TABS (SoT PR 17g — DS canvas is Pulse/Plan/Money)', () => {
    expect(src).not.toMatch(/const V2_TABS\s*=\s*\[[\s\S]*?{ id: 'cases', label: 'Cases' }/);
  });

  it('maps ?tab=cases onto pulse in V2 so legacy deep-links survive', () => {
    expect(src).toMatch(/const LEGACY_TAB_REDIRECTS_V2[\s\S]*?cases: 'pulse'/);
  });

  it('imports ProjectCasesTab from ./tabs/ProjectCasesTab', () => {
    expect(src).toMatch(/import \{ ProjectCasesTab \} from '\.\/tabs\/ProjectCasesTab'/);
  });

  it('renders ProjectCasesTab when activeTab === cases (legacy 7-tab grammar)', () => {
    expect(src).toMatch(/activeTab === 'cases' \? <ProjectCasesTab projectId=\{id!\} \/>/);
  });
});

describe('W2-02 — ProjectCasesTab implementation', () => {
  const src = readFileSync('src/routes/projects/tabs/ProjectCasesTab.tsx', 'utf-8');

  it('accepts projectId prop and is exported', () => {
    expect(src).toMatch(/interface ProjectCasesTabProps[\s\S]*?projectId: string/);
    expect(src).toMatch(/export function ProjectCasesTab/);
  });

  it('fetches cases via fetchProjectCases(projectId)', () => {
    expect(src).toMatch(/import \{[^}]*fetchProjectCases[^}]*\} from '@\/lib\/api\/cases'/);
    expect(src).toMatch(/fetchProjectCases\(projectId\)/);
  });

  it('uses DS primitives (SectionCard, Table, StatusBadge) — no raw table/button/hex', () => {
    expect(src).toMatch(/import \{ SectionCard \}/);
    expect(src).toMatch(/import \{ Table, type Column \} from '@\/components\/ds'/);
    expect(src).toMatch(/import \{ StatusBadge/);
    expect(src).not.toMatch(/<table[\s>]/);
    expect(src).not.toMatch(/<button[\s>]/);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('forwards to /cases from the empty state (UX Law 2)', () => {
    expect(src).toMatch(/action=\{\{ href: '\/cases', label: 'Go to Cases' \}\}/);
  });

  it('handles loading and error states via DS primitives', () => {
    expect(src).toMatch(/<LoadingState/);
    expect(src).toMatch(/<ErrorState/);
  });

  it('cleans up async fetch on unmount (let active = true pattern)', () => {
    expect(src).toMatch(/let active = true/);
    expect(src).toMatch(/active = false/);
  });
});

describe('W2-02 — cases.ts API project filter', () => {
  const src = readFileSync('src/lib/api/cases.ts', 'utf-8');

  it('CasesQuery exposes a projectId field', () => {
    expect(src).toMatch(/projectId\?: string/);
  });

  it('fetchCases serialises projectId into the query string', () => {
    expect(src).toMatch(/params\.set\('projectId', query\.projectId\)/);
  });

  it('exports fetchProjectCases(projectId) convenience helper', () => {
    expect(src).toMatch(/export async function fetchProjectCases\(projectId: string\)/);
    expect(src).toMatch(/return fetchCases\(\{ projectId \}\)/);
  });
});
