// page-pulse.jsx — "Project Pulse" — the headline dashboard for one project.
// Grammar: Decision Dashboard
//   1. Title bar (PageHeader with 3-tab Pulse/Plan/Money + role pill + actions)
//   2. KPI strip (4 clickable cards)
//   3. 4-quadrant RAG cards
//   4. Two-column: open positions table + decisions/risks panel
//   5. Activity timeline + external-link tiles
//   6. Data freshness footer

const PROJECT = {
  name: 'Mercury Core Banking — UK',
  code: 'MCB-UK',
  stage: 'Delivery',
  pm: 'Ethan Brooks',
  start: '2025-09-01',
  end:   '2026-12-15',
};

const POSITIONS = [
  { role: 'Lead Backend Engineer', skills: ['Java','Kafka','Spring'],   alloc: 100, start: 'Jul 1',  weeks: 32, status: 'open',       suggested: 5, fill: null },
  { role: 'Senior Frontend Eng',   skills: ['React','TS','D3'],         alloc: 80,  start: 'Jun 16', weeks: 28, status: 'proposed',   suggested: 3, fill: 'Priya N.' },
  { role: 'Mainframe Integration', skills: ['COBOL','MQ'],              alloc: 60,  start: 'Aug 4',  weeks: 24, status: 'open',       suggested: 2, fill: null },
  { role: 'Solution Architect',    skills: ['EA','TOGAF'],              alloc: 50,  start: 'Jun 2',  weeks: 40, status: 'assigned',   suggested: 0, fill: 'Henrik V.' },
  { role: 'QA Lead',               skills: ['SDET','k6'],               alloc: 100, start: 'Jun 30', weeks: 28, status: 'booked',     suggested: 0, fill: 'Aisha O.' },
  { role: 'Data Migration Eng',    skills: ['SQL','DBT','Snowflake'],   alloc: 100, start: 'Jul 21', weeks: 20, status: 'open',       suggested: 4, fill: null },
];

const RISKS = [
  { tone: 'critical', title: 'COBOL specialist pipeline empty',     owner: 'RM',  due: 'Jun 8' },
  { tone: 'danger',   title: 'FX rate provider sunset in Q3',       owner: 'SA',  due: 'Jul 1' },
  { tone: 'warning',  title: 'Regulator approval lead-time +6 wks', owner: 'PM',  due: 'Aug 15' },
];

const DECISIONS = [
  { tone: 'danger',  title: 'Re-baseline Q3 budget or absorb FX delta?',                owner: 'Director',  by: 'Tue 26 May' },
  { tone: 'warning', title: 'Confirm Frontend Lead — Priya N. (proposed)',              owner: 'PM',        by: 'Thu 28 May' },
  { tone: 'info',    title: 'Approve mainframe integration spike (3w, $48k)',           owner: 'PM + RM',   by: 'Fri 29 May' },
];

const TIMELINE = [
  { tone: 'active',  who: 'Ethan B.',  what: <>booked <strong>Aisha O.</strong> as QA Lead</>, when: '08:42' },
  { tone: 'warning', who: 'System',    what: <>budget variance crossed <strong>−8%</strong> threshold</>, when: 'Tue' },
  { tone: 'info',    who: 'Maya K.',   what: <>proposed <strong>Priya N.</strong> for Senior Frontend</>, when: 'Tue' },
  { tone: 'active',  who: 'Henrik V.', what: <>completed milestone <strong>Architecture sign-off</strong></>, when: 'Mon' },
  { tone: 'danger',  who: 'System',    what: <>risk auto-raised: <strong>COBOL specialist pipeline empty</strong></>, when: 'Fri' },
];

const EXT_LINKS = [
  { kind: 'jira',       title: 'Jira PPM',         meta: 'MCB · 247 issues · 12 sprints' },
  { kind: 'confluence', title: 'Programme space',  meta: '38 pages · last edited Tue' },
  { kind: 'teams',      title: 'Delivery channel', meta: 'Mercury Core · 26 members' },
  { kind: 'gantt',      title: 'Master Gantt',     meta: 'Smartsheet · 142 tasks' },
];

