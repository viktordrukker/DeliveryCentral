import { useState } from 'react';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button, Table, type Column } from '@/components/ds';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import {
  pickProposalCandidate,
  rejectProposalSlate,
  type ProposalSlateCandidateDto,
  type ProposalSlateDto,
} from '@/lib/api/staffing-requests';

import { MatchScoreBar } from './MatchScoreBar';
import { RejectAllReasonModal } from './RejectAllReasonModal';
import { SkillMatchHeatmap, type SkillMatchCell } from './SkillMatchHeatmap';

interface ProposalReviewPanelProps {
  slate: ProposalSlateDto;
  staffingRequestId: string;
  /** Required skills for the request, used to render the heatmap. */
  requiredSkills?: string[];
  /** Per-candidate proficiency cells. When omitted, the heatmap shows Missing for all skills (no inference). */
  proficiencyCells?: SkillMatchCell[];
  /** Map of personId → display name. Falls back to truncated id when missing. */
  personNames?: Record<string, string>;
  /** Whether the current user can take pick/reject actions on this slate. */
  canDecide: boolean;
  /**
   * Planned overlay for the workload timeline column. Renders the proposed
   * allocation as a "(new)" segment alongside each candidate's existing
   * assignments, mirroring the staffing-desk row pattern.
   */
  plannedOverlay?: {
    allocationPercent: number;
    startDate: string;
    endDate: string;
    projectName: string;
  };
  onPicked: (assignmentId: string) => void;
  onRejected: (nextRequestStatus: 'OPEN' | 'CANCELLED') => void;
}

/**
 * Inline review surface for a proposal slate. Renders the heatmap + side-by-side
 * comparison directly on the staffing-request detail page. The Pick action opens
 * a small confirmation modal; the Reject action opens the existing reason modal.
 */
