import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useDrilldown } from '@/app/drilldown-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ApiError } from '@/lib/api/http-client';
import { formatDateShort } from '@/lib/format-date';
import {
  StaffingRequest,
  SuggestionCandidate,
  cancelStaffingRequest,
  fetchStaffingRequestById,
  fetchStaffingSuggestions,
  fulfilStaffingRequest,
  reviewStaffingRequest,
} from '@/lib/api/staffing-requests';

const STATUS_LABELS: Record<string, string> = {
  CANCELLED: 'Cancelled',
  DRAFT: 'Draft',
  FULFILLED: 'Fulfilled',
  IN_REVIEW: 'In Review',
  OPEN: 'Open',
};

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: 'High',
  LOW: 'Low',
  MEDIUM: 'Medium',
  URGENT: 'Urgent',
};

export function StaffingRequestDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { principal } = useAuth();
  const [request, setRequest] = useState<StaffingRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [assignedPersonId, setAssignedPersonId] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionCandidate[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const isRM = principal?.roles.includes('resource_manager') || principal?.roles.includes('admin');
  const isPM = principal?.roles.includes('project_manager') || principal?.roles.includes('admin');
  const { setCurrentLabel } = useDrilldown();

  useEffect(() => {
    if (request?.role) setCurrentLabel(request.role);
  }, [request?.role, setCurrentLabel]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetchStaffingRequestById(id)
      .then((data) => {
        setRequest(data);
        if ((data.status === 'OPEN' || data.status === 'IN_REVIEW') && data.skills.length > 0) {
          setSuggestionsLoading(true);
          fetchStaffingSuggestions(id)
            .then((s) => setSuggestions(s))
            .catch(() => { /* non-critical */ })
            .finally(() => setSuggestionsLoading(false));
        }
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError('Failed to load staffing request.');
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleReview(): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await reviewStaffingRequest(id);
      setRequest(updated);
    } catch {
      setError('Failed to take request into review.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFulfil(): Promise<void> {
    if (!id || !principal?.personId || !assignedPersonId.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await fulfilStaffingRequest(id, principal.personId, assignedPersonId.trim());
      setRequest(updated);
      setAssignedPersonId('');
    } catch {
      setError('Failed to record fulfilment.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await cancelStaffingRequest(id);
      setRequest(updated);
    } catch {
      setError('Failed to cancel request.');
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) return <LoadingState label="Loading staffing request..." variant="skeleton" skeletonType="detail" />;
  if (notFound) {
    return (
      <PageContainer>
        <EmptyState description={`No staffing request was found for ${id ?? 'this ID'}.`} title="Request not found" />
      </PageContainer>
    );
  }
  if (!request) return <ErrorState description={error ?? 'Unknown error.'} />;

  return (
    <PageContainer>
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/staffing-requests">
            Back to requests
          </Link>
        }
        eyebrow="Supply & Demand"
        subtitle={request.summary ?? 'No summary provided.'}
        title={`${request.role} — ${request.projectName ?? request.projectId}`}
      />

      {error ? <ErrorState description={error} /> : null}

      <SectionCard title="Details">
        <dl className="detail-list">
          <dt>Status</dt>
          <dd>
            <span className={`badge badge--${request.status.toLowerCase().replace('_', '-')}`}>
              {STATUS_LABELS[request.status] ?? request.status}
            </span>
          </dd>
          <dt>Priority</dt>
          <dd>{PRIORITY_LABELS[request.priority] ?? request.priority}</dd>
          <dt>Project</dt>
          <dd>
            <Link to={`/projects/${request.projectId}`}>{request.projectName ?? request.projectId}</Link>
          </dd>
          <dt>Requested By</dt>
          <dd>
            <Link to={`/people/${request.requestedByPersonId}`}>{request.requestedByPersonId}</Link>
          </dd>
          <dt>Allocation</dt>
          <dd>{request.allocationPercent}%</dd>
          <dt>Dates</dt>
          <dd>
            {request.startDate} → {request.endDate}
          </dd>
          <dt>Headcount</dt>
          <dd>
            {request.headcountFulfilled} / {request.headcountRequired} filled
          </dd>
          {request.skills.length > 0 ? (
            <>
              <dt>Skills</dt>
              <dd>{request.skills.join(', ')}</dd>
            </>
          ) : null}
        </dl>
      </SectionCard>

      {request.fulfilments.length > 0 ? (
        <SectionCard title="Fulfilments">
          <table className="dash-compact-table">
            <thead>
              <tr>
                <th>Assigned Person</th>
                <th>Proposed By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {request.fulfilments.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link to={`/people/${f.assignedPersonId}`}>{f.assignedPersonId}</Link>
                  </td>
                  <td>
                    <Link to={`/people/${f.proposedByPersonId}`}>{f.proposedByPersonId}</Link>
                  </td>
                  <td>{formatDateShort(f.fulfilledAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}

      {isRM && (request.status === 'OPEN' || request.status === 'IN_REVIEW') && request.skills.length > 0 ? (
        <SectionCard title="Skill-Matched Candidates">
          {suggestionsLoading ? (
            <LoadingState label="Finding matching candidates..." variant="skeleton" skeletonType="detail" />
          ) : suggestions.length === 0 ? (
            <EmptyState description="No candidates matched the required skills." title="No suggestions" />
          ) : (
            <div data-testid="skill-suggestions-panel" style={{ overflow: 'auto' }}>
              <table className="dash-compact-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Match Score</th>
                    <th>Available Capacity</th>
                    <th>Skills Matched</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.slice(0, 10).map((c) => (
                    <tr key={c.personId}>
                      <td>
                        <Link to={`/people/${c.personId}`}>{c.displayName}</Link>
                      </td>
                      <td>
                        <span style={{
                          background: c.score >= 1 ? 'var(--color-status-active)' : c.score >= 0.5 ? 'var(--color-status-warning)' : 'var(--color-status-neutral)',
                          borderRadius: 3,
                          color: 'var(--color-surface)',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 6px',
                        }}>
                          {c.score.toFixed(2)}
                        </span>
                      </td>
                      <td>{c.availableCapacityPercent}%</td>
                      <td style={{ fontSize: 12 }}>
                        {c.skillBreakdown
                          .filter((b) => b.proficiencyMatch > 0)
                          .map((b) => b.skillName)
                          .join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {isRM && (request.status === 'OPEN' || request.status === 'IN_REVIEW') ? (
        <SectionCard title="RM Actions">
          {request.status === 'OPEN' ? (
            <button
              className="button"
              disabled={actionLoading}
              onClick={() => void handleReview()}
              type="button"
            >
              Take Into Review
            </button>
          ) : null}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '1rem' }}>
            <label className="field" style={{ flex: 1 }}>
              <span className="field__label">Assign Person ID</span>
              <input
                className="field__control"
                onChange={(e) => setAssignedPersonId(e.target.value)}
                placeholder="Person UUID"
                type="text"
                value={assignedPersonId}
              />
            </label>
            <button
              className="button"
              disabled={actionLoading || !assignedPersonId.trim()}
              onClick={() => void handleFulfil()}
              type="button"
            >
              Record Fulfilment
            </button>
          </div>
        </SectionCard>
      ) : null}

      {(isPM || isRM) &&
        request.status !== 'CANCELLED' &&
        request.status !== 'FULFILLED' ? (
        <SectionCard title="Cancel Request">
          <p style={{ marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
            Cancelling a request removes it from the RM queue.
          </p>
          <button
            className="button button--danger"
            disabled={actionLoading}
            onClick={() => void handleCancel()}
            type="button"
          >
            Cancel Request
          </button>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