function ProjectPulse() {
  return (
    <AppShell active="projects" context={PROJECT.name}>
      <PageHeader
        breadcrumb={['Projects', 'Mercury Core Banking — UK', 'Pulse']}
        title={PROJECT.name}
        badges={<>
          <StatusBadge tone="warning">At risk</StatusBadge>
          <span className="badge badge-outline mono">{PROJECT.code}</span>
          <span className="badge badge-outline">{PROJECT.stage}</span>
        </>}
        subtitle={<>PM <strong style={{color:'var(--color-text)'}}>{PROJECT.pm}</strong> · 14 mo programme · 18 of 40 weeks elapsed</>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="download"/> Export</button>
          <button className="btn btn-secondary btn-md"><Icon name="edit"/> Edit project</button>
          <button className="btn btn-primary btn-md"><Icon name="plus"/> Add position</button>
        </>}
        tabs={[
          { id:'pulse', label:'Pulse' },
          { id:'plan',  label:'Plan',  count:'8' },
          { id:'money', label:'Money' },
        ]}
        activeTab="pulse"
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:20}}>
        {/* Banner — urgent anomaly strip */}
        <div className="banner banner-danger">
          <div style={{color:'var(--color-status-danger)', display:'flex', alignItems:'center'}}><Icon name="alert" size={18}/></div>
          <div style={{flex:1}}>
            <div className="banner-title">Decision needed by Tuesday 26 May</div>
            <div className="banner-body">Q3 budget projection is <strong>−$184k</strong> against baseline. Director sign-off required to re-baseline or absorb FX delta.</div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-ghost btn-sm">Snooze</button>
            <button className="btn btn-primary btn-sm">Open decision <Icon name="arrow-right"/></button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="kpi-strip">
          <div className="kpi tone-warning">
            <span className="kpi-label">Open positions</span>
            <span className="kpi-value">3<span className="unit"> / 8</span></span>
            <span className="kpi-delta down"><Icon name="arrow-down" size={12}/> 2 longer than 14d SLA</span>
          </div>
          <div className="kpi tone-danger">
            <span className="kpi-label">Budget variance</span>
            <span className="kpi-value">−8.2<span className="unit">%</span></span>
            <span className="kpi-delta down"><Icon name="trending-down" size={12}/> from −5.1% last week</span>
          </div>
          <div className="kpi tone-active">
            <span className="kpi-label">Milestone progress</span>
            <span className="kpi-value">62<span className="unit">%</span></span>
            <span className="kpi-delta up"><Icon name="trending-up" size={12}/> on track vs plan</span>
          </div>
          <div className="kpi tone-info">
            <span className="kpi-label">Days to next gate</span>
            <span className="kpi-value">11<span className="unit"> d</span></span>
            <span className="kpi-foot">Reg approval · 6 Jun</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Burn rate (4w)</span>
            <span className="kpi-value mono">$248k</span>
            <Sparkline data={[182, 205, 211, 240, 232, 248]} width={120} height={20} tone="warning"/>
          </div>
        </div>

        {/* Quadrant + Decision panel */}
        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20}}>
          <div className="card" style={{overflow:'hidden'}}>
            <div className="card-header">
              <h3>RAG quadrant · this week</h3>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <span className="compact-sm muted">Auto-snapshot · Mon 02:00</span>
                <button className="icon-btn icon-btn-sm" aria-label="Refresh"><Icon name="refresh"/></button>
              </div>
            </div>
            <div className="quad-grid" style={{borderRadius:0, border:0}}>
              <div className="quad tone-warning">
                <div className="quad-head">
                  <span className="quad-title">Delivery</span>
                  <StatusBadge tone="warning">At risk</StatusBadge>
                </div>
                <div className="quad-score">62<span className="out"> / 100</span></div>
                <div className="quad-bar"><i style={{width:'62%'}}/></div>
                <div className="quad-meta">Schedule slip 8d on integration · velocity 0.84 of plan</div>
              </div>
              <div className="quad tone-danger">
                <div className="quad-head">
                  <span className="quad-title">Budget</span>
                  <StatusBadge tone="danger">Over</StatusBadge>
                </div>
                <div className="quad-score">48<span className="out"> / 100</span></div>
                <div className="quad-bar"><i style={{width:'48%'}}/></div>
                <div className="quad-meta">EV $1.84M · AC $2.02M · variance −$184k</div>
              </div>
              <div className="quad tone-active">
                <div className="quad-head">
                  <span className="quad-title">People</span>
                  <StatusBadge tone="active">Healthy</StatusBadge>
                </div>
                <div className="quad-score">81<span className="out"> / 100</span></div>
                <div className="quad-bar"><i style={{width:'81%'}}/></div>
                <div className="quad-meta">5 of 8 positions filled · 1 critical gap</div>
              </div>
              <div className="quad tone-active">
                <div className="quad-head">
                  <span className="quad-title">Quality</span>
                  <StatusBadge tone="active">Healthy</StatusBadge>
                </div>
                <div className="quad-score">88<span className="out"> / 100</span></div>
                <div className="quad-bar"><i style={{width:'88%'}}/></div>
                <div className="quad-meta">Defect escape rate 1.2% · 0 P0 open</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Decisions awaiting you</h3>
              <span className="badge badge-warning"><span className="dot"/>3 open</span>
            </div>
            <div style={{padding:'4px 0'}}>
              {DECISIONS.map((d, i) => (
                <div key={i} style={{padding:'12px 20px', borderBottom: i < DECISIONS.length-1 ? '1px solid var(--color-border-subtle)' : 0, display:'flex', gap:12, alignItems:'flex-start'}}>
                  <span className={'tone-dot tone-'+d.tone} style={{marginTop:6, flexShrink:0}}/>
                  <div style={{flex:1, minWidth:0}}>
                    <div className="body-sm" style={{fontWeight:500}}>{d.title}</div>
                    <div className="compact-sm muted" style={{marginTop:2}}>Owner · {d.owner} · by {d.by}</div>
                  </div>
                  <button className="btn btn-tertiary btn-sm">Open <Icon name="arrow-right"/></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Open positions table + risks panel */}
        <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20}}>
          <div className="card">
            <div className="card-header">
              <h3>Open & in-flight positions</h3>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <input className="input input-sm" placeholder="Filter role…" style={{width:180}}/>
                <button className="btn btn-ghost btn-sm"><Icon name="filter"/> Filter</button>
                <button className="btn btn-primary btn-sm"><Icon name="plus"/> Position</button>
              </div>
            </div>
            <div style={{overflow:'auto'}}>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Alloc</th>
                    <th>Start</th>
                    <th>Status</th>
                    <th>Active fill</th>
                    <th className="right">Suggest</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {POSITIONS.map((p, i) => (
                    <tr key={i}>
                      <td>
                        <div className="table-cell-strong">{p.role}</div>
                        <div className="compact-sm muted" style={{marginTop:2}}>{p.skills.join(' · ')}</div>
                      </td>
                      <td className="num">{p.alloc}%</td>
                      <td className="mono">{p.start}</td>
                      <td>
                        {p.status === 'open' && <StatusBadge tone="warning">Open · {p.weeks}w</StatusBadge>}
                        {p.status === 'proposed' && <StatusBadge tone="info">Proposed</StatusBadge>}
                        {p.status === 'booked' && <StatusBadge tone="accent">Booked</StatusBadge>}
                        {p.status === 'assigned' && <StatusBadge tone="active">Assigned</StatusBadge>}
                      </td>
                      <td>
                        {p.fill ? (
                          <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                            <Avatar name={p.fill} size="sm"/>
                            <span className="body-sm">{p.fill}</span>
                          </span>
                        ) : <span className="muted compact-sm">— Vacant —</span>}
                      </td>
                      <td className="right">
                        {p.suggested > 0
                          ? <button className="btn btn-ghost btn-sm" style={{padding:'0 8px'}}><span className="badge badge-accent" style={{marginRight:4}}>{p.suggested}</span>Fills</button>
                          : <span className="muted compact-sm">—</span>}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn icon-btn-sm" aria-label="More"><Icon name="more-v"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Top risks</h3>
              <a href="#" className="compact">View all 11 <Icon name="chevron-right" size={12}/></a>
            </div>
            <div style={{padding:'4px 0'}}>
              {RISKS.map((r, i) => (
                <div key={i} style={{padding:'12px 20px', borderBottom: i < RISKS.length-1 ? '1px solid var(--color-border-subtle)' : 0}}>
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <StatusBadge tone={r.tone}>{r.tone === 'critical' ? 'Critical' : r.tone === 'danger' ? 'High' : 'Medium'}</StatusBadge>
                    <span className="compact-sm muted">Owner · {r.owner}</span>
                    <span className="compact-sm muted" style={{marginLeft:'auto'}}>Due {r.due}</span>
                  </div>
                  <div className="body-sm" style={{marginTop:6}}>{r.title}</div>
                </div>
              ))}
            </div>
            <div className="card-footer">
              <button className="btn btn-tertiary btn-sm" style={{marginRight:'auto'}}><Icon name="plus"/> Log risk</button>
              <button className="btn btn-secondary btn-sm">Mitigation plan</button>
            </div>
          </div>
        </div>

        {/* Next milestone + activity timeline + external links */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
          <div className="card">
            <div className="card-header">
              <h3>Next milestone</h3>
              <a href="#" className="compact">Plan tab <Icon name="chevron-right" size={12}/></a>
            </div>
            <div className="card-body">
              <div style={{display:'flex', alignItems:'flex-start', gap:16}}>
                <Donut value={68} tone="warning" size={72}/>
                <div style={{flex:1, minWidth:0}}>
                  <div className="label-eyebrow">Gate 3 · Regulatory approval</div>
                  <div className="h3" style={{marginTop:4}}>FCA filing submitted</div>
                  <div className="compact muted" style={{marginTop:4}}>Due <span className="mono" style={{color:'var(--color-text)'}}>Fri 6 Jun</span> · 11 days · owner Henrik V.</div>
                  <div style={{display:'flex', gap:24, marginTop:14}}>
                    <div>
                      <div className="label-eyebrow">Tasks</div>
                      <div className="h3 tnum" style={{marginTop:2}}>17 / 25</div>
                    </div>
                    <div>
                      <div className="label-eyebrow">Blockers</div>
                      <div className="h3 tnum" style={{marginTop:2, color:'var(--color-status-warning)'}}>2</div>
                    </div>
                    <div>
                      <div className="label-eyebrow">Slip risk</div>
                      <div className="h3 tnum" style={{marginTop:2, color:'var(--color-status-warning)'}}>+3 d</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Activity</h3>
              <div style={{display:'flex', gap:8}}>
                <button className="btn btn-ghost btn-sm">All</button>
                <button className="btn btn-ghost btn-sm">Mine</button>
              </div>
            </div>
            <div className="card-body" style={{paddingTop:8, paddingBottom:8}}>
              <div className="timeline">
                {TIMELINE.map((t, i) => (
                  <div key={i} className={'tl-row tl-'+t.tone}>
                    <span className="tl-dot"/>
                    <div className="tl-body"><span style={{fontWeight:500}}>{t.who}</span> {t.what}</div>
                    <span className="tl-meta">{t.when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* External link tiles */}
        <div className="card">
          <div className="card-header">
            <h3>Linked workspaces</h3>
            <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Link</button>
          </div>
          <div className="card-body" style={{padding:16}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:12}}>
              {EXT_LINKS.map((l, i) => (
                <a key={i} href="#" style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:12, borderRadius: 'var(--radius-card)',
                  border:'1px solid var(--color-border)',
                  textDecoration:'none', color:'var(--color-text)',
                  transition: 'background 150ms',
                }}>
                  <div style={{
                    width:36, height:36, borderRadius:8,
                    background:'var(--color-surface-alt)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    color:'var(--color-accent)'
                  }}>
                    <Icon name={l.kind} size={20}/>
                  </div>
                  <div style={{minWidth:0, flex:1}}>
                    <div className="body-sm" style={{fontWeight:500}}>{l.title}</div>
                    <div className="compact-sm muted" style={{marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{l.meta}</div>
                  </div>
                  <Icon name="external" size={14} style={{color:'var(--color-text-subtle)'}}/>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Data freshness */}
        <div style={{display:'flex', alignItems:'center', gap:12, padding:'8px 0', color:'var(--color-text-subtle)', fontSize:'var(--font-size-compact-sm)'}}>
          <span className="tone-dot tone-active"/>
          <span>Data as of <span className="mono" style={{color:'var(--color-text-muted)'}}>23 May 2026 · 14:32 UTC</span></span>
          <span>·</span>
          <span>Source: Production DB</span>
          <span>·</span>
          <span>Confidence: High</span>
          <button className="btn btn-ghost btn-sm" style={{marginLeft:'auto'}}><Icon name="refresh"/> Refresh</button>
        </div>
      </div>
    </AppShell>
  );
}

window.ProjectPulse = ProjectPulse;
