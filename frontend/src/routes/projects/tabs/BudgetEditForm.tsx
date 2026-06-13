import { useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { Button } from '@/components/ds';
import { upsertProjectBudget } from '@/lib/api/project-budget';

interface BudgetEditFormProps {
  projectId: string;
  /** Existing budget (capex/opex/fiscalYear) or null when BAC is unset. */
  initial: { fiscalYear: number; capex: number; opex: number } | null;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * EPIC A — inline budget set/edit form for the Money tab.
 *
 * Restores the budget-edit affordance the V2 Money tab lost (BAC "not set"
 * with no way to set it). Saves via the existing PUT /projects/:id/budget;
 * EVM (CPI/EAC/EV/AC) recomputes server-side on upsert, so the parent's
 * dashboard refetch reflects fresh numbers.
 */
export function BudgetEditForm({ projectId, initial, onSaved, onCancel }: BudgetEditFormProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(initial?.fiscalYear ?? currentYear);
  const [capex, setCapex] = useState(String(initial?.capex ?? 0));
  const [opex, setOpex] = useState(String(initial?.opex ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await upsertProjectBudget(projectId, {
        fiscalYear,
        capexBudget: Number(capex) || 0,
        opexBudget: Number(opex) || 0,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard title={initial ? 'Edit budget' : 'Set budget'}>
      <div
        data-testid="budget-edit-form"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}
      >
        <label className="field">
          <span className="field__label">Fiscal Year</span>
          <input
            className="field__control"
            type="number"
            min={2020}
            max={currentYear + 5}
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
        <label className="field">
          <span className="field__label">CAPEX Budget</span>
          <input
            className="field__control"
            type="number"
            min={0}
            step={1000}
            value={capex}
            onChange={(e) => setCapex(e.target.value)}
            style={{ width: 150 }}
          />
        </label>
        <label className="field">
          <span className="field__label">OPEX Budget</span>
          <input
            className="field__control"
            type="number"
            min={0}
            step={1000}
            value={opex}
            onChange={(e) => setOpex(e.target.value)}
            style={{ width: 150 }}
          />
        </label>
        <Button variant="primary" type="button" disabled={saving} onClick={() => void handleSave()}>
          {saving ? 'Saving…' : 'Save budget'}
        </Button>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error ? (
        <div style={{ color: 'var(--color-status-danger)', fontSize: 12, marginTop: 'var(--space-2)' }}>{error}</div>
      ) : null}
    </SectionCard>
  );
}
