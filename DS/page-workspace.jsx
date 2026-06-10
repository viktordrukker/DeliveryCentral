// page-workspace.jsx — Employee Workspace at /me/*
// One stateful component with 6 tabs. Reuses AppShell + atoms + Calendar + BalanceMeter + Timeline.

const TODAY_MS = new Date(2026, 4, 23).getTime(); // 23 May 2026, anchor for demos
const today = new Date(TODAY_MS);

// Shared chrome — title bar + tab strip
function WorkspaceChrome({ activeTab, onTab }) {
  const tabs = [
    { id:'overview', label:'Overview' },
    { id:'time',     label:'Time',       count: '40 / 37.5h' },
    { id:'leave',    label:'Leave',      count: '14.5d left' },
    { id:'projects', label:'Projects',   count: 3 },
    { id:'inbox',    label:'Inbox',      count: 4 },
    { id:'settings', label:'Settings' },
  ];
  return (
    <>
      <PageHeader
        breadcrumb={['Workspace']}
        title="Priya Natarajan"
        badges={<>
          <Avatar name="Priya Natarajan" size="sm"/>
          <span className="badge badge-outline">Senior FE · L5</span>
          <span className="badge badge-outline">London · BST</span>
        </>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="settings"/> Account</button>
          <button className="btn btn-secondary btn-md"><Icon name="external"/> View profile</button>
        </>}
      />
      <div className="tab-strip">
        {tabs.map((t) => (
          <div key={t.id} className={'ts-tab' + (t.id === activeTab ? ' active' : '')}
               onClick={() => onTab && onTab(t.id)}>
            <span>{t.label}</span>
            {t.count != null && <span className="compact-sm muted tnum">{t.count}</span>}
          </div>
        ))}
        <span className="ts-add"/>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const wkTimeline = [
    { id:1, startDate: new Date(2026,4,18), endDate: new Date(2026,4,23), status:'assigned', allocationPercent:80, label:'MCB-UK · 80%' },
    { id:2, startDate: new Date(2026,4,18), endDate: new Date(2026,4,23), status:'assigned', allocationPercent:20, label:'Design system · 20%' },
  ];
  return (
    <div className="page-body" style={{display:'flex', flexDirection:'column', gap:20}}>
      {/* KPI strip — each KPI is a clickable doorway */}
      <div className="kpi-strip" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <a href="#" className="kpi tone-warning" style={{textDecoration:'none', color:'inherit'}}>
          <span className="kpi-label">Hours this week</span>
          <span className="kpi-value">31.5<span className="unit"> / 37.5h</span></span>
          <span className="kpi-delta down"><Icon name="alert" size={12}/> 1.5h short, 1 day left</span>
        </a>
        <a href="#" className="kpi tone-active" style={{textDecoration:'none', color:'inherit'}}>
          <span className="kpi-label">Leave balance</span>
          <span className="kpi-value">14.5<span className="unit"> d</span></span>
          <span className="kpi-foot">+ 3.5d in lieu</span>
        </a>
        <a href="#" className="kpi tone-info" style={{textDecoration:'none', color:'inherit'}}>
          <span className="kpi-label">Open notifications</span>
          <span className="kpi-value">4</span>
          <span className="kpi-foot">2 require action</span>
        </a>
        <a href="#" className="kpi" style={{textDecoration:'none', color:'inherit'}}>
          <span className="kpi-label">Active projects</span>
          <span className="kpi-value">3</span>
          <span className="kpi-foot">MCB-UK · DS · Atlas</span>
        </a>
      </div>

      {/* Hero — weekly timeline */}
      <div className="card">
        <div className="card-header">
          <h3>This week · logged hours by project</h3>
          <span className="compact muted">18–24 May 2026 · auto-fill from assignments</span>
        </div>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <window.Timeline
            segments={wkTimeline}
            variant="stacked"
            size="md"
            today={today}
            rangeStart={new Date(2026,4,18)}
            rangeEnd={new Date(2026,4,24)}
          />
          <div style={{display:'flex', gap:20, marginTop:14, paddingTop:12, borderTop:'1px solid var(--color-border-subtle)'}}>
            <span><span className="label-eyebrow">Logged</span> <span className="mono" style={{fontWeight:600, fontVariantNumeric:'tabular-nums'}}>31.5h</span></span>
            <span><span className="label-eyebrow">Expected</span> <span className="mono" style={{fontWeight:600}}>37.5h</span></span>
            <span><span className="label-eyebrow">Variance</span> <span className="mono" style={{fontWeight:600, color:'var(--color-status-warning)'}}>−6.0h</span></span>
            <span style={{flex:1}}/>
            <button className="btn btn-secondary btn-md">Auto-fill from assignments</button>
            <button className="btn btn-primary btn-md">Submit timesheet</button>
          </div>
        </div>
      </div>

      {/* Approvals + activity */}
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:20}}>
        <div className="card">
          <div className="card-header">
            <h3>Awaiting your input</h3>
            <span className="badge badge-warning">2 require action</span>
          </div>
          <div style={{display:'flex', flexDirection:'column'}}>
            {[
              { tone:'warning', title:'Confirm proposal: MCB-UK · Senior FE · 80%', meta:'Maya K. proposed you · 6h to SLA', cta:'Open' },
              { tone:'info',    title:'Sign off Q2 self-assessment',                 meta:'HR · due Friday',                cta:'Open' },
              { tone:'active',  title:'Acknowledge cost-rate change',                meta:'+$170/d effective 1 Jul',         cta:'Acknowledge' },
            ].map((a, i) => (
              <div key={i} style={{padding:'14px 20px', borderTop: i>0 ? '1px solid var(--color-border-subtle)' : 0, display:'flex', alignItems:'center', gap:12}}>
                <span className={'tone-dot tone-'+a.tone} style={{flexShrink:0}}/>
                <div style={{flex:1, minWidth:0}}>
                  <div className="body-sm" style={{fontWeight:500}}>{a.title}</div>
                  <div className="compact-sm muted">{a.meta}</div>
                </div>
                <button className="btn btn-tertiary btn-sm">{a.cta} <Icon name="arrow-right"/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Recent activity</h3><a href="#" className="compact">All</a></div>
          <div className="card-body" style={{padding:'10px 20px'}}>
            <div className="timeline">
              {[
                { tone:'info',    when:'09:14', body:<>Maya K. proposed you for <strong>MCB-UK</strong></> },
                { tone:'active',  when:'Tue',   body:<>You logged <strong>8h</strong> on Atlas</> },
                { tone:'info',    when:'Mon',   body:<>You submitted timesheet for week 19</> },
                { tone:'pending', when:'Fri',   body:<>Hannah C. approved your leave 24-28 Jun</> },
                { tone:'active',  when:'Thu',   body:<>You finished onboarding for Mercury</> },
              ].map((e, i) => (
                <div key={i} className={'tl-row tl-'+e.tone}>
                  <span className="tl-dot"/>
                  <div className="tl-body">{e.body}</div>
                  <span className="tl-meta">{e.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Leave tab
// ─────────────────────────────────────────────────────────────────────────
function LeaveTab() {
  const calEvents = [
    { date: new Date(2026,5,24), kind:'pending' },
    { date: new Date(2026,5,25), kind:'pending' },
    { date: new Date(2026,5,26), kind:'pending' },
    { date: new Date(2026,5,27), kind:'pending' },
    { date: new Date(2026,5,28), kind:'pending' },
    { date: new Date(2026,3,3),  kind:'approved', label:'Easter' },
    { date: new Date(2026,3,6),  kind:'holiday',  label:'Easter Monday' },
    { date: new Date(2026,4,4),  kind:'holiday',  label:'Early May BH' },
    { date: new Date(2026,4,25), kind:'holiday',  label:'Spring BH' },
    { date: new Date(2026,7,31), kind:'holiday',  label:'Summer BH' },
    { date: new Date(2026,11,25),kind:'holiday',  label:'Christmas' },
    { date: new Date(2026,11,28),kind:'holiday',  label:'Boxing Day' },
    { date: new Date(2026,1,16), kind:'approved', label:'Family visit' },
    { date: new Date(2026,1,17), kind:'approved' },
    { date: new Date(2026,1,18), kind:'approved' },
  ];
  return (
    <div className="page-body" style={{display:'grid', gridTemplateColumns:'minmax(380px, 460px) 1fr', gap:20, alignItems:'flex-start'}}>
      {/* Left: balance + request form */}
      <div style={{display:'flex', flexDirection:'column', gap:20}}>
        <div className="card">
          <div className="card-header"><h3>Annual leave</h3><span className="compact muted">Resets 1 Jan</span></div>
          <div className="card-body">
            <window.BalanceMeter
              entitlement={25} used={7.5} pending={5} accrual={3.5} unit="d"
              breakdown={[
                { label:'Annual leave',  used:7.5, entitlement:25, color:'var(--color-accent)' },
                { label:'TOIL / lieu',   used:0,   entitlement:3.5, color:'var(--color-status-info)' },
                { label:'Sick',          used:2,   entitlement:10,  color:'var(--color-text-muted)' },
                { label:'Parental',      used:0,   entitlement:0,   color:'var(--color-status-active)' },
              ]}/>
          </div>
        </div>

        {/* Request form */}
        <div className="card">
          <div className="card-header"><h3>Request leave</h3><span className="compact muted">Pre-filled from your context</span></div>
          <div className="card-body" style={{display:'flex', flexDirection:'column', gap:14}}>
            <div className="field">
              <label className="field-label">Type</label>
              <select className="select"><option>Annual leave</option><option>TOIL</option><option>Sick</option><option>Parental</option></select>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <div className="field">
                <label className="field-label">From</label>
                <input className="input mono" defaultValue="24 Jun 2026"/>
              </div>
              <div className="field">
                <label className="field-label">To</label>
                <input className="input mono" defaultValue="28 Jun 2026"/>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Notes <span className="muted compact-sm">(optional)</span></label>
              <textarea className="textarea" rows="2" placeholder="Holiday with family"/>
            </div>

            {/* Live preview — working days, balance, conflicts */}
            <div style={{border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', overflow:'hidden'}}>
              <div style={{padding:'10px 14px', background:'var(--color-surface-alt)', borderBottom:'1px solid var(--color-border)'}}>
                <div className="label-eyebrow">Preview</div>
              </div>
              <div style={{padding:'14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div><div className="compact muted">Working days</div><div className="mono" style={{fontWeight:600}}>5d</div></div>
                <div><div className="compact muted">Holidays excluded</div><div className="mono" style={{fontWeight:600}}>0</div></div>
                <div><div className="compact muted">Balance after</div><div className="mono" style={{fontWeight:600, color:'var(--color-status-active)'}}>9.5d</div></div>
                <div><div className="compact muted">Approver</div><div className="mono" style={{fontWeight:600}}>Maya K.</div></div>
              </div>
              {/* Conflict warning rail */}
              <div style={{padding:'10px 14px', background:'color-mix(in oklab, var(--color-status-warning) 14%, var(--color-surface))', borderTop:'1px solid var(--color-border)', display:'flex', alignItems:'center', gap:10}}>
                <Icon name="alert" size={14} style={{color:'var(--color-status-warning)', flexShrink:0}}/>
                <div style={{flex:1, minWidth:0}}>
                  <div className="body-sm" style={{fontWeight:600, color:'var(--color-status-warning)'}}>Overlap with active assignment</div>
                  <div className="compact-sm">MCB-UK · 80% allocation. Your manager (Maya K.) will be notified.</div>
                </div>
              </div>
            </div>

            <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
              <button className="btn btn-ghost btn-md">Save draft</button>
              <button className="btn btn-primary btn-md">Submit request</button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: year calendar */}
      <div className="card">
        <div className="card-header">
          <h3>2026 calendar</h3>
          <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
            <span className="compact muted" style={{display:'inline-flex', alignItems:'center', gap:4}}><span style={{width:10, height:10, borderRadius:2, background:'color-mix(in oklab, var(--color-status-active) 35%, var(--color-surface))'}}/> Approved</span>
            <span className="compact muted" style={{display:'inline-flex', alignItems:'center', gap:4}}><span style={{width:10, height:10, borderRadius:2, background:'color-mix(in oklab, var(--color-status-warning) 35%, var(--color-surface))'}}/> Pending</span>
            <span className="compact muted" style={{display:'inline-flex', alignItems:'center', gap:4}}><span style={{width:10, height:10, borderRadius:2, background:'color-mix(in oklab, var(--color-status-info) 22%, var(--color-surface))'}}/> Holiday</span>
            <span className="compact muted" style={{display:'inline-flex', alignItems:'center', gap:4}}><span style={{width:10, height:10, borderRadius:2, background:'var(--color-surface-alt)', border:'1px solid var(--color-border)'}}/> Weekend</span>
          </div>
        </div>
        <div className="card-body" style={{padding:18}}>
          <window.Calendar mode="year" month={new Date(2026,0,1)} events={calEvents} today={today}/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Projects tab
// ─────────────────────────────────────────────────────────────────────────
function ProjectsTab() {
  return (
    <div className="page-body" style={{display:'flex', flexDirection:'column', gap:16}}>
      <div className="card">
        <div className="card-header">
          <h3>My active memberships</h3>
          <span className="compact muted">Click a row to open project</span>
        </div>
        <div style={{overflow:'auto'}}>
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Role</th>
                <th className="right">Allocation</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Manager</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[
                { project:'Mercury Core Banking — UK', role:'Senior Frontend Eng', alloc:'80%',  start:'16 Jun 2026', end:'30 Dec 2026', status:'proposed', mgr:'Maya Kovács' },
                { project:'Design system regen',         role:'Contributor',         alloc:'20%',  start:'1 Mar 2026',  end:'open',         status:'assigned', mgr:'Ethan Brooks' },
                { project:'Atlas ERP Rollout',           role:'Frontend Lead',       alloc:'100%', start:'4 Nov 2024',  end:'18 May 2026',  status:'released', mgr:'Aaron Page' },
              ].map((r, i) => (
                <tr key={i}>
                  <td><span className="table-cell-strong">{r.project}</span></td>
                  <td>{r.role}</td>
                  <td className="right num">{r.alloc}</td>
                  <td className="mono compact">{r.start}</td>
                  <td className="mono compact">{r.end}</td>
                  <td>
                    {r.status === 'assigned' && <StatusBadge tone="active">Assigned</StatusBadge>}
                    {r.status === 'proposed' && <StatusBadge tone="info">Proposed</StatusBadge>}
                    {r.status === 'released' && <StatusBadge tone="pending">Released</StatusBadge>}
                  </td>
                  <td><span style={{display:'inline-flex', alignItems:'center', gap:6}}><Avatar name={r.mgr} size="sm"/><span className="compact">{r.mgr}</span></span></td>
                  <td><button className="icon-btn icon-btn-sm" aria-label="Open"><Icon name="chevron-right"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{padding:'12px 16px', borderTop:'1px solid var(--color-border)', background:'var(--color-surface-alt)'}}>
          <button className="btn btn-ghost btn-sm"><Icon name="chevron-down"/> Show historical (8)</button>
        </div>
      </div>

      {/* Empty state inline — what you'd see if no active memberships */}
      <div className="card">
        <div className="card-header"><h3>Empty state · no active memberships</h3><span className="compact muted">Renders when memberships list is empty</span></div>
        <div className="empty-state">
          <div className="empty-icon"><Icon name="position" size={22}/></div>
          <div className="empty-title">No active assignments</div>
          <div className="empty-body">You don't have any active projects right now. Your Resource Manager can propose you for an open position.</div>
          <div style={{display:'flex', gap:8}}>
            <a className="btn btn-primary btn-md" href="mailto:maya.kovacs@bankbigfoot.co.uk?subject=Open%20to%20new%20assignment"><Icon name="comment"/> Email Maya Kovács (your RM)</a>
            <a className="btn btn-secondary btn-md" href="#"><Icon name="bench"/> View bench</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Time tab — weekly grid + day-cell edit
// ─────────────────────────────────────────────────────────────────────────
function TimeTab() {
  return (
    <div className="page-body" style={{display:'flex', flexDirection:'column', gap:16}}>
      {/* Week navigator + KPIs */}
      <div className="card">
        <div className="card-header">
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <button className="icon-btn icon-btn-sm" aria-label="Previous week"><Icon name="chevron-left"/></button>
            <h3>Week 21 · 18–24 May 2026</h3>
            <button className="icon-btn icon-btn-sm" aria-label="Next week"><Icon name="chevron-right"/></button>
            <button className="btn btn-ghost btn-sm">This week</button>
            <StatusBadge tone="warning">Draft · unsaved</StatusBadge>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn btn-secondary btn-md"><Icon name="copy"/> Copy week</button>
            <button className="btn btn-secondary btn-md"><Icon name="refresh"/> Auto-fill</button>
            <button className="btn btn-primary btn-md">Submit week</button>
          </div>
        </div>
      </div>
      <div className="kpi-strip" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        <div className="kpi"><span className="kpi-label">Filed (h)</span><span className="kpi-value mono">31.5</span><span className="kpi-foot">across 2 projects</span></div>
        <div className="kpi"><span className="kpi-label">Expected (h)</span><span className="kpi-value mono">37.5</span><span className="kpi-foot">5d × 7.5h</span></div>
        <div className="kpi tone-warning"><span className="kpi-label">Variance</span><span className="kpi-value mono">−6.0<span className="unit">h</span></span><span className="kpi-foot">1 day remaining</span></div>
        <div className="kpi tone-active"><span className="kpi-label">Lock status</span><span className="kpi-value" style={{fontSize:18, fontWeight:600}}>Open</span><span className="kpi-foot">Locks Mon 02:00</span></div>
      </div>

      {/* Hero timeline */}
      <div className="card">
        <div className="card-header"><h3>Logged hours · this week</h3></div>
        <div className="card-body" style={{padding:'14px 20px'}}>
          <window.Timeline
            segments={[
              { id:1, startDate:new Date(2026,4,18), endDate:new Date(2026,4,23), status:'assigned', allocationPercent:80, label:'MCB · 80%' },
              { id:2, startDate:new Date(2026,4,18), endDate:new Date(2026,4,23), status:'assigned', allocationPercent:20, label:'DS · 20%' },
            ]}
            size="md" today={today}
            rangeStart={new Date(2026,4,18)}
            rangeEnd={new Date(2026,4,24)}
            showMonthGrid={false}
          />
        </div>
      </div>

      {/* Weekly entries grid */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflow:'auto'}}>
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                {['Mon 18','Tue 19','Wed 20','Thu 21','Fri 22','Sat 23','Sun 24'].map((d) => <th key={d} className="right">{d}</th>)}
                <th className="right">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { p:'Mercury Core — UK',     d:[6.5, 7.0, 6.5, 6.0, 0, 0, 0] },
                { p:'Design system regen',    d:[1.5, 1.5, 1.5, 1.0, 0, 0, 0] },
                { p:'Internal · learning',    d:[0, 0, 0, 0, 0, 0, 0] },
              ].map((row) => {
                const total = row.d.reduce((a, b) => a + b, 0);
                return (
                  <tr key={row.p}>
                    <td><span className="table-cell-strong">{row.p}</span></td>
                    {row.d.map((h, i) => (
                      <td key={i} className="right" style={{
                        background: h === 0 ? 'var(--color-surface-alt)' : 'transparent',
                        color: h === 0 ? 'var(--color-text-subtle)' : 'var(--color-text)',
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {row.p === 'Mercury Core — UK' && i === 4 ? (
                          // Inline editor on Friday — the open cell
                          <span style={{display:'inline-flex', alignItems:'center', gap:4}}>
                            <input className="input input-sm mono" defaultValue="6.5"
                              style={{width:50, height:24, textAlign:'right', boxShadow:'0 0 0 2px var(--focus-ring-color)'}}/>
                            <span className="compact-sm muted">h</span>
                          </span>
                        ) : (h === 0 ? '–' : h.toFixed(1))}
                      </td>
                    ))}
                    <td className="right mono" style={{fontWeight:600}}>{total.toFixed(1)}h</td>
                    <td>{total === 0 ? <span className="muted compact-sm">—</span> : <StatusBadge tone="warning">Draft</StatusBadge>}</td>
                  </tr>
                );
              })}
              <tr style={{background:'var(--color-surface-alt)', fontWeight:600}}>
                <td>Daily total</td>
                {[8,8.5,8,7,6.5,0,0].map((h, i) => (
                  <td key={i} className="right mono">{h ? h.toFixed(1) : '–'}</td>
                ))}
                <td className="right mono">38.0h</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Inbox tab
// ─────────────────────────────────────────────────────────────────────────
function InboxTab() {
  return (
    <div className="page-body" style={{display:'flex', flexDirection:'column', gap:16}}>
      <div className="filter-bar">
        <div style={{position:'relative', width:260}}>
          <Icon name="search" style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-subtle)'}}/>
          <input className="input input-sm" placeholder="Search notifications…" style={{paddingLeft:30}}/>
        </div>
        <span className="chip chip-active">Unread · 4 <Icon name="x" size={10} className="remove"/></span>
        <span className="chip">Mentions</span>
        <span className="chip">Approvals</span>
        <span className="chip">System</span>
        <span style={{flex:1}}/>
        <button className="btn btn-secondary btn-sm"><Icon name="check"/> Mark all read</button>
      </div>

      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflow:'auto'}}>
          <table className="table table-compact">
            <thead>
              <tr>
                <th style={{width:32}}><input type="checkbox" className="checkbox"/></th>
                <th style={{width:24}}></th>
                <th>From</th>
                <th>Subject</th>
                <th>Received</th>
                <th style={{width:160}}></th>
              </tr>
            </thead>
            <tbody>
              {[
                { unread:true,  from:'Maya Kovács',  subj:'You\'ve been proposed for MCB-UK Senior FE',         when:'2h ago',  cta:'Confirm', tone:'warning' },
                { unread:true,  from:'HR',           subj:'Q2 self-assessment due Friday',                       when:'5h ago',  cta:'Open',     tone:'info' },
                { unread:true,  from:'System',       subj:'Timesheet for week 20 was approved',                  when:'1d ago',  cta:'View',     tone:'active' },
                { unread:true,  from:'Aaron Page',   subj:'Atlas ERP closeout — please sign off your tasks',     when:'2d ago',  cta:'Open',     tone:'info' },
                { unread:false, from:'Hannah Cole',  subj:'Your leave 24–28 Jun was approved',                   when:'Mon',     cta:'View',     tone:'active' },
                { unread:false, from:'Henrik Voss',  subj:'Mercury Core architecture review notes',              when:'Sun',     cta:'Read',     tone:'info' },
                { unread:false, from:'System',       subj:'Cost rate increased to $1,650/d effective 1 Jul',     when:'05 May',  cta:'Acknowledge', tone:'info' },
              ].map((n, i) => (
                <tr key={i} style={{background: n.unread ? 'color-mix(in oklab, var(--color-accent) 6%, var(--color-surface))' : 'transparent'}}>
                  <td><input type="checkbox" className="checkbox"/></td>
                  <td>{n.unread && <span style={{display:'inline-block', width:8, height:8, borderRadius:'50%', background:'var(--color-accent)'}}/>}</td>
                  <td><span className="body-sm" style={{fontWeight: n.unread ? 600 : 400}}>{n.from}</span></td>
                  <td><span className="body-sm" style={{fontWeight: n.unread ? 600 : 400}}>{n.subj}</span></td>
                  <td className="mono compact muted">{n.when}</td>
                  <td><button className={'btn ' + (n.unread ? 'btn-primary' : 'btn-ghost') + ' btn-sm'}>{n.cta}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Settings tab — Digest schedule + Quiet hours
// ─────────────────────────────────────────────────────────────────────────
function SettingsTab() {
  return (
    <div className="page-body" style={{display:'grid', gridTemplateColumns:'minmax(0, 720px) 1fr', gap:20, alignItems:'flex-start'}}>
      <div style={{display:'flex', flexDirection:'column', gap:20}}>
        <div className="card">
          <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:4}}>
            <h3>Identity</h3>
            <span className="compact muted">Read-only · sourced from M365. Contact HR to correct.</span>
          </div>
          <div className="card-body" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <div className="field"><label className="field-label">Display name</label><input className="input" defaultValue="Priya Natarajan" readOnly/></div>
            <div className="field"><label className="field-label">Email</label><input className="input" defaultValue="priya.natarajan@bankbigfoot.co.uk" readOnly/></div>
            <div className="field"><label className="field-label">Time zone</label><select className="select"><option>Europe/London (BST · UTC+1)</option></select></div>
            <div className="field"><label className="field-label">Locale</label><select className="select"><option>English (UK)</option></select></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:4}}>
            <h3>Digest schedule</h3>
            <span className="compact muted">When you receive non-urgent notifications by email.</span>
          </div>
          <div className="card-body" style={{display:'flex', flexDirection:'column', gap:10}}>
            {[
              { v:'immediate', l:'Immediate',           sub:'Every event sends an email as soon as it happens.' },
              { v:'daily',     l:'Daily · 9 AM',        sub:'A single morning digest, your local time.',                checked: true },
              { v:'weekly',    l:'Weekly · Mon 9 AM',   sub:'One quiet Monday-morning summary. Urgent items still come immediately.' },
            ].map((o) => (
              <label key={o.v} style={{display:'flex', alignItems:'flex-start', gap:10, padding:12, borderRadius:'var(--radius-card)', border:'1px solid ' + (o.checked ? 'var(--color-accent)' : 'var(--color-border)'), background: o.checked ? 'var(--color-accent-soft)' : 'var(--color-surface)'}}>
                <input type="radio" name="digest" className="radio" defaultChecked={o.checked} style={{marginTop:2}}/>
                <div>
                  <div className="body-sm" style={{fontWeight:500}}>{o.l}</div>
                  <div className="compact muted">{o.sub}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:4}}>
            <h3>Quiet hours</h3>
            <span className="compact muted">During this window we won't send notifications. Channel rules can override (locked on for email).</span>
          </div>
          <div className="card-body">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14}}>
              <div className="field">
                <label className="field-label">From</label>
                <input className="input mono" defaultValue="19:00"/>
              </div>
              <div className="field">
                <label className="field-label">To</label>
                <input className="input mono" defaultValue="08:00"/>
              </div>
            </div>
            <label style={{display:'flex', gap:10, alignItems:'center'}}>
              <input type="checkbox" className="checkbox" defaultChecked disabled/>
              <div>
                <div className="body-sm" style={{fontWeight:500}}>Apply to email only <span className="badge badge-outline">locked</span></div>
                <div className="compact muted">In-app and Teams notifications still appear in real time. This is a policy lock managed by your Bank Admin.</div>
              </div>
            </label>
          </div>
          <div className="card-footer">
            <span style={{marginRight:'auto'}} className="compact muted">All edits are audit-logged.</span>
            <button className="btn btn-ghost btn-md">Discard</button>
            <button className="btn btn-primary btn-md">Save changes</button>
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div style={{display:'flex', flexDirection:'column', gap:16, alignSelf:'stretch'}}>
        <div className="card">
          <div className="card-header"><h3>Sessions</h3></div>
          <div className="card-body" style={{padding:'10px 20px', display:'flex', flexDirection:'column', gap:10}}>
            {[
              { dev:'MacBook Pro · Chrome', when:'now', tone:'active' },
              { dev:'iPhone 16 · DeliverIT', when:'2h ago', tone:'info' },
              { dev:'Office desk · Edge',    when:'yesterday', tone:'pending' },
            ].map((s, i) => (
              <div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
                <span className={'tone-dot tone-'+s.tone}/>
                <span className="body-sm" style={{flex:1}}>{s.dev}</span>
                <span className="compact-sm muted">{s.when}</span>
              </div>
            ))}
            <button className="btn btn-tertiary btn-sm" style={{marginTop:6}}>Sign out other sessions</button>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>Privacy</h3></div>
          <div className="card-body" style={{padding:'10px 20px', display:'flex', flexDirection:'column', gap:8}}>
            <a href="#" className="body-sm">Download my data</a>
            <a href="#" className="body-sm">Audit log of my activity</a>
            <a href="#" className="body-sm" style={{color:'var(--color-status-danger)'}}>Request account closure</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Top-level Workspace component
// ─────────────────────────────────────────────────────────────────────────
function EmployeeWorkspace({ defaultTab = 'overview' }) {
  const [tab, setTab] = React.useState(defaultTab);
  return (
    <AppShell active="people" context="My Workspace">
      <WorkspaceChrome activeTab={tab} onTab={setTab}/>
      {tab === 'overview' && <OverviewTab/>}
      {tab === 'leave'    && <LeaveTab/>}
      {tab === 'projects' && <ProjectsTab/>}
      {tab === 'time'     && <TimeTab/>}
      {tab === 'inbox'    && <InboxTab/>}
      {tab === 'settings' && <SettingsTab/>}
    </AppShell>
  );
}

window.EmployeeWorkspace = EmployeeWorkspace;
window.WorkspaceOverviewTab = () => <EmployeeWorkspace defaultTab="overview"/>;
window.WorkspaceLeaveTab    = () => <EmployeeWorkspace defaultTab="leave"/>;
window.WorkspaceProjectsTab = () => <EmployeeWorkspace defaultTab="projects"/>;
window.WorkspaceTimeTab     = () => <EmployeeWorkspace defaultTab="time"/>;
window.WorkspaceInboxTab    = () => <EmployeeWorkspace defaultTab="inbox"/>;
window.WorkspaceSettingsTab = () => <EmployeeWorkspace defaultTab="settings"/>;
