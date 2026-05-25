/**
 * V2-A.8 — HR Directory 3-tab shell (Directory / Bench / HR Queue).
 *
 * Source-string assertions verifying the dsRefresh-gated 3-tab wiring
 * and the extracted CasesPanel shared between the standalone `/cases`
 * route and the embedded HR-Queue tab.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-A.8 — EmployeeDirectoryPage 3-tab shell', () => {
  const src = readFileSync('src/routes/people/EmployeeDirectoryPage.tsx', 'utf-8');

  it('declares Directory / Bench / HR Queue as the canvas 3-tab list', () => {
    expect(src).toMatch(/{ id: 'directory', label: 'Directory' }/);
    expect(src).toMatch(/{ id: 'bench', label: 'Bench' }/);
    expect(src).toMatch(/{ id: 'cases', label: 'HR Queue' }/);
  });

  it('renders CasesPanel inline when activeView=cases (dsRefresh ON)', () => {
    expect(src).toMatch(/dsRefreshEnabled && activeView === 'cases' \?\s*<CasesPanel\s*\/>/);
  });

  it('still renders BenchEnrichedPanel for the bench view', () => {
    expect(src).toMatch(/dsRefreshEnabled && activeView === 'bench' \?\s*<BenchEnrichedPanel\s*\/>/);
  });

  it('imports the shared CasesPanel', () => {
    expect(src).toMatch(/import { CasesPanel } from '@\/components\/cases\/CasesPanel'/);
  });
});

describe('V2-A.8 — CasesPanel extracted from CasesPage', () => {
  const panelSrc = readFileSync('src/components/cases/CasesPanel.tsx', 'utf-8');
  const pageSrc = readFileSync('src/routes/cases/CasesPage.tsx', 'utf-8');

  it('CasesPanel composes the existing filter bar + section card', () => {
    expect(panelSrc).toMatch(/<FilterBar>/);
    expect(panelSrc).toMatch(/<SectionCard title="Case List">/);
    expect(panelSrc).toMatch(/<CaseListTable/);
  });

  it('CasesPanel does NOT call useTitleBarActions (parent page owns chrome)', () => {
    expect(panelSrc).not.toMatch(/useTitleBarActions/);
  });

  it('CasesPage delegates to CasesPanel and keeps title-bar actions', () => {
    expect(pageSrc).toMatch(/<CasesPanel\s*\/>/);
    expect(pageSrc).toMatch(/useTitleBarActions/);
    expect(pageSrc).toMatch(/Create case/);
  });
});