export function ProposalReviewPanel({
  slate,
  staffingRequestId,
  requiredSkills = [],
  proficiencyCells,
  personNames = {},
  canDecide,
  plannedOverlay,
  onPicked,
  onRejected,
}: ProposalReviewPanelProps): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [confirmPickOpen, setConfirmPickOpen] = useState(false);

  const isDecided = slate.status !== 'OPEN';
  const actionsDisabled = isDecided || submitting || !canDecide;

  // Honest heatmap: when we don't have real proficiency cells, render an empty
  // cells array. Each missing cell falls back to 0 (Missing) inside the heatmap
  // — never fabricate "Strong" labels from the absence of mismatchedSkills.
  const heatmapCells: SkillMatchCell[] = proficiencyCells ?? [];

  const heatmapCandidates = slate.candidates.map((c) => ({
    id: c.candidatePersonId,
    displayName: personNames[c.candidatePersonId] ?? `${c.candidatePersonId.slice(0, 8)}…`,
  }));

  const selectedCandidate = slate.candidates.find((c) => c.id === selectedId) ?? null;
  const selectedName = selectedCandidate
    ? (personNames[selectedCandidate.candidatePersonId] ??
       `${selectedCandidate.candidatePersonId.slice(0, 8)}…`)
    : '';

  async function performPick(): Promise<void> {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await pickProposalCandidate(staffingRequestId, slate.id, selectedId);
      onPicked(result.assignmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the pick.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectSubmit(input: {
    reasonCode: string;
    reason?: string;
    sendBack: boolean;
  }): Promise<void> {
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await rejectProposalSlate(staffingRequestId, slate.id, input);
      setRejectOpen(false);
      onRejected(result.nextRequestStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject the slate.');
      setRejectOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {error ? (
        <div
          role="alert"
          style={{
            background: 'var(--color-status-danger-soft, var(--color-surface-alt))',
            color: 'var(--color-status-danger)',
            padding: 'var(--space-2)',
            borderRadius: 4,
            marginBottom: 'var(--space-2)',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      {requiredSkills.length > 0 ? (
        <section style={{ marginBottom: 'var(--space-3)' }}>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 600,
              margin: '0 0 4px',
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              color: 'var(--color-text-muted)',
            }}
          >
            Skill match heatmap
          </h4>
          <SkillMatchHeatmap
            candidates={heatmapCandidates}
            skills={requiredSkills}
            cells={heatmapCells}
          />
        </section>
      ) : null}

      <section style={{ marginBottom: 'var(--space-3)' }}>
        <h4
          style={{
            fontSize: 11,
            fontWeight: 600,
            margin: '0 0 4px',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            color: 'var(--color-text-muted)',
          }}
        >
          Side-by-side comparison
        </h4>
        <Table
          variant="compact"
          tableLayout="fixed"
          columns={comparisonColumns(personNames, actionsDisabled, selectedId, setSelectedId, plannedOverlay)}
          rows={slate.candidates.slice().sort((a, b) => a.rank - b.rank)}
          getRowKey={(c) => c.id}
        />
      </section>

      {canDecide ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 'var(--space-2)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <Button
            variant="danger"
            onClick={() => setRejectOpen(true)}
            disabled={actionsDisabled}
          >
            Reject all…
          </Button>
          <Button
            variant="primary"
            onClick={() => setConfirmPickOpen(true)}
            disabled={!selectedId || actionsDisabled}
          >
            {submitting ? 'Recording pick…' : 'Pick selected candidate'}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmPickOpen}
        title="Pick this candidate?"
        message={
          selectedCandidate
            ? `This will create an Assignment at BOOKED for ${selectedName} (rank #${selectedCandidate.rank}). The other candidates in the slate will be marked as not picked.`
            : 'No candidate selected.'
        }
        confirmLabel="Pick candidate"
        onCancel={() => setConfirmPickOpen(false)}
        onConfirm={() => {
          // Close the dialog immediately so a stray double-click can't fire a
          // second pickProposalCandidate request — the slate-pick has no DB
          // transaction guarding "load → mutate → save", so a race produces
          // duplicate Assignments (one per click).
          setConfirmPickOpen(false);
          void performPick();
        }}
      />

      <RejectAllReasonModal
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onSubmit={handleRejectSubmit}
      />
    </>
  );
}

function comparisonColumns(
  personNames: Record<string, string>,
  disabled: boolean,
  selectedId: string | null,
  setSelectedId: (id: string) => void,
  plannedOverlay?: {
    allocationPercent: number;
    startDate: string;
    endDate: string;
    projectName: string;
  },
): Column<ProposalSlateCandidateDto>[] {
  return [
    {
      key: 'pick',
      title: ' ',
      width: 36,
      getValue: (c) => (selectedId === c.id ? 'selected' : ''),
      render: (c) => (
        <input
          type="radio"
          checked={selectedId === c.id}
          disabled={disabled}
          onChange={() => setSelectedId(c.id)}
          aria-label={`Pick candidate rank ${c.rank}`}
        />
      ),
    },
    {
      key: 'rank',
      title: '#',
      width: 48,
      getValue: (c) => c.rank,
      render: (c) => <span style={{ fontWeight: 600 }}>#{c.rank}</span>,
    },
    {
      key: 'candidate',
      title: 'Candidate',
      width: 140,
      getValue: (c) => personNames[c.candidatePersonId] ?? c.candidatePersonId,
      render: (c) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {personNames[c.candidatePersonId] ?? `${c.candidatePersonId.slice(0, 8)}…`}
          </div>
          {c.decision !== 'PENDING' ? (
            <div
              style={{
                fontSize: 10,
                color: 'var(--color-text-subtle)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              {c.decision}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'timeline',
      title: 'Timeline',
      width: 260,
      getValue: () => null,
      render: (c) => (
        <WorkloadTimeline
          personId={c.candidatePersonId}
          planned={plannedOverlay}
          compact
        />
      ),
    },
    {
      key: 'match',
      title: 'Match',
      width: 120,
      getValue: (c) => c.matchScore,
      render: (c) => <MatchScoreBar score={Number(c.matchScore)} />,
    },
    {
      key: 'available',
      title: 'Available',
      width: 90,
      getValue: (c) => c.availabilityPercent ?? 0,
      render: (c) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {c.availabilityPercent !== undefined ? `${c.availabilityPercent}%` : '—'}
        </span>
      ),
    },
    {
      key: 'missing',
      title: 'Missing skills',
      width: 140,
      getValue: (c) => c.mismatchedSkills.join(','),
      render: (c) =>
        c.mismatchedSkills.length === 0 ? (
          <span style={{ color: 'var(--color-text-muted)' }}>None</span>
        ) : (
          <span style={{ color: 'var(--color-status-warning)' }}>
            {c.mismatchedSkills.join(', ')}
          </span>
        ),
    },
    {
      key: 'rationale',
      title: 'Rationale',
      width: 160,
      getValue: (c) => c.rationale ?? '',
      render: (c) =>
        c.rationale ? (
          <span>{c.rationale}</span>
        ) : (
          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
        ),
    },
  ];
}
