import { StatusBadge } from '@/components/common/StatusBadge';
import type { CellClass, PlannerAssignmentBlock, PlannerDemandBlock } from '@/lib/api/staffing-desk';
import type { PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';
import type { ExtendTarget } from '@/components/staffing-desk/PlannerExtendAssignmentModal';
import { Button, Modal } from '@/components/ds';

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

/**
 * Phase DS-2-6 (Group B) — rebuilt on `<Modal>`. Despite the legacy "popover"
 * name, this surface is functionally a centered modal: aria-modal, focus
 * trap, backdrop, escape close. The `onExtend` callback lifts the
 * `PlannerExtendAssignmentModal` to the parent (`WorkforcePlanner`),
 * matching the pattern recommended in `ds-deferred-items.md` Group B —
 * avoids stacked-modal flicker.
 */
export function PlannerCellDetailPopover({ detail, simulation, onClose, onExtend }: Props): JSX.Element {
  const cellMoves = simulation.moves.filter((m) => m.toProjectId === detail.projectId && m.weekStart === detail.weekStart);
  const cellSuggestions = simulation.suggestions.filter((s) => s.targetProjectId === detail.projectId && s.weekStart === detail.weekStart);

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel="Cell detail"
      size="md"
      title={
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{detail.projectName}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
            Week of {detail.weekStart.slice(5)} · Supply {detail.totalSupplyPercent}% · Demand {detail.totalDemandPercent}%
          </div>
        </div>
      }
    >
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
                    <Button variant="secondary" size="sm" onClick={() => { simulation.removeMove(move.id); onClose(); }} style={{ fontSize: 9 }} title="Remove simulated move">
                      Remove
                    </Button>
                  )}
                  {suggestion && !suggestion.accepted && (
                    <>
                      <Button variant="primary" size="sm" onClick={() => { simulation.acceptSuggestion(suggestion.id); onClose(); }} style={{ fontSize: 9 }}>
                        Accept
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => { simulation.rejectSuggestion(suggestion.id); onClose(); }} style={{ fontSize: 9 }}>
                        Reject
                      </Button>
                    </>
                  )}
                  {a.status === 'APPROVED' || a.status === 'ACTIVE' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
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
                        style={{ fontSize: 9 }}
                        title="Extend assignment end date"
                      >
                        Extend
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => { simulation.toggleRelease(a.personId, a.personName, a.costPerMonth); onClose(); }} style={{ fontSize: 9 }} title="Mark for release">
                        Release
                      </Button>
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
    </Modal>
  );
}
