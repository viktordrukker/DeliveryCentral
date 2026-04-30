import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { fetchSupplyProfile, type SupplyProfileResponse, type SupplyPerson } from '@/lib/api/staffing-desk';
import { Button } from '@/components/ds';

interface Props {
  onClose: () => void;
  open: boolean;
  poolId?: string;
  orgUnitId?: string;
}

const OVERLAY: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 110, display: 'flex', justifyContent: 'flex-end',
};
const BACKDROP: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' };
const PANEL: React.CSSProperties = {
  position: 'relative', width: 500, maxWidth: '95vw', height: '100%',
  background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)',
  boxShadow: 'var(--shadow-modal)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
};
const HEADER: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const BODY: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', flex: 1, overflowY: 'auto' };

export function SupplyDrillDown({ onClose, open, poolId, orgUnitId }: Props): JSX.Element | null {
  const [data, setData] = useState<SupplyProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [timelinePerson, setTimelinePerson] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchSupplyProfile({ poolId, orgUnitId })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, poolId, orgUnitId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={OVERLAY} role="dialog" aria-label="Supply drill-down">
      <div style={BACKDROP} onClick={onClose} />
      <div style={PANEL}>
        <div style={HEADER}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Available Supply</div>
          <Button variant="secondary" size="sm" onClick={onClose} type="button">&times;</Button>
        </div>
        <div style={BODY}>
          {loading && <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Loading...</div>}
          {data && (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{data.availablePeople}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Available</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{data.benchPeople}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>On Bench</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{data.totalPeople}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Total</div>
                </div>
              </div>

              {/* Skill heatmap */}
              {data.skillDistribution.length > 0 && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Skills Available</div>
                  {data.skillDistribution.slice(0, 10).map((s) => (
                    <div key={s.skill} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2, fontSize: 11 }}>
                      <span style={{ width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.skill}</span>
                      <div style={{ flex: 1, height: 12, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, s.peopleCount * 10)}%`, height: '100%', background: 'var(--color-status-active)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right', color: 'var(--color-text-muted)' }}>
                        {s.peopleCount}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Grade distribution */}
              {data.gradeDistribution.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                  {data.gradeDistribution.map((g) => (
                    <span key={g.grade} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
                    }}>
                      {g.grade}: {g.count}
                    </span>
                  ))}
                </div>
              )}

              {/* Person timeline viewer */}
              {timelinePerson && (
                <div style={{ marginBottom: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 6, padding: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>Workload Timeline</span>
                    <Button variant="secondary" size="sm" onClick={() => setTimelinePerson(null)} type="button" style={{ fontSize: 10 }}>Close</Button>
                  </div>
                  <WorkloadTimeline personId={timelinePerson} />
                </div>
              )}

              {/* People list */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                People ({data.people.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {data.people.map((p) => (
                  <PersonRow key={p.personId} person={p} onViewTimeline={setTimelinePerson} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PersonRow({ person, onViewTimeline }: { person: SupplyPerson; onViewTimeline: (id: string) => void }): JSX.Element {
  const tone = person.availablePercent >= 50 ? 'active' : person.availablePercent > 0 ? 'warning' : 'danger';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 4,
      fontSize: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>{person.displayName}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
          {person.grade ?? ''} {person.poolName ? `· ${person.poolName}` : ''}
        </div>
        {person.skills.length > 0 && (
          <div style={{ fontSize: 9, color: 'var(--color-text-subtle)', marginTop: 1 }}>{person.skills.slice(0, 5).join(', ')}</div>
        )}
      </div>
      <StatusBadge label={`${person.availablePercent}% free`} tone={tone} variant="chip" size="small" />
      <Button variant="secondary" size="sm" onClick={() => onViewTimeline(person.personId)} type="button" style={{ fontSize: 9, padding: '2px 6px' }}>
        Timeline
      </Button>
    </div>
  );
}
