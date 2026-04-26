import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { RiskRegister } from '@/components/projects/RiskRegister';
import { RiskHeatMap } from '@/components/projects/RiskHeatMap';
import {
  type ProjectRiskDto,
  type RiskMatrixCell,
  type RiskSummaryDto,
  type RiskType,
  type RiskCategory,
  type RiskStatus,
  type CreateRiskRequest,
  fetchRisks,
  fetchRiskMatrix,
  fetchRiskSummary,
  createRisk,
  updateRisk,
  convertRiskToIssue,
  resolveRisk,
  closeRisk,
} from '@/lib/api/project-risks';

interface RisksIssuesTabProps {
  projectId: string;
}

const CATEGORIES: RiskCategory[] = ['SCOPE', 'SCHEDULE', 'BUDGET', 'BUSINESS', 'TECHNICAL', 'OPERATIONAL'];

export function RisksIssuesTab({ projectId }: RisksIssuesTabProps): JSX.Element {
  const [risks, setRisks] = useState<ProjectRiskDto[]>([]);
  const [matrixData, setMatrixData] = useState<RiskMatrixCell[]>([]);
  const [summary, setSummary] = useState<RiskSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<RiskType | null>(null);
  const [filterCategory, setFilterCategory] = useState<RiskCategory | null>(null);
  const [filterStatus, setFilterStatus] = useState<RiskStatus | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createCategory, setCreateCategory] = useState<RiskCategory>('TECHNICAL');
  const [createProbability, setCreateProbability] = useState('3');
  const [createImpact, setCreateImpact] = useState('3');
  const [isCreating, setIsCreating] = useState(false);

  async function loadData(): Promise<void> {
    try {
      const [r, m, s] = await Promise.all([
        fetchRisks(projectId),
        fetchRiskMatrix(projectId),
        fetchRiskSummary(projectId),
      ]);
      setRisks(r);
      setMatrixData(m);
      setSummary(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load risk data.');
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);

    void (async () => {
      await loadData();
      if (active) setLoading(false);
    })();

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (isCreating || !createTitle.trim()) return;
    setIsCreating(true);
    try {
      const data: CreateRiskRequest = {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        category: createCategory,
        probability: Number(createProbability),
        impact: Number(createImpact),
      };
      await createRisk(projectId, data);
      toast.success('Risk created');
      setCreateTitle('');
      setCreateDescription('');
      setCreateCategory('TECHNICAL');
      setCreateProbability('3');
      setCreateImpact('3');
      setShowCreate(false);
      await loadData();
    } catch {
      toast.error('Failed to create risk');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleResolve(riskId: string): Promise<void> {
    try {
      await resolveRisk(projectId, riskId);
      toast.success('Risk resolved');
      await loadData();
    } catch {
      toast.error('Failed to resolve risk');
    }
  }

  async function handleClose(riskId: string): Promise<void> {
    try {
      await closeRisk(projectId, riskId);
      toast.success('Risk closed');
      await loadData();
    } catch {
      toast.error('Failed to close risk');
    }
  }

  if (loading) return <LoadingState label="Loading risks..." variant="skeleton" skeletonType="detail" />;
  if (error) return <ErrorState description={error} />;

  const overdueCount = risks.filter((r) =>
    r.dueDate && new Date(r.dueDate) < new Date() && !['RESOLVED', 'CLOSED'].includes(r.status),
  ).length;

  return (
    <div data-testid="risks-issues-tab" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* KPI mini-strip */}
      <div className="kpi-strip kpi-strip--compact" aria-label="Risk metrics">
        <span className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-warning)' }}>
          <span className="kpi-strip__value">{summary?.openRisks ?? 0}</span>
          <span className="kpi-strip__label">Open Risks</span>
        </span>
        <span className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-danger)' }}>
          <span className="kpi-strip__value">{summary?.openIssues ?? 0}</span>
          <span className="kpi-strip__label">Open Issues</span>
        </span>
        <span className="kpi-strip__item" style={{ borderLeft: `3px solid ${(summary?.criticalCount ?? 0) > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
          <span className="kpi-strip__value">{summary?.criticalCount ?? 0}</span>
          <span className="kpi-strip__label">Critical (15+)</span>
        </span>
        <span className="kpi-strip__item" style={{ borderLeft: `3px solid ${overdueCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
          <span className="kpi-strip__value">{overdueCount}</span>
          <span className="kpi-strip__label">Overdue</span>
        </span>
      </div>

      {/* Create Risk button / form */}
      {!showCreate ? (
        <div>
          <button className="button button--primary button--sm" type="button" onClick={() => setShowCreate(true)}>
            + New Risk
          </button>
        </div>
      ) : (
        <SectionCard title="Create Risk">
          <form onSubmit={(e) => void handleCreate(e)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              <label className="field">
                <span className="field__label">Title</span>
                <input className="field__control" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} required />
              </label>
              <label className="field">
                <span className="field__label">Category</span>
                <select className="field__control" value={createCategory} onChange={(e) => setCreateCategory(e.target.value as RiskCategory)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Probability (1-5)</span>
                <input className="field__control" type="number" min={1} max={5} value={createProbability} onChange={(e) => setCreateProbability(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Impact (1-5)</span>
                <input className="field__control" type="number" min={1} max={5} value={createImpact} onChange={(e) => setCreateImpact(e.target.value)} />
              </label>
            </div>
            <label className="field" style={{ marginTop: 'var(--space-3)' }}>
              <span className="field__label">Description</span>
              <textarea className="field__control" rows={2} value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
              <button className="button button--primary" type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </button>
              <button className="button button--secondary" type="button" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Two-column: Register + Heat map */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 'var(--space-4)', alignItems: 'start' }}>
        <SectionCard title={`Risk Register (${risks.length})`}>
          <RiskRegister
            risks={risks}
            onCreateRisk={async (data) => { await createRisk(projectId, data); await loadData(); }}
            onUpdateRisk={async (riskId, data) => { await updateRisk(projectId, riskId, data); await loadData(); }}
            onConvertToIssue={async (riskId, assigneeId) => { await convertRiskToIssue(projectId, riskId, assigneeId); await loadData(); }}
            onResolve={handleResolve}
            onClose={handleClose}
            filterRiskType={filterType}
            filterCategory={filterCategory}
            filterStatus={filterStatus}
            onFilterChange={(f) => { setFilterType(f.riskType ?? null); setFilterCategory(f.category ?? null); setFilterStatus(f.status ?? null); }}
          />
        </SectionCard>

        <SectionCard title="Risk Heat Map">
          {matrixData.length > 0 ? (
            <RiskHeatMap matrixData={matrixData} />
          ) : (
            <EmptyState title="No matrix data" description="Add risks to populate the heat map." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
