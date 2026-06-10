// page-profile.jsx — "People Profile" — composed Person 360.
// Grammar: Detail Surface — header + tabs + body + sidebar.
// Identity + Employment + Position history + Skills + Cost rates + Time/Leave + Activity.

const POSITION_HISTORY = [
  { project: 'Mercury Core Banking — UK', role: 'Senior Frontend Eng', alloc: 80,  start: '2025-09-01', end: 'now',        status: 'assigned' },
  { project: 'Atlas ERP Rollout',          role: 'Frontend Lead',       alloc: 100, start: '2024-11-04', end: '2025-08-15', status: 'released' },
  { project: 'Helix DW Migration',         role: 'UI Engineer',         alloc: 60,  start: '2024-03-18', end: '2024-10-30', status: 'released' },
  { project: 'Beacon CRM',                 role: 'UI Engineer',         alloc: 100, start: '2023-06-05', end: '2024-03-10', status: 'released' },
];

const COST_RATES = [
  { effective: '2026-01-01', daily: 1650, currency: 'USD', kind: 'Internal · L5' },
  { effective: '2025-01-01', daily: 1480, currency: 'USD', kind: 'Internal · L5' },
  { effective: '2024-01-01', daily: 1320, currency: 'USD', kind: 'Internal · L4' },
];

const SKILLS = [
  { skill: 'React',           level: 5, endorsements: 8 },
  { skill: 'TypeScript',      level: 5, endorsements: 6 },
  { skill: 'Design Systems',  level: 4, endorsements: 3 },
  { skill: 'D3.js',           level: 4, endorsements: 2 },
  { skill: 'GraphQL',         level: 3, endorsements: 4 },
  { skill: 'Node.js',         level: 3, endorsements: 2 },
  { skill: 'Figma',           level: 4, endorsements: 5 },
  { skill: 'Storybook',       level: 4, endorsements: 3 },
];

const TIMELINE_EVENTS = [
  { tone:'info',    when:'18 May 2026', body:<>Position fill on <strong>Atlas ERP Rollout</strong> → <strong>RELEASED</strong></> },
  { tone:'active',  when:'01 Jan 2026', body:<>Cost rate increased to <strong>$1,650/d</strong> (L5)</> },
  { tone:'active',  when:'04 Nov 2024', body:<>Booked as Frontend Lead on <strong>Atlas ERP Rollout</strong></> },
  { tone:'info',    when:'01 Sep 2024', body:<>Org unit changed — Platform → <strong>Banking Front-of-House</strong></> },
  { tone:'active',  when:'05 Jun 2023', body:<>Joined DeliverIT · Bank Bigfoot · grade L4</> },
];

