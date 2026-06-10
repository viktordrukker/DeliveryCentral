// page-plan-money.jsx — Project Plan tab + Project Money tab.
// Both share the ProjectPulse PageHeader/tabs and the same overall chrome.

const PLAN_WORKSTREAMS = [
  { id:'arch',  label:'Architecture & Platform',   color:'var(--color-chart-1)', positions:[
      { role:'Solution Architect',     fill:'Henrik V.',  alloc:50,  start:0,  weeks:60, status:'assigned' },
      { role:'Platform Engineer',      fill:'Marco B.',   alloc:100, start:4,  weeks:32, status:'assigned' },
  ]},
  { id:'be',    label:'Backend',                   color:'var(--color-chart-2)', positions:[
      { role:'Lead Backend Engineer',  fill:null,          alloc:100, start:8,  weeks:32, status:'open' },
      { role:'Backend Engineer',       fill:'Aarav M.',    alloc:100, start:6,  weeks:28, status:'booked' },
      { role:'Backend Engineer',       fill:'Lina O.',     alloc:80,  start:6,  weeks:28, status:'assigned' },
  ]},
  { id:'fe',    label:'Frontend Customer Channel', color:'var(--color-chart-3)', positions:[
      { role:'Senior Frontend Eng',    fill:'Priya N.',    alloc:80,  start:10, weeks:28, status:'proposed' },
      { role:'Frontend Engineer',      fill:'Diego C.',    alloc:100, start:12, weeks:24, status:'booked' },
  ]},
  { id:'mf',    label:'Mainframe Integration',     color:'var(--color-chart-4)', positions:[
      { role:'COBOL Integration',      fill:null,          alloc:60,  start:14, weeks:24, status:'open' },
      { role:'MQ Specialist',          fill:'Yusuf D.',    alloc:60,  start:14, weeks:20, status:'assigned' },
  ]},
  { id:'qa',    label:'Quality',                   color:'var(--color-chart-5)', positions:[
      { role:'QA Lead',                fill:'Aisha O.',    alloc:100, start:8,  weeks:28, status:'booked' },
      { role:'SDET',                   fill:'Tomás R.',    alloc:100, start:12, weeks:24, status:'booked' },
  ]},
];

const MILESTONES = [
  { name:'Discovery sign-off',    start:0,  end:8,  status:'done',     weight:10, end_date:'Sep 2025' },
  { name:'Architecture sign-off', start:6,  end:18, status:'done',     weight:15, end_date:'Jan 2026' },
  { name:'Regulatory approval',   start:14, end:26, status:'current',  weight:20, end_date:'Jun 2026' },
  { name:'Integration done',      start:20, end:42, status:'planned',  weight:25, end_date:'Oct 2026' },
  { name:'UAT complete',          start:38, end:54, status:'planned',  weight:20, end_date:'Dec 2026' },
  { name:'Go-live',               start:52, end:60, status:'planned',  weight:10, end_date:'Feb 2027' },
];

// Larger Gantt row — fixed pixel height, used for both workstreams and positions
function GanttBar({ label, sub, start, end, total, color, status, today }) {
  const left = (start / total) * 100;
  const width = ((end - start) / total) * 100;
  const isOpen = status === 'open';
  const cellBg = isOpen ? 'transparent' : color;
  const border = isOpen ? '1px dashed ' + color : 'none';
  return (
    <div style={{display:'grid', gridTemplateColumns:'220px 1fr', gap:12, alignItems:'center', padding:'5px 0'}}>
      <div style={{minWidth:0}}>
        <div className="body-sm" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight: status === 'open' ? 600 : 400}}>{label}</div>
        {sub && <div className="compact-sm muted" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{sub}</div>}
      </div>
      <div style={{position:'relative', height:22, background:'var(--color-surface-alt)', borderRadius:4}}>
        <div style={{
          position:'absolute', left:left+'%', width:width+'%', top:3, bottom:3,
          background:cellBg, border, borderRadius:3,
          display:'flex', alignItems:'center', paddingLeft:8,
          fontSize:11, color:'#fff', fontVariantNumeric:'tabular-nums',
        }}>
          {!isOpen && width > 12 && <span style={{opacity:0.95}}>{Math.round(end-start)}w</span>}
        </div>
        {today != null && (
          <div style={{position:'absolute', left:today+'%', top:-2, bottom:-2, width:2, background:'var(--color-status-warning)'}}/>
        )}
      </div>
    </div>
  );
}

