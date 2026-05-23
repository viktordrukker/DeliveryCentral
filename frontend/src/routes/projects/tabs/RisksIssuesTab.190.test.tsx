/**
 * GitHub #190 — risks creation form only captured 5 fields (Title, Description,
 * Category, Probability, Impact), but the view/expanded row showed Strategy,
 * Due date, Owner, Damage control plan, Strategy description. Backend POST
 * already accepted every field — the gap was purely in the form UI.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GitHub #190 — Risks create form captures every field the view shows', () => {
  const src = readFileSync('src/routes/projects/tabs/RisksIssuesTab.tsx', 'utf-8');

  it('declares state for every missing field', () => {
    expect(src).toMatch(/setCreateStrategy\b/);
    expect(src).toMatch(/setCreateStrategyDescription\b/);
    expect(src).toMatch(/setCreateDamageControlPlan\b/);
    expect(src).toMatch(/setCreateOwnerPersonId\b/);
    expect(src).toMatch(/setCreateDueDate\b/);
  });

  it('threads every missing field into the createRisk request payload', () => {
    const handler = src.slice(src.indexOf('async function handleCreate'), src.indexOf('async function handleResolve'));
    expect(handler).toMatch(/strategy:\s*createStrategy \|\| undefined/);
    expect(handler).toMatch(/strategyDescription:\s*createStrategyDescription/);
    expect(handler).toMatch(/damageControlPlan:\s*createDamageControlPlan/);
    expect(handler).toMatch(/ownerPersonId:\s*createOwnerPersonId \|\| undefined/);
    expect(handler).toMatch(/dueDate:\s*createDueDate \|\| undefined/);
  });

  it('renders Strategy <select>, Due <input type="date">, Owner picker, and the two textareas', () => {
    const form = src.slice(src.indexOf('<form onSubmit={(e) => void handleCreate'), src.indexOf('</form>'));
    expect(form).toMatch(/STRATEGIES\.map/);
    expect(form).toMatch(/type="date"/);
    expect(form).toMatch(/<PersonSelect\s+label="Owner"/);
    expect(form).toMatch(/Strategy description/);
    expect(form).toMatch(/Damage control plan/);
  });
});
