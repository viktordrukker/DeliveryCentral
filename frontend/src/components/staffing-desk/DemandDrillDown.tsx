import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/common/StatusBadge';
import { fetchDemandProfile, type DemandProfileResponse } from '@/lib/api/staffing-desk';
import { priorityTone } from '@/features/staffing-desk/staffing-desk.types';

interface Props {
  onClose: () => void;
  open: boolean;
  projectId?: string;
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
const HEADER: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const BODY: React.CSSProperties = { padding: 'var(--space-3) var(--space-4)', flex: 1, overflowY: 'auto' };

export function DemandDrillDown({ onClose, open, projectId }: Props): JSX.Element | null {
  const [data, setData] = useState<DemandProfileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchDemandProfile({ projectId })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={OVERLAY} role="dialog" aria-label="Demand drill-down">
      <div style={BACKDROP} onClick={onClose} />
      <div style={PANEL}>
        <div style={HEADER}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Open Demand</div>
          <button className="button button--secondary button--sm" onClick={onClose} type="button">&times;</button>
        </div>
        <div style={BODY}>
          {loading && <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Loading...</div>}
          {data && (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-status-warning)' }}>{data.headcountOpen}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>HC Open</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{data.totalRequests}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Requests</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{data.totalHeadcountNeeded}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Total HC</div>
                </div>
              </div>

              {/* Gap analysis table */}
              {data.skillDemand.length > 0 && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Skill Gap Analysis</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Skill</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Needed</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Available</th>
                        <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Gap</th>
                        <th style={{ padding: '4px 8px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.skillDemand.map((s) => (
                        <tr key={s.skill} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '4px 8px' }}>{s.skill}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.headcountNeeded}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.availableSupply}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {s.gap > 0 ? `−${s.gap}` : s.gap < 0 ? `+${Math.abs(s.gap)}` : '0'}
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <StatusBadge
                              label={s.gap > 0 ? 'Deficit' : s.gap === 0 ? 'Exact' : 'Surplus'}
                              tone={s.gap > 0 ? 'danger' : s.gap === 0 ? 'warning' : 'active'}
                              variant="dot"
                              size="small"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Priority breakdown */}
              {data.priorityBreakdown.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                  {data.priorityBreakdown.map((p) => (
                    <StatusBadge key={p.priority} label={`${p.priority}: ${p.headcount} HC`} tone={priorityTone(p.priority)} variant="chip" size="small" />
                  ))}
                </div>
              )}

              {/* Request list */}
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
                Requests ({data.requests.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {data.requests.map((r) => (
                  <div key={r.requestId} style={{
                    padding: '6px 8px', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 500 }}>{r.projectName}</span>
                      <StatusBadge label={r.priority} tone={priorityTone(r.priority)} variant="chip" size="small" />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      {r.role} · {r.allocationPercent}% · HC {r.headcountFulfilled}/{r.headcountRequired}
                    </div>
                    {r.skills.length > 0 && (
                      <div style={{ fontSize: 9, color: 'var(--color-text-subtle)', marginTop: 1 }}>{r.skills.join(', ')}</div>
                    )}
                    <div style={{ fontSize: 9, color: 'var(--color-text-subtle)', marginTop: 1 }}>
                      Open {r.daysOpen}d
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
