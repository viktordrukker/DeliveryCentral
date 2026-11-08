/**
 * F-130 / D-103-write-path round 40 — guardrail for the actor-audit
 * coverage script. Runs `node scripts/check-actor-audit-coverage.cjs`
 * and asserts the printed coverage is >= 98%.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('actor-audit coverage script', () => {
  it('reports >= 98% coverage and exits 0', () => {
    const cwd = resolve(__dirname, '..', '..', '..');
    const out = execFileSync('node', ['scripts/check-actor-audit-coverage.cjs'], {
      cwd,
      encoding: 'utf-8',
    });
    const match = out.match(/actor-audit coverage:\s+(\d+)\/(\d+)\s+=\s+([\d.]+)%/);
    expect(match).not.toBeNull();
    const pct = parseFloat(match![3]);
    expect(pct).toBeGreaterThanOrEqual(98);
  });
});
