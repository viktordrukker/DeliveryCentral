import { useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ds';
import {
  cpiWhatIf,
  type CpiWhatIfPersonRow,
  type CpiWhatIfResponse,
} from '@/lib/api/capitalisation';

interface CpiWhatIfCardProps {
  projectId: string;
}

interface ScenarioRow extends CpiWhatIfPersonRow {
  key: number;
}

let nextKey = 1;
function newRow(): ScenarioRow {
  return {
    key: nextKey++,
    role: '',
    monthlyRate: 0,
    monthsRemaining: 3,
    quantity: 1,
  };
}

function gradeTone(grade: CpiWhatIfResponse['warningThreshold']):
  | 'active'
  | 'warning'
  | 'danger' {
  if (grade === 'GREEN') return 'active';
  if (grade === 'AMBER') return 'warning';
  return 'danger';
}

/**
 * LEAN-P4-missing-7 — CPI what-if projection card.
 *
 * Director / PM enters a hypothetical staffing delta (additional people +
 * optional ad-hoc hours) and POSTs to the read-only projection endpoint.
 * Response includes the baseline vs projected CPI, delta cost, and a
 * GREEN/AMBER/RED grade. Scenario is never persisted.
 */
export function CpiWhatIfCard({ projectId }: CpiWhatIfCardProps): JSX.Element {
  const [rows, setRows] = useState<ScenarioRow[]>(() => [newRow()]);
  const [additionalHours, setAdditionalHours] = useState<number>(0);
  const [response, setResponse] = useState<CpiWhatIfResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(key: number, patch: Partial<ScenarioRow>): void {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow(): void {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key: number): void {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function onProject(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await cpiWhatIf(projectId, {
        scenarioPeople: rows.map(({ role, monthlyRate, monthsRemaining, quantity }) => ({
          role,
          monthlyRate: Number(monthlyRate) || 0,
          monthsRemaining: Number(monthsRemaining) || 0,
          quantity: Number(quantity) || 0,
        })),
        scenarioAdditionalHours: additionalHours > 0 ? additionalHours : undefined,
      });
      setResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to project CPI.');
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="CPI what-if">
      <div
        data-testid="cpi-what-if-card"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <p
          className="compact muted"
          style={{ margin: 0, color: 'var(--color-text-muted)' }}
        >
          Model a staffing scenario without committing it. CPI = EV / AC;
          GREEN ≥ 0.95, AMBER ≥ 0.85, RED otherwise.
        </p>

        <div
          data-testid="cpi-what-if-scenario-rows"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
        >
          {rows.map((row, idx) => (
            <div
              key={row.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 0.7fr 40px',
                gap: 'var(--space-2)',
                alignItems: 'end',
              }}
            >
              <label className="field">
                <span className="field__label">Role</span>
                <input
                  className="field__control"
                  type="text"
                  value={row.role}
                  placeholder="Senior FE"
                  onChange={(e) => updateRow(row.key, { role: e.target.value })}
                  data-testid={`cpi-row-role-${idx}`}
                />
              </label>
              <label className="field">
                <span className="field__label">Monthly rate ($)</span>
                <input
                  className="field__control"
                  type="number"
                  min={0}
                  value={row.monthlyRate}
                  onChange={(e) =>
                    updateRow(row.key, { monthlyRate: Number(e.target.value) })
                  }
                  data-testid={`cpi-row-rate-${idx}`}
                />
              </label>
              <label className="field">
                <span className="field__label">Months</span>
                <input
                  className="field__control"
                  type="number"
                  min={0}
                  value={row.monthsRemaining}
                  onChange={(e) =>
                    updateRow(row.key, { monthsRemaining: Number(e.target.value) })
                  }
                  data-testid={`cpi-row-months-${idx}`}
                />
              </label>
              <label className="field">
                <span className="field__label">Qty</span>
                <input
                  className="field__control"
                  type="number"
                  min={0}
                  value={row.quantity}
                  onChange={(e) =>
                    updateRow(row.key, { quantity: Number(e.target.value) })
                  }
                  data-testid={`cpi-row-qty-${idx}`}
                />
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => removeRow(row.key)}
                disabled={rows.length <= 1}
                aria-label={`Remove scenario row ${idx + 1}`}
                data-testid={`cpi-row-remove-${idx}`}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-2)',
            alignItems: 'end',
          }}
        >
          <label className="field">
            <span className="field__label">Additional hours (optional)</span>
            <input
              className="field__control"
              type="number"
              min={0}
              value={additionalHours}
              onChange={(e) => setAdditionalHours(Number(e.target.value))}
              data-testid="cpi-additional-hours"
            />
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={addRow}
              data-testid="cpi-add-row"
            >
              + Add person
            </Button>
            <Button
              variant="primary"
              onClick={() => void onProject()}
              disabled={loading}
              data-testid="cpi-project-button"
            >
              {loading ? 'Projecting…' : 'Project CPI'}
            </Button>
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            style={{ color: 'var(--color-status-danger)', fontSize: 13 }}
            data-testid="cpi-what-if-error"
          >
            {error}
          </div>
        ) : null}

        {response ? (
          <div
            data-testid="cpi-what-if-result"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              background: 'var(--color-surface-alt)',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                Baseline CPI
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-text)',
                }}
                data-testid="cpi-baseline-value"
              >
                {response.baselineCPI.toFixed(2)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                Projected CPI
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-text)',
                }}
                data-testid="cpi-projected-value"
              >
                {response.projectedCPI.toFixed(2)}{' '}
                <StatusBadge
                  tone={gradeTone(response.warningThreshold)}
                  variant="chip"
                  label={response.warningThreshold}
                />
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                Delta ACWP
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-text)',
                }}
                data-testid="cpi-delta-acwp"
              >
                ${response.deltaACWP.toLocaleString('en-US')}
              </div>
            </div>
            <div
              style={{
                gridColumn: '1 / -1',
                fontSize: 13,
                color: 'var(--color-text-muted)',
              }}
              data-testid="cpi-explanation"
            >
              {response.explanation}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