function GanttHeader() {
  return (
    <div style={{display:'grid', gridTemplateColumns:'220px 1fr', gap:12, padding:'4px 0 8px', borderBottom:'1px solid var(--color-border)'}}>
      <span className="label-eyebrow">Workstream / Position</span>
      <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', fontSize:10, color:'var(--color-text-subtle)', letterSpacing:'0.04em', textTransform:'uppercase'}}>
        {['Q3 2025','Q4 2025','Q1 2026','Q2 2026','Q3 2026','Q4 2026'].map((q) => <span key={q}>{q}</span>)}
      </div>
    </div>
  );
}

function ProjectPlan() {
  const TODAY = 30; // pct (week ~18 of 60)
  return (
    <AppShell active="projects" context="Mercury Core Banking — UK">
      <PageHeader
        breadcrumb={['Projects', 'Mercury Core Banking — UK', 'Plan']}
        title="Mercury Core Banking — UK"
        badges={<>
          <StatusBadge tone="warning">At risk</StatusBadge>
          <span className="badge badge-outline mono">MCB-UK</span>
        </>}
        subtitle={<>5 workstreams · 12 positions · 6 gates · 60 weeks · today is week 18</>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="download"/> Export</button>
          <button className="btn btn-secondary btn-md"><Icon name="milestone"/> Add milestone</button>
          <button className="btn btn-primary btn-md"><Icon name="position"/> Add position</button>
        </>}
        tabs={[
          { id:'pulse', label:'Pulse' },
          { id:'plan',  label:'Plan',  count:'12' },
          { id:'money', label:'Money' },
        ]}
        activeTab="plan"
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:20}}>
        {/* KPI strip — plan-focused */}
        <div className="kpi-strip" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
          <div className="kpi tone-active">
            <span className="kpi-label">Schedule</span>
            <span className="kpi-value">+2<span className="unit"> d</span></span>
            <span className="kpi-foot">vs baseline · trending green</span>
          </div>
          <div className="kpi tone-warning">
            <span className="kpi-label">Open positions</span>
            <span className="kpi-value">3</span>
            <span className="kpi-foot">of 12 total</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Filled</span>
            <span className="kpi-value">9<span className="unit"> / 12</span></span>
            <Donut value={75} size={20} thickness={4} tone="accent"/>
          </div>
          <div className="kpi tone-info">
            <span className="kpi-label">Active milestone</span>
            <span className="kpi-value" style={{fontSize:18, fontWeight:600}}>Gate 3</span>
            <span className="kpi-foot">FCA approval · 11 days</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Effort logged · L4W</span>
            <span className="kpi-value mono">3,840 h</span>
            <Sparkline data={[820, 920, 1020, 1080]} width={120} height={20}/>
          </div>
        </div>

        {/* Milestone strip — segmented gates */}
        <div className="card">
          <div className="card-header">
            <h3>Gates</h3>
            <span className="compact muted">Today · week 18 of 60 · on schedule</span>
          </div>
          <div className="card-body" style={{padding:20}}>
            <div style={{display:'flex', gap:6}}>
              {MILESTONES.map((m, i) => {
                const tone = m.status === 'done' ? 'active' : m.status === 'current' ? 'warning' : 'pending';
                return (
                  <div key={m.name} style={{flex: m.weight, minWidth:0}}>
                    <div className={'tl-row tl-'+tone} style={{padding:0, gridTemplateColumns:'1fr', marginBottom:8}}>
                      <span style={{
                        height:6, borderRadius:3,
                        background: m.status === 'done' ? 'var(--color-status-active)' : m.status === 'current' ? 'var(--color-status-warning)' : 'var(--color-border-strong)',
                      }}/>
                    </div>
                    <div className="compact" style={{fontWeight:500}}>Gate {i+1}</div>
                    <div className="compact-sm muted" style={{marginTop:2, lineHeight:1.3}}>{m.name}</div>
                    <div className="compact-sm mono" style={{marginTop:2, color: m.status === 'current' ? 'var(--color-status-warning)' : 'var(--color-text-subtle)'}}>{m.end_date}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gantt */}
        <div className="card">
          <div className="card-header">
            <h3>Schedule · workstreams + positions</h3>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <span className="chip chip-active">All</span>
              <span className="chip">Open only</span>
              <span className="chip">My workstreams</span>
              <button className="btn btn-ghost btn-sm"><Icon name="external"/> Open in Smartsheet</button>
            </div>
          </div>
          <div className="card-body" style={{padding:'14px 20px 20px'}}>
            <GanttHeader/>
            {PLAN_WORKSTREAMS.map((ws) => (
              <React.Fragment key={ws.id}>
                <div style={{padding:'14px 0 6px', display:'flex', alignItems:'center', gap:8, borderTop:'1px solid var(--color-border-subtle)', marginTop:4}}>
                  <span style={{width:10, height:10, borderRadius:2, background:ws.color}}/>
                  <span className="body-sm" style={{fontWeight:600}}>{ws.label}</span>
                  <span className="compact muted">· {ws.positions.length} positions</span>
                  <span style={{flex:1}}/>
                  <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Position</button>
                </div>
                {ws.positions.map((p, i) => (
                  <GanttBar
                    key={i}
                    label={p.role}
                    sub={p.fill ? (p.fill + ' · ' + p.alloc + '%') : <span style={{color:'var(--color-status-warning)'}}>— Vacant — · {p.alloc}%</span>}
                    start={p.start} end={p.start + p.weeks} total={60}
                    color={ws.color}
                    status={p.status}
                    today={TODAY}
                  />
                ))}
              </React.Fragment>
            ))}
            {/* Today marker legend */}
            <div style={{display:'flex', gap:18, marginTop:18, paddingTop:14, borderTop:'1px solid var(--color-border)', alignItems:'center', flexWrap:'wrap'}}>
              <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:'var(--font-size-compact)', color:'var(--color-text-muted)'}}>
                <span style={{width:2, height:14, background:'var(--color-status-warning)'}}/> Today · week 18
              </span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:'var(--font-size-compact)', color:'var(--color-text-muted)'}}>
                <span style={{width:14, height:10, background:'var(--color-chart-1)', borderRadius:2}}/> Filled
              </span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:'var(--font-size-compact)', color:'var(--color-text-muted)'}}>
                <span style={{width:14, height:10, border:'1px dashed var(--color-chart-2)', borderRadius:2}}/> Open / vacant
              </span>
            </div>
          </div>
        </div>

        {/* Open positions only — Gantt above covers the full inventory; this
            focuses on what the PM needs to act on right now. */}
        <div className="card">
          <div className="card-header">
            <h3>Open positions · awaiting fill</h3>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <span className="badge badge-warning"><span className="dot"/>3 open · 2 past 14d SLA</span>
              <button className="btn btn-ghost btn-sm"><Icon name="external"/> View all 12</button>
              <button className="btn btn-primary btn-sm"><Icon name="plus"/> Position</button>
            </div>
          </div>
          <div style={{overflow:'auto'}}>
            <table className="table table-compact">
              <thead><tr>
                <th>Position</th>
                <th>Workstream</th>
                <th className="right">Alloc</th>
                <th>Start</th>
                <th className="right">Open for</th>
                <th className="right">Candidates</th>
                <th style={{width:200}}>Action</th>
              </tr></thead>
              <tbody>
                {PLAN_WORKSTREAMS.flatMap((ws) => ws.positions.filter((p) => p.status === 'open').map((p) => ({...p, ws}))).map((p, i) => {
                  const days = [22, 14, 7][i] || 5;
                  const cand = [5, 2, 4][i] || 3;
                  return (
                    <tr key={i}>
                      <td><span className="table-cell-strong">{p.role}</span></td>
                      <td>
                        <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                          <span style={{width:8, height:8, borderRadius:2, background:p.ws.color}}/>
                          <span className="compact">{p.ws.label}</span>
                        </span>
                      </td>
                      <td className="right num">{p.alloc}%</td>
                      <td className="mono">W{p.start+1}</td>
                      <td className="right">
                        <span className="mono tnum" style={{color: days > 14 ? 'var(--color-status-danger)' : days > 10 ? 'var(--color-status-warning)' : 'var(--color-text)'}}>{days}d</span>
                      </td>
                      <td className="right"><span className="badge badge-accent">{cand}</span></td>
                      <td>
                        <div style={{display:'flex', gap:6}}>
                          <button className="btn btn-tertiary btn-sm">View candidates</button>
                          <button className="btn btn-secondary btn-sm">Propose</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Project Money — EVM + variance + forecast + cost lines + CRs
// ─────────────────────────────────────────────────────────────────────────

function PlanVsActualChart() {
  const W = 720, H = 240, P = 30;
  const months = 12; // Sep'25 .. Aug'26
  const planned = [180, 360, 540, 720, 920, 1140, 1380, 1620, 1860, 2080, 2240, 2400];
  const actuals = [192, 388, 580, 778, 996, 1226, 1488, 1762, 2024, 2236, null, null]; // future = null
  const earned   = [170, 348, 528, 712, 916, 1126, 1376, 1620, 1858, 2050, null, null];
  const max = 2700;
  const x = (i) => P + (i / (months - 1)) * (W - 2*P);
  const y = (v) => H - P - (v / max) * (H - 2*P);
  const M = ['S','O','N','D','J','F','M','A','M','J','J','A'];
  const lineD = (arr) => arr.map((v, i) => (v == null ? '' : (i === 0 || arr[i-1] == null ? 'M' : 'L') + x(i) + ' ' + y(v))).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:'auto', display:'block'}}>
      {[0, 700, 1400, 2100, 2800].map((v) => (
        <g key={v}>
          <line x1={P} x2={W-P} y1={y(v)} y2={y(v)} stroke="var(--color-border-subtle)" strokeDasharray="2 4"/>
          <text x={P-6} y={y(v)+3} textAnchor="end" fontSize="10" fill="var(--color-text-subtle)">${v}k</text>
        </g>
      ))}
      {M.map((m, i) => (
        <text key={i} x={x(i)} y={H-10} textAnchor="middle" fontSize="10" fill="var(--color-text-subtle)">{m}</text>
      ))}
      {/* PV — planned */}
      <path d={lineD(planned)} fill="none" stroke="var(--color-text-subtle)" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* AC — actuals area + line */}
      <path d={lineD(actuals) + ` L ${x(actuals.filter(v => v != null).length - 1)} ${H-P} L ${P} ${H-P} Z`}
        fill="var(--color-status-danger)" opacity="0.08"/>
      <path d={lineD(actuals)} fill="none" stroke="var(--color-status-danger)" strokeWidth="2"/>
      {/* EV — earned */}
      <path d={lineD(earned)} fill="none" stroke="var(--color-status-active)" strokeWidth="2"/>

      {/* Today marker */}
      <line x1={x(9.4)} x2={x(9.4)} y1={P} y2={H-P} stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
      <text x={x(9.4)+6} y={P+12} fontSize="10" fill="var(--color-accent)">Today</text>

      {/* EAC dotted line — forecast curve */}
      <path d={`M ${x(9)} ${y(2050)} Q ${x(10.5)} ${y(2280)}, ${x(11)} ${y(2620)}`}
        fill="none" stroke="var(--color-status-danger)" strokeDasharray="3 3" strokeWidth="2"/>
      <text x={x(11)} y={y(2620)-6} fontSize="10" fill="var(--color-status-danger)">EAC $2.62M</text>
    </svg>
  );
}

