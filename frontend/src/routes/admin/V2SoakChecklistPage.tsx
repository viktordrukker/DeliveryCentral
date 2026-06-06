import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button, Table, type Column } from '@/components/ds';
import {
  fetchSoakChecklist,
  saveSoakChecklist,
  type SoakCellObservation,
  type SoakChecklistCell,
  type SoakChecklistSummary,
} from '@/lib/api/v2-soak-checklist';

import {
  expectedOutcomesByJourney,
  SOAK_JOURNEYS,
  SOAK_ROLES,
  type SoakExpectedOutcome,
  type SoakJourneyDefinition,
  type SoakRole,
} from './v2-soak-journeys';

const DEFAULT_SESSION = `${new Date().toISOString().slice(0, 10)}-pre-c0`;

const OBSERVATION_TONE: Record<SoakCellObservation, 'active' | 'warning' | 'danger' | 'neutral'> = {
  PASS: 'active',
  FAIL: 'danger',
  BLOCKED: 'warning',
  NOT_RUN: 'neutral',
};

function cellKey(journeyId: string, role: SoakRole): string {
  return `${journeyId}::${role}`;
}

function isEditable(expected: SoakExpectedOutcome): boolean {
  return expected !== 'NOT_APPLICABLE';
}

function nextObservation(current: SoakCellObservation): SoakCellObservation {
  switch (current) {
    case 'NOT_RUN':
      return 'PASS';
    case 'PASS':
      return 'FAIL';
    case 'FAIL':
      return 'BLOCKED';
    case 'BLOCKED':
      return 'NOT_RUN';
  }
}

export function V2SoakChecklistPage(): JSX.Element {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION);
  const [activeSessionId, setActiveSessionId] = useState(DEFAULT_SESSION);
  const [observations, setObservations] = useState<Map<string, SoakCellObservation>>(new Map());
  const [summary, setSummary] = useState<SoakChecklistSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedMatrix = useMemo(() => expectedOutcomesByJourney(), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    fetchSoakChecklist(activeSessionId)
      .then((res) => {
        if (!active) return;
        const map = new Map<string, SoakCellObservation>();
        for (const cell of res.state.cells) {
          map.set(cellKey(cell.journeyId, cell.role as SoakRole), cell.observation);
        }
        setObservations(map);
        setSummary(res.summary ?? null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load soak checklist.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeSessionId]);

  function toggleCell(journeyId: string, role: SoakRole, expected: SoakExpectedOutcome): void {
    if (!isEditable(expected)) return;
    setObservations((prev) => {
      const next = new Map(prev);
      const current = next.get(cellKey(journeyId, role)) ?? 'NOT_RUN';
      next.set(cellKey(journeyId, role), nextObservation(current));
      return next;
    });
  }

  async function save(): Promise<void> {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const cells: SoakChecklistCell[] = [];
      for (const j of SOAK_JOURNEYS) {
        for (const role of SOAK_ROLES) {
          const expected = j.expectedOutcome[role];
          if (!isEditable(expected)) continue;
          const observation = observations.get(cellKey(j.id, role)) ?? 'NOT_RUN';
          if (observation === 'NOT_RUN') continue;
          cells.push({ journeyId: j.id, role, observation, observedAt: now });
        }
      }
      const res = await saveSoakChecklist(activeSessionId, cells, expectedMatrix);
      setSummary(res.summary ?? null);
      toast.success('Soak checklist saved.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save checklist.';
      setError(message);
      toast.error(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  function loadSession(): void {
    const trimmed = sessionId.trim();
    if (!trimmed) return;
    setActiveSessionId(trimmed);
  }

  return (
    <PageContainer testId="v2-soak-checklist-page">
      <PageHeader
        eyebrow="V2 cutover"
        title="V2 Soak Click-Through Checklist"
        subtitle="30 journeys x 8 roles = 256 cells. Walk this matrix on the v2-staging environment before flipping dsRefresh and workspaceMe defaults."
      />

      <SectionCard title="Session">
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label className="field" style={{ flex: 1, minWidth: 240 }}>
            <span className="field__label">Session id</span>
            <input
              className="field__control"
              data-testid="soak-session-id-input"
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="2026-06-08-pre-c0"
              type="text"
              value={sessionId}
            />
          </label>
          <Button data-testid="soak-load-button" onClick={loadSession} variant="secondary">
            Load
          </Button>
          <Button
            data-testid="soak-save-button"
            disabled={isSaving}
            onClick={() => void save()}
            variant="primary"
          >
            {isSaving ? 'Saving…' : 'Save observations'}
          </Button>
        </div>
        <div style={{ marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--color-text-muted)' }}>
          Active session: <code>{activeSessionId}</code>
        </div>
      </SectionCard>

      {error ? <ErrorState description={error} /> : null}

      {summary ? <SoakSummaryStrip summary={summary} /> : null}

      {isLoading ? (
        <LoadingState label="Loading checklist…" variant="skeleton" skeletonType="page" />
      ) : SOAK_JOURNEYS.length === 0 ? (
        <EmptyState title="No journeys" description="Journey definitions are missing." />
      ) : (
        <SectionCard title={`Journey x Role matrix (${SOAK_JOURNEYS.length} x ${SOAK_ROLES.length})`}>
          <SoakChecklistMatrix observations={observations} onToggle={toggleCell} />
        </SectionCard>
      )}
    </PageContainer>
  );
}

function SoakSummaryStrip({ summary }: { summary: SoakChecklistSummary }): JSX.Element {
  const cutoverColor = summary.cutoverReady
    ? 'var(--color-status-active)'
    : 'var(--color-status-danger)';
  return (
    <div
      className="kpi-strip"
      aria-label="Soak checklist summary"
      data-testid="soak-summary-strip"
      style={{ marginBottom: 'var(--space-3)' }}
    >
      <div className="kpi-strip__item" style={{ borderLeft: `3px solid ${cutoverColor}` }}>
        <span className="kpi-strip__value">{summary.cutoverReady ? 'READY' : 'BLOCKED'}</span>
        <span className="kpi-strip__label">Cutover gate</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-active)' }}>
        <span className="kpi-strip__value">{summary.pass}</span>
        <span className="kpi-strip__label">Passed</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-danger)' }}>
        <span className="kpi-strip__value">{summary.fail}</span>
        <span className="kpi-strip__label">Failed</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-warning)' }}>
        <span className="kpi-strip__value">{summary.blocked}</span>
        <span className="kpi-strip__label">Blocked</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-neutral)' }}>
        <span className="kpi-strip__value">{summary.notRun}</span>
        <span className="kpi-strip__label">Not run</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-status-danger)' }}>
        <span className="kpi-strip__value">{summary.regressions}</span>
        <span className="kpi-strip__label">Regressions</span>
      </div>
      <div className="kpi-strip__item" style={{ borderLeft: '3px solid var(--color-accent)' }}>
        <span className="kpi-strip__value">{summary.totalGated}</span>
        <span className="kpi-strip__label">Total gated</span>
      </div>
    </div>
  );
}

