/**
 * V2-A.15 — Create Project Wizard step shape.
 *
 * Source-string assertions verifying the canvas labels (Identity / Setup /
 * Activation) replace the legacy ones (Basics / Engagement / Confirm),
 * and the post-create section directs the operator to the Plan tab.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('V2-A.15 — Create Project Wizard step labels', () => {
  const formSrc = readFileSync('src/components/projects/ProjectLifecycleForm.tsx', 'utf-8');
  const pageSrc = readFileSync('src/routes/projects/CreateProjectPage.tsx', 'utf-8');

  it('step indicator uses canvas labels (Identity / Setup / Activation)', () => {
    expect(formSrc).toMatch(/\['Identity', 'Setup', 'Activation'\]/);
  });

  it('drops the legacy Basics / Engagement / Confirm labels', () => {
    expect(formSrc).not.toMatch(/\['Basics', 'Engagement', 'Confirm'\]/);
  });

  it('CreateProjectPage subtitle mentions the new step grammar', () => {
    expect(pageSrc).toMatch(/Identity → Setup → Activation/);
  });

  it('SectionCard title includes the current step name', () => {
    expect(pageSrc).toMatch(/\['Identity', 'Setup', 'Activation'\]\[state\.step\]/);
  });

  it('post-create section points operator at the Plan tab', () => {
    expect(pageSrc).toMatch(/Open Plan tab/);
    expect(pageSrc).toMatch(/\?tab=plan/);
    expect(pageSrc).toMatch(/add positions and milestones/);
  });
});
