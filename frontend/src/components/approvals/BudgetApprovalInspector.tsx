import { Money } from '@/components/ds';
import { Pct } from '@/components/ds/Pct';
import { SparklineDs, VarianceBar } from '@/components/ds';

/**
 * SoT PR 11 — budget-source approval body per `DS/page-approvals.jsx:39-138`.
 *
 * Renders the full one-screen-approval context:
 *   - 4 key-figure tiles: Baseline / Actuals YTD / EAC / Variance
 *   - Variance breakdown rows (one VarianceBar per driver)
 *   - Forecast Sparkline summary card
 *
 * Pulls structured values from `meta` when present, otherwise falls back to
 * the project / current / requested / variance fields derived in the parent
 * {@link ApprovalInspector}.
 */

const S_CTX_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
};
const S_SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
  marginBottom: 6,
};
const S_TILE: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  background: 'var(--color-surface-alt)',
};
const S_TILE_VALUE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  marginTop: 4,
  fontVariantNumeric: 'tabular-nums',
};

interface BudgetApprovalInspectorProps {
  meta: Record<string, unknown>;
  currency: string;
  fallback: {
    projectCode: string | null;
    projectName: string | null;
    currentAmount: number | null;
    requestedAmount: number | null;
    variancePercent: number | null;
  };
}

interface VarianceRow {
  label: string;
  value: number;
  why?: string;
}

function readNumber(meta: Record<string, unknown>, key: string): number | null {
  const value = meta[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function readString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number') return String(value);
  return null;
}

function readNumberArray(meta: Record<string, unknown>, key: string): number[] | null {
  const value = meta[key];
  if (!Array.isArray(value)) return null;
  const nums = value.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  return nums.length > 0 ? nums : null;
}

function readVarianceBreakdown(meta: Record<string, unknown>): VarianceRow[] | null {
  const raw = meta.varianceBreakdown;
  if (!Array.isArray(raw)) return null;
  const rows: VarianceRow[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const label = typeof obj.label === 'string' ? obj.label : null;
    const value = typeof obj.value === 'number' && Number.isFinite(obj.value) ? obj.value : null;
    if (label == null || value == null) continue;
    const why = typeof obj.why === 'string' ? obj.why : undefined;
    rows.push({ label, value, why });
  }
  return rows.length > 0 ? rows : null;
}

export function BudgetApprovalInspector({
  meta,
  currency,
  fallback,
}: BudgetApprovalInspectorProps): JSX.Element {
  // Canonical DS canvas keys: baselineAmount / actualsYtd / eac / variance.
  const baseline = readNumber(meta, 'baselineAmount') ?? fallback.currentAmount;
  const actualsYtd = readNumber(meta, 'actualsYtd');
  const eac = readNumber(meta, 'eac') ?? readNumber(meta, 'estimateAtCompletion') ?? fallback.requestedAmount;
  const varianceValue = readNumber(meta, 'varianceAmount') ?? readNumber(meta, 'variance');
  const variancePct = readNumber(meta, 'variancePercent') ?? readNumber(meta, 'deltaPercent') ?? fallback.variancePercent;

  const projectCode = readString(meta, 'projectCode') ?? fallback.projectCode;
  const projectName = readString(meta, 'projectName') ?? fallback.projectName;

  const breakdown = readVarianceBreakdown(meta);
  const forecastSeries = readNumberArray(meta, 'forecastSeries') ?? readNumberArray(meta, 'burnSeries');
  const forecastNote = readString(meta, 'forecastNote');
  const reason = readString(meta, 'reason') ?? readString(meta, 'justification');

  const breakdownMax = breakdown
    ? Math.max(...breakdown.map((r) => Math.abs(r.value)), 1) * 1.05
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {projectCode || projectName ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <div style={S_CTX_LABEL}>Project</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
            {projectCode ? (
              <span style={{ color: 'var(--color-text-muted)', marginRight: 4 }}>{projectCode}</span>
            ) : null}
            {projectName ?? '—'}
          </div>
        </div>
      ) : null}

      {/* 4 key-figure tiles: Baseline / Actuals YTD / EAC / Variance */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}
        data-testid="budget-key-figures"
      >
        <div style={S_TILE}>
          <div style={S_CTX_LABEL}>Baseline</div>
          <div style={S_TILE_VALUE}>
            {baseline != null ? <Money value={baseline} currency={currency} /> : '—'}
          </div>
        </div>
        <div style={S_TILE}>
          <div style={S_CTX_LABEL}>Actuals YTD</div>
          <div style={S_TILE_VALUE}>
            {actualsYtd != null ? <Money value={actualsYtd} currency={currency} /> : '—'}
          </div>
        </div>
        <div style={S_TILE}>
          <div style={S_CTX_LABEL}>EAC at completion</div>
          <div style={{ ...S_TILE_VALUE, color: 'var(--color-status-danger)' }}>
            {eac != null ? <Money value={eac} currency={currency} /> : '—'}
          </div>
        </div>
        <div style={{ ...S_TILE, background: 'var(--color-status-danger-bg, var(--color-surface-alt))' }}>
          <div style={{ ...S_CTX_LABEL, color: 'var(--color-status-danger)' }}>Variance</div>
          <div style={{ ...S_TILE_VALUE, color: 'var(--color-status-danger)' }}>
            {varianceValue != null ? (
              <>
                <Money value={varianceValue} currency={currency} />
                {variancePct != null ? (
                  <span style={{ marginLeft: 6 }}>
                    · <Pct value={variancePct} sign tone="auto" fractionDigits={0} />
                  </span>
                ) : null}
              </>
            ) : variancePct != null ? (
              <Pct value={variancePct} sign tone="auto" fractionDigits={0} />
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>

      {/* Variance breakdown — one VarianceBar per driver */}
      {breakdown ? (
        <div data-testid="budget-variance-breakdown">
          <div style={S_SECTION_LABEL}>Variance breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {breakdown.map((row) => (
              <div
                key={row.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.6fr 110px',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--color-text)' }}>
                  {row.label}
                  {row.why ? (
                    <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2 }}>
                      {row.why}
                    </div>
                  ) : null}
                </div>
                <VarianceBar
                  value={row.value}
                  max={breakdownMax}
                  width={240}
                  height={10}
                  ariaLabel={`${row.label} ${row.value}`}
                />
                <div
                  style={{
                    fontSize: 12,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    color: row.value < 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)',
                  }}
                >
                  <Money value={row.value} currency={currency} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : variancePct != null ? (
        // Fall back to single VarianceBar when no per-driver breakdown supplied.
        <div>
          <div style={S_SECTION_LABEL}>Variance vs baseline</div>
          <VarianceBar
            value={variancePct}
            max={Math.max(50, Math.abs(variancePct) * 1.5)}
            width={280}
            height={14}
            ariaLabel={`Variance ${variancePct}%`}
          />
        </div>
      ) : null}

      {/* Forecast Sparkline summary card */}
      {forecastSeries ? (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
          data-testid="budget-forecast-summary"
        >
          <SparklineDs
            data={forecastSeries}
            width={200}
            height={48}
            tone="danger"
            ariaLabel="Forecast burn"
          />
          <div>
            <div style={S_CTX_LABEL}>Forecast burn · plan vs proj</div>
            <div style={{ fontSize: 12, color: 'var(--color-text)', marginTop: 2 }}>
              {forecastNote ?? 'Projected burn against baseline.'}
            </div>
          </div>
        </div>
      ) : null}

      {reason ? (
        <div>
          <div style={S_SECTION_LABEL}>Submitter rationale</div>
          <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>{reason}</div>
        </div>
      ) : null}
    </div>
  );
}
