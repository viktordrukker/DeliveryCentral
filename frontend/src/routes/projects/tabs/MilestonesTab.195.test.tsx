/**
 * GitHub #195 — Milestones tab had no client-side sort, no sortable column
 * headers, no manual reorder. The simplest sane fix is column-header sort by
 * name / plannedDate / actualDate / status (manual drag-reorder deferred
 * until a `displayOrder` column exists).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GitHub #195 — Milestones tab column-header sort', () => {
  const src = readFileSync('src/routes/projects/tabs/MilestonesTab.tsx', 'utf-8');

  it('declares sort state + a sorted-via-useMemo array', () => {
    expect(src).toMatch(/type MilestoneSortKey = 'plannedDate' \| 'actualDate' \| 'name' \| 'status'/);
    expect(src).toMatch(/const \[sortKey, setSortKey\] = useState<MilestoneSortKey>\('plannedDate'\)/);
    expect(src).toMatch(/const sortedMilestones = useMemo/);
  });

  it('toggle handler flips direction when clicking the active key, otherwise resets to asc', () => {
    expect(src).toMatch(/function toggleSort\(key: MilestoneSortKey\)/);
    expect(src).toMatch(/setSortDir\(\(d\) => \(d === 'asc' \? 'desc' : 'asc'\)\)/);
  });

  it('column headers for Name / Planned / Actual / Status are clickable buttons with data-sort-key', () => {
    expect(src).toMatch(/sortableHeader\('Name', 'name'\)/);
    expect(src).toMatch(/sortableHeader\('Planned', 'plannedDate'\)/);
    expect(src).toMatch(/sortableHeader\('Actual', 'actualDate'\)/);
    expect(src).toMatch(/sortableHeader\('Status', 'status'\)/);
    expect(src).toMatch(/data-sort-key=\{key\}/);
  });

  it('Table feeds sortedMilestones, not the raw milestones array', () => {
    expect(src).toMatch(/rows=\{sortedMilestones\}/);
  });
});
