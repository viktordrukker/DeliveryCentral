import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon } from '@/components/common/TipBalloon';
import { Button } from '@/components/ds';
import {
  type ComputedRag,
  type CreateRagSnapshotRequest,
  type RagRating,
  createRagSnapshot,
  fetchComputedRag,
} from '@/lib/api/project-rag';

interface WeeklyStatusFormProps {
  projectId: string;
  onSaved: () => void;
}

const RAG_OPTIONS: Array<{ value: RagRating; label: string; color: string }> = [
  { value: 'GREEN', label: 'Green', color: 'var(--color-status-active)' },
  { value: 'AMBER', label: 'Amber', color: 'var(--color-status-warning)' },
  { value: 'RED', label: 'Red', color: 'var(--color-status-danger)' },
];

function RagSelector({ label, value, onChange, readOnly, tooltip }: {
  label: string;
  value: RagRating;
  onChange: (v: RagRating) => void;
  readOnly?: boolean;
  tooltip?: string;
}): JSX.Element {
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{label}</span>
        {tooltip ? <TipBalloon tip={tooltip} arrow="right" /> : null}
        {readOnly ? <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>(auto-computed)</span> : null}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
        {RAG_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            variant={value === opt.value ? 'primary' : 'secondary'}
            size="sm"
            disabled={readOnly}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              border: `2px solid ${value === opt.value ? opt.color : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-control, 4px)',
              background: value === opt.value ? opt.color : 'transparent',
              color: value === opt.value ? 'var(--color-surface)' : 'var(--color-text)',
              opacity: readOnly ? 0.7 : 1,
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function WeeklyStatusForm({ projectId, onSaved }: WeeklyStatusFormProps): JSX.Element {
  const [computed, setComputed] = useState<ComputedRag | null>(null);
  const [scheduleRag, setScheduleRag] = useState<RagRating>('GREEN');
  const [scopeRag, setScopeRag] = useState<RagRating>('GREEN');
  const [budgetRag, setBudgetRag] = useState<RagRating>('GREEN');
  const [businessRag, setBusinessRag] = useState<RagRating>('GREEN');
  const [narrative, setNarrative] = useState('');
  const [accomplishments, setAccomplishments] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [riskSummary, setRiskSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetchComputedRag(projectId).then((c) => {
      setComputed(c);
      setScheduleRag(c.scheduleRag);
      setBudgetRag(c.budgetRag);
    }).catch(() => undefined);
  }, [projectId]);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data: CreateRagSnapshotRequest = {
        scheduleRag,
        budgetRag,
        clientRag: businessRag,
        scopeRag,
        businessRag,
        narrative: narrative.trim() || undefined,
        accomplishments: accomplishments.trim() || undefined,
        nextSteps: nextSteps.trim() || undefined,
        riskSummary: riskSummary.trim() || undefined,
      };
      await createRagSnapshot(projectId, data);
      toast.success('Weekly status saved');
      onSaved();
    } catch {
      toast.error('Failed to save status');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <RagSelector
          label="Staffing"
          value={computed?.staffingRag ?? 'GREEN'}
          onChange={() => {}}
          readOnly
          tooltip={computed?.staffingExplanation}
        />
        <RagSelector
          label="Scope"
          value={scopeRag}
          onChange={setScopeRag}
          tooltip="Set based on scope stability, change requests, and deliverable acceptance."
        />
        <RagSelector
          label="Schedule"
          value={scheduleRag}
          onChange={setScheduleRag}
          tooltip={computed?.scheduleExplanation}
        />
        <RagSelector
          label="Budget"
          value={budgetRag}
          onChange={setBudgetRag}
          tooltip={computed?.budgetExplanation}
        />
        <RagSelector
          label="Business"
          value={businessRag}
          onChange={setBusinessRag}
          tooltip="Set based on client satisfaction, stakeholder engagement, and business value delivery."
        />
      </div>

      {computed ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-3) 0' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Overall:</span>
          <StatusBadge status={computed.overallRag.toLowerCase()} label={computed.overallRag} variant="chip" />
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <label className="field">
          <span className="field__label">Status Narrative</span>
          <textarea className="field__control" rows={2} value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="Brief summary of project status this week..." />
        </label>
        <label className="field">
          <span className="field__label">Accomplishments</span>
          <textarea className="field__control" rows={2} value={accomplishments} onChange={(e) => setAccomplishments(e.target.value)} placeholder="What was completed this week..." />
        </label>
        <label className="field">
          <span className="field__label">Next Steps</span>
          <textarea className="field__control" rows={2} value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} placeholder="What's planned for next week..." />
        </label>
        <label className="field">
          <span className="field__label">Risk Summary</span>
          <textarea className="field__control" rows={2} value={riskSummary} onChange={(e) => setRiskSummary(e.target.value)} placeholder="Key risks and mitigation status..." />
        </label>
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <Button variant="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Weekly Status'}
        </Button>
      </div>
    </form>
  );
}
