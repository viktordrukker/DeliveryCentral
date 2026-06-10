// page-staffing-desk.jsx — Staffing Desk + Distribution Studio + Find candidates + tab CRUD + states
// The killer feature surface — where staffing decisions get made.

// ── Shared chrome: title bar + tab strip + JQL bar + view switcher ─────────
function StaffingDeskChrome({ view, dirty }) {
  const tabs = [
    { id:'mine',     label:'My open positions', scope:'private', count:6,  active: view !== 'planner' },
    { id:'sla',      label:'SLA breach watch',  scope:'public',  count:3 },
    { id:'cobol',    label:'COBOL pipeline',    scope:'private', count:8 },
    { id:'mcb-q3',   label:'MCB Q3 backlog',    scope:'public',  count:12 },
    { id:'capex',    label:'Capex-only roles',  scope:'public',  count:5 },
    { id:'plan',     label:'Distribution Studio', scope:'private', isPlanner:true, active: view === 'planner' },
  ];
  return (
    <>
      <PageHeader
        breadcrumb={['Workforce','Staffing Desk']}
        title="Staffing Desk"
        badges={<>
          <span className="badge badge-outline">18 open</span>
          <span className="badge badge-outline">12 bench</span>
          {dirty && <span className="scenario-dirty">7 unsaved moves</span>}
        </>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="download"/> Export</button>
          <button className="btn btn-secondary btn-md"><Icon name="copy"/> Save tab</button>
          <button className="btn btn-primary btn-md"><Icon name="plus"/> New position</button>
        </>}
      />
      {/* Tab strip */}
      <div className="tab-strip">
        {tabs.map((t) => (
          <div key={t.id} className={'ts-tab' + (t.active ? ' active' : '')}>
            {t.isPlanner && <Icon name="gantt" size={14} style={{color: t.active ? 'var(--color-accent)' : 'var(--color-text-muted)'}}/>}
            <span>{t.label}</span>
            <span className={'ts-scope ' + (t.scope === 'public' ? 'public' : '')}>{t.scope === 'public' ? 'Public' : 'Mine'}</span>
            {t.count != null && <span className="compact-sm muted tnum">{t.count}</span>}
            <span className="ts-gear"><Icon name="settings" size={12}/></span>
          </div>
        ))}
        <button className="icon-btn icon-btn-sm ts-add" aria-label="New tab"><Icon name="plus" size={14}/></button>
      </div>
    </>
  );
}

function JqlBar({ value, error, suggest }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 16px', position:'relative'}}>
      <div className={'jql-bar' + (error ? ' error' : '')}>
        <span className="jql-prefix">JQL</span>
        <span style={{flex:1, display:'flex', alignItems:'center', whiteSpace:'nowrap', overflow:'hidden'}}>
          {value}
        </span>
        <span className="jql-status">
          {error
            ? <><Icon name="alert" size={12} style={{color:'var(--color-status-danger)'}}/> <span style={{color:'var(--color-status-danger)'}}>Syntax error · col {error.col}</span></>
            : <><span style={{color:'var(--color-status-active)'}}>✓ 247 matches</span><span>·</span><span className="kbd">⌘</span><span className="kbd">⏎</span></>}
        </span>
        {suggest && (
          <div className="jql-suggest" style={{left:suggest.x}}>
            <div className="head">Field · <span style={{textTransform:'none'}}>after <span className="mono">{suggest.context}</span></span></div>
            {suggest.items.map((s, i) => (
              <div key={s.token} className={'row' + (i === 0 ? ' active' : '')}>
                <span className="mono">{s.token}</span>
                <span className="desc">{s.desc}</span>
                {i === 0 && <span className="kbd">↵</span>}
              </div>
            ))}
          </div>
        )}
        {error && error.msg && (
          <div className="jql-error-msg" style={{left: error.x}}>
            <span style={{position:'absolute', top:-4, left:14, width:8, height:8, background:'var(--color-status-danger)', transform:'rotate(45deg)'}}/>
            {error.msg}
          </div>
        )}
      </div>
      <div style={{display:'inline-flex', border:'1px solid var(--color-border-strong)', borderRadius:'var(--radius-control)', overflow:'hidden'}}>
        <button className="btn btn-tertiary btn-sm" style={{borderRadius:0, borderRight:'1px solid var(--color-border)'}}><Icon name="docs"/> Board</button>
        <button className="btn btn-ghost btn-sm" style={{borderRadius:0, borderRight:'1px solid var(--color-border)'}}><Icon name="gantt"/> Planner</button>
        <button className="btn btn-ghost btn-sm" style={{borderRadius:0}}><Icon name="bench"/> Bench</button>
      </div>
    </div>
  );
}

// 12-month horizon for the inline row timeline (Feb 2026 → Jan 2027)
const TL_MONTHS = ['Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan'];
const TL_TODAY_PCT = (3.6 / 12) * 100; // late May 2026

// Compute monthly sum allocation across all bars (0..12 months).
// Returns 12 numbers (one per month) summing alloc for any bar overlapping that month.
const computeMonthlyHeat = (bars) => {
  const months = new Array(12).fill(0);
  bars.forEach((b) => {
    if (!b.alloc) return;
    const s = Math.max(0, Math.floor(b.start));
    const e = Math.min(12, Math.ceil(b.end));
    for (let m = s; m < e; m++) months[m] += b.alloc;
  });
  return months;
};
const heatClass = (pct) =>
  pct === 0    ? 'h0'   :
  pct < 50     ? 'h50'  :
  pct < 80     ? 'h80'  :
  pct <= 100   ? 'h100' :
  pct <= 120   ? 'h120' :
  pct < 150    ? 'h150' : 'h200';

// Convert fractional-month bars to {startDate, endDate} relative to a base.
// Used to feed legacy demo bars (start: 0..12) into the date-axis Timeline.
const RANGE_START = new Date(2026, 1, 1);  // 1 Feb 2026 — anchor for demos
const RANGE_END   = new Date(2027, 1, 1);  // 1 Feb 2027
const TODAY_DATE  = new Date(2026, 4, 23); // 23 May 2026 — matches NOW marker
const monthOffsetToDate = (m) => new Date(RANGE_START.getFullYear(), RANGE_START.getMonth() + Math.floor(m), 1 + Math.round((m - Math.floor(m)) * 28));
const barsToSegments = (bars) => bars.map((b, i) => ({
  id: b.id ?? 'b' + i,
  startDate: monthOffsetToDate(b.start),
  endDate:   monthOffsetToDate(b.end),
  status: b.status,
  allocationPercent: b.alloc ?? 100,
  label: b.label,
}));

