/**
 * V2-A.10 — EmployeeDetailsPlaceholderPage profile refactor.
 *
 * Source-string assertions verifying the dsRefresh-ON branch composes
 * PersonProfilePanel as the page surface with a minimal action header
 * (PageHeader + deactivate/terminate ConfirmDialogs) instead of the
 * legacy 4-tab chrome.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-A.10 — Profile page surface', () => {
  const src = readFileSync('src/routes/people/EmployeeDetailsPlaceholderPage.tsx', 'utf-8');

  it('renders PersonProfilePanel as the body when dsRefresh is on', () => {
    expect(src).toMatch(/if \(dsRefreshEnabled && id\)/);
    expect(src).toMatch(/<PersonProfilePanel personId=\{id\} \/>/);
  });

  it('exposes lifecycle ConfirmDialogs on the canvas profile surface', () => {
    // Both Deactivate and Terminate confirm dialogs must be reachable on the
    // dsRefresh-ON branch — the legacy branch is no longer the only path
    // exposing them.
    const matches = src.match(/<ConfirmDialog\b[\s\S]*?confirmLabel="(Deactivate|Terminate)"/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4); // 2 in legacy + 2 in dsRefresh branches
  });

  it('renders a PageHeader with eyebrow="People" and lifecycle actions on the canvas profile', () => {
    // The dsRefresh-ON branch should now own its own PageHeader so HR/admin
    // can deactivate/terminate without leaving the canvas profile.
    expect(src).toMatch(/eyebrow="People"/);
    expect(src).toMatch(/Deactivate this employee\?/);
    expect(src).toMatch(/Terminate this employee\?/);
  });

  it('preserves the legacy 4-tab grammar for the dsRefresh-OFF branch', () => {
    expect(src).toMatch(/id: 'overview', label: 'Overview'/);
    expect(src).toMatch(/id: 'history', label: 'History'/);
    expect(src).toMatch(/<TabBar/);
  });

  it('keeps EmploymentStatus humanizer wired for the canvas subtitle', () => {
    expect(src).toMatch(/humanizeEnum\(lifecycleStatus, EMPLOYMENT_STATUS_LABELS\)/);
  });
});
