/**
 * W2-02 — Project-scoped Cases tab on Project Detail.
 *
 * Lists cases where relatedProjectId === projectId. Read-only; the full
 * triage / create workflow lives at /cases. Empty state forwards to the
 * global Cases page so the user is never stranded (UX Law 2).
 */
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge, type StatusTone } from '@/components/common/StatusBadge';
import { Table, type Column } from '@/components/ds';
import { type CaseRecord, fetchProjectCases } from '@/lib/api/cases';
import { formatDateShort } from '@/lib/format-date';

interface ProjectCasesTabProps {
  projectId: string;
}

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'OPEN':
      return 'pending';
    case 'IN_PROGRESS':
      return 'info';
    case 'APPROVED':
    case 'COMPLETED':
      return 'active';
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger';
    case 'ARCHIVED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function ProjectCasesTab({ projectId }: ProjectCasesTabProps): JSX.Element {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetchProjectCases(projectId);
        if (active) setCases(response.items);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load project cases.');
          setCases([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [projectId]);

  const columns: Column<CaseRecord>[] = [
    {
      key: 'caseNumber',
      title: 'Case #',
      render: (item) => (
        <Link to={`/cases/${item.id}`} style={{ color: 'var(--color-accent)' }}>
          {item.caseNumber}
        </Link>
      ),
    },
    {
      key: 'caseType',
      title: 'Type',
      render: (item) => <span>{item.caseTypeDisplayName}</span>,
    },
    {
      key: 'subject',
      title: 'Subject',
      render: (item) => <span>{item.subjectPersonName ?? item.subjectPersonId}</span>,
    },
    {
      key: 'owner',
      title: 'Owner',
      render: (item) => <span>{item.ownerPersonName ?? item.ownerPersonId}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      render: (item) => (
        <StatusBadge tone={statusTone(item.status)} label={item.status} variant="chip" size="small" />
      ),
    },
    {
      key: 'openedAt',
      title: 'Opened',
      render: (item) => <span>{formatDateShort(item.openedAt)}</span>,
    },
    {
      key: 'closedAt',
      title: 'Closed',
      render: (item) => <span>{item.closedAt ? formatDateShort(item.closedAt) : '—'}</span>,
    },
  ];

  return (
    <SectionCard title="Cases">
      {loading ? (
        <LoadingState label="Loading project cases..." />
      ) : error ? (
        <ErrorState description={error} />
      ) : cases.length === 0 ? (
        <EmptyState
          title="No cases on this project"
          description="Open onboarding, performance, or transfer cases linked to this project will appear here."
          action={{ href: '/cases', label: 'Go to Cases' }}
        />
      ) : (
        <Table
          columns={columns}
          rows={cases}
          getRowKey={(item) => item.id}
        />
      )}
    </SectionCard>
  );
}
