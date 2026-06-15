import { useEffect, useState } from 'react';

import { useAuth } from '@/app/auth-context';
import { PEOPLE_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Table, type Column } from '@/components/ds';
import { fetchMyCases, type CaseRecord } from '@/lib/api/cases';
import { formatCaseType } from '@/lib/labels';

import { HrOpenCasesPanel } from './HrOpenCasesPanel';

function formatCallerRole(row: CaseRecord, personId: string): string {
  if (row.subjectPersonId === personId) return 'Subject';
  const participantRole = row.participants.find((p) => p.personId === personId)?.role;
  if (!participantRole) return '—';
  // Convert SCREAMING_SNAKE_CASE participant role (e.g., OBSERVER, REQUESTER)
  // into a friendly capitalized label.
  return participantRole
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * W2-01 — /me?tab=cases. Lists HR cases where the calling person is the
 * subject (case is about them) or a participant (e.g., observer on a
 * transfer). Backed by `GET /api/me/cases`, a self-scoped endpoint that
 * does NOT require HR roles.
 */
export function MeCasesTab(): JSX.Element {
  const { principal } = useAuth();
  const personId = principal?.personId ?? '';
  // PR-712 — people-managers also see the org-wide "People with Open Cases"
  // panel here (its legacy HR-dashboard home is flag-off/unreachable on v2).
  const isPeopleManager = hasAnyRole(principal?.roles, PEOPLE_MANAGE_ROLES);

  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!personId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    fetchMyCases()
      .then((response) => {
        if (!active) return;
        setCases(response.items);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load cases');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [personId]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="page" />;

  const hrPanel = isPeopleManager ? <HrOpenCasesPanel /> : null;

  if (error) {
    return (
      <>
        {hrPanel}
        <ErrorState title="Couldn't load your cases" description={error} />
      </>
    );
  }

  if (cases.length === 0) {
    return (
      <>
        {hrPanel}
        <SectionCard title="Your HR cases">
          <EmptyState
            title="No cases yet"
            description="When HR opens a case about you (onboarding, transfer, performance, etc.) or adds you as a participant, it will appear here."
          />
        </SectionCard>
      </>
    );
  }

  const columns: Column<CaseRecord>[] = [
    {
      key: 'caseNumber',
      title: 'Case',
      width: 140,
      getValue: (row) => row.caseNumber,
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
          {row.caseNumber}
        </span>
      ),
    },
    {
      key: 'caseType',
      title: 'Type',
      width: 180,
      getValue: (row) => formatCaseType(row.caseTypeKey),
      render: (row) => (
        <span>{row.caseTypeDisplayName ?? formatCaseType(row.caseTypeKey)}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      width: 110,
      getValue: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} variant="chip" size="small" />,
    },
    {
      key: 'role',
      title: 'Your role',
      width: 120,
      getValue: (row) => formatCallerRole(row, personId),
      render: (row) => <span>{formatCallerRole(row, personId)}</span>,
    },
    {
      key: 'summary',
      title: 'Summary',
      truncate: true,
      getValue: (row) => row.summary ?? '',
    },
    {
      key: 'openedAt',
      title: 'Opened',
      width: 120,
      align: 'right',
      getValue: (row) => row.openedAt,
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
          {new Date(row.openedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <>
      {hrPanel}
      <SectionCard title={`Your HR cases (${cases.length})`}>
        <Table
          columns={columns}
          rows={cases}
          getRowKey={(row) => row.id}
          variant="compact"
          caption="Your HR cases"
        />
      </SectionCard>
    </>
  );
}
