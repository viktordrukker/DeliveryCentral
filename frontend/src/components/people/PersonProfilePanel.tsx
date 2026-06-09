import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import { Money } from '@/components/ds/Money';
import { Pct } from '@/components/ds/Pct';
import { Tabs, Timeline, Table, type Column, type TabItem, type TimelineSegment } from '@/components/ds';
import { PersonActivityFeed } from './PersonActivityFeed';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  type PersonProfileDto,
  fetchPersonProfile,
} from '@/lib/api/person-profile';

interface PersonProfilePanelProps {
  personId: string;
}

/**
 * V2 Scope §4 item 7 — 5-tab grammar (gated behind `dsRefresh`).
 *
 * Identity / Assignments / Skills / Leave / Activity. HR endorsers, leave
 * admins, and RM drill-downs each have a 1-click target instead of a 1000px
 * scroll. Tab state lives in `?tab=…` so deep-links + back-button restore
 * the right pane. Legacy flat-canvas path is preserved when the flag is OFF.
 */
const V2_TABS: TabItem[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'assignments', label: 'Positions' },
  { id: 'skills', label: 'Skills' },
  { id: 'leave', label: 'Leave' },
  { id: 'activity', label: 'Activity' },
];
type V2TabId = 'identity' | 'assignments' | 'skills' | 'leave' | 'activity';

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
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as V2TabId | null) ?? 'identity';

  function setTab(tab: V2TabId): void {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }

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

  const identityCard = (
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
  );

  const kpiStrip = (
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
  );

  const assignmentsCard = (
    <SectionCard title={`Assignments (${assignments.length})`}>
      {assignments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '8px 4px' }}>
          No assignments on record.
        </p>
      ) : (
        <>
          {/* V2-B.11 — DS Timeline above the assignments list. Visualizes
              the temporal overlap of all assignments at a glance; the
              existing list below stays for detailed metadata (role, alloc,
              status). Segments are clickable via href into the project. */}
          <Timeline
            segments={assignments.map<TimelineSegment>((a) => ({
              id: a.id,
              startDate: a.validFrom,
              endDate: a.validTo ?? null,
              label: a.projectName,
              tone: a.status === 'ACTIVE' ? 'active' : 'neutral',
              allocationPercent: a.allocationPercent,
              href: `/projects/${a.projectId}`,
            }))}
            showToday
            showMonthLabels
            size="sm"
          />
        {/* V2-B.21 — assignment list as a DS Table (was a hand-rolled <ul> grid). */}
        <div style={{ marginTop: 12 }}>
          <Table
            variant="compact"
            testId="person-profile-assignments"
            getRowKey={(a) => a.id}
            rows={assignments}
            columns={
              [
                {
                  key: 'project',
                  title: 'Project',
                  getValue: (a) => a.projectName,
                  render: (a) => (
                    <Link
                      to={`/projects/${a.projectId}`}
                      style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {a.projectName}
                    </Link>
                  ),
                },
                {
                  key: 'role',
                  title: 'Role',
                  getValue: (a) => a.staffingRole,
                  render: (a) => <span className="muted">{a.staffingRole}</span>,
                },
                {
                  key: 'status',
                  title: 'Status',
                  render: (a) => (
                    <StatusBadge
                      tone={a.status === 'ACTIVE' ? 'active' : 'neutral'}
                      variant="chip"
                      label={a.status}
                    />
                  ),
                },
                {
                  key: 'alloc',
                  title: 'Alloc',
                  align: 'right',
                  getValue: (a) => a.allocationPercent,
                  render: (a) => <Pct value={a.allocationPercent} fractionDigits={0} />,
                },
                {
                  key: 'since',
                  title: 'Since',
                  align: 'right',
                  getValue: (a) => a.validFrom,
                  render: (a) => (
                    <span style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                      {new Date(a.validFrom).toLocaleDateString()}
                    </span>
                  ),
                },
              ] as Column<(typeof assignments)[number]>[]
            }
          />
        </div>
        </>
      )}
    </SectionCard>
  );

  const skillsCard = (
    <SectionCard title={`Skills (${skills.length})`}>
      {skills.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>No skills recorded.</p>
      ) : (
        <ul
          data-testid="person-profile-skills"
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          {/* V2-B.21 — proficiency rendered as 1–5 pip bars (was a chip with
              a raw number). Certified skills use the active tone. */}
          {skills.map((s) => (
            <li
              key={s.skillId}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                {s.skillName}
                {s.certified ? (
                  <span style={{ color: 'var(--color-status-active)' }} title="Certified"> ✓</span>
                ) : null}
              </span>
              <span
                style={{ display: 'inline-flex', gap: 3, flexShrink: 0 }}
                aria-label={`Proficiency ${s.proficiency} of 5`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background:
                        n <= s.proficiency
                          ? s.certified
                            ? 'var(--color-status-active)'
                            : 'var(--color-accent)'
                          : 'var(--color-border)',
                    }}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );

  const leaveCard = (
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
  );

  const managerChainCard = (
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
  );

  const poolsCard = (
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
  );

  /* V2-A.13 — lifecycle activity feed (previously only on the legacy
     History tab) surfaced inside the v2 profile panel. */
  const activityCard = (
    <SectionCard title="Recent activity">
      <PersonActivityFeed personId={personId} limit={10} />
    </SectionCard>
  );

  // V2 Scope §4 item 7 — dsRefresh-gated tab grammar. 5 tabs, URL-driven.
  // Each tab's content is gated on `activeTab === <id>` so deep-links to
  // ?tab=skills land an HR endorser directly on the skills pane without
  // scrolling past identity + assignments. Legacy flat-canvas layout below
  // stays bit-identical when the flag is OFF.
  if (dsRefreshEnabled) {
    return (
      <div data-testid="person-profile-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {identityCard}
        {kpiStrip}
        <Tabs
          tabs={V2_TABS}
          value={activeTab}
          onValueChange={(id) => setTab(id as V2TabId)}
          ariaLabel="Person profile sections"
          idPrefix="person-profile-tab"
          testId="person-profile-tabs"
        />
        {activeTab === 'identity' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {managerChainCard}
            {poolsCard}
          </div>
        ) : null}
        {activeTab === 'assignments' ? assignmentsCard : null}
        {activeTab === 'skills' ? skillsCard : null}
        {activeTab === 'leave' ? leaveCard : null}
        {activeTab === 'activity' ? activityCard : null}
      </div>
    );
  }

  return (
    <div data-testid="person-profile-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {identityCard}
      {kpiStrip}
      {assignmentsCard}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {skillsCard}
        {leaveCard}
        {managerChainCard}
        {poolsCard}
        {activityCard}
      </div>
    </div>
  );
}
