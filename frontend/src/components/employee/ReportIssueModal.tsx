import { useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { FormModal } from '@/components/ds';
import { createCase } from '@/lib/api/cases';

interface ReportIssueModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * F-4.5 / C1-EMP-CASE — Employee-reported issue modal.
 *
 * Opens a `FormModal` collecting category + summary + description and
 * fires `POST /api/cases` with `caseTypeKey: 'EMPLOYEE_ISSUE'`. The
 * authenticated principal is used as both subject and owner so the
 * case lands in the user's own case list immediately. JSM round-trip
 * happens when `integrations.jsm.enabled` flips ON (F-4.6).
 *
 * Used from `/dashboard/employee` and `/my-time` "Report an issue"
 * buttons.
 */
export function ReportIssueModal({ open, onClose }: ReportIssueModalProps): JSX.Element | null {
  if (!open) return null;
  return <ReportIssueModalInner onClose={onClose} />;
}

function ReportIssueModalInner({ onClose }: { onClose: () => void }): JSX.Element {
  const { principal } = useAuth();
  const [category, setCategory] = useState<'IT' | 'HR' | 'FACILITIES' | 'OTHER'>('IT');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = summary.trim().length > 0 && description.trim().length > 0 && !!principal?.personId;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || !principal?.personId) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createCase({
        caseTypeKey: 'EMPLOYEE_ISSUE',
        subjectPersonId: principal.personId,
        ownerPersonId: principal.personId,
        summary: `[${category}] ${summary.trim()} — ${description.trim()}`,
      });
      toast.success(`Issue reported — ${created.caseNumber}`);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to report issue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormModal
      open
      onCancel={onClose}
      title="Report an issue"
      onSubmit={() => void handleSubmit()}
      submitLabel={submitting ? 'Reporting…' : 'Report issue'}
      submitDisabled={!canSubmit || submitting}
      cancelLabel="Cancel"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <label className="field">
          <span className="field__label">Category</span>
          <select
            className="field__control"
            data-testid="report-issue-category"
            onChange={(e) => setCategory(e.target.value as typeof category)}
            value={category}
          >
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="FACILITIES">Facilities</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Summary (required, ≤ 200 chars)</span>
          <input
            className="field__control"
            data-testid="report-issue-summary"
            maxLength={200}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Laptop won't connect to corp VPN"
            type="text"
            value={summary}
          />
        </label>

        <label className="field">
          <span className="field__label">Description (required, ≤ 2000 chars)</span>
          <textarea
            className="field__control"
            data-testid="report-issue-description"
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? Steps to reproduce? Any error messages?"
            rows={6}
            value={description}
          />
        </label>

        {error ? (
          <div style={{ color: 'var(--color-status-danger)', fontSize: 13 }}>{error}</div>
        ) : null}
      </div>
    </FormModal>
  );
}
