// page-time-management.jsx — Manager-side surfaces: TimeManagement parent +
// Timesheet approval queue + Leave Decision Drawer + DS docs for Calendar / BalanceMeter.

// ── Leave Decision Drawer ─────────────────────────────────────────────────
function LeaveDecisionDrawer({ rejectMode = false }) {
  return (
    <div className="dc-artboard" style={{background:'var(--color-bg)', height:'100%', overflow:'auto', position:'relative'}}>
      {/* Faux list behind the drawer */}
      <div style={{padding:24, opacity:0.45}}>
        <div className="card">
          <div className="card-header"><h3>Pending leave requests · 5</h3></div>
          <div style={{padding:'8px 0'}}>
            {[
              { who:'Priya Natarajan', kind:'Annual', days:5, when:'24–28 Jun', sel:true },
              { who:'Diego Costa',     kind:'Annual', days:3, when:'10–12 Jul' },
              { who:'Aisha Okafor',    kind:'Sick',   days:2, when:'21–22 May' },
              { who:'Marco Bianchi',   kind:'Annual', days:7, when:'15–23 Aug' },
              { who:'Tomás Reyes',     kind:'Parental',days:14,when:'01–14 Sep' },
            ].map((r, i) => (
              <div key={i} style={{padding:'12px 20px', borderTop: i>0 ? '1px solid var(--color-border-subtle)' : 0, display:'flex', alignItems:'center', gap:12, background: r.sel ? 'var(--color-row-selected)' : 'transparent'}}>
                <Avatar name={r.who} size="sm"/>
                <span className="body-sm" style={{flex:1, fontWeight: r.sel ? 600 : 400}}>{r.who} · {r.kind} · <span className="mono">{r.days}d</span> · {r.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The drawer itself */}
      <div style={{
        position:'absolute', top:0, right:0, bottom:0,
        width:520, background:'var(--color-surface)',
        borderLeft:'1px solid var(--color-border)',
        boxShadow:'var(--shadow-modal)',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{padding:'14px 20px', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', gap:12}}>
          <Avatar name="Priya Natarajan" size="lg"/>
          <div style={{flex:1, minWidth:0}}>
            <div className="body-sm" style={{fontWeight:600}}>Priya Natarajan</div>
            <div className="compact muted">Annual leave · 24–28 Jun (5d)</div>
          </div>
          <StatusBadge tone="warning">Pending · 1d 4h</StatusBadge>
          <button className="icon-btn icon-btn-sm" aria-label="Close"><Icon name="x"/></button>
        </div>

        <div style={{padding:'14px 20px', flex:1, overflow:'auto', display:'flex', flexDirection:'column', gap:18}}>
          {/* Balance impact */}
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Balance impact</div>
            <window.BalanceMeter
              entitlement={25} used={7.5} pending={5} unit="d"
              size="sm" showLegend={true}/>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10}}>
              <div style={{padding:'10px 12px', background:'var(--color-surface-alt)', borderRadius:6}}>
                <div className="compact muted">Pre-approval</div>
                <div className="mono" style={{fontSize:16, fontWeight:600}}>14.5d remaining</div>
              </div>
              <div style={{padding:'10px 12px', background:'var(--color-accent-soft)', borderRadius:6}}>
                <div className="compact" style={{color:'var(--color-accent-text)'}}>Post-approval</div>
                <div className="mono" style={{fontSize:16, fontWeight:600, color:'var(--color-accent-text)'}}>9.5d remaining</div>
              </div>
            </div>
          </div>

          {/* Allocation in range */}
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Allocation in requested range</div>
            <div className="card" style={{boxShadow:'none', borderColor:'var(--color-border-subtle)'}}>
              <table className="table table-compact" style={{margin:0}}>
                <thead><tr><th>Project</th><th>Role</th><th className="right">Alloc</th></tr></thead>
                <tbody>
                  <tr>
                    <td className="table-cell-strong">Mercury Core Banking — UK</td>
                    <td>Senior FE</td>
                    <td className="right num">80%</td>
                  </tr>
                  <tr>
                    <td className="table-cell-strong">Design system regen</td>
                    <td>Contributor</td>
                    <td className="right num">20%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="banner banner-warning" style={{marginTop:10}}>
              <Icon name="alert" size={14} style={{color:'var(--color-status-warning)'}}/>
              <div>
                <div className="banner-title">Overlaps an active assignment</div>
                <div className="banner-body">MCB-UK runs the full week. PM Ethan Brooks will be auto-notified.</div>
              </div>
            </div>
          </div>

          {/* Team coverage */}
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Team coverage that week</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10}}>
              <div style={{padding:'10px 12px', background:'var(--color-surface-alt)', borderRadius:6}}>
                <div className="compact muted">On leave</div>
                <div className="mono" style={{fontSize:18, fontWeight:600}}>3</div>
              </div>
              <div style={{padding:'10px 12px', background:'var(--color-surface-alt)', borderRadius:6}}>
                <div className="compact muted">Remaining in pool</div>
                <div className="mono" style={{fontSize:18, fontWeight:600, color:'var(--color-status-active)'}}>12</div>
              </div>
              <div style={{padding:'10px 12px', background:'var(--color-surface-alt)', borderRadius:6}}>
                <div className="compact muted">Public holidays</div>
                <div className="mono" style={{fontSize:18, fontWeight:600}}>0</div>
              </div>
            </div>
          </div>

          {/* Reject reason field */}
          {rejectMode && (
            <div className="field">
              <label className="field-label">Rejection reason <span className="req">*</span></label>
              <textarea className="textarea" rows="3" placeholder="Explain to Priya why this can't be approved…" defaultValue="MCB-UK go-live week — please re-request after 5 Jul."/>
              <div className="field-hint">Visible to Priya. Will appear in her inbox.</div>
            </div>
          )}
        </div>

        {/* Sticky action footer — within 200px of the data above */}
        <div style={{padding:'12px 20px', borderTop:'1px solid var(--color-border)', display:'flex', gap:8, alignItems:'center', background:'var(--color-surface-alt)'}}>
          <span className="compact muted" style={{marginRight:'auto'}}>↑ ↓ navigate queue · A approve · R reject</span>
          {!rejectMode && <>
            <button className="btn btn-ghost btn-md">Snooze 24h</button>
            <button className="btn btn-danger btn-md">Reject…</button>
            <button className="btn btn-primary btn-md"><Icon name="check"/> Approve</button>
          </>}
          {rejectMode && <>
            <button className="btn btn-ghost btn-md">Cancel</button>
            <button className="btn btn-danger btn-md">Reject with reason</button>
          </>}
        </div>
      </div>
    </div>
  );
}

// ── TimeManagement parent surface ─────────────────────────────────────────
function TimeManagementPage({ activeTab = 'timesheets', drawer = null }) {
  return (
    <AppShell active="hr" context="Time Management">
      <PageHeader
        breadcrumb={['Operations', 'Time Management']}
        title="Time Management"
        badges={<>
          <StatusBadge tone="warning">7 awaiting you</StatusBadge>
          <span className="badge badge-outline">SLA · 24h</span>
        </>}
        subtitle={<>Approve timesheets and leave for your team. Items expire to SLA after 24h.</>}
        actions={<>
          <select className="select input-sm" style={{width:140}}><option>This week</option><option>Last 7d</option><option>This month</option></select>
          <button className="btn btn-ghost btn-md"><Icon name="filter"/> Filters</button>
          <button className="btn btn-secondary btn-md"><Icon name="history"/> Audit</button>
        </>}
        tabs={[
          { id:'timesheets', label:'Timesheets', count:4 },
          { id:'leave',      label:'Leave',      count:3 },
        ]}
        activeTab={activeTab}
      />
      {/* Combined KPI strip — each tile is a doorway */}
      <div style={{padding:'14px 24px'}}>
        <div className="kpi-strip" style={{gridTemplateColumns:'repeat(5, 1fr)'}}>
          <a className="kpi tone-warning" href="#" style={{textDecoration:'none', color:'inherit'}}>
            <span className="kpi-label">Pending timesheets</span>
            <span className="kpi-value">4</span>
            <span className="kpi-foot">2 over 24h</span>
          </a>
          <a className="kpi tone-info" href="#" style={{textDecoration:'none', color:'inherit'}}>
            <span className="kpi-label">Pending leave</span>
            <span className="kpi-value">3</span>
            <span className="kpi-foot">1 with conflict</span>
          </a>
          <a className="kpi tone-danger" href="#" style={{textDecoration:'none', color:'inherit'}}>
            <span className="kpi-label">SLA breach</span>
            <span className="kpi-value">2</span>
            <span className="kpi-foot">action this morning</span>
          </a>
          <a className="kpi" href="#" style={{textDecoration:'none', color:'inherit'}}>
            <span className="kpi-label">Hours awaiting</span>
            <span className="kpi-value mono">148.5<span className="unit">h</span></span>
            <span className="kpi-foot">across 4 timesheets</span>
          </a>
          <a className="kpi tone-active" href="#" style={{textDecoration:'none', color:'inherit'}}>
            <span className="kpi-label">On leave next 7d</span>
            <span className="kpi-value">3</span>
            <span className="kpi-foot">Priya, Marco, Tomás</span>
          </a>
        </div>
      </div>

      {/* Body */}
      {activeTab === 'timesheets' && (
        <div style={{padding:'0 24px 24px', display:'grid', gridTemplateColumns:'1fr', gap:16}}>
          <TimesheetQueueTable selected={drawer === 'timesheet'}/>
          {drawer === 'timesheet' && <TimesheetInspectorDrawer/>}
        </div>
      )}
      {activeTab === 'leave' && (
        <div style={{padding:'0 24px 24px'}}>
          <LeaveQueueTable selected={!!drawer}/>
        </div>
      )}
    </AppShell>
  );
}

function TimesheetQueueTable({ selected }) {
  return (
    <div className="card" style={{overflow:'hidden'}}>
      <div style={{overflow:'auto'}}>
        <table className="table table-compact">
          <thead><tr>
            <th style={{width:32}}><input type="checkbox" className="checkbox"/></th>
            <th>Person</th>
            <th>Week</th>
            <th className="right">Hours</th>
            <th>Anomalies</th>
            <th>Submitted</th>
            <th className="right">Age</th>
            <th>Status</th>
            <th style={{width:200}}>Actions</th>
          </tr></thead>
          <tbody>
            {[
              { who:'Priya Natarajan', wk:'Wk 21 · 18–24 May', hrs:31.5, anom:'1.5h short',         sub:'today 09:14',  age:2, age_tone:'normal', sel:true },
              { who:'Diego Costa',     wk:'Wk 21 · 18–24 May', hrs:40,   anom:'Overtime Sat 4h',     sub:'today 08:02',  age:3, age_tone:'normal' },
              { who:'Aisha Okafor',    wk:'Wk 20 · 11–17 May', hrs:37.5, anom:'',                    sub:'yesterday',    age:25,age_tone:'breach' },
              { who:'Tomás Reyes',     wk:'Wk 20 · 11–17 May', hrs:39.5, anom:'2h on Sun (unusual)', sub:'2d ago',       age:48,age_tone:'breach' },
            ].map((r, i) => (
              <tr key={i} style={{background: selected && r.sel ? 'var(--color-row-selected)' : 'transparent', borderLeft: selected && r.sel ? '3px solid var(--color-accent)' : '3px solid transparent'}}>
                <td><input type="checkbox" className="checkbox"/></td>
                <td><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Avatar name={r.who} size="sm"/>{r.who}</span></td>
                <td className="compact">{r.wk}</td>
                <td className="right mono">{r.hrs}h</td>
                <td>{r.anom
                  ? <span className="compact" style={{color:'var(--color-status-warning)'}}><Icon name="alert" size={11}/> {r.anom}</span>
                  : <span className="muted compact-sm">—</span>}</td>
                <td className="mono compact">{r.sub}</td>
                <td className="right">
                  <span className="mono tnum" style={{color: r.age_tone === 'breach' ? 'var(--color-status-danger)' : 'var(--color-text)', fontWeight: r.age_tone === 'breach' ? 600 : 400}}>{r.age}h</span>
                </td>
                <td>{r.age_tone === 'breach'
                  ? <StatusBadge tone="critical">SLA breach</StatusBadge>
                  : <StatusBadge tone="warning">Pending</StatusBadge>}</td>
                <td>
                  <div style={{display:'flex', gap:6}}>
                    <button className="btn btn-ghost btn-sm">Nudge</button>
                    <button className="btn btn-secondary btn-sm">Reject</button>
                    <button className="btn btn-primary btn-sm"><Icon name="check"/> Approve</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimesheetInspectorDrawer() {
  return (
    <div className="card section-card-emphasized">
      <div style={{padding:'14px 20px', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', gap:12}}>
        <Avatar name="Priya Natarajan" size="lg"/>
        <div style={{flex:1}}>
          <div className="body-sm" style={{fontWeight:600}}>Priya Natarajan · Wk 21 · 18–24 May</div>
          <div className="compact muted">Submitted 2h ago · 31.5h / 37.5h expected · −1.5h short</div>
        </div>
        <StatusBadge tone="warning">1 anomaly</StatusBadge>
      </div>
      <div style={{padding:'14px 20px', display:'grid', gridTemplateColumns:'1fr 220px', gap:20}}>
        <div>
          {/* Mini timeline */}
          <div className="label-eyebrow" style={{marginBottom:6}}>Hours by project · this week</div>
          <window.Timeline
            segments={[
              { id:1, startDate:new Date(2026,4,18), endDate:new Date(2026,4,23), status:'assigned', allocationPercent:80, label:'MCB · 80%' },
              { id:2, startDate:new Date(2026,4,18), endDate:new Date(2026,4,23), status:'assigned', allocationPercent:20, label:'DS · 20%' },
            ]}
            size="sm" today={today}
            rangeStart={new Date(2026,4,18)} rangeEnd={new Date(2026,4,24)}
            showMonthGrid={false}/>

          <div style={{marginTop:14}}>
            <div className="label-eyebrow" style={{marginBottom:6}}>Anomalies</div>
            <div className="banner banner-warning">
              <Icon name="alert" size={14} style={{color:'var(--color-status-warning)'}}/>
              <div>
                <div className="banner-title">1.5h short of expected</div>
                <div className="banner-body">31.5h / 37.5h. Friday cell still in draft (6.5h captured, not yet logged on MCB).</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <button className="btn btn-primary btn-md"><Icon name="check"/> Approve</button>
          <button className="btn btn-danger btn-md">Reject…</button>
          <button className="btn btn-ghost btn-md">Request revision</button>
          <button className="btn btn-tertiary btn-md">Nudge</button>
          <div className="compact muted" style={{marginTop:8}}>On approve, next pending opens automatically.</div>
        </div>
      </div>
    </div>
  );
}

function LeaveQueueTable({ selected }) {
  return (
    <div className="card" style={{overflow:'hidden'}}>
      <div style={{overflow:'auto'}}>
        <table className="table table-compact">
          <thead><tr>
            <th style={{width:32}}><input type="checkbox" className="checkbox"/></th>
            <th>Person</th>
            <th>Type</th>
            <th>Dates</th>
            <th className="right">Days</th>
            <th>Conflict</th>
            <th>Submitted</th>
            <th>Status</th>
            <th style={{width:200}}>Actions</th>
          </tr></thead>
          <tbody>
            {[
              { who:'Priya Natarajan', kind:'Annual', when:'24–28 Jun', days:5, conf:true, sub:'today',     sel:true },
              { who:'Diego Costa',     kind:'Annual', when:'10–12 Jul', days:3, conf:false, sub:'today' },
              { who:'Marco Bianchi',   kind:'Annual', when:'15–23 Aug', days:7, conf:false, sub:'yesterday' },
            ].map((r, i) => (
              <tr key={i} style={{background: selected && r.sel ? 'var(--color-row-selected)' : 'transparent', borderLeft: selected && r.sel ? '3px solid var(--color-accent)' : '3px solid transparent'}}>
                <td><input type="checkbox" className="checkbox"/></td>
                <td><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Avatar name={r.who} size="sm"/>{r.who}</span></td>
                <td>{r.kind}</td>
                <td className="mono compact">{r.when}</td>
                <td className="right mono">{r.days}d</td>
                <td>{r.conf
                  ? <StatusBadge tone="warning">MCB-UK 80%</StatusBadge>
                  : <StatusBadge tone="active">Clean</StatusBadge>}</td>
                <td className="mono compact">{r.sub}</td>
                <td><StatusBadge tone="warning">Pending</StatusBadge></td>
                <td>
                  <div style={{display:'flex', gap:6}}>
                    <button className="btn btn-secondary btn-sm">Reject</button>
                    <button className="btn btn-primary btn-sm"><Icon name="check"/> Approve</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DS docs pages ─────────────────────────────────────────────────────────
function CalendarDS() {
  const [picked, setPicked] = React.useState(new Date(2026, 4, 23));
  const events = [
    { date: new Date(2026,4,4),  kind:'holiday', label:'Early May BH' },
    { date: new Date(2026,4,25), kind:'holiday', label:'Spring BH' },
    { date: new Date(2026,4,15), kind:'approved' },
    { date: new Date(2026,4,16), kind:'approved' },
    { date: new Date(2026,4,17), kind:'approved' },
    { date: new Date(2026,4,28), kind:'pending' },
    { date: new Date(2026,4,29), kind:'pending' },
  ];
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20, maxWidth:680}}>
        <div className="label-eyebrow">DeliverIT · DS primitive</div>
        <h1 className="h1" style={{marginTop:6, marginBottom:6}}>&lt;Calendar/&gt;</h1>
        <p className="body muted">Date picker + range selector + month/year overview. Used inline (workspace leave tab year-grid) or inside a popover (DateRangePicker).</p>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><h3>Single-month picker · md</h3></div>
        <div className="card-body" style={{display:'flex', gap:32, alignItems:'flex-start'}}>
          <window.Calendar value={picked} onChange={setPicked} today={today} events={events}/>
          <div>
            <div className="label-eyebrow" style={{marginBottom:8}}>State</div>
            <dl className="dl" style={{minWidth:200}}>
              <dt>Picked</dt>     <dd className="mono">{picked.toLocaleDateString()}</dd>
              <dt>Today</dt>      <dd className="mono">{today.toLocaleDateString()}</dd>
              <dt>Events</dt>     <dd className="mono">{events.length}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><h3>Sizes · xs / sm / md</h3></div>
        <div className="card-body" style={{display:'flex', gap:32, alignItems:'flex-start', flexWrap:'wrap'}}>
          <window.Calendar size="xs" value={picked} onChange={setPicked} today={today} events={events}/>
          <window.Calendar size="sm" value={picked} onChange={setPicked} today={today} events={events}/>
          <window.Calendar size="md" value={picked} onChange={setPicked} today={today} events={events}/>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Year mode · holidays + approved + pending</h3></div>
        <div className="card-body">
          <window.Calendar mode="year" month={new Date(2026,0,1)} events={events} today={today}/>
        </div>
      </div>
    </div>
  );
}

function BalanceMeterDS() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20, maxWidth:680}}>
        <div className="label-eyebrow">DeliverIT · DS primitive</div>
        <h1 className="h1" style={{marginTop:6, marginBottom:6}}>&lt;BalanceMeter/&gt;</h1>
        <p className="body muted">Used + pending + remaining of a budget. Reuses status tokens; no new color tokens.</p>
      </div>

      {/* Sizes side-by-side */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><h3>Sizes</h3><span className="compact muted">md / sm / xs — same data, different density</span></div>
        <div className="card-body" style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24}}>
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>md (default)</div>
            <window.BalanceMeter entitlement={25} used={7.5} pending={5} unit="d"/>
          </div>
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>sm</div>
            <window.BalanceMeter entitlement={25} used={7.5} pending={5} unit="d" size="sm"/>
          </div>
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>xs · legend off</div>
            <window.BalanceMeter entitlement={25} used={7.5} pending={5} unit="d" size="xs" showLegend={false}/>
          </div>
        </div>
      </div>

      {/* Overdrawn + breakdown side-by-side */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
        <div className="card">
          <div className="card-header"><h3>Overdrawn state</h3></div>
          <div className="card-body">
            <window.BalanceMeter entitlement={25} used={22} pending={8} unit="d"/>
            <div className="compact muted" style={{marginTop:10}}>
              Used + pending exceeds entitlement. The danger-hatched extension beyond the 100% line is the overbooking signal.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Per-type breakdown</h3></div>
          <div className="card-body">
            <window.BalanceMeter
              entitlement={25} used={7.5} pending={5} accrual={3.5} unit="d"
              breakdown={[
                { label:'Annual leave',  used:7.5, entitlement:25 },
                { label:'TOIL / lieu',   used:0,   entitlement:3.5, color:'var(--color-status-info)' },
                { label:'Sick',          used:2,   entitlement:10,  color:'var(--color-text-muted)' },
                { label:'Parental',      used:0,   entitlement:0,   color:'var(--color-status-active)' },
              ]}/>
          </div>
        </div>
      </div>
    </div>
  );
}

window.TimeManagementPage = TimeManagementPage;
window.TimeManagementLeaveTab = () => <TimeManagementPage activeTab="leave"/>;
window.TimeManagementWithDrawer = () => <TimeManagementPage activeTab="timesheets" drawer="timesheet"/>;
window.LeaveDecisionDrawer = LeaveDecisionDrawer;
window.LeaveDecisionDrawerReject = () => <LeaveDecisionDrawer rejectMode={true}/>;
window.CalendarDS = CalendarDS;
window.BalanceMeterDS = BalanceMeterDS;
