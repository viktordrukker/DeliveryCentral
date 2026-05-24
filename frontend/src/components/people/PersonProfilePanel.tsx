import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import { Money } from '@/components/ds/Money';
import { Pct } from '@/components/ds/Pct';
import {
  type PersonProfileDto,
  fetchPersonProfile,
} from '@/lib/api/person-profile';

interface PersonProfilePanelProps {
  personId: string;
}

const KPI: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '8px 12px',
  background: 'var(--color-surface-alt)',
  borderRadius: 6,
  minWidth: 130,
};

/**
 * Phase B2 — Person 360 panel (identity + assignments + skills + leave +
 * timesheet summary + manager chain).
 *
 * Backed by `GET /api/people/:id/profile` (issue 262). The `costRate` field
 * is absent (not null) for callers without cost visibility — guard with
 * `'costRate' in profile` before rendering.
 *
 * Reference: DS/page-profile.jsx.
 */
export function PersonProfilePanel({ personId }: PersonProfilePanelProps): JSX.Element {
  const [profile, setProfile] = useState<PersonProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!personId) return;
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await fetchPersonProfile(personId);
        if (active) {
          setProfile(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [personId]);

  if (loading) return <LoadingState variant="skeleton" skeletonType="page" />;
  if (error) return <ErrorState description={error} />;
  if (!profile) return <ErrorState description="No profile data available." />;

  const { person, costRate, assignments, timesheetSummary, leaveBalance, managerChain, skills, pools } = profile;
  const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE');
  const totalAllocation = activeAssignments.reduce((sum, a) => sum + a.allocationPercent, 0);

  return (
    <div data-testid="person-profile-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionCard title="Identity">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={person.displayName} size="xl" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>
              {person.displayName}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {[person.role, person.grade, person.location].filter(Boolean).join(' · ') || '—'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
              {person.primaryEmail ?? 'no email'} · {person.timezone ?? 'no tz'} ·{' '}
              <StatusBadge
                tone={person.employmentStatus === 'ACTIVE' ? 'active' : 'neutral'}
                variant="chip"
                label={person.employmentStatus}
              />
              {person.hiredAt ? (
                <span> · hired {new Date(person.hiredAt).toLocaleDateString()}</span>
              ) : null}
            </span>
          </div>
          {costRate != null ? (
            <div style={KPI}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Cost rate</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                <Money value={costRate} compact />
              </span>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 8,
        }}
        data-testid="person-profile-kpis"
      >
        <div style={KPI}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Active assignments</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{activeAssignments.length}</span>
        </div>
        <div style={KPI}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Total allocation</span>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            <Pct value={totalAllocation} fractionDigits={0} />
          </span>
        </div>
        <div style={KPI}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Last 4 weeks</span>
          <span style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {timesheetSummary.last4WeeksHours}h
          </span>
        </div>
        <div style={KPI}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Overtime</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color: timesheetSummary.overtimeHours > 8 ? 'var(--color-status-warning)' : 'var(--color-text)',
            }}
          >
            {timesheetSummary.overtimeHours}h
          </span>
        </div>
      </div>

      <SectionCard title={`Assignments (${assignments.length})`}>
        {assignments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 4px' }}>
            No assignments on record.
          </p>
        ) : (
          <ul
            data-testid="person-profile-assignments"
            style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            {assignments.map((a) => (
              <li
                key={a.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 80px 110px 60px',
                  gap: 8,
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: 13,
                  alignItems: 'center',
                }}
              >
                <Link
                  to={`/projects/${a.projectId}`}
                  style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {a.projectName}
                </Link>
                <span style={{ color: 'var(--color-text-muted)' }}>{a.staffingRole}</span>
                <StatusBadge
                  tone={a.status === 'ACTIVE' ? 'active' : 'neutral'}
                  variant="chip"
                  label={a.status}
                />
                <span style={{ color: 'var(--color-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
                  <Pct value={a.allocationPercent} fractionDigits={0} />
                </span>
                <span style={{ color: 'var(--color-text-subtle)', fontSize: 11, textAlign: 'right' }}>
                  {new Date(a.validFrom).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <SectionCard title={`Skills (${skills.length})`}>
          {skills.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No skills recorded.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {skills.map((s) => (
                <li key={s.skillId}>
                  <StatusBadge
                    tone={s.certified ? 'active' : 'info'}
                    variant="chip"
                    label={`${s.skillName} · ${s.proficiency}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Leave balance">
          {leaveBalance.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No leave balances recorded.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {leaveBalance.map((l) => (
                <li
                  key={l.type}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 60px 60px 60px',
                    gap: 8,
                    fontSize: 12,
                    padding: '4px 8px',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <span>{l.type}</span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{l.used}</span>
                  <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                    {l.pending}
                  </span>
                  <span
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 600,
                      color: l.remaining < 0 ? 'var(--color-status-danger)' : 'var(--color-text)',
                    }}
                  >
                    {l.remaining}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Manager chain">
          {managerChain.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No manager chain on record.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {managerChain.map((m) => (
                <li
                  key={m.personId}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}
                >
                  <Avatar name={m.displayName} size="xs" />
                  <Link
                    to={`/people/${m.personId}`}
                    style={{ flex: 1, color: 'var(--color-text)', textDecoration: 'none' }}
                  >
                    {m.displayName}
                  </Link>
                  <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                    {m.relationshipType}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Resource pools">
          {pools.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No pool memberships.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {pools.map((p) => (
                <li key={p.resourcePoolId}>
                  <StatusBadge
                    tone={p.isPrimary ? 'active' : 'info'}
                    variant="chip"
                    label={p.resourcePoolName + (p.isPrimary ? ' ★' : '')}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
