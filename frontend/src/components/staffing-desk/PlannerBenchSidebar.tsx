import { useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import type { AutoMatchStrategy, PlannerBenchPerson, UnmatchedDemand } from '@/lib/api/staffing-desk';
import type { PlannerSimulation } from '@/features/staffing-desk/usePlannerSimulation';
import { Button, IconButton } from '@/components/ds';

interface Props {
  benchPeople: PlannerBenchPerson[];
  unmatchedDemand: UnmatchedDemand[];
  simulation: PlannerSimulation;
  simulating: boolean;
  onAutoMatch: (strategy: AutoMatchStrategy, minSkillMatch: number) => void;
  autoMatchLoading: boolean;
  supplyDelta: number;
  totalFte: number;
  gapP50?: number;
  onDragStart: (person: PlannerBenchPerson) => void;
  onWhyNot: (demandId: string) => void;
}

const STRATEGY_OPTIONS: Array<{ value: AutoMatchStrategy; label: string; hint: string }> = [
  { value: 'BALANCED', label: 'Balanced', hint: 'Skill · bench · cost weighted' },
  { value: 'BEST_FIT', label: 'Best-Fit', hint: 'Maximize skill match' },
  { value: 'UTILIZE_BENCH', label: 'Utilize-Bench', hint: 'Longest-benched first' },
  { value: 'CHEAPEST', label: 'Cheapest', hint: 'Lowest cost, skill floor' },
  { value: 'GROWTH', label: 'Growth', hint: 'Stretch juniors into partial-match roles' },
];

const S_SIDEBAR: React.CSSProperties = {
  width: 220, minWidth: 220, borderRight: '1px solid var(--color-border)',
  background: 'var(--color-surface)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
  fontSize: 11,
};
const S_SECTION: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)', padding: '8px 10px 4px', borderBottom: '1px solid var(--color-border)',
};
const S_CARD: React.CSSProperties = {
  padding: '6px 10px', borderBottom: '1px solid var(--color-border)',
  cursor: 'grab', transition: 'background 80ms',
};
const S_SKILL_TAG: React.CSSProperties = {
  display: 'inline-block', fontSize: 8, padding: '1px 5px', borderRadius: 8,
  background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
  marginRight: 2, marginBottom: 1,
};

