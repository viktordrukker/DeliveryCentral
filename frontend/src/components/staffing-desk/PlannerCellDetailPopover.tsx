import { StatusBadge } from '@/components/common/StatusBadge';
import type { CellClass, PlannerAssignmentBlock, PlannerDemandBlock } from '@/lib/api/staffing-desk';
import type { PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';
import type { ExtendTarget } from '@/components/staffing-desk/PlannerExtendAssignmentModal';

export interface CellDetail {
  projectId: string;
  projectName: string;
  weekStart: string;
  assignments: PlannerAssignmentBlock[];
  demands: PlannerDemandBlock[];
  totalSupplyPercent: number;
  totalDemandPercent: number;
}

interface Props {
  detail: CellDetail;
  simulation: PlannerSimulation;
  onClose: () => void;
  onExtend: (target: ExtendTarget) => void;
}

const S_BACKDROP: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 88,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const S_PANEL: React.CSSProperties = {
  width: 'min(520px, 96vw)', maxHeight: '80vh',
  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
  borderRadius: 8, boxShadow: 'var(--shadow-modal)',
  display: 'flex', flexDirection: 'column',
};
const S_HEADER: React.CSSProperties = {
  padding: '10px 14px', borderBottom: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
};
const S_BODY: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '10px 14px' };
const S_SECTION_TITLE: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)', marginTop: 10, marginBottom: 4,
};
const S_ROW: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
  padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: 11,
};

const CLASS_TONE: Record<CellClass, 'active' | 'warning' | 'danger' | 'neutral'> = {
  SUGGESTED: 'active',
  ACCEPTABLE: 'warning',
  MISMATCH: 'danger',
  BLOCKED: 'neutral',
};

export function PlannerCellDetailPopover({ detail, simulation, onClose, onExtend }: Props): JSX.Element {
  const cellMoves = simulation.moves.filter((m) => m.toProjectId === detail.projectId && m.weekStart === detail.weekStart);
  const cellSuggestions = simulation.suggestions.filter((s) => s.targetProjectId === detail.projectId && s.weekStart === detail.weekStart);

  return (
    <div style={S_BACKDROP} onClick={onClose} role="dialog" aria-modal="true" aria-label="Cell detail">
      <div style={S_PANEL} onClick={(e) => e.stopPropagation()}>
        <div style={S_HEADER}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{detail.projectName}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Week of {detail.weekStart.slice(5)} · Supply {detail.totalSupplyPercent}% · Demand {detail.totalDemandPercent}%
            </div>
          </div>
          <button className="button button--secondary button--sm" onClick={onClose} type="button">Close</button>
        </div>

        <div style={S_BODY}>
          {detail.assignments.length > 0 && (
            <>
              <div style={S_SECTION_TITLE}>People ({detail.assignments.length})</div>
              {detail.assignments.map((a) => {
                const move = cellMoves.find((m) => m.id === a.assignmentId);
                const suggestion = cellSuggestions.find((s) => s.id === a.assignmentId || s.benchPersonId === a.personId);
                const cellClass = move?.cellClass ?? suggestion?.cellClass ?? null;
                return (
                  <div key={a.assignmentId} style={S_ROW}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500 }}>{a.personName}</span>
                        {cellClass && <StatusBadge label={cellClass} tone={CLASS_TONE[cellClass]} variant="chip" size="small" />}
                        {a.status === 'PHANTOM_HIRE' && <StatusBadge label="HIRE" tone="info" variant="chip" size="small" />}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {a.staffingRole || '—'} · {a.allocationPercent}% {a.costPerMonth ? `· $${Math.round(a.costPerMonth / 1000)}k/mo` : ''}
                      </div>
                      {move?.reason && (
                        <div style={{ fontSize: 10, color: 'var(--color-status-warning)', marginTop: 2 }}>
                          Reason: {move.reason.type}{move.reason.note ? ` — ${move.reason.note}` : ''}
                        </div>
                      )}
                      {suggestion && !suggestion.accepted && (
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                          {suggestion.rationale}
                        </div>
                      )}
                      {(move?.mismatchedSkills.length ?? 0) > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--color-status-danger)', marginTop: 2 }}>
                          Missing: {move!.mismatchedSkills.join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {move && (
                        <button
                          className="button button--secondary button--sm"
                          onClick={() => { simulation.removeMove(move.id); onClose(); }}
                          type="button"
                          style={{ fontSize: 9 }}
                          title="Remove simulated move"
                        >
                          Remove
                        </button>
                      )}
                      {suggestion && !suggestion.accepted && (
                        <>
                          <button
                            className="button button--sm"
                            onClick={() => { simulation.acceptSuggestion(suggestion.id); onClose(); }}
                            type="button"
                            style={{ fontSize: 9 }}
                          >
                            Accept
                          </button>
                          <button
                            className="button button--secondary button--sm"
                            onClick={() => { simulation.rejectSuggestion(suggestion.id); onClose(); }}
                            type="button"
                            style={{ fontSize: 9 }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {a.status === 'APPROVED' || a.status === 'ACTIVE' ? (
                        <>
                          <button
                            className="button button--secondary button--sm"
                            onClick={() => {
                              onExtend({
                                assignmentId: a.assignmentId,
                                personId: a.personId,
                                personName: a.personName,
                                projectId: detail.projectId,
                                projectName: detail.projectName,
                                staffingRole: a.staffingRole,
                                allocationPercent: a.allocationPercent,
                                currentValidTo: null,
                                currentValidFrom: detail.weekStart,
                              });
                              onClose();
                            }}
                            type="button"
                            style={{ fontSize: 9 }}
                            title="Extend assignment end date"
                          >
                            Extend
                          </button>
                          <button
                            className="button button--secondary button--sm"
                            onClick={() => { simulation.toggleRelease(a.personId, a.personName, a.costPerMonth); onClose(); }}
                            type="button"
                            style={{ fontSize: 9 }}
                            title="Mark for release"
                          >
                            Release
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {detail.demands.length > 0 && (
            <>
              <div style={S_SECTION_TITLE}>Open demand ({detail.demands.reduce((s, d) => s + d.headcountOpen, 0)} HC)</div>
              {detail.demands.map((d, i) => (
                <div key={`${d.requestId ?? d.rolePlanId ?? i}`} style={S_ROW}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{d.role} ×{d.headcountOpen}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {d.allocationPercent}% alloc{d.priority ? ` · ${d.priority}` : ''}
                      {d.skills.length > 0 ? ` · needs: ${d.skills.join(', ')}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {detail.assignments.length === 0 && detail.demands.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 11 }}>
              Nothing in this week for this project.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