function PeopleProfile() {
  return (
    <AppShell active="people" context="People · Priya Natarajan">
      <PageHeader
        breadcrumb={['People', 'Directory', 'Priya Natarajan']}
        title={<span style={{display:'flex', alignItems:'center', gap:12}}>
          <Avatar name="Priya Natarajan" size="xl"/>
          Priya Natarajan
        </span>}
        badges={<>
          <StatusBadge tone="info">Proposed · MCB-UK</StatusBadge>
          <span className="badge badge-outline">L5 · Senior Engineer</span>
          <span className="badge badge-outline mono">EID-04812</span>
        </>}
        subtitle={<>Banking Front-of-House · London · joined Jun 2023 · reports to Maya Kovács</>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="comment"/> Message</button>
          <button className="btn btn-secondary btn-md"><Icon name="position"/> Propose to position</button>
          <button className="btn btn-secondary btn-md"><Icon name="more-v"/></button>
        </>}
        tabs={[
          { id:'overview',  label:'Overview' },
          { id:'positions', label:'Positions',  count:'4' },
          { id:'skills',    label:'Skills',     count:'12' },
          { id:'cost',      label:'Cost rates' },
          { id:'time',      label:'Time & leave' },
          { id:'activity',  label:'Activity' },
        ]}
        activeTab="overview"
      />

      <div className="page-body" style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'flex-start'}}>
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {/* Snapshot strip */}
          <div className="kpi-strip" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
            <div className="kpi tone-info">
              <span className="kpi-label">Utilization · L30D</span>
              <span className="kpi-value">86<span className="unit">%</span></span>
              <Sparkline data={[70, 80, 95, 100, 90, 80, 86]} width={120} height={20} tone="info"/>
            </div>
            <div className="kpi tone-active">
              <span className="kpi-label">Billable hours · L30D</span>
              <span className="kpi-value mono">152</span>
              <span className="kpi-delta up">+8h vs prior 30d</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Cost / day</span>
              <span className="kpi-value mono">$1,650</span>
              <span className="kpi-foot">Effective 1 Jan 2026</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">Leave balance</span>
              <span className="kpi-value mono">14.5<span className="unit"> d</span></span>
              <span className="kpi-foot">+ 3.5d in lieu</span>
            </div>
          </div>

          {/* Identity + Employment */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <div className="card">
              <div className="card-header"><h3>Identity</h3></div>
              <div className="card-body">
                <dl className="dl">
                  <dt>Employee ID</dt>      <dd className="mono">EID-04812</dd>
                  <dt>Email</dt>            <dd>priya.natarajan@bankbigfoot.co.uk</dd>
                  <dt>Office</dt>           <dd>London · Canary Wharf</dd>
                  <dt>Working pattern</dt>  <dd>Full-time · 37.5h/wk</dd>
                  <dt>Date of joining</dt>  <dd className="mono">5 Jun 2023</dd>
                  <dt>Time in company</dt>  <dd>2y 11mo</dd>
                </dl>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3>Employment</h3></div>
              <div className="card-body">
                <dl className="dl">
                  <dt>Grade</dt>            <dd>L5 · Senior Engineer</dd>
                  <dt>Role family</dt>     <dd>Engineering · Frontend</dd>
                  <dt>Org unit</dt>         <dd>Banking Front-of-House</dd>
                  <dt>Line manager</dt>     <dd>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                      <Avatar name="Maya Kovács" size="sm"/> Maya Kovács
                    </span>
                  </dd>
                  <dt>Cost centre</dt>      <dd className="mono">UK-FE-200</dd>
                  <dt>Employment type</dt>  <dd>Permanent</dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Position history */}
          <div className="card">
            <div className="card-header">
              <h3>Position history</h3>
              <span className="compact muted">4 positions · 2y 11mo logged</span>
            </div>
            <div style={{overflow:'auto'}}>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Role</th>
                    <th className="right">Alloc</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {POSITION_HISTORY.map((h, i) => (
                    <tr key={i}>
                      <td><span className="table-cell-strong">{h.project}</span></td>
                      <td>{h.role}</td>
                      <td className="right num">{h.alloc}%</td>
                      <td className="mono">{h.start}</td>
                      <td className="mono">{h.end}</td>
                      <td>
                        {h.status === 'assigned' && <StatusBadge tone="active">Assigned</StatusBadge>}
                        {h.status === 'released' && <StatusBadge tone="pending">Released</StatusBadge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skills + Cost rates side-by-side */}
          <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:16}}>
            <div className="card">
              <div className="card-header">
                <h3>Skills</h3>
                <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Add</button>
              </div>
              <div className="card-body" style={{paddingTop:8}}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                  {SKILLS.map((s) => (
                    <div key={s.skill} style={{display:'flex', alignItems:'center', gap:10}}>
                      <span className="body-sm" style={{flex:1, minWidth:0}}>{s.skill}</span>
                      <div style={{display:'flex', gap:2}}>
                        {[1,2,3,4,5].map((n) => (
                          <span key={n} style={{
                            width:14, height:6, borderRadius:1,
                            background: n <= s.level ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                          }}/>
                        ))}
                      </div>
                      <span className="compact-sm muted tnum" style={{width:32, textAlign:'right'}}>{s.endorsements}×</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Cost rates</h3></div>
              <div style={{overflow:'auto'}}>
                <table className="table table-compact">
                  <thead><tr><th>Effective</th><th>Kind</th><th className="right">Rate / day</th></tr></thead>
                  <tbody>
                    {COST_RATES.map((r, i) => (
                      <tr key={i}>
                        <td className="mono">{r.effective}</td>
                        <td>{r.kind}</td>
                        <td className="right mono"><Money value={r.daily}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Time + Leave */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <div className="card">
              <div className="card-header">
                <h3>Time · this week</h3>
                <StatusBadge tone="warning">Pending submit</StatusBadge>
              </div>
              <div className="card-body" style={{paddingTop:10}}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6}}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => {
                    const hrs = [8, 8.5, 7.5, 9, 6, 0, 0][i];
                    const tone = hrs > 8 ? 'warning' : hrs === 0 ? 'pending' : 'active';
                    return (
                      <div key={d} style={{textAlign:'center'}}>
                        <div className="compact-sm muted">{d}</div>
                        <div style={{
                          marginTop:4,
                          padding:'10px 6px',
                          borderRadius:'var(--radius-control)',
                          background: hrs === 0 ? 'var(--color-surface-alt)' : 'var(--color-accent-soft)',
                          color: hrs > 8 ? 'var(--color-status-warning)' : hrs === 0 ? 'var(--color-text-muted)' : 'var(--color-accent-text)',
                          fontWeight:600, fontVariantNumeric:'tabular-nums',
                        }}>
                          {hrs ? hrs.toFixed(1) : '–'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginTop:14}}>
                  <span className="body-sm muted">Total this week</span>
                  <span className="body-sm mono" style={{fontWeight:600}}>39.0 / 37.5h</span>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-ghost btn-sm">Edit week</button>
                <button className="btn btn-primary btn-sm">Submit for approval</button>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3>Leave</h3>
                <a href="#" className="compact">Request leave <Icon name="chevron-right" size={12}/></a>
              </div>
              <div className="card-body">
                <dl className="dl">
                  <dt>Annual entitlement</dt>     <dd className="mono">25.0 d</dd>
                  <dt>Taken YTD</dt>              <dd className="mono">7.5 d</dd>
                  <dt>Pending approval</dt>       <dd className="mono">3.0 d</dd>
                  <dt>Remaining</dt>              <dd className="mono" style={{fontWeight:600}}>14.5 d</dd>
                  <dt>In lieu / TOIL</dt>         <dd className="mono">3.5 d</dd>
                </dl>
                <div style={{marginTop:14, padding:'10px 12px', background:'var(--color-status-info-bg)', borderRadius:'var(--radius-card)', color:'var(--color-status-info)', fontSize:'var(--font-size-compact)'}}>
                  <strong>Upcoming:</strong> 24–28 June (5d) · pending Maya Kovács approval
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar — recent activity + actions + suggestions, stretches to fill column */}
        <div style={{display:'flex', flexDirection:'column', gap:16, alignSelf:'stretch'}}>
          <div className="card">
            <div className="card-header"><h3>Quick actions</h3></div>
            <div className="card-body" style={{padding:12, display:'flex', flexDirection:'column', gap:6}}>
              <button className="btn btn-secondary btn-md" style={{justifyContent:'flex-start'}}><Icon name="position"/> Propose to open position</button>
              <button className="btn btn-secondary btn-md" style={{justifyContent:'flex-start'}}><Icon name="skill"/> Edit skills</button>
              <button className="btn btn-secondary btn-md" style={{justifyContent:'flex-start'}}><Icon name="org"/> Move org unit</button>
              <button className="btn btn-secondary btn-md" style={{justifyContent:'flex-start'}}><Icon name="calendar"/> Plan leave</button>
              <button className="btn btn-secondary btn-md" style={{justifyContent:'flex-start', color:'var(--color-status-danger)'}}><Icon name="lock"/> Deactivate…</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Suggested next positions</h3><span className="compact muted">5d remaining on proposal</span></div>
            <div style={{display:'flex', flexDirection:'column'}}>
              {[
                { project:'Mercury Core · UK',  role:'Senior FE Eng · 80%',   match:92, start:'16 Jun', tone:'active' },
                { project:'Apollo Risk',         role:'Frontend Lead · 100%',  match:86, start:'01 Jul', tone:'info'   },
                { project:'Helix DW',            role:'UI Engineer · 60%',     match:71, start:'23 Jun', tone:'info'   },
              ].map((s, i) => (
                <div key={i} style={{padding:'10px 20px', borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 0, display:'flex', alignItems:'center', gap:10}}>
                  <Donut value={s.match} size={32} thickness={4} tone={s.tone}/>
                  <div style={{minWidth:0, flex:1}}>
                    <div className="body-sm" style={{fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.role}</div>
                    <div className="compact-sm muted" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.project} · {s.start}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm">Propose</button>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{flex:1, minHeight:200}}>
            <div className="card-header">
              <h3>Activity</h3>
              <a href="#" className="compact">All</a>
            </div>
            <div className="card-body" style={{paddingTop:8, paddingBottom:8}}>
              <div className="timeline">
                {TIMELINE_EVENTS.map((e, i) => (
                  <div key={i} className={'tl-row tl-'+e.tone}>
                    <span className="tl-dot"/>
                    <div className="tl-body">{e.body}<div className="compact-sm muted" style={{marginTop:2}}>{e.when}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.PeopleProfile = PeopleProfile;
