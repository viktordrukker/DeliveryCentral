import { toast } from 'sonner';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { CellClass } from '@/lib/api/staffing-desk';
import { suggestionKey, type PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';

interface Props {
  simulation: PlannerSimulation;
}

const S_BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 90,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const S_PANEL: React.CSSProperties = {
  width: 'min(960px, 96vw)', maxHeight: '88vh',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 8, boxShadow: 'var(--shadow-modal)', display: 'flex', flexDirection: 'column',
};
const S_HEADER: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const S_SUMMARY: React.CSSProperties = {
  padding: '10px 16px', borderBottom: '1px solid var(--color-border)',
  display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12,
  background: 'var(--color-surface-alt)',
};
const S_METRIC: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 };
const S_METRIC_LABEL: React.CSSProperties = { fontSize: 9, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const S_METRIC_VALUE: React.CSSProperties = { fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' };
const S_BODY: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '8px 16px' };
const S_TABLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 11 };
const S_TH: React.CSSProperties = {
  textAlign: 'left', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)', padding: '6px 4px', borderBottom: '1px solid var(--color-border)',
  position: 'sticky', top: 0, background: 'var(--color-surface)',
};
const S_TD: React.CSSProperties = { padding: '6px 4px', borderBottom: '1px solid var(--color-border)', verticalAlign: 'top' };
const S_FOOTER: React.CSSProperties = {
  padding: '10px 16px', borderTop: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
};

const CLASS_TONE: Record<CellClass, 'active' | 'warning' | 'danger' | 'neutral'> = {
  SUGGESTED: 'active',
  ACCEPTABLE: 'warning',
  MISMATCH: 'danger',
  BLOCKED: 'neutral',
};