// RowTimeline — thin wrapper around <Timeline/>. Used by the Staffing Desk.
function RowTimeline({ bars }) {
  return (
    <window.Timeline
      segments={barsToSegments(bars)}
      variant="stacked"
      size="sm"
      rangeStart={RANGE_START}
      rangeEnd={RANGE_END}
      today={TODAY_DATE}
      showOverallocationBands={true}
    />
  );
}

// Each row = a person (or open position) with their assignments overlaid as a timeline.
const DESK_ROWS = [
  { name:'Amir Fischer',   role:'Staff Engineer · G7',       project:'Cascade API Migration', alloc:100, start:'1 May 2026', end:'1 Jun 2026', status:'assigned', dept:'Frontend D…', mgr:'Jamal Khan',     pool:'Frontend Pool', email:'amir.fischer.48',  emp:'ACTIVE', code:'ASG-0094',
    bars:[
      { start: 0, end: 2, status: 'assigned', alloc: 100, label: 'Cascade · 100%' },
      { start: 3, end: 7, status: 'booked', alloc: 80, label: 'Project Atlas' },
      { start: 7, end: 12, status: 'open', alloc: 80, label: 'Open' },
    ]},
  { name:'Amir Ellis',     role:'Software Engineer · G8',    project:'Delta Data Platform',  alloc:100, start:'1 May 2026', end:'1 Jun 2026', status:'assigned', dept:'DevOps & P…', mgr:'Olivia Sinclair', pool:'DevOps Pool',  email:'amir.ellis.2u',     emp:'ACTIVE', code:'ASG-0096',
    bars:[
      { start: 0.5, end: 3.5, status: 'assigned', alloc: 100, label: 'Delta · 100%' },
      { start: 4, end: 9, status: 'assigned', alloc: 80, label: 'Delta phase 2' },
      { start: 9, end: 12, status: 'proposed', alloc: 60, label: 'Echo' },
    ]},
  { name:'Daria Ellis',    role:'Engineer · G8',             project:'Jade Partner Portal',  alloc:80,  start:'22 Apr 2026', end:'open',       status:'assigned', dept:'Mobile & Q…', mgr:'Olivia Sinclair', pool:'Mobile & Q…',  email:'daria.ellis.32',   emp:'ACTIVE', code:'ASG-0099',
    bars:[
      { start: 1, end: 6, status: 'assigned', alloc: 80, label: 'Jade · 80%' },
      { start: 3, end: 8, status: 'assigned', alloc: 60, label: 'Echo · 60%' },
      { start: 7, end: 9, status: 'hold', alloc: 0, label: 'Hold' },
      { start: 9, end: 12, status: 'assigned', alloc: 80, label: 'Jade · 80%' },
      { start: 9, end: 12, status: 'proposed', alloc: 60, label: 'Echo · 60%' },
    ]},
  { name:'Cara Ellis',     role:'Lead Engineer · G8',        project:'Jade Partner Portal',  alloc:100, start:'17 Apr 2026', end:'open',       status:'proposed', dept:'Backend De…', mgr:'Mei Lin',         pool:'Backend Pool',  email:'cara.ellis.30',    emp:'ACTIVE', code:'ASG-0097',
    bars:[
      { start: 0, end: 1.5, status: 'released', alloc: 0, label: '' },
      { start: 2, end: 5, status: 'proposed', alloc: 100, label: 'Lead · 100%' },
      { start: 5, end: 11, status: 'booked', alloc: 80, label: 'Booked · phase 2' },
    ]},
  { name:'Felix Ellis',    role:'Lead Engineer · G8',        project:'Jade Partner Portal',  alloc:100, start:'13 Apr 2026', end:'open',       status:'assigned', dept:'Frontend D…', mgr:'Mei Lin',         pool:'Frontend Pool', email:'felix.ellis.38',    emp:'ACTIVE', code:'ASG-0105',
    bars:[
      { start: 0, end: 8, status: 'assigned', alloc: 100, label: 'Jade · 100%' },
      { start: 5, end: 10, status: 'proposed', alloc: 50, label: 'Echo · 50%' },
      { start: 7, end: 12, status: 'booked', alloc: 50, label: 'Helix · 50%' },
      { start: 8.5, end: 12, status: 'open', alloc: 80, label: 'Open' },
    ]},
  { name:'Eli Ellis',      role:'QA Engineer · G8',          project:'Jade Partner Portal',  alloc:50,  start:'14 Apr 2026', end:'open',       status:'assigned', dept:'Frontend D…', mgr:'Mei Lin',         pool:'Frontend Pool', email:'eli.ellis.34',      emp:'ACTIVE', code:'ASG-0101',
    bars:[
      { start: 1, end: 4, status: 'assigned', alloc: 50, label: 'Jade QA · 50%' },
      { start: 4, end: 6, status: 'onboarding', alloc: 50, label: 'Onboard' },
      { start: 6, end: 11, status: 'assigned', alloc: 50, label: 'Jade QA · 50%' },
    ]},
  { name:'Elena Ellis',    role:'DevOps Engineer · G8',      project:'Jade Partner Portal',  alloc:40,  start:'8 Apr 2026',  end:'open',       status:'assigned', dept:'Mobile & Q…', mgr:'Raj Patel',       pool:'Mobile & Q…',  email:'elena.ellis.35',    emp:'ACTIVE', code:'ASG-0102',
    bars:[
      { start: 0.5, end: 6, status: 'assigned', alloc: 40, label: 'Jade · 40%' },
      { start: 6, end: 10, status: 'assigned', alloc: 80, label: 'Jade phase 2' },
    ]},
  { name:'Fatima Ellis',   role:'UX Designer · G8',          project:'Jade Partner Portal',  alloc:100, start:'9 Apr 2026',  end:'open',       status:'assigned', dept:'Backend De…', mgr:'Jamal Khan',      pool:'Backend Pool',  email:'fatima.ellis.37',   emp:'ACTIVE', code:'ASG-0104',
    bars:[
      { start: 0, end: 5, status: 'assigned', alloc: 100, label: 'Jade UX · 100%' },
      { start: 5, end: 9, status: 'released', alloc: 0, label: '' },
      { start: 9, end: 12, status: 'proposed', alloc: 60, label: 'Echo UX' },
    ]},
  { name:'Soren Davis',    role:'QA Engineer · G8',          project:'Gamma AI Copilot',     alloc:50,  start:'30 Mar 2026', end:'open',       status:'assigned', dept:'Frontend D…', mgr:'Raj Patel',       pool:'Frontend Pool', email:'soren.davis.21',    emp:'ACTIVE', code:'ASG-0067',
    bars:[
      { start: 0, end: 3, status: 'assigned', alloc: 50, label: 'Gamma · 50%' },
      { start: 3, end: 5, status: 'hold', alloc: 0, label: 'Hold' },
      { start: 5, end: 11, status: 'assigned', alloc: 50, label: 'Gamma · 50%' },
    ]},
  { name:'OPEN · L4 BE',   role:'Backend Engineer · L4',     project:'Mercury Core · UK',     alloc:100, start:'8 Jul 2026',  end:'open',       status:'open',     dept:'Backend',     mgr:'\u2014',            pool:'Backend Pool',  email:'\u2014',            emp:'\u2014',     code:'POS-0148',
    bars:[
      { start: 5, end: 11, status: 'open', alloc: 100, label: 'OPEN · 100%' },
    ], isOpen:true },
];