export function PlannerBenchSidebar({ benchPeople, unmatchedDemand, simulation, simulating, onAutoMatch, autoMatchLoading, supplyDelta, totalFte, gapP50, onDragStart, onWhyNot }: Props): JSX.Element {
  const [attrition, setAttrition] = useState(10);
  const [strategy, setStrategy] = useState<AutoMatchStrategy>('BALANCED');
  const [minMatch, setMinMatch] = useState(15); // percent
  const activeStrategy = STRATEGY_OPTIONS.find((s) => s.value === strategy);

  // Filter out people already dispatched by accepted suggestions
  const dispatchedIds = new Set(simulation.suggestions.filter((s) => s.accepted).map((s) => s.benchPersonId));
  const releasedIds = new Set(simulation.releases.map((r) => r.personId));
  const availableBench = benchPeople.filter((p) => !dispatchedIds.has(p.personId) && !releasedIds.has(p.personId));

  // Simple Monte Carlo: attrition % → gap estimate
  const attritionCount = Math.round((totalFte * attrition) / 100);
  const currentGap = (simulation.unmatchedDemand.reduce((s, d) => s + d.headcountOpen, 0)) - availableBench.length;
  const gapWithAttrition = currentGap + attritionCount;

  return (
    <div style={S_SIDEBAR}>
      {/* Auto-Match: strategy + action */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label className="field" style={{ gap: 2 }}>
          <span className="field__label" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Strategy</span>
          <select
            className="field__control"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as AutoMatchStrategy)}
            disabled={autoMatchLoading || !simulating}
            style={{ fontSize: 10, padding: '2px 4px' }}
            data-testid="planner-strategy-select"
          >
            {STRATEGY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        {activeStrategy && (
          <div style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>{activeStrategy.hint}</div>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>Min skill match</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{minMatch}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={90}
            step={5}
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
            disabled={autoMatchLoading || !simulating || strategy === 'GROWTH'}
            style={{ accentColor: 'var(--color-accent)' }}
            data-testid="planner-min-match-slider"
          />
          {strategy === 'GROWTH' && (
            <span style={{ fontSize: 8, color: 'var(--color-text-subtle)' }}>Ignored for GROWTH (uses 20–60% stretch band)</span>
          )}
        </label>
        <Button variant="primary" size="sm" onClick={() => onAutoMatch(strategy, minMatch / 100)} disabled={autoMatchLoading || !simulating} type="button" style={{ width: '100%', fontSize: 10 }} data-testid="planner-auto-match">
          {autoMatchLoading ? 'Matching…' : 'Auto-Distribute'}
        </Button>
        {simulation.suggestions.length > 0 && (
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textAlign: 'center' }}>
            {simulation.suggestions.filter((s) => s.accepted).length}/{simulation.suggestions.length} accepted
          </div>
        )}
      </div>

      {/* Bench People */}
      <div style={S_SECTION}>
        Bench ({availableBench.length})
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {availableBench.map((p) => (
          <div
            key={p.personId}
            draggable={simulating}
            onDragStart={() => onDragStart(p)}
            style={{ ...S_CARD, opacity: simulating ? 1 : 0.7, cursor: simulating ? 'grab' : 'default' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-alt)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{p.displayName}</span>
              <span style={{ fontSize: 9, color: 'var(--color-text-subtle)' }}>{p.grade ?? ''}</span>
            </div>
            {/* Skills */}
            <div style={{ marginTop: 2 }}>
              {p.skills.slice(0, 4).map((sk) => (
                <span key={sk} style={S_SKILL_TAG}>{sk}</span>
              ))}
              {p.skills.length > 4 && <span style={{ fontSize: 8, color: 'var(--color-text-subtle)' }}>+{p.skills.length - 4}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{p.availablePercent}% free · {p.daysOnBench}d</span>
              {simulating && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={simulation.releases.some((r) => r.personId === p.personId)}
                    onChange={() => simulation.toggleRelease(p.personId, p.displayName, p.costPerMonth)}
                    style={{ accentColor: 'var(--color-status-danger)' }}
                    title="Mark for release"
                  />
                  <span style={{ fontSize: 8, color: 'var(--color-status-danger)' }}>Release</span>
                </label>
              )}
            </div>
          </div>
        ))}
        {availableBench.length === 0 && (
          <div style={{ padding: '12px 10px', color: 'var(--color-text-subtle)', textAlign: 'center', fontSize: 10 }}>
            {dispatchedIds.size > 0 ? 'All bench people dispatched' : 'No one on bench'}
          </div>
        )}
      </div>

      {/* Unmatched Demand / Hire Needs */}
      {(simulation.unmatchedDemand.length > 0 || simulation.hireIntents.length > 0) && (
        <>
          <div style={S_SECTION}>Hire Needs</div>
          <div style={{ maxHeight: 120, overflowY: 'auto' }}>
            {simulation.unmatchedDemand.map((d) => {
              const hasIntent = simulation.hireIntents.some((h) => h.role === d.role && h.projectId === '');
              return (
                <div key={d.demandId} style={{ padding: '4px 10px', fontSize: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', gap: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{d.role} ×{d.headcountOpen}</div>
                    <div style={{ fontSize: 8, color: 'var(--color-text-subtle)' }}>{d.projectName}</div>
                    {d.reason && <div style={{ fontSize: 8, color: 'var(--color-status-warning)', marginTop: 1 }}>{d.reason}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <Button variant="secondary" size="sm" onClick={() => onWhyNot(d.demandId)} type="button" title="Why wasn't this filled?" style={{ fontSize: 8, padding: '1px 5px', minWidth: 0 }}>
                      ?
                    </Button>
                    {simulating && !hasIntent && (
                      <Button variant="secondary" size="sm" onClick={() => simulation.addHireIntent({ projectId: '', projectName: d.projectName, role: d.role, skills: d.skills, count: d.headcountOpen, priority: 'MEDIUM', allocationPercent: 100, startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10), })} type="button" style={{ fontSize: 8, padding: '1px 6px' }}>
                        +Hire
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {simulation.hireIntents.map((h) => (
              <div key={h.id} style={{ padding: '4px 10px', fontSize: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', background: 'rgba(168,85,247,0.08)' }}>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--color-accent)' }}>{h.role} ×{h.count}</div>
                  <div style={{ fontSize: 8, color: 'var(--color-text-subtle)' }}>Hire intent</div>
                </div>
                <IconButton aria-label="Remove hire intent" size="sm" onClick={() => simulation.removeHireIntent(h.id)} style={{ color: 'var(--color-text-subtle)', fontSize: 12 }}>×</IconButton>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sensitivity */}
      <div style={S_SECTION}>Sensitivity</div>
      <div style={{ padding: '6px 10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
          Attrition:
          <input type="range" min={0} max={20} value={attrition} onChange={(e) => setAttrition(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--color-accent)' }} />
          <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 24, textAlign: 'right' }}>{attrition}%</span>
        </label>
        <div style={{ fontSize: 10, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
          <div>Gap (base): <strong style={{ color: currentGap > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>{currentGap > 0 ? `-${currentGap}` : `+${Math.abs(currentGap)}`}</strong></div>
          <div>Gap (+{attrition}% attrition): <strong style={{ color: 'var(--color-status-danger)' }}>-{gapWithAttrition}</strong></div>
        </div>
      </div>
    </div>
  );
}
