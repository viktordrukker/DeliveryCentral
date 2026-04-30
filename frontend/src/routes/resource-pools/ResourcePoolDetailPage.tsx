import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useDrilldown } from '@/app/drilldown-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { formatDate } from '@/lib/format-date';
import {
  ResourcePool,
  addResourcePoolMember,
  fetchResourcePoolById,
  removeResourcePoolMember,
} from '@/lib/api/resource-pools';
import { PersonDirectoryItem, fetchPersonDirectory } from '@/lib/api/person-directory';
import { RM_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { Button, Table, type Column } from '@/components/ds';
import type { ResourcePoolMember } from '@/lib/api/resource-pools';

export function ResourcePoolDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [pool, setPool] = useState<ResourcePool | null>(null);
  const [people, setPeople] = useState<PersonDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const canManage = hasAnyRole(principal?.roles, RM_MANAGE_ROLES);
  const { setCurrentLabel } = useDrilldown();

  useEffect(() => {
    if (pool?.name) setCurrentLabel(pool.name);
  }, [pool?.name, setCurrentLabel]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    void Promise.all([
      fetchResourcePoolById(id),
      fetchPersonDirectory({ page: 1, pageSize: 200 }),
    ])
      .then(([poolData, peopleData]) => {
        if (!isMounted) return;
        setPool(poolData);
        setPeople(peopleData.items);
      })
      .catch((reason: Error) => {
        if (!isMounted) return;
        if (reason.message.toLowerCase().includes('not found') || (reason as { status?: number }).status === 404) {
          setNotFound(true);
        } else {
          setError(reason.message);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const memberPersonIds = new Set(pool?.members.map((m) => m.personId) ?? []);
  const availablePeople = people.filter((p) => !memberPersonIds.has(p.id));

  async function handleAddMember(): Promise<void> {
    if (!id || !selectedPersonId) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const updated = await addResourcePoolMember(id, selectedPersonId);
      setPool(updated);
      const person = people.find((p) => p.id === selectedPersonId);
      setSuccessMessage(`Added ${person?.displayName ?? 'member'} to pool.`);
      setSelectedPersonId('');
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Failed to add member.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveMember(personId: string): Promise<void> {
    if (!id) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const updated = await removeResourcePoolMember(id, personId);
      setPool(updated);
      const person = people.find((p) => p.id === personId);
      setSuccessMessage(`Removed ${person?.displayName ?? 'member'} from pool.`);
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Failed to remove member.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer testId="resource-pool-detail-page">
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/resource-pools">
            Back to pools
          </Button>
        }
        eyebrow="Resource Pools"
        subtitle="Pool details and member roster."
        title={pool?.name ?? 'Resource Pool'}
      />

      {isLoading ? <LoadingState label="Loading resource pool..." variant="skeleton" skeletonType="detail" /> : null}
      {error ? <ErrorState description={error} /> : null}
      {notFound ? (
        <SectionCard>
          <EmptyState
            description={`No resource pool was found for ID ${id ?? 'unknown'}.`}
            title="Pool not found"
          />
        </SectionCard>
      ) : null}

      {pool ? (
        <>
          <SectionCard title="Pool Details">
            <dl className="details-list">
              <div>
                <dt>Name</dt>
                <dd>{pool.name}</dd>
              </div>
              <div>
                <dt>Code</dt>
                <dd>{pool.code}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{pool.description ?? 'No description'}</dd>
              </div>
              <div>
                <dt>Org Unit</dt>
                <dd>{pool.orgUnitId ?? 'Not linked'}</dd>
              </div>
              <div>
                <dt>Members</dt>
                <dd>{pool.members.length}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Members">
            {submitError ? <ErrorState description={submitError} /> : null}
            {successMessage ? <p className="form-success">{successMessage}</p> : null}

            {canManage ? (
              <div className="form-stack" style={{ marginBottom: '1.5rem' }}>
                <label className="field">
                  <span className="field__label">Add member</span>
                  <select
                    className="field__control"
                    onChange={(e) => setSelectedPersonId(e.target.value)}
                    value={selectedPersonId}
                  >
                    <option value="">Select a person…</option>
                    {availablePeople.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-actions">
                  <Button variant="primary" disabled={!selectedPersonId || isSubmitting} onClick={() => void handleAddMember()} type="button">
                    {isSubmitting ? 'Saving…' : 'Add member'}
                  </Button>
                </div>
              </div>
            ) : null}

            {pool.members.length === 0 ? (
              <EmptyState
                description="This pool has no members yet. Add people using the form above."
                title="No members"
              />
            ) : (
              <Table
                variant="compact"
                columns={[
                  { key: 'name', title: 'Name', getValue: (m) => m.displayName, render: (m) => <span style={{ fontWeight: 500 }}>{m.displayName}</span> },
                  { key: 'since', title: 'Member Since', getValue: (m) => m.validFrom, render: (m) => <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(m.validFrom)}</span> },
                  { key: 'actions', title: 'Actions', align: 'right', render: (m) => (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Link style={{ fontSize: 10, color: 'var(--color-accent)' }} to={`/people/${m.personId}`} onClick={(e) => e.stopPropagation()}>Go</Link>
                      {canManage ? (
                        <Button variant="danger" size="sm" disabled={isSubmitting} onClick={(e) => { e.stopPropagation(); setConfirmRemoveId(m.personId); }} type="button">Remove</Button>
                      ) : null}
                    </div>
                  ) },
                ] as Column<ResourcePoolMember>[]}
                rows={pool.members}
                getRowKey={(m) => m.personId}
                onRowClick={(m) => navigate(`/people/${m.personId}`)}
              />
            )}
          </SectionCard>

          <SectionCard title="Quick Actions">
            <div className="details-list">
              <div>
                <dt>Assignments</dt>
                <dd>
                  <Button as={Link} variant="secondary" to="/assignments/new">
                    Create new assignment
                  </Button>
                </dd>
              </div>
              <div>
                <dt>Dashboard</dt>
                <dd>
                  <Button as={Link} variant="secondary" to="/dashboard/resource-manager">
                    Open RM dashboard
                  </Button>
                </dd>
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}
      <ConfirmDialog
        open={confirmRemoveId !== null}
        message="This will remove the member from this resource pool. They will no longer appear in pool capacity calculations."
        onCancel={() => setConfirmRemoveId(null)}
        onConfirm={() => { const pid = confirmRemoveId; setConfirmRemoveId(null); if (pid) void handleRemoveMember(pid); }}
        title="Remove pool member?"
      />
    </PageContainer>
  );
}
