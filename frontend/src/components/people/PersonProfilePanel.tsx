import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ds/Avatar';
import { Donut } from '@/components/ds/Donut';
import { Money } from '@/components/ds/Money';
import { Pct } from '@/components/ds/Pct';
import { Button, Tabs, Timeline, Table, type Column, type TabItem, type TimelineSegment } from '@/components/ds';
import { PersonActivityFeed } from './PersonActivityFeed';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  type PersonProfileDto,
  fetchPersonProfile,
} from '@/lib/api/person-profile';
import {
  fetchPersonSuggestedPositions,
  type PersonSuggestedPosition,
} from '@/lib/api/project-positions';

interface PersonProfilePanelProps {
  personId: string;
}

/**
 * SoT PR 9 — 6-tab grammar (gated behind `dsRefresh`).
 *
 * Overview / Positions / Skills / Cost rates / Time & leave / Activity, matching
 * DS/page-profile.jsx. Tab state lives in `?tab=…` so deep-links + back-button
 * restore the right pane. Legacy flat-canvas path is preserved when the flag is
 * OFF.
 */
const V2_TABS: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'positions', label: 'Positions' },
  { id: 'skills', label: 'Skills' },
  { id: 'cost', label: 'Cost rates' },
  { id: 'time', label: 'Time & leave' },
  { id: 'activity', label: 'Activity' },
];
type V2TabId = 'overview' | 'positions' | 'skills' | 'cost' | 'time' | 'activity';

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
  const activeTab = (searchParams.get('tab') as V2TabId | null) ?? 'overview';
  // SoT PR 9 — right-rail suggested next positions are sourced from the same
  // endpoint as the bench inspector, restricted to 3 rows per DS canvas.
  const [suggestedPositions, setSuggestedPositions] = useState<PersonSuggestedPosition[]>([]);

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

  // SoT PR 9 — fetch 3 suggested next positions for the right rail.
  useEffect(() => {
    if (!personId || !dsRefreshEnabled) return;
    let active = true;
    void fetchPersonSuggestedPositions(personId, 3)
      .then((res) => {
        if (active) setSuggestedPositions(res.candidates);
      })
      .catch(() => {
        if (active) setSuggestedPositions([]);
      });
    return () => {
      active = false;
    };
  }, [personId, dsRefreshEnabled]);

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

  // SoT PR 9 — dsRefresh-gated 6-tab grammar with 320px right rail.
  // Tabs: Overview / Positions / Skills / Cost rates / Time & leave / Activity.
  // Right rail (per DS/page-profile.jsx): Quick actions, Suggested next positions,
  // Activity timeline. Legacy flat-canvas layout below stays bit-identical when
  // the flag is OFF.
  if (dsRefreshEnabled) {
    const overviewCard = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {managerChainCard}
        {poolsCard}
      </div>
    );
    const costRatesCard = (
      <SectionCard title="Cost rates">
        {costRate != null ? (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text)' }}>
            Current rate: <Money value={costRate} compact />
            <span style={{ color: 'var(--color-text-muted)', marginLeft: 8, fontSize: 12 }}>
              / day
            </span>
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            No cost rate visible at your role.
          </p>
        )}
      </SectionCard>
    );
    const timeAndLeaveCard = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        <SectionCard title="Timesheet · last 4 weeks">
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, fontSize: 13 }}>
            <dt style={{ color: 'var(--color-text-muted)' }}>Logged hours</dt>
            <dd style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {timesheetSummary.last4WeeksHours}h
            </dd>
            <dt style={{ color: 'var(--color-text-muted)' }}>Overtime</dt>
            <dd
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                color: timesheetSummary.overtimeHours > 8 ? 'var(--color-status-warning)' : 'var(--color-text)',
              }}
            >
              {timesheetSummary.overtimeHours}h
            </dd>
            <dt style={{ color: 'var(--color-text-muted)' }}>Leave hours</dt>
            <dd style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              {timesheetSummary.leaveHours}h
            </dd>
          </dl>
        </SectionCard>
        {leaveCard}
      </div>
    );
    const quickActionsCard = (
      <SectionCard title="Quick actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="person-profile-quick-actions">
          <Button
            as={Link}
            variant="secondary"
            size="md"
            to={`/staffing-desk?view=board&personId=${personId}`}
            style={{ justifyContent: 'flex-start' }}
          >
            Propose to open position
          </Button>
          <Button
            as={Link}
            variant="secondary"
            size="md"
            to={`/people/${personId}?tab=skills`}
            style={{ justifyContent: 'flex-start' }}
          >
            Edit skills
          </Button>
          <Button
            as={Link}
            variant="secondary"
            size="md"
            to={`/org?personId=${personId}`}
            style={{ justifyContent: 'flex-start' }}
          >
            Move org unit
          </Button>
          <Button
            as={Link}
            variant="secondary"
            size="md"
            to={`/me?tab=leave`}
            style={{ justifyContent: 'flex-start' }}
          >
            Plan leave
          </Button>
          <Button
            as={Link}
            variant="secondary"
            size="md"
            to={`/people/${personId}?tab=activity`}
            style={{ justifyContent: 'flex-start' }}
          >
            View activity
          </Button>
        </div>
      </SectionCard>
    );
    const suggestedNextCard = (
      <SectionCard title="Suggested next positions">
        {suggestedPositions.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
            No matching open positions right now.
          </p>
        ) : (
          <ul
            data-testid="person-profile-suggested-positions"
            style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {suggestedPositions.map((s) => (
              <li
                key={s.positionId}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}
              >
                <Donut value={Math.round(s.matchScore * 100)} size={32} thickness={4} tone="info" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link
                    to={`/projects/${s.projectId}/positions/${s.positionPublicId ?? s.positionId}`}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      textDecoration: 'none',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.role}
                  </Link>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {s.projectName}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    );
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
        <div
          data-testid="person-profile-body"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'flex-start' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {activeTab === 'overview' ? overviewCard : null}
            {activeTab === 'positions' ? assignmentsCard : null}
            {activeTab === 'skills' ? skillsCard : null}
            {activeTab === 'cost' ? costRatesCard : null}
            {activeTab === 'time' ? timeAndLeaveCard : null}
            {activeTab === 'activity' ? activityCard : null}
          </div>
          <aside
            data-testid="person-profile-right-rail"
            style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16 }}
          >
            {quickActionsCard}
            {suggestedNextCard}
            {activityCard}
          </aside>
        </div>
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