function StaffingDeskBoard() {
  return (
    <AppShell active="bench" context="Staffing Desk">
      <StaffingDeskChrome view="board" dirty={false}/>
      <JqlBar
        value={
          <>
            <span className="jql-token">status</span>
            <span className="jql-op">=</span>
            <span className="jql-val">"OPEN"</span>
            <span className="jql-op">&nbsp;AND&nbsp;</span>
            <span className="jql-token">project.code</span>
            <span className="jql-op">in (</span>
            <span className="jql-val">"MCB-UK"</span>
            <span className="jql-op">,&nbsp;</span>
            <span className="jql-val">"ATL"</span>
            <span className="jql-op">)&nbsp;AND&nbsp;</span>
            <span className="jql-token">sla.daysOpen</span>
            <span className="jql-op">&gt;</span>
            <span className="jql-val">7</span>
          </>
        }
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:14}}>
        {/* KPI strip — matches the live Workload Tracking layout */}
        <div className="kpi-strip" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
          <div className="kpi tone-active">
            <span className="kpi-label">Supply</span>
            <span className="kpi-value">203</span>
            <span className="kpi-foot">167 available</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Available FTE</span>
            <span className="kpi-value">167</span>
            <span className="kpi-foot">133 on bench</span>
          </div>
          <div className="kpi tone-info">
            <span className="kpi-label">Open Demand</span>
            <span className="kpi-value">0<span className="unit"> HC</span></span>
            <span className="kpi-foot">0 requests</span>
          </div>
          <div className="kpi tone-warning">
            <span className="kpi-label">Staffing Gap</span>
            <span className="kpi-value">−167</span>
            <span className="kpi-foot">surplus</span>
          </div>
          <div className="kpi tone-active">
            <span className="kpi-label">Fill Rate</span>
            <span className="kpi-value">100<span className="unit">%</span></span>
            <span className="kpi-foot">avg 0d to fill</span>
          </div>
          <div className="kpi tone-danger">
            <span className="kpi-label">Overallocated</span>
            <span className="kpi-value">16</span>
            <span className="kpi-foot">people &gt; 100%</span>
          </div>
        </div>

        {/* Supply / Demand sub-toggle + bulk bar */}
        <div style={{display:'flex', alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <div style={{display:'inline-flex', border:'1px solid var(--color-border-strong)', borderRadius:'var(--radius-pill)', overflow:'hidden', height:30}}>
            <button className="btn btn-primary btn-sm" style={{borderRadius:0, height:30}}>Supply <span className="tnum" style={{opacity:0.85, marginLeft:4}}>47</span></button>
            <button className="btn btn-ghost btn-sm" style={{borderRadius:0, height:30}}>Demand <span className="tnum" style={{opacity:0.6, marginLeft:4}}>2</span></button>
          </div>
          <span className="compact muted">10 rows · sorted by start date</span>
          <span style={{flex:1}}/>
          <button className="btn btn-tertiary btn-sm"><Icon name="search"/> Saved filters · 4</button>
          <button className="btn btn-tertiary btn-sm"><Icon name="settings"/> Columns</button>
          <button className="btn btn-secondary btn-sm"><Icon name="download"/> Export XLSX</button>
        </div>

        {/* The killer table — Person + inline Timeline + dense columns */}
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflow:'auto'}}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{width:32}}><input type="checkbox" className="checkbox"/></th>
                  <th>Person</th>
                  <th style={{minWidth:260, width:280}}>Timeline · 12mo</th>
                  <th className="right" style={{width:120}}>Σ util (now)</th>
                  <th>Project</th>
                  <th>Role</th>
                  <th className="right">%</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th>Manager</th>
                  <th>Pool</th>
                  <th>Code</th>
                  <th style={{width:40}}></th>
                </tr>
                {/* Filter row */}
                <tr style={{background:'var(--color-surface)'}}>
                  <th></th>
                  <th><input className="input input-sm" placeholder="Person…" style={{height:24, fontSize:11}}/></th>
                  <th></th>
                  <th><select className="select input-sm" style={{height:24, fontSize:11}}><option>Any util</option><option>&gt;100%</option><option>&lt;50%</option></select></th>
                  <th><input className="input input-sm" placeholder="All" style={{height:24, fontSize:11}}/></th>
                  <th><input className="input input-sm" placeholder="All" style={{height:24, fontSize:11}}/></th>
                  <th><input className="input input-sm" placeholder="80" style={{height:24, fontSize:11, width:46}}/></th>
                  <th><input className="input input-sm mono" placeholder="dd.mm.yy" style={{height:24, fontSize:10}}/></th>
                  <th><input className="input input-sm mono" placeholder="dd.mm.yy" style={{height:24, fontSize:10}}/></th>
                  <th><select className="select input-sm" style={{height:24, fontSize:11}}><option>All</option></select></th>
                  <th><input className="input input-sm" placeholder="Gra" style={{height:24, fontSize:11, width:42}}/></th>
                  <th><select className="select input-sm" style={{height:24, fontSize:11}}><option>All</option></select></th>
                  <th><select className="select input-sm" style={{height:24, fontSize:11}}><option>All</option></select></th>
                  <th><input className="input input-sm" placeholder="Code…" style={{height:24, fontSize:11}}/></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {DESK_ROWS.map((r, i) => (
                  <tr key={i}>
                    <td><input type="checkbox" className="checkbox"/></td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        {!r.isOpen && <Avatar name={r.name} size="sm"/>}
                        {r.isOpen && <span style={{width:22, height:22, borderRadius:'50%', background:'var(--color-status-warning-bg)', color:'var(--color-status-warning)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}><Icon name="position" size={11}/></span>}
                        <a href="#" style={{color:'var(--color-accent-text)', fontWeight:500, textDecoration:'none'}}>{r.name}</a>
                      </div>
                    </td>
                    <td><RowTimeline bars={r.bars}/></td>
                    {(() => {
                      const todayM = TL_TODAY_PCT/100*12;
                      const sum = r.bars.reduce((a, b) => (b.start <= todayM && b.end > todayM ? a + (b.alloc || 0) : a), 0);
                      const over = sum > 100;
                      const danger = sum > 120;
                      const critical = sum > 150;
                      const fillCls = critical ? 'critical' : danger ? 'danger' : over ? 'over' : '';
                      const idle = sum < 50 && !r.isOpen;
                      const tone = critical ? 'var(--timeline-heat-200)' : danger ? 'var(--color-status-danger)' : over ? 'var(--color-status-warning)' : idle ? 'var(--color-status-info)' : 'var(--color-text)';
                      return (
                        <td className="right">
                          <div className="util-cell" style={{justifyContent:'flex-end'}}>
                            <span className="util-bar over-track" title={`Current Σ ${sum}%`}>
                              <i className={fillCls} style={{width: Math.min(sum, 150) / 150 * 100 + '%'}}/>
                              <span className="mark100"/>
                            </span>
                            <span style={{minWidth:34, color: tone, fontWeight: over || idle ? 600 : 400}}>{sum}%</span>
                          </div>
                          {over && <div className="compact-sm tnum" style={{color:'var(--color-status-danger)', marginTop:2}}>+{sum-100}% over</div>}
                          {idle && <div className="compact-sm" style={{color:'var(--color-status-info)', marginTop:2}}>idle</div>}
                        </td>
                      );
                    })()}
                    <td>
                      <span className="body-sm" style={{display:'block', maxWidth:140, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.project}</span>
                    </td>
                    <td>
                      <span className="body-sm" style={{display:'block', maxWidth:130, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{r.role}</span>
                    </td>
                    <td className="right num">{r.alloc}…</td>
                    <td className="mono compact">{r.start}</td>
                    <td className="mono compact">{r.end}</td>
                    <td>
                      {r.status === 'assigned' && <StatusBadge tone="active">Assigne…</StatusBadge>}
                      {r.status === 'proposed' && <StatusBadge tone="info">Propose…</StatusBadge>}
                      {r.status === 'open'     && <StatusBadge tone="warning">Open</StatusBadge>}
                    </td>
                    <td className="compact">{r.role.split('·')[1]?.trim() || '—'}</td>
                    <td className="compact"><span style={{maxWidth:90, display:'inline-block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', verticalAlign:'middle'}}>{r.mgr}</span></td>
                    <td className="compact"><span style={{maxWidth:100, display:'inline-block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', verticalAlign:'middle'}}>{r.pool}</span></td>
                    <td className="mono compact-sm">{r.code}</td>
                    <td><button className="icon-btn icon-btn-sm" aria-label="Open"><Icon name="chevron-right"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderTop:'1px solid var(--color-border)'}}>
            <span className="compact muted">10 of 47 · NOW marker = Tue 26 May · ↑↓ navigate · ↵ open · ⌘K command</span>
            <div className="pagination">
              <button className="pag-btn" disabled><Icon name="chevron-left" size={12}/></button>
              <button className="pag-btn active">1</button>
              <button className="pag-btn">2</button>
              <button className="pag-btn">3</button>
              <span className="pag-btn" style={{cursor:'default'}}>…</span>
              <button className="pag-btn">5</button>
              <button className="pag-btn"><Icon name="chevron-right" size={12}/></button>
            </div>
          </div>
        </div>

        {/* Lifecycle legend — readable but unobtrusive */}
        <div style={{display:'flex', alignItems:'center', gap:18, padding:'4px 4px', flexWrap:'wrap', color:'var(--color-text-muted)', fontSize:'var(--font-size-compact)'}}>
          <span className="label-eyebrow">Timeline legend</span>
          {[
            { cls:'tl-open',       label:'Open' },
            { cls:'tl-proposed',   label:'Proposed' },
            { cls:'tl-booked',     label:'Booked' },
            { cls:'tl-onboarding', label:'Onboarding' },
            { cls:'tl-assigned',   label:'Assigned' },
            { cls:'tl-hold',       label:'On hold' },
            { cls:'tl-released',   label:'Released' },
          ].map((l) => (
            <span key={l.label} style={{display:'inline-flex', alignItems:'center', gap:6}}>
              <span className={'row-tl-bar '+l.cls} style={{position:'static', width:24, height:12, padding:0, justifyContent:'center'}}/>
              <span>{l.label}</span>
            </span>
          ))}
          <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <span style={{width:2, height:14, background:'var(--timeline-today)'}}/>
            <span>Today</span>
          </span>
        </div>
      </div>
    </AppShell>
  );
}

// ── Distribution Studio (Planner view) ───────────────────────────────────
const WEEKS = ['W22','W23','W24','W25','W26','W27','W28','W29','W30','W31','W32','W33'];
const TODAY_COL = 1; // current week

function PlannerRuler() {
  return (
    <div className="pl-ruler" style={{gridTemplateColumns:`repeat(${WEEKS.length}, 1fr)`}}>
      {WEEKS.map((w, i) => (
        <div key={w} className={'pl-ruler-cell' + (i === TODAY_COL ? ' today' : '')}>
          <div>JUN</div>
          <div className="week">{w}</div>
        </div>
      ))}
    </div>
  );
}

// Bar positioned by week column (1-indexed) and duration in weeks
function PBar({ start, weeks, status, label, dragging, snap }) {
  return (
    <div className={'tl-bar tl-' + status + (dragging ? ' dragging' : '') + (snap ? ' snap' : '')}
      style={{
        position:'absolute',
        left: `calc(${start} * (100% / ${WEEKS.length}) + 2px)`,
        width: `calc(${weeks} * (100% / ${WEEKS.length}) - 4px)`,
      }}>
      <span className="tl-handle left"/>
      <span>{label}</span>
      <span className="tl-handle right"/>
    </div>
  );
}

function PlannerGroup({ title, badges, sigma, heat, lanes, collapsed }) {
  return (
    <>
      <div className="pl-group-head">
        <Icon name="chevron-down" className="chev" size={14}/>
        <span>{title}</span>
        {badges}
        <div className="pl-sigma">
          <Sparkline data={sigma} width={120} height={18} tone={Math.max(...sigma) > 130 ? 'warning' : 'active'}/>
          <span className="sigma-val">Σ avg {Math.round(sigma.reduce((a,b)=>a+b,0)/sigma.length)}%</span>
        </div>
      </div>
      {!collapsed && heat && (
        <div className="pl-lane" style={{minHeight:0, padding:0, gridTemplateColumns:'subgrid'}}>
          <div className="pl-lane-label" style={{padding:'4px 14px', fontSize:10, color:'var(--color-text-subtle)', letterSpacing:'0.06em', textTransform:'uppercase'}}>Heat</div>
          <div style={{padding:'4px 0'}}>
            <div className="tl-heat" style={{margin:0}}>
              {heat.map((h, i) => <i key={i} className={h ? 'h'+h : ''}/>)}
            </div>
          </div>
        </div>
      )}
      {!collapsed && lanes.map((lane, i) => (
        <div key={i} className="pl-lane">
          <div className="pl-lane-label">
            {lane.person ? <Avatar name={lane.person} size="sm"/> : <span style={{width:22, height:22, borderRadius:'50%', background:'var(--color-status-warning-bg)', color:'var(--color-status-warning)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}><Icon name="position" size={12}/></span>}
            <div style={{minWidth:0, flex:1}}>
              <div style={{fontWeight:500}}>{lane.label}</div>
              <div className="role compact-sm">{lane.role}</div>
            </div>
          </div>
          <div className="pl-lane-bars" style={{gridTemplateColumns:`repeat(${WEEKS.length}, 1fr)`}}>
            {/* Week gridlines */}
            {WEEKS.map((_, wi) => (
              <div key={wi} style={{borderRight:'1px solid var(--color-border-subtle)', height:'100%'}}/>
            ))}
            {/* Today line painted over */}
            {lane.bars.map((b, bi) => <PBar key={bi} {...b}/>)}
          </div>
        </div>
      ))}
    </>
  );
}

function DistributionStudio() {
  return (
    <AppShell active="bench" context="Distribution Studio">
      <StaffingDeskChrome view="planner" dirty={true}/>
      <JqlBar
        value={
          <>
            <span className="jql-token">project.code</span>
            <span className="jql-op">=</span>
            <span className="jql-val">"MCB-UK"</span>
            <span className="jql-op">&nbsp;AND&nbsp;</span>
            <span className="jql-token">horizon</span>
            <span className="jql-op">=</span>
            <span className="jql-val">"12w"</span>
            <span className="jql-op">&nbsp;AND&nbsp;</span>
            <span className="jql-token">person.skill</span>
            <span className="jql-op">~</span>
            <span className="jql-bad">"React*</span>
          </>
        }
        error={{ col: 79, x: 470, msg: 'Unterminated string · expected closing "' }}
      />

      <div className="page-body" style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:12, padding:'12px 24px', alignItems:'stretch'}}>
        {/* Bench sidebar — stretches to fill the column with people + alerts + history */}
        <div className="pl-bench" style={{minHeight:'100%'}}>
          <div className="pl-bench-head">
            <Icon name="bench" size={14}/>
            <span className="body-sm" style={{fontWeight:600}}>Bench</span>
            <span style={{flex:1}}/>
            <span className="badge badge-warning">4 idle &gt; 14d</span>
          </div>
          <div style={{position:'relative', padding:'8px 12px'}}>
            <Icon name="search" style={{position:'absolute', left:18, top:16, color:'var(--color-text-subtle)'}}/>
            <input className="input input-sm" placeholder="Filter…" style={{paddingLeft:30, width:'100%'}}/>
          </div>
          <div style={{flex:1, overflow:'auto'}}>
            {[
              { name:'Aarav Mehta',   role:'Backend Eng · L4',     days:11 },
              { name:'Priya Natarajan',role:'Senior FE Eng · L5',  days:5,  proposed:true },
              { name:'Marco Bianchi', role:'SRE · L4',             days:21 },
              { name:'Lina Olsen',    role:'Data Eng · L4',        days:9 },
              { name:'Yusuf Demir',   role:'Sol Architect · L6',   days:22 },
              { name:'Tomás Reyes',   role:'QA · L3',              days:3 },
            ].map((p) => (
              <div key={p.name} className="pl-bench-item">
                <Avatar name={p.name} size="sm"/>
                <div style={{minWidth:0, flex:1}}>
                  <div className="body-sm" style={{fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.name}</div>
                  <div className="compact-sm muted" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{p.role}</div>
                  <div className="compact-sm mono" style={{color: p.days > 14 ? 'var(--color-status-danger)' : p.days > 7 ? 'var(--color-status-warning)' : 'var(--color-text-subtle)', marginTop:2}}>{p.days}d off</div>
                </div>
                {p.proposed && <StatusBadge tone="info">Prop.</StatusBadge>}
              </div>
            ))}
          </div>

          {/* Conflicts to resolve — fills remaining vertical space with signal, not filler */}
          <div style={{borderTop:'1px solid var(--color-border)', background:'var(--color-surface-alt)'}}>
            <div style={{padding:'8px 12px', display:'flex', alignItems:'center', gap:6}}>
              <Icon name="alert" size={12} style={{color:'var(--color-status-danger)'}}/>
              <span className="label-eyebrow" style={{color:'var(--color-status-danger)'}}>Conflicts · 2</span>
            </div>
            {[
              { who:'Diego C.', text:'120% W25-27 if move accepted', tone:'danger' },
              { who:'Yusuf D.', text:'Hold ends W28, no follow-on',  tone:'warning' },
            ].map((c) => (
              <div key={c.who} style={{padding:'8px 12px', borderTop:'1px solid var(--color-border-subtle)', display:'flex', flexDirection:'column', gap:2, cursor:'pointer'}}>
                <div className="compact" style={{fontWeight:500}}>{c.who} · <span className={'tone-dot tone-'+c.tone} style={{marginLeft:2}}/></div>
                <div className="compact-sm muted">{c.text}</div>
              </div>
            ))}
          </div>

          {/* Recently moved — undo affordance */}
          <div style={{borderTop:'1px solid var(--color-border)'}}>
            <div style={{padding:'8px 12px', display:'flex', alignItems:'center', gap:6}}>
              <Icon name="history" size={12} style={{color:'var(--color-text-muted)'}}/>
              <span className="label-eyebrow">Recently moved · 7</span>
              <span style={{flex:1}}/>
              <button className="btn btn-ghost btn-sm" style={{padding:'0 6px', height:18, fontSize:10}}>Undo all</button>
            </div>
            {[
              { txt:'Priya N. → MCB-UK', when:'2m ago' },
              { txt:'Diego C. ← Atlas',   when:'8m ago' },
              { txt:'Open · L4 BE moved', when:'15m ago' },
            ].map((c, i) => (
              <div key={i} style={{padding:'6px 12px', borderTop:'1px solid var(--color-border-subtle)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span className="compact-sm" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', flex:1}}>{c.txt}</span>
                <span className="compact-sm muted mono">{c.when}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Planner grid */}
        <div style={{display:'flex', flexDirection:'column', gap:12, minWidth:0}}>
          <div className="pl-grid compact" style={{gridTemplateColumns:'220px 1fr'}}>
            {/* Top-left empty + ruler */}
            <div style={{padding:'10px 14px', background:'var(--color-surface-alt)', borderBottom:'1px solid var(--color-border)', borderRight:'1px solid var(--color-border)', fontSize:11, color:'var(--color-text-subtle)', letterSpacing:'0.06em', textTransform:'uppercase'}}>Mercury Core · 12-week horizon</div>
            <PlannerRuler/>

            {/* Frontend group — heat band visible, includes the dragging bar */}
            <PlannerGroup
              title="Frontend Customer Channel"
              badges={<span className="badge badge-outline">3 positions</span>}
              sigma={[80,100,128,150,140,120,100,110,130,120,100,90]}
              heat={[null,'100','120','150','150','120','100',null,'100','120','100',null]}
              lanes={[
                { person:'Priya Natarajan', label:'Priya N.',                  role:'Senior FE · proposed', bars:[
                  { start:2, weeks:7, status:'proposed', label:'Priya N. · 80%' },
                ]},
                // The dragging row — original ghost left over its old position, snap preview on the right
                { person:'Diego Costa', label:'Diego C.',                       role:'FE Eng · drag in progress', bars:[
                  { start:1, weeks:4, status:'booked', label:'Diego · 100%', dragging:true },
                  { start:5, weeks:4, status:'booked', label:'Snap · W26 → W30', snap:true },
                ]},
                { person:null, label:'OPEN · FE L4',                          role:'Frontend Engineer · 80%', bars:[
                  { start:4, weeks:8, status:'open', label:'OPEN · 80%' },
                ]},
              ]}
            />

            {/* Backend group — open + booked + assigned */}
            <PlannerGroup
              title="Backend"
              badges={<span className="badge badge-outline">3 positions</span>}
              sigma={[90,100,100,90,80,90,100,100,95,90,85,80]}
              lanes={[
                { person:null, label:'OPEN · Lead BE', role:'Lead Backend Eng · 100%', bars:[
                  { start:6, weeks:6, status:'open', label:'OPEN · 100%' },
                ]},
                { person:'Aarav Mehta', label:'Aarav M.', role:'Backend Eng · booked', bars:[
                  { start:4, weeks:8, status:'booked', label:'Aarav · 100%' },
                ]},
                { person:'Lina Olsen', label:'Lina O.', role:'Backend Eng · assigned', bars:[
                  { start:0, weeks:11, status:'assigned', label:'Lina · 80%' },
                ]},
              ]}
            />

            {/* Mainframe — open with critical SLA, plus on-hold */}
            <PlannerGroup
              title="Mainframe Integration"
              badges={<>
                <span className="badge badge-outline">2 positions</span>
                <span className="badge badge-critical">SLA breach</span>
              </>}
              sigma={[40,60,80,60,60,80,80,80,60,40,40,40]}
              lanes={[
                { person:null, label:'OPEN · COBOL', role:'COBOL Integration · 60%', bars:[
                  { start:5, weeks:6, status:'open', label:'OPEN · 60% · 30d breach' },
                ]},
                { person:'Yusuf Demir', label:'Yusuf D.', role:'MQ Specialist · on-hold', bars:[
                  { start:0, weeks:3, status:'assigned', label:'Yusuf · 60%' },
                  { start:3, weeks:3, status:'hold',     label:'Hold' },
                  { start:6, weeks:5, status:'assigned', label:'Yusuf · 60%' },
                ]},
              ]}
            />

            {/* QA — collapsed group */}
            <div className="pl-group-head" style={{borderTop:'1px solid var(--color-border)'}}>
              <Icon name="chevron-right" className="chev" size={14}/>
              <span>Quality</span>
              <span className="badge badge-outline">2 positions</span>
              <div className="pl-sigma">
                <Sparkline data={[100,100,100,100,100,100,100,100,100,100,100,100]} width={120} height={18} tone="active"/>
                <span className="sigma-val">Σ avg 100%</span>
              </div>
            </div>
          </div>

          {/* Anomaly drawer */}
          <div className="pl-drawer">
            <div className="pl-drawer-head">
              <Icon name="chevron-down" className="chev" size={14}/>
              <span style={{fontWeight:600}}>Anomalies</span>
              <span className="badge badge-warning">3</span>
              <span style={{flex:1}}/>
              <span className="compact muted">FE Σ crosses 150% W25-26 · COBOL open 30d · Diego conflict W26-27</span>
            </div>
            <div className="pl-drawer-body" style={{padding:'10px 14px', display:'flex', flexDirection:'column', gap:6}}>
              {[
                { tone:'danger', when:'W25-26', what:<>Frontend Σ-allocation crosses <strong>150%</strong> (3 active proposals overlap)</>, action:'Stagger start dates' },
                { tone:'critical', when:'now', what:<>COBOL Integration position open <strong>30 days</strong> · pipeline empty</>, action:'Escalate to Director' },
                { tone:'warning', when:'W26-27', what:<>Diego C. would conflict with Atlas ERP closeout if moved later</>, action:'Hold drop' },
              ].map((a, i) => (
                <div key={i} style={{display:'flex', alignItems:'center', gap:10, padding:'4px 0'}}>
                  <span className={'tone-dot tone-'+a.tone}/>
                  <span className="mono compact" style={{color:'var(--color-text-subtle)', minWidth:60}}>{a.when}</span>
                  <span className="body-sm" style={{flex:1}}>{a.what}</span>
                  <button className="btn btn-ghost btn-sm">{a.action} →</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Find candidates panel — slim version embedded in Position detail ──────
function FindCandidatesPanel() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1240, margin:'0 auto'}}>
      <div style={{marginBottom:14}}>
        <div className="label-eyebrow">Position detail · /projects/MCB-UK/positions/POS-00148</div>
        <h1 className="h1" style={{marginTop:6, marginBottom:4}}>Find candidates</h1>
        <p className="body muted">Single-position inline view. Top 5 ranked by skill match × availability × cost. Inline propose, no modal.</p>
      </div>

      <div className="card">
        <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:6}}>
          <div style={{display:'flex', alignItems:'center', gap:8, width:'100%'}}>
            <h3>Senior Frontend Engineer · L5 · 80%</h3>
            <StatusBadge tone="warning">Open · 15d · SLA in 6h</StatusBadge>
            <span style={{flex:1}}/>
            <button className="btn btn-ghost btn-sm"><Icon name="settings"/> Match weights</button>
          </div>
          <div className="compact muted">Required · React, TypeScript, Design Systems · Bonus · D3, A11y · Rate band L5 · BPSS clearance</div>
        </div>
        <div style={{padding:'4px 0'}}>
          {[
            { name:'Priya Natarajan',  match:92, avail:'16 Jun · clear', cost:'On rate card · $1,650/d', flags:['React 5/5','TS 5/5','DS 4/5','D3 4/5'], onBench:true, tone:'active' },
            { name:'Diego Costa',      match:84, avail:'01 Jul · clear', cost:'On rate card · $1,580/d', flags:['React 4/5','TS 4/5','DS 3/5'], onBench:false, currentProj:'Atlas ERP' },
            { name:'Saoirse Walsh',    match:79, avail:'23 Jun',         cost:'+6% above · $1,750/d',    flags:['React 4/5','TS 5/5','D3 3/5'], onBench:false, currentProj:'Beacon CRM', tone:'warning' },
            { name:'Akira Tanaka',     match:72, avail:'04 Aug',         cost:'On rate card · $1,620/d', flags:['React 3/5','TS 4/5'], onBench:false, currentProj:'Helix DW' },
            { name:'Hannah Cole (sub)',match:64, avail:'now',            cost:'Stretch · L4 → L5 prov.', flags:['React 3/5','TS 3/5'], onBench:true, tone:'info' },
          ].map((c, i) => (
            <div key={c.name} style={{
              display:'grid', gridTemplateColumns:'44px 1.2fr 1.4fr 1fr 200px', gap:16, alignItems:'center',
              padding:'14px 24px',
              borderTop: i > 0 ? '1px solid var(--color-border-subtle)' : 0,
              background: i === 0 ? 'var(--color-accent-soft)' : 'transparent',
            }}>
              <Avatar name={c.name} size="lg"/>
              <div style={{minWidth:0}}>
                <div className="body-sm" style={{fontWeight:600, display:'flex', alignItems:'center', gap:8}}>
                  {c.name}
                  {c.onBench && <span className="badge badge-outline">Bench</span>}
                </div>
                <div className="compact-sm muted" style={{marginTop:2}}>
                  {c.onBench ? 'Available now' : 'Currently on ' + c.currentProj}
                </div>
                <div style={{display:'flex', gap:4, marginTop:6, flexWrap:'wrap'}}>
                  {c.flags.map((f) => <span key={f} className="badge badge-outline" style={{height:18, fontSize:10}}>{f}</span>)}
                </div>
              </div>
              <div>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <Donut value={c.match} size={40} thickness={5} tone={c.match > 85 ? 'active' : c.match > 75 ? 'info' : 'warning'}/>
                  <div>
                    <div className="mono" style={{fontSize:18, fontWeight:600, fontVariantNumeric:'tabular-nums'}}>{c.match}%</div>
                    <div className="compact-sm muted">match</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="compact" style={{fontWeight:500}}>{c.avail}</div>
                <div className="compact-sm muted" style={{marginTop:2}}>{c.cost}</div>
              </div>
              <div style={{display:'flex', gap:6, justifyContent:'flex-end'}}>
                <button className="btn btn-ghost btn-sm">Compare</button>
                <button className={'btn ' + (i === 0 ? 'btn-primary' : 'btn-secondary') + ' btn-sm'}>Propose</button>
              </div>
            </div>
          ))}
        </div>
        <div className="card-footer">
          <span className="compact muted" style={{marginRight:'auto'}}>5 of 18 candidates · widening filters shows more</span>
          <button className="btn btn-tertiary btn-sm">Open full search</button>
          <button className="btn btn-tertiary btn-sm">Escalate</button>
        </div>
      </div>
    </div>
  );
}

// ── Tab CRUD modals + state primitives for the desk ───────────────────────
function StaffingStatesAndModals() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <div className="label-eyebrow">Staffing Desk · States & modals</div>
        <h1 className="h1" style={{marginTop:6}}>Empty · Error · Loading · CRUD modals</h1>
      </div>

      {/* ── State primitives ── */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20}}>
        {/* No results */}
        <div className="card">
          <div className="card-header"><h3>Empty · No results</h3></div>
          <div className="empty-state">
            <div className="empty-icon"><Icon name="search" size={22}/></div>
            <div className="empty-title">No positions match this query</div>
            <div className="empty-body">
              <span className="mono compact">status = "OPEN" AND skill ~ "Erlang"</span> matched 0 of 247 positions.
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-secondary btn-md">Drop "skill" filter</button>
              <button className="btn btn-tertiary btn-md">Reset query</button>
            </div>
          </div>
        </div>

        {/* RBAC denial */}
        <div className="card">
          <div className="card-header"><h3>Error · RBAC denied</h3></div>
          <div className="error-state">
            <div className="empty-icon"><Icon name="lock" size={22}/></div>
            <div className="empty-title">You can't view this tab</div>
            <div className="empty-body">"MCB Q3 backlog" is a public tab that exposes <strong>Atlas ERP</strong> positions. Your role (PM · Mercury) doesn't include Atlas.</div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-secondary btn-md">Request access</button>
              <button className="btn btn-ghost btn-md">Switch tab</button>
            </div>
          </div>
        </div>

        {/* Planner loading */}
        <div className="card">
          <div className="card-header"><h3>Loading · Planner scenario</h3></div>
          <div className="card-body" style={{display:'flex', flexDirection:'column', gap:12}}>
            <div className="skel" style={{height:30, width:'100%'}}/>
            <div style={{display:'grid', gridTemplateColumns:'160px 1fr', gap:8}}>
              <div className="skel" style={{height:22}}/>
              <div className="skel" style={{height:22}}/>
              <div className="skel" style={{height:22, width:'60%'}}/>
              <div className="skel" style={{height:22, width:'85%'}}/>
              <div className="skel" style={{height:22, width:'45%'}}/>
              <div className="skel" style={{height:22, width:'70%'}}/>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:8, color:'var(--color-text-muted)', fontSize:'var(--font-size-compact)'}}>
              <span className="spinner" style={{width:12, height:12, borderWidth:2}}/>
              Loading 247 positions across 12-week horizon · 1.2s
            </div>
          </div>
        </div>

        {/* Solver timeout */}
        <div className="card">
          <div className="card-header"><h3>Error · Solver timeout</h3></div>
          <div className="card-body" style={{padding:'20px 24px'}}>
            <div className="banner banner-warning" style={{marginBottom:14}}>
              <Icon name="alert" style={{color:'var(--color-status-warning)'}}/>
              <div>
                <div className="banner-title">"Suggest fills" took longer than 8 seconds</div>
                <div className="banner-body">We ran out of compute budget before scoring all 186 candidates. Showing top 12 partial matches. Solver state has been preserved — retry to continue from where we stopped.</div>
              </div>
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-secondary btn-md"><Icon name="refresh"/> Continue solving</button>
              <button className="btn btn-tertiary btn-md">Use partial result</button>
              <button className="btn btn-ghost btn-md">Narrow search</button>
            </div>
          </div>
        </div>

        {/* Dual-write banner */}
        <div className="card" style={{gridColumn:'span 2'}}>
          <div className="card-header"><h3>Banner · Dual-write window</h3></div>
          <div className="card-body" style={{padding:'20px 24px'}}>
            <div className="banner banner-info">
              <Icon name="info" size={18} style={{color:'var(--color-status-info)'}}/>
              <div>
                <div className="banner-title">Legacy + lean staffing models writing in parallel · sprint 2–5 only</div>
                <div className="banner-body">Every change you make here is mirrored to the legacy <span className="mono">staffing_request</span> + <span className="mono">project_assignment</span> tables until <span className="mono">2026-07-20</span>. If anything looks off, your platform admin can roll back without data loss.</div>
              </div>
              <button className="btn btn-tertiary btn-sm">Operator runbook</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab CRUD modals ── */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <div className="card-header"><h3>Modal · New tab</h3></div>
          <div style={{background:'var(--color-overlay)', padding:16}}>
            <div className="card" style={{maxWidth:460, margin:'0 auto', boxShadow:'var(--shadow-modal)'}}>
              <div className="card-header"><h3>New tab</h3><button className="icon-btn icon-btn-sm" aria-label="Close"><Icon name="x"/></button></div>
              <div className="card-body" style={{display:'flex', flexDirection:'column', gap:14}}>
                <div className="field">
                  <label className="field-label">Tab name <span className="req">*</span></label>
                  <input className="input" defaultValue="MCB FE backlog"/>
                </div>
                <div className="field">
                  <label className="field-label">Query (JQL)</label>
                  <textarea className="textarea mono" rows="3" defaultValue={'project.code = "MCB-UK"\nAND workstream = "FE"\nAND status = "OPEN"'}/>
                  <div className="field-hint">Preview · <span className="mono">8 matches</span></div>
                </div>
                <div className="field">
                  <label className="field-label">Scope</label>
                  <div style={{display:'flex', gap:8}}>
                    <label style={{display:'flex', gap:8, alignItems:'center', flex:1, border:'1px solid var(--color-accent)', background:'var(--color-accent-soft)', padding:10, borderRadius:'var(--radius-control)'}}>
                      <input type="radio" className="radio" name="scope" defaultChecked/>
                      <div>
                        <div className="body-sm" style={{fontWeight:500}}>Mine</div>
                        <div className="compact-sm muted">Only you can see it.</div>
                      </div>
                    </label>
                    <label style={{display:'flex', gap:8, alignItems:'center', flex:1, border:'1px solid var(--color-border)', padding:10, borderRadius:'var(--radius-control)'}}>
                      <input type="radio" className="radio" name="scope"/>
                      <div>
                        <div className="body-sm" style={{fontWeight:500}}>Public</div>
                        <div className="compact-sm muted">Everyone with read access.</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-ghost btn-md" style={{marginRight:'auto'}}>Cancel</button>
                <button className="btn btn-primary btn-md">Create tab</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Modal · Clone · Scope toggle · Rename · Delete</h3></div>
          <div style={{padding:16, display:'flex', flexDirection:'column', gap:12}}>
            {/* Inline rename */}
            <div style={{border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', padding:12}}>
              <div className="label-eyebrow">Rename · inline</div>
              <div style={{display:'flex', gap:6, marginTop:8, alignItems:'center'}}>
                <input className="input input-sm" defaultValue="MCB Q3 backlog" style={{maxWidth:240}}/>
                <button className="btn btn-primary btn-sm">Save</button>
                <button className="btn btn-ghost btn-sm">Cancel</button>
              </div>
            </div>
            {/* Clone */}
            <div style={{border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', padding:12}}>
              <div className="label-eyebrow">Clone</div>
              <div className="compact" style={{marginTop:6}}>Copy "MCB Q3 backlog" → <strong>MCB Q3 backlog (copy)</strong> · scope: <span className="badge badge-outline">Mine</span></div>
              <div className="compact mono muted" style={{marginTop:6, padding:'6px 8px', background:'var(--color-surface-alt)', borderRadius:4, whiteSpace:'pre'}}>
                {'project.code = "MCB-UK" AND status = "OPEN"'}
              </div>
              <div style={{display:'flex', gap:6, marginTop:10}}>
                <button className="btn btn-secondary btn-sm">Edit before saving</button>
                <button className="btn btn-primary btn-sm">Clone</button>
              </div>
            </div>
            {/* Scope toggle */}
            <div style={{border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', padding:12}}>
              <div className="label-eyebrow">Scope toggle</div>
              <div className="banner banner-warning" style={{marginTop:6}}>
                <Icon name="alert" size={14} style={{color:'var(--color-status-warning)'}}/>
                <div>
                  <div className="banner-title">Make "MCB Q3 backlog" public?</div>
                  <div className="banner-body">14 colleagues with read access will see this tab. The underlying query keeps your filters as-is.</div>
                </div>
              </div>
              <div style={{display:'flex', gap:6, marginTop:10, justifyContent:'flex-end'}}>
                <button className="btn btn-ghost btn-sm">Cancel</button>
                <button className="btn btn-primary btn-sm">Make public</button>
              </div>
            </div>
            {/* Delete */}
            <div style={{border:'1px solid var(--color-status-danger)', background:'var(--color-status-danger-bg)', borderRadius:'var(--radius-card)', padding:12}}>
              <div className="label-eyebrow" style={{color:'var(--color-status-danger)'}}>Delete · confirm</div>
              <div className="body-sm" style={{marginTop:6}}>Delete public tab <strong>"MCB Q3 backlog"</strong>?</div>
              <div className="compact muted" style={{marginTop:4}}>14 colleagues will lose this view. The query itself is recoverable from audit log for 30 days.</div>
              <div style={{display:'flex', gap:6, marginTop:10, justifyContent:'flex-end'}}>
                <button className="btn btn-ghost btn-sm">Cancel</button>
                <button className="btn btn-danger btn-sm">Delete tab</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StaffingDeskBoard = StaffingDeskBoard;
window.DistributionStudio = DistributionStudio;
window.FindCandidatesPanel = FindCandidatesPanel;
window.StaffingStatesAndModals = StaffingStatesAndModals;
