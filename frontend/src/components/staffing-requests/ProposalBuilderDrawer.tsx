import { useEffect, useMemo, useState } from 'react';

import { Button, Drawer, FormField, Textarea } from '@/components/ds';
import { PersonSelect } from '@/components/common/PersonSelect';
import {
  fetchStaffingSuggestions,
  submitProposalSlate,
  type StaffingRequest,
  type SubmitProposalSlateCandidate,
  type SuggestionCandidate,
} from '@/lib/api/staffing-requests';

import { MatchScoreBar } from './MatchScoreBar';

interface ProposalBuilderDrawerProps {
  open: boolean;
  request: StaffingRequest;
  onClose: () => void;
  onSubmitted: () => void;
  /** Soft caps; backend enforces the configurable PlatformSetting bounds. */
  minCandidates?: number;
  maxCandidates?: number;
}

interface DraftCandidate {
  candidatePersonId: string;
  displayName?: string;
  rank: number;
  matchScore: number;
  availabilityPercent?: number;
  rationale: string;
  source: 'matcher' | 'manual' | 'endorsed';
}

/**
 * RM-facing slate builder. Reads matcher suggestions for the request and lets
 * the RM add/remove/rank candidates. The PM's optional endorsement is
 * pre-seeded at rank #1 with a visible "Endorsed by PM" pill.
 */
export function ProposalBuilderDrawer(props: ProposalBuilderDrawerProps): JSX.Element | null {
  if (!props.open) return null;
  return <Inner {...props} />;
}

function Inner({
  open,
  request,
  onClose,
  onSubmitted,
  minCandidates = 1,
  maxCandidates = 5,
}: ProposalBuilderDrawerProps): JSX.Element {
  const [suggestions, setSuggestions] = useState<SuggestionCandidate[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [candidates, setCandidates] = useState<DraftCandidate[]>([]);
  const [pendingPersonId, setPendingPersonId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Load matcher suggestions on open. Pre-seed the PM-endorsed candidate at
  // rank #1 if the request has one.
  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const list = await fetchStaffingSuggestions(request.id);
        if (!active) return;
        setSuggestions(list);
        if (request.candidatePersonId) {
          const endorsed = list.find((s) => s.personId === request.candidatePersonId);
          setCandidates([
            {
              candidatePersonId: request.candidatePersonId,
              displayName: endorsed?.displayName,
              rank: 1,
              matchScore: endorsed?.score ?? 0,
              availabilityPercent: endorsed?.availableCapacityPercent,
              rationale: 'Endorsed by PM at request creation.',
              source: 'endorsed',
            },
          ]);
        }
      } catch (err) {
        if (active) setSuggestError(err instanceof Error ? err.message : 'Failed to load suggestions.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [request.id, request.candidatePersonId]);

  const usedIds = useMemo(() => new Set(candidates.map((c) => c.candidatePersonId)), [candidates]);
  const remainingSuggestions = suggestions.filter((s) => !usedIds.has(s.personId));

  function addFromSuggestion(s: SuggestionCandidate): void {
    if (candidates.length >= maxCandidates) {
      setError(`Cannot add more than ${maxCandidates} candidates.`);
      return;
    }
    const nextRank = candidates.length === 0 ? 1 : Math.max(...candidates.map((c) => c.rank)) + 1;
    setCandidates([
      ...candidates,
      {
        candidatePersonId: s.personId,
        displayName: s.displayName,
        rank: nextRank,
        matchScore: s.score,
        availabilityPercent: s.availableCapacityPercent,
        rationale: '',
        source: 'matcher',
      },
    ]);
    setError(undefined);
  }

  function addManual(): void {
    if (!pendingPersonId) return;
    if (usedIds.has(pendingPersonId)) {
      setError('That person is already on the slate.');
      return;
    }
    if (candidates.length >= maxCandidates) {
      setError(`Cannot add more than ${maxCandidates} candidates.`);
      return;
    }
    const nextRank = candidates.length === 0 ? 1 : Math.max(...candidates.map((c) => c.rank)) + 1;
    setCandidates([
      ...candidates,
      {
        candidatePersonId: pendingPersonId,
        rank: nextRank,
        matchScore: 50,
        rationale: '',
        source: 'manual',
      },
    ]);
    setPendingPersonId('');
    setError(undefined);
  }

  function removeCandidate(personId: string): void {
    setCandidates(candidates.filter((c) => c.candidatePersonId !== personId));
  }

  function updateCandidate(personId: string, patch: Partial<DraftCandidate>): void {
    setCandidates(candidates.map((c) => (c.candidatePersonId === personId ? { ...c, ...patch } : c)));
  }

  const ranksValid =
    candidates.length === 0 ||
    new Set(candidates.map((c) => c.rank)).size === candidates.length;
  const submitDisabled =
    submitting ||
    candidates.length < minCandidates ||
    candidates.length > maxCandidates ||
    !ranksValid;

  async function handleSubmit(): Promise<void> {
    if (!ranksValid) {
      setError('Each candidate must have a unique rank.');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const payload: SubmitProposalSlateCandidate[] = candidates
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((c) => ({
          candidatePersonId: c.candidatePersonId,
          rank: c.rank,
          matchScore: c.matchScore,
          availabilityPercent: c.availabilityPercent,
          rationale: c.rationale.trim() || undefined,
        }));
      await submitProposalSlate(request.id, { candidates: payload });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the slate.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Build proposal slate"
      description={`Project ${request.projectName ?? request.projectId} · ${request.role} · ${request.allocationPercent}% · ${request.startDate} → ${request.endDate}`}
      width="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {candidates.length} of {maxCandidates} candidate{maxCandidates === 1 ? '' : 's'} ·
            {candidates.length < minCandidates
              ? ` need ${minCandidates - candidates.length} more`
              : ' ready to submit'}
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitDisabled}>
              {submitting ? 'Submitting…' : 'Submit slate'}
            </Button>
          </div>
        </div>
      }
    >
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Suggested candidates */}
        <section>
          <header
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-1)',
            }}
          >
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)' }}>
              Suggested candidates
            </h3>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {loading ? 'Loading…' : `${remainingSuggestions.length} ranked by skill + availability`}
            </span>
          </header>
          {suggestError ? (
            <div role="alert" style={{ fontSize: 12, color: 'var(--color-status-danger)' }}>
              {suggestError}
            </div>
          ) : null}
          {loading ? null : remainingSuggestions.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              The matcher returned no further suggestions. Use the manual picker below.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {remainingSuggestions.map((s) => (
                <div
                  key={s.personId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-1) var(--space-2)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 4,
                    background: 'var(--color-surface)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                      Available: {Math.round(s.availableCapacityPercent)}% · Allocated: {Math.round(s.currentAllocationPercent)}%
                    </div>
                  </div>
                  <MatchScoreBar score={s.score} />
                  <Button variant="secondary" size="sm" onClick={() => addFromSuggestion(s)}>
                    + Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Manual add */}
        <section>
          <header style={{ marginBottom: 'var(--space-1)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)' }}>
              Add other person
            </h3>
          </header>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <PersonSelect
                label=""
                value={pendingPersonId}
                onChange={setPendingPersonId}
              />
            </div>
            <Button variant="secondary" onClick={addManual} disabled={!pendingPersonId || candidates.length >= maxCandidates}>
              Add manually
            </Button>
          </div>
        </section>

        {/* Slate being assembled */}
        <section>
          <header style={{ marginBottom: 'var(--space-1)' }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)' }}>
              Slate being assembled
            </h3>
          </header>
          {candidates.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--color-border)',
                borderRadius: 4,
                padding: 'var(--space-3)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
              }}
            >
              Pick at least {minCandidates} candidate{minCandidates === 1 ? '' : 's'} from the suggestions above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {candidates
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map((c) => (
                  <CandidateRow
                    key={c.candidatePersonId}
                    candidate={c}
                    onChange={(patch) => updateCandidate(c.candidatePersonId, patch)}
                    onRemove={() => removeCandidate(c.candidatePersonId)}
                  />
                ))}
            </div>
          )}
        </section>
      </div>
    </Drawer>
  );
}