interface MatrixProps {
  observations: Map<string, SoakCellObservation>;
  onToggle: (journeyId: string, role: SoakRole, expected: SoakExpectedOutcome) => void;
}

function SoakChecklistMatrix({ observations, onToggle }: MatrixProps): JSX.Element {
  const columns: Column<SoakJourneyDefinition>[] = [
    {
      key: 'journey',
      title: 'Journey',
      render: (journey) => (
        <div style={{ fontWeight: 500, minWidth: 280 }}>
          <div>{journey.id} — {journey.title}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            persona: {journey.persona}
            {journey.blockedBy ? ` · blocked by ${journey.blockedBy}` : ''}
          </div>
        </div>
      ),
    },
    ...SOAK_ROLES.map<Column<SoakJourneyDefinition>>((role) => ({
      key: role,
      title: role,
      align: 'center' as const,
      render: (journey) => {
        const expected = journey.expectedOutcome[role];
        const observation = observations.get(cellKey(journey.id, role)) ?? 'NOT_RUN';
        return (
          <SoakChecklistCellButton
            expected={expected}
            journeyId={journey.id}
            observation={observation}
            onToggle={() => onToggle(journey.id, role, expected)}
            role={role}
          />
        );
      },
    })),
  ];
  return (
    <div data-testid="soak-matrix" style={{ overflowX: 'auto' }}>
      <Table
        columns={columns}
        rows={[...SOAK_JOURNEYS]}
        getRowKey={(j) => j.id}
        variant="compact"
      />
    </div>
  );
}

interface CellButtonProps {
  expected: SoakExpectedOutcome;
  observation: SoakCellObservation;
  journeyId: string;
  role: SoakRole;
  onToggle: () => void;
}

function SoakChecklistCellButton({
  expected,
  observation,
  journeyId,
  role,
  onToggle,
}: CellButtonProps): JSX.Element {
  if (expected === 'NOT_APPLICABLE') {
    return (
      <span
        aria-label={`${role} not applicable for ${journeyId}`}
        data-testid={`soak-cell-${journeyId}-${role}`}
        style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}
      >
        N/A
      </span>
    );
  }
  const label = expected === 'FAIL_EXPECTED' ? `${observation} (deny)` : observation;
  return (
    <Button
      aria-label={`${role} observation for ${journeyId}: ${observation}`}
      data-testid={`soak-cell-${journeyId}-${role}`}
      onClick={onToggle}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
      type="button"
      variant="ghost"
      size="xs"
    >
      <StatusBadge label={label} tone={OBSERVATION_TONE[observation]} variant="chip" />
    </Button>
  );
}