const COST_LINES = [
  { kind:'People · internal',     month:148, ytd:1240, share:55, tone:'active' },
  { kind:'People · vendor',       month:62,  ytd:548,  share:24, tone:'warning' },
  { kind:'Cloud · Equinix + AWS', month:18,  ytd:172,  share:8,  tone:'info' },
  { kind:'Licences · Snowflake',  month:14,  ytd:124,  share:6,  tone:'info' },
  { kind:'Travel',                month:8,   ytd:76,   share:3,  tone:'pending' },
  { kind:'Other',                 month:6,   ytd:54,   share:2,  tone:'pending' },
];

const CRS = [
  { id:'CR-018', title:'Mainframe spike — 3 weeks',           value:48000,  status:'proposed', who:'A. Page' },
  { id:'CR-017', title:'Regulatory scope add — FCA Q3',       value:36000,  status:'approved', who:'E. Brooks' },
  { id:'CR-015', title:'COBOL specialist premium',            value:12000,  status:'approved', who:'M. Kovács' },
  { id:'CR-014', title:'Equinix multi-year deal',             value:-22000, status:'approved', who:'H. Voss' },
];

function ProjectMoney() {
  return (
    <AppShell active="projects" context="Mercury Core Banking — UK">
      <PageHeader
        breadcrumb={['Projects', 'Mercury Core Banking — UK', 'Money']}
        title="Mercury Core Banking — UK"
        badges={<>
          <StatusBadge tone="danger">Over budget</StatusBadge>
          <span className="badge badge-outline mono">MCB-UK</span>
        </>}
        subtitle={<>Auto-computed EVM · multi-currency consolidated to USD · fiscal calendar ON · last refresh 14:32 UTC</>}
        actions={<>
          <select className="select input-sm" style={{width:140}}><option>USD · base</option><option>GBP · project</option><option>Both</option></select>
          <button className="btn btn-ghost btn-md"><Icon name="download"/> Export</button>
          <button className="btn btn-secondary btn-md"><Icon name="docs"/> Change request</button>
        </>}
        tabs={[
          { id:'pulse', label:'Pulse' },
          { id:'plan',  label:'Plan', count:'12' },
          { id:'money', label:'Money' },
        ]}
        activeTab="money"
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:20}}>
        {/* Banner */}
        <div className="banner banner-danger">
          <Icon name="alert" size={18} style={{color:'var(--color-status-danger)'}}/>
          <div style={{flex:1}}>
            <div className="banner-title">Forecast EAC exceeds baseline by $184k (−8.2%)</div>
            <div className="banner-body">Driven by FX consolidation (−$112k) and COBOL specialist premium (−$48k). Director re-baseline decision is pending.</div>
          </div>
          <button className="btn btn-primary btn-sm">Open approval <Icon name="arrow-right"/></button>
        </div>

        {/* EVM KPI strip */}
        <div className="kpi-strip" style={{gridTemplateColumns:'repeat(6,1fr)'}}>
          <div className="kpi">
            <span className="kpi-label">Baseline (BAC)</span>
            <span className="kpi-value mono">$2.24M</span>
            <span className="kpi-foot">USD · consolidated</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Actual (AC)</span>
            <span className="kpi-value mono">$2.02M</span>
            <span className="kpi-foot">YTD</span>
          </div>
          <div className="kpi tone-active">
            <span className="kpi-label">Earned (EV)</span>
            <span className="kpi-value mono">$1.84M</span>
            <span className="kpi-delta up">62% complete</span>
          </div>
          <div className="kpi tone-danger">
            <span className="kpi-label">CPI</span>
            <span className="kpi-value">0.91</span>
            <span className="kpi-delta down"><Icon name="trending-down" size={12}/> from 0.96</span>
          </div>
          <div className="kpi tone-warning">
            <span className="kpi-label">SPI</span>
            <span className="kpi-value">0.94</span>
            <span className="kpi-foot">marginal · trending stable</span>
          </div>
          <div className="kpi tone-danger">
            <span className="kpi-label">EAC</span>
            <span className="kpi-value mono">$2.42M</span>
            <span className="kpi-delta down">+$184k vs BAC</span>
          </div>
        </div>

        {/* Hero chart */}
        <div className="card">
          <div className="card-header">
            <h3>Plan vs Actual · with forecast (EAC)</h3>
            <div style={{display:'flex', gap:12, alignItems:'center'}}>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:10, height:2, background:'var(--color-text-subtle)'}}/><span className="compact muted">Planned (PV)</span></span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:10, height:2, background:'var(--color-status-active)'}}/><span className="compact muted">Earned (EV)</span></span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:10, height:2, background:'var(--color-status-danger)'}}/><span className="compact muted">Actual (AC)</span></span>
            </div>
          </div>
          <div className="card-body" style={{padding:'8px 20px 20px'}}>
            <PlanVsActualChart/>
          </div>
        </div>

        {/* Variance drill + top cost lines */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
          <div className="card">
            <div className="card-header"><h3>Variance drivers · YTD</h3><a href="#" className="compact">Full breakdown</a></div>
            <div className="card-body" style={{padding:'14px 20px', display:'flex', flexDirection:'column', gap:10}}>
              {[
                { label:'FX impact (GBP→USD)',           value:-112, max:160 },
                { label:'COBOL specialist premium',       value:-48,  max:160 },
                { label:'Regulatory scope add · FCA',     value:-36,  max:160 },
                { label:'External vendor rates',          value:-28,  max:160 },
                { label:'Negotiated Equinix savings',     value:+22,  max:160 },
                { label:'Timesheet recoveries · Q1',      value:+18,  max:160 },
              ].map((r) => (
                <div key={r.label} style={{display:'grid', gridTemplateColumns:'1.4fr 1.4fr 80px', alignItems:'center', gap:10}}>
                  <span className="body-sm">{r.label}</span>
                  <VarianceBar value={r.value} max={r.max}/>
                  <span className="mono tnum" style={{textAlign:'right', color: r.value < 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}}>
                    {r.value > 0 ? '+' : '−'}${Math.abs(r.value)}k
                  </span>
                </div>
              ))}
            </div>
            <div className="card-footer">
              <span className="compact muted" style={{marginRight:'auto'}}>Sum of drivers · −$184k</span>
              <button className="btn btn-tertiary btn-sm">Add driver note</button>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Top cost lines · this month</h3><span className="compact muted">May 2026</span></div>
            <div style={{overflow:'auto'}}>
              <table className="table table-compact">
                <thead><tr><th>Line</th><th className="right">Month</th><th className="right">YTD</th><th className="right">Share</th></tr></thead>
                <tbody>
                  {COST_LINES.map((c) => (
                    <tr key={c.kind}>
                      <td><span style={{display:'inline-flex', alignItems:'center', gap:8}}><span className={'tone-dot tone-'+c.tone}/>{c.kind}</span></td>
                      <td className="right mono">${c.month}k</td>
                      <td className="right mono">${c.ytd}k</td>
                      <td className="right">
                        <div style={{display:'inline-flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}>
                          <div style={{width:60, height:4, background:'var(--color-surface-alt)', borderRadius:2, overflow:'hidden'}}>
                            <div style={{width:c.share+'%', height:'100%', background:'var(--color-accent)'}}/>
                          </div>
                          <span className="mono tnum compact">{c.share}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Change requests + Approvals */}
        <div className="card">
          <div className="card-header">
            <h3>Change requests · this quarter</h3>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <span className="chip chip-active">All · 4</span>
              <span className="chip">Pending · 1</span>
              <span className="chip">Approved · 3</span>
              <button className="btn btn-primary btn-sm"><Icon name="plus"/> CR</button>
            </div>
          </div>
          <div style={{overflow:'auto'}}>
            <table className="table table-compact">
              <thead><tr><th>ID</th><th>Title</th><th>Owner</th><th className="right">Δ Budget</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {CRS.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td className="table-cell-strong">{c.title}</td>
                    <td>{c.who}</td>
                    <td className="right mono" style={{color: c.value < 0 ? 'var(--color-status-active)' : 'var(--color-status-danger)'}}>
                      {c.value > 0 ? '+' : '−'}<Money value={Math.abs(c.value)} compact/>
                    </td>
                    <td>{c.status === 'proposed' ? <StatusBadge tone="warning">Proposed</StatusBadge> : <StatusBadge tone="active">Approved</StatusBadge>}</td>
                    <td><button className="icon-btn icon-btn-sm" aria-label="Open"><Icon name="chevron-right"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fiscal period rollup */}
        <div className="card">
          <div className="card-header"><h3>By fiscal period · monthly rollup</h3><span className="compact muted">FY26 · base USD</span></div>
          <div className="card-body" style={{padding:'14px 20px'}}>
            <table className="table table-compact">
              <thead><tr>
                <th>Period</th>
                <th className="right">Planned</th>
                <th className="right">Actual</th>
                <th className="right">Earned</th>
                <th className="right">CPI</th>
                <th className="right">SPI</th>
                <th></th>
              </tr></thead>
              <tbody>
                {[
                  { p:'2025-Q3 · Sep–Nov', pv:540, ac:580, ev:528, cpi:0.91, spi:0.98 },
                  { p:'2025-Q4 · Dec–Feb', pv:600, ac:646, ev:598, cpi:0.93, spi:1.00 },
                  { p:'2026-Q1 · Mar–May', pv:680, ac:794, ev:732, cpi:0.92, spi:1.08 },
                  { p:'2026-Q2 · Jun–Aug', pv:420, ac:'—', ev:'—', cpi:'—', spi:'—' },
                ].map((p) => (
                  <tr key={p.p}>
                    <td><span className="table-cell-strong">{p.p}</span></td>
                    <td className="right mono">${p.pv}k</td>
                    <td className="right mono">{p.ac === '—' ? <span className="muted">—</span> : '$'+p.ac+'k'}</td>
                    <td className="right mono">{p.ev === '—' ? <span className="muted">—</span> : '$'+p.ev+'k'}</td>
                    <td className="right mono" style={{color: typeof p.cpi === 'number' && p.cpi < 0.95 ? 'var(--color-status-warning)' : 'var(--color-text)'}}>{p.cpi}</td>
                    <td className="right mono">{p.spi}</td>
                    <td><Sparkline data={[p.pv, p.ac === '—' ? p.pv : p.ac, p.ev === '—' ? p.pv : p.ev]} width={60} height={20}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.ProjectPlan = ProjectPlan;
window.ProjectMoney = ProjectMoney;
