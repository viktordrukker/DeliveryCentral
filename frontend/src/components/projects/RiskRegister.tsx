import { useState } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import type {
  ProjectRiskDto,
  CreateRiskRequest,
  UpdateRiskRequest,
  RiskType,
  RiskCategory,
  RiskStatus,
} from '@/lib/api/project-risks';
import { Button, Table, type Column } from '@/components/ds';

interface RiskRegisterProps {
  risks: ProjectRiskDto[];
  onCreateRisk: (data: CreateRiskRequest) => Promise<void>;
  onUpdateRisk: (riskId: string, data: UpdateRiskRequest) => Promise<void>;
  onConvertToIssue: (riskId: string, assigneePersonId: string) => Promise<void>;
  onResolve: (riskId: string) => Promise<void>;
  onClose: (riskId: string) => Promise<void>;
  filterRiskType?: RiskType | null;
  filterCategory?: RiskCategory | null;
  filterStatus?: RiskStatus | null;
  onFilterChange?: (filters: { riskType?: RiskType | null; category?: RiskCategory | null; status?: RiskStatus | null }) => void;
}

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

const RISK_TYPES: RiskType[] = ['RISK', 'ISSUE'];
const CATEGORIES: RiskCategory[] = ['SCOPE', 'SCHEDULE', 'BUDGET', 'BUSINESS', 'TECHNICAL', 'OPERATIONAL'];
const STATUSES: RiskStatus[] = ['IDENTIFIED', 'ASSESSED', 'MITIGATING', 'RESOLVED', 'CLOSED', 'CONVERTED_TO_ISSUE'];

function severityTone(score: number): 'danger' | 'warning' | 'active' {
  if (score >= 15) return 'danger';
  if (score >= 8) return 'warning';
  return 'active';
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDate(d: string | null): string {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function humanLabel(s: string): string {
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RiskRegister({
  risks,
  onResolve,
  onClose,
  filterRiskType,
  filterCategory,
  filterStatus,
  onFilterChange,
}: RiskRegisterProps): JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = risks.filter((r) => {
    if (filterRiskType && r.riskType !== filterRiskType) return false;
    if (filterCategory && r.category !== filterCategory) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div data-testid="risk-register">
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
        <label className="field" style={{ minWidth: 120 }}>
          <span className="field__label">Type</span>
          <select
            className="field__control"
            value={filterRiskType ?? ''}
            onChange={(e) => onFilterChange?.({ riskType: (e.target.value || null) as RiskType | null, category: filterCategory, status: filterStatus })}
          >
            <option value="">All</option>
            {RISK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="field" style={{ minWidth: 140 }}>
          <span className="field__label">Category</span>
          <select
            className="field__control"
            value={filterCategory ?? ''}
            onChange={(e) => onFilterChange?.({ riskType: filterRiskType, category: (e.target.value || null) as RiskCategory | null, status: filterStatus })}
          >
            <option value="">All</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{humanLabel(c)}</option>)}
          </select>
        </label>
        <label className="field" style={{ minWidth: 140 }}>
          <span className="field__label">Status</span>
          <select
            className="field__control"
            value={filterStatus ?? ''}
            onChange={(e) => onFilterChange?.({ riskType: filterRiskType, category: filterCategory, status: (e.target.value || null) as RiskStatus | null })}
          >
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{humanLabel(s)}</option>)}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No risks found" description="No risks or issues match the current filters." />
      ) : (
        <div>
          <Table
            variant="compact"
            columns={[
              { key: 'index', title: '#', width: 28, align: 'center', getValue: (_r: ProjectRiskDto, i: number) => i + 1, render: (_r: ProjectRiskDto, i: number) => i + 1 },
              { key: 'severity', title: 'Severity', width: 88, getValue: (r) => r.riskScore, render: (r) => <StatusBadge status={r.riskScore >= 15 ? 'critical' : r.riskScore >= 8 ? 'warning' : 'active'} variant="dot" tone={severityTone(r.riskScore)} /> },
              { key: 'title', title: 'Title', getValue: (r) => r.title, render: (r) => <span style={{ fontWeight: 500 }}>{r.title}</span> },
              { key: 'category', title: 'Category', width: 100, getValue: (r) => r.category, render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{humanLabel(r.category)}</span> },
              { key: 'type', title: 'Type', width: 72, getValue: (r) => r.riskType, render: (r) => <StatusBadge status={r.riskType} variant="chip" tone={r.riskType === 'ISSUE' ? 'danger' : 'info'} /> },
              { key: 'score', title: 'Score', align: 'right', width: 60, getValue: (r) => r.riskScore, render: (r) => <span style={{ ...NUM, fontWeight: 700 }}>{r.probability}\u00d7{r.impact}={r.riskScore}</span> },
              { key: 'strategy', title: 'Strategy', width: 90, getValue: (r) => r.strategy ?? '', render: (r) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.strategy ? humanLabel(r.strategy) : '\u2014'}</span> },
              { key: 'owner', title: 'Owner', width: 120, getValue: (r) => r.ownerDisplayName ?? 'Unassigned', render: (r) => <span style={{ fontSize: 11 }}>{r.ownerDisplayName ?? 'Unassigned'}</span> },
              { key: 'status', title: 'Status', width: 100, getValue: (r) => r.status, render: (r) => <StatusBadge status={r.status} variant="chip" /> },
              { key: 'due', title: 'Due', width: 80, getValue: (r) => r.dueDate ?? '', render: (r) => <span style={{ color: isOverdue(r.dueDate) ? 'var(--color-status-danger)' : 'var(--color-text-muted)', fontSize: 11 }}>{formatDate(r.dueDate)}</span> },
              { key: 'actions', title: 'Actions', width: 100, render: (r) => {
                const canResolve = !['RESOLVED', 'CLOSED'].includes(r.status);
                const canClose = r.status === 'RESOLVED';
                return (
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }} onClick={(e) => e.stopPropagation()}>
                    {canResolve && (<Button variant="secondary" size="sm" onClick={() => onResolve(r.id)}>Resolve</Button>)}
                    {canClose && (<Button variant="secondary" size="sm" onClick={() => onClose(r.id)}>Close</Button>)}
                  </div>
                );
              } },
            ] as Column<ProjectRiskDto>[]}
            rows={filtered}
            getRowKey={(r) => r.id}
            onRowClick={(r) => setExpandedId(expandedId === r.id ? null : r.id)}
          />

          {/* Expanded detail row */}
          {expandedId && (() => {
            const risk = filtered.find((r) => r.id === expandedId);
            if (!risk) return null;
            return (
              <div style={{
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                padding: 'var(--space-3)',
                marginTop: 'var(--space-2)',
                background: 'var(--color-surface-alt)',
                fontSize: 12,
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Description</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>{risk.description || 'No description provided.'}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Strategy Details</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>{risk.strategyDescription || '\u2014'}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Damage Control Plan</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>{risk.damageControlPlan || '\u2014'}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>Assignee</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>{risk.assigneeDisplayName || 'Unassigned'}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