interface CandidateRowProps {
  candidate: DraftCandidate;
  onChange: (patch: Partial<DraftCandidate>) => void;
  onRemove: () => void;
}

function CandidateRow({ candidate, onChange, onRemove }: CandidateRowProps): JSX.Element {
  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: 'var(--space-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        background: 'var(--color-surface)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 8,
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text-muted)',
              minWidth: 22,
              textAlign: 'center',
            }}
          >
            #{candidate.rank}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            {candidate.displayName ?? `${candidate.candidatePersonId.slice(0, 8)}…`}
          </span>
          {candidate.source === 'endorsed' ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: 8,
                background: 'var(--color-status-info-soft, var(--color-surface-alt))',
                color: 'var(--color-status-info)',
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              Endorsed by PM
            </span>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <FormField label="Rank">
          <input
            type="number"
            min={1}
            max={20}
            className="ds-input"
            value={candidate.rank}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({ rank: Number.isFinite(n) ? n : 1 });
            }}
            style={{ width: 70 }}
          />
        </FormField>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Match</div>
          <MatchScoreBar score={candidate.matchScore} width={140} />
        </div>
        {candidate.availabilityPercent !== undefined ? (
          <div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Available</div>
            <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(candidate.availabilityPercent)}%
            </div>
          </div>
        ) : null}
      </div>
      <FormField label="Rationale (optional)" hint="Visible to the reviewer.">
        <Textarea
          rows={2}
          value={candidate.rationale}
          onChange={(e) => onChange({ rationale: e.target.value })}
          placeholder="Why this candidate?"
        />
      </FormField>
    </div>
  );
}