export function PlannerAutoMatchPreviewModal({ simulation }: Props): JSX.Element | null {
  const preview = simulation.preview;
  if (!preview) return null;

  const selectedCount = preview.suggestions.filter((s) => preview.selectedIds.has(suggestionKey(s))).length;
  const { summary } = preview;

  return (
    <div style={S_BACKDROP} role="dialog" aria-modal="true" aria-label="Auto-Distribute preview">
      <div style={S_PANEL}>
        <div style={S_HEADER}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Auto-Distribute preview</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Strategy: <strong>{summary.strategy}</strong> — review before committing to simulation
            </div>
          </div>
          <button className="button button--secondary button--sm" onClick={simulation.discardPreview} type="button">Close</button>
        </div>

        <div style={S_SUMMARY}>
          <div style={S_METRIC}><span style={S_METRIC_LABEL}>Assigned</span><span style={S_METRIC_VALUE}>{summary.assignedCount}<span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}> / {summary.totalDemand}</span></span></div>
          <div style={S_METRIC}><span style={S_METRIC_LABEL}>Coverage</span><span style={S_METRIC_VALUE}>{summary.coverageLiftPercent.toFixed(1)}%</span></div>
          <div style={S_METRIC}><span style={S_METRIC_LABEL}>Avg match</span><span style={S_METRIC_VALUE}>{Math.round(summary.avgMatchScore * 100)}%</span></div>
          <div style={S_METRIC}><span style={S_METRIC_LABEL}>Strong</span><span style={{ ...S_METRIC_VALUE, color: 'var(--color-status-active)' }}>{summary.strongCount}</span></div>
          <div style={S_METRIC}><span style={S_METRIC_LABEL}>Medium</span><span style={{ ...S_METRIC_VALUE, color: 'var(--color-status-warning)' }}>{summary.mediumCount}</span></div>
          <div style={S_METRIC}><span style={S_METRIC_LABEL}>Mismatch</span><span style={{ ...S_METRIC_VALUE, color: 'var(--color-status-danger)' }}>{summary.mismatchCount}</span></div>
        </div>

        <div style={{
          padding: '8px 16px', borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)', fontSize: 11, color: 'var(--color-text-muted)',
          display: 'flex', flexWrap: 'wrap', columnGap: 12, rowGap: 4, alignItems: 'center',
        }}>
          <strong style={{ color: 'var(--color-text)' }}>Scope (same as grid):</strong>
          <span>Projects with demand: <strong style={{ color: 'var(--color-text)' }}>{preview.diagnostics.projectsWithOpenDemand}</strong></span>
          <span>→ in grid: <strong style={{ color: 'var(--color-text)' }}>{preview.diagnostics.projectsInScope}</strong></span>
          <span>· Demand HC: <strong style={{ color: 'var(--color-text)' }}>{preview.diagnostics.totalHeadcountScanned}</strong></span>
          <span>→ in scope: <strong style={{ color: 'var(--color-text)' }}>{preview.diagnostics.headcountInScope}</strong></span>
          {preview.diagnostics.headcountSkippedProjectStatus > 0 && <span>status filter: −{preview.diagnostics.headcountSkippedProjectStatus}</span>}
          {preview.diagnostics.headcountSkippedPriority > 0 && <span>priority: −{preview.diagnostics.headcountSkippedPriority}</span>}
          {preview.diagnostics.headcountSkippedHorizon > 0 && <span>horizon: −{preview.diagnostics.headcountSkippedHorizon}</span>}
          <span>· Bench: <strong style={{ color: 'var(--color-text)' }}>{preview.diagnostics.benchInScope}</strong>/{preview.diagnostics.totalActivePeople} active</span>
          <span>· Proposed: <strong style={{ color: 'var(--color-status-active)' }}>{preview.diagnostics.suggestionsCreated}</strong></span>
          {preview.diagnostics.chainedCount > 0 && <span style={{ color: 'var(--color-accent)' }}>· {preview.diagnostics.chainedCount} chained</span>}
          {preview.diagnostics.fallbackCount > 0 && <span style={{ color: 'var(--color-status-warning)' }}>· {preview.diagnostics.fallbackCount} fallback</span>}
          {preview.diagnostics.unmatchedHeadcount > 0 && <span style={{ color: 'var(--color-status-danger)' }}>· {preview.diagnostics.unmatchedHeadcount} unmatched HC</span>}
        </div>

        <div style={S_BODY}>
          {preview.suggestions.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
              No candidates produced. Try a different strategy, clear locked people, or release more capacity.
            </div>
          )}

          {preview.suggestions.length > 0 && (
            <table style={S_TABLE}>
              <thead>
                <tr>
                  <th style={{ ...S_TH, width: 32 }}></th>
                  <th style={S_TH}>Person</th>
                  <th style={S_TH}>Project</th>
                  <th style={S_TH}>Role</th>
                  <th style={S_TH}>Week</th>
                  <th style={{ ...S_TH, width: 90 }}>Class</th>
                  <th style={{ ...S_TH, width: 70, textAlign: 'right' }}>Match</th>
                  <th style={{ ...S_TH, width: 60, textAlign: 'right' }}>Alloc</th>
                  <th style={S_TH}>Rationale</th>
                </tr>
              </thead>
              <tbody>
                {preview.suggestions.map((s) => {
                  const key = suggestionKey(s);
                  const selected = preview.selectedIds.has(key);
                  return (
                    <tr key={key} style={{ opacity: selected ? 1 : 0.45 }}>
                      <td style={S_TD}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => simulation.togglePreviewSuggestion(key)}
                          aria-label={`Include ${s.benchPersonName} → ${s.targetProjectName}`}
                        />
                      </td>
                      <td style={S_TD}>
                        <div style={{ fontWeight: 500 }}>{s.benchPersonName}</div>
                        {s.constraintWarnings.length > 0 && (
                          <div style={{ fontSize: 9, color: 'var(--color-status-warning)' }}>⚠ {s.constraintWarnings.join(' · ')}</div>
                        )}
                      </td>
                      <td style={S_TD}>{s.targetProjectName}</td>
                      <td style={S_TD}>{s.demandRole}</td>
                      <td style={S_TD} data-tabular="true" title={s.coverageWeeks?.join(', ')}>
                        {s.weekStart.slice(5)}
                        {s.coverageWeeks && s.coverageWeeks.length > 1 && (
                          <div style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>×{s.coverageWeeks.length}w</div>
                        )}
                      </td>
                      <td style={S_TD}>
                        <StatusBadge label={s.cellClass} tone={CLASS_TONE[s.cellClass]} variant="chip" size="small" />
                      </td>
                      <td style={{ ...S_TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(s.matchScore * 100)}%
                      </td>
                      <td style={{ ...S_TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.allocationPercent}%</td>
                      <td style={{ ...S_TD, fontSize: 10, color: 'var(--color-text-muted)' }}>
                        <div>{s.rationale}</div>
                        {s.mismatchedSkills.length > 0 && (
                          <div style={{ fontSize: 9, color: 'var(--color-status-danger)', marginTop: 2 }}>Missing: {s.mismatchedSkills.join(', ')}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {preview.unmatched.length > 0 && (
            <div style={{ marginTop: 16, padding: 10, background: 'var(--color-surface-alt)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
                Unmatched demand ({preview.unmatched.reduce((s, u) => s + u.headcountOpen, 0)} HC)
              </div>
              {preview.unmatched.map((u) => (
                <div key={u.demandId} style={{ fontSize: 10, color: 'var(--color-text-muted)', padding: '2px 0' }}>
                  <strong>{u.role}</strong> ×{u.headcountOpen} @ {u.projectName}
                  {u.reason && <span style={{ color: 'var(--color-text-subtle)' }}> — {u.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={S_FOOTER}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {selectedCount} of {preview.suggestions.length} selected · ${Math.round(summary.estimatedMonthlyCostImpact / 1000)}k/mo projected
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="button button--secondary button--sm" onClick={simulation.discardPreview} type="button">Discard</button>
            <button
              className="button button--sm"
              onClick={() => {
                simulation.commitPreview();
                toast.success(`${selectedCount} suggestion${selectedCount === 1 ? '' : 's'} applied to simulation — visible in grid now`);
              }}
              disabled={selectedCount === 0}
              type="button"
              data-testid="planner-preview-apply"
            >
              Apply {selectedCount > 0 ? `${selectedCount} ` : ''}to simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
