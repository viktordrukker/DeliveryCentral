// page-director.jsx — Director Decision Dashboard.
// Grammar: Decision Dashboard, full strength. Portfolio view across all projects.

const PORTFOLIO = [
  { code:'MCB-UK',  name:'Mercury Core Banking — UK', stage:'Delivery', pm:'Ethan Brooks',  ragD:'warning', ragB:'danger',   ragP:'active',  ragQ:'active',  budget:-184, util:84, milestones:'17/25' },
  { code:'ATL',     name:'Atlas ERP Rollout',         stage:'Delivery', pm:'Aaron Page',    ragD:'active',  ragB:'warning',  ragP:'warning', ragQ:'active',  budget:-62,  util:91, milestones:'9/12'  },
  { code:'APO',     name:'Apollo Risk Platform',      stage:'Discovery',pm:'Maya Kovács',   ragD:'active',  ragB:'active',   ragP:'warning', ragQ:'pending', budget:+8,   util:62, milestones:'2/8'   },
  { code:'BCN',     name:'Beacon CRM',                stage:'Delivery', pm:'Selma Iqbal',   ragD:'warning', ragB:'active',   ragP:'active',  ragQ:'warning', budget:-22,  util:78, milestones:'14/18' },
  { code:'HLX',     name:'Helix DW Migration',        stage:'Closeout', pm:'Hannah Cole',   ragD:'active',  ragB:'active',   ragP:'active',  ragQ:'active',  budget:+45,  util:54, milestones:'22/22' },
  { code:'ORN',     name:'Orion Treasury',            stage:'Activation',pm:'Aaron Page',   ragD:'pending', ragB:'pending',  ragP:'pending', ragQ:'pending', budget:0,    util:0,  milestones:'0/14'  },
];

function DirectorDashboard() {
  return (
    <AppShell active="home" context="Portfolio">
      <PageHeader
        breadcrumb={['Dashboards', 'Director']}
        title="Portfolio · this week"
        badges={<>
          <span className="badge badge-outline">6 projects</span>
          <span className="badge badge-outline">$8.4M committed</span>
        </>}
        subtitle={<>Hi Lina. Two projects need a decision this week. Budget pressure on Mercury and Atlas is concentrated in FX and external rates.</>}
        actions={<>
          <select className="select input-sm" style={{width:140}}><option>This week</option><option>This month</option><option>Quarter</option></select>
          <button className="btn btn-ghost btn-md"><Icon name="download"/> Export brief</button>
          <button className="btn btn-secondary btn-md"><Icon name="reports"/> Open in Reports</button>
        </>}
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:20}}>
        {/* What needs me now — anomaly strip */}
        <div className="card section-card-emphasized" style={{borderRadius:'var(--radius-card)', borderLeftWidth:3}}>
          <div className="card-header"><h3>What needs you now</h3><span className="compact muted">5 items · prioritized by SLA × impact</span></div>
          <div style={{display:'flex', flexDirection:'column'}}>
            {[
              { tone:'critical', label:'Budget · Mercury Core',  body:'Re-baseline Q3 budget · −$184k · 2d to decision', cta:'Open approval' },
              { tone:'danger',   label:'Position · MCB-UK',     body:'COBOL specialist · open 30d · 0 candidates in pipeline', cta:'Open position' },
              { tone:'warning',  label:'Activation · Orion',    body:'Activation gate ready · 4 positions pre-staffed', cta:'Activate' },
              { tone:'info',     label:'Forecast · Atlas',      body:'Change request +$62k pending RM input · 4d', cta:'View CR' },
              { tone:'info',     label:'People · Bench',        body:'4 people idle >14d · 12 fills suggested', cta:'Open bench' },
            ].map((r, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:14,
                padding:'12px 20px',
                borderTop: i === 0 ? 0 : '1px solid var(--color-border-subtle)',
              }}>
                <span className={'tone-dot tone-'+r.tone} style={{flexShrink:0}}/>
                <span className="compact muted" style={{minWidth:140}}>{r.label}</span>
                <span className="body-sm" style={{flex:1, minWidth:0}}>{r.body}</span>
                <button className="btn btn-tertiary btn-sm">{r.cta} <Icon name="arrow-right"/></button>
              </div>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div className="kpi-strip" style={{gridTemplateColumns:'repeat(5, 1fr)'}}>
          <div className="kpi tone-active">
            <span className="kpi-label">Active projects</span>
            <span className="kpi-value">6</span>
            <span className="kpi-foot">1 in activation, 1 in closeout</span>
          </div>
          <div className="kpi tone-warning">
            <span className="kpi-label">At-risk projects</span>
            <span className="kpi-value">2</span>
            <span className="kpi-delta down"><Icon name="trending-up" size={12}/> +1 this week</span>
          </div>
          <div className="kpi tone-danger">
            <span className="kpi-label">Budget variance · portfolio</span>
            <span className="kpi-value">−2.6<span className="unit">%</span></span>
            <Sparkline data={[0.5, -0.2, -1.1, -1.4, -1.8, -2.1, -2.6]} width={120} height={20} tone="danger"/>
          </div>
          <div className="kpi tone-info">
            <span className="kpi-label">Utilization</span>
            <span className="kpi-value">76<span className="unit">%</span></span>
            <span className="kpi-foot">Target 78% · 12 on bench</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Open positions</span>
            <span className="kpi-value">18</span>
            <span className="kpi-delta down"><Icon name="trending-down" size={12}/> −3 vs last week</span>
          </div>
        </div>

        {/* Hero chart — Planned vs actual burn, multi-project */}
        <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:20}}>
          <div className="card">
            <div className="card-header">
              <h3>Planned vs actual burn · 6 projects</h3>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <span className="chip chip-active">Burn</span>
                <span className="chip">EVM</span>
                <span className="chip">Velocity</span>
              </div>
            </div>
            <div className="card-body" style={{padding:20}}>
              {/* SVG variance / burn chart */}
              <BurnChart/>
              <div style={{display:'flex', gap:20, marginTop:14, flexWrap:'wrap'}}>
                {['Mercury','Atlas','Apollo','Beacon','Helix','Orion'].map((n, i) => (
                  <span key={n} style={{display:'inline-flex', alignItems:'center', gap:6}}>
                    <span style={{width:10, height:2, background:`var(--color-chart-${i+1})`}}/>
                    <span className="compact muted">{n}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Variance by driver</h3></div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:10, padding:'14px 20px 20px'}}>
              {[
                { label:'FX impact',              value:-148, max:200 },
                { label:'Vendor rates',           value:-78,  max:200 },
                { label:'Spec change · regs',     value:-52,  max:200 },
                { label:'People (premium hires)', value:-30,  max:200 },
                { label:'Negotiated savings',     value:+44,  max:200 },
                { label:'Timesheet recoveries',   value:+12,  max:200 },
              ].map((r) => (
                <div key={r.label} style={{display:'grid', gridTemplateColumns:'1.1fr 1.6fr 70px', alignItems:'center', gap:10}}>
                  <span className="body-sm">{r.label}</span>
                  <VarianceBar value={r.value} max={r.max}/>
                  <span className="mono tnum" style={{textAlign:'right', color: r.value < 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}}>
                    {r.value > 0 ? '+' : '−'}${Math.abs(r.value)}k
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio table — 4-quadrant indicator per project */}
        <div className="card">
          <div className="card-header">
            <h3>Portfolio · 4-axis RAG</h3>
            <div style={{display:'flex', gap:8, alignItems:'center'}}>
              <input className="input input-sm" placeholder="Filter…" style={{width:160}}/>
              <button className="btn btn-ghost btn-sm"><Icon name="sort"/> Sort</button>
            </div>
          </div>
          <div style={{overflow:'auto'}}>
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Stage</th>
                  <th>PM</th>
                  <th style={{textAlign:'center'}}>Del</th>
                  <th style={{textAlign:'center'}}>Bud</th>
                  <th style={{textAlign:'center'}}>Peo</th>
                  <th style={{textAlign:'center'}}>Qua</th>
                  <th className="right">Budget var</th>
                  <th className="right">Util</th>
                  <th>Milestones</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {PORTFOLIO.map((p) => (
                  <tr key={p.code}>
                    <td>
                      <div className="table-cell-strong">{p.name}</div>
                      <div className="compact-sm muted mono">{p.code}</div>
                    </td>
                    <td><span className="badge badge-outline">{p.stage}</span></td>
                    <td><span style={{display:'inline-flex', alignItems:'center', gap:6}}><Avatar name={p.pm} size="sm"/><span className="compact">{p.pm}</span></span></td>
                    <td style={{textAlign:'center'}}><span className={'tone-dot tone-'+p.ragD}/></td>
                    <td style={{textAlign:'center'}}><span className={'tone-dot tone-'+p.ragB}/></td>
                    <td style={{textAlign:'center'}}><span className={'tone-dot tone-'+p.ragP}/></td>
                    <td style={{textAlign:'center'}}><span className={'tone-dot tone-'+p.ragQ}/></td>
                    <td className="right">
                      <span className="mono tnum" style={{color: p.budget < -20 ? 'var(--color-status-danger)' : p.budget < 0 ? 'var(--color-status-warning)' : p.budget > 0 ? 'var(--color-status-active)' : 'var(--color-text-muted)'}}>
                        {p.budget === 0 ? '—' : (p.budget > 0 ? '+' : '−') + '$' + Math.abs(p.budget) + 'k'}
                      </span>
                    </td>
                    <td className="right">
                      <div style={{display:'inline-flex', alignItems:'center', gap:6}}>
                        <div style={{width:48, height:4, background:'var(--color-surface-alt)', borderRadius:2, overflow:'hidden'}}>
                          <div style={{
                            height:'100%', width: p.util + '%',
                            background: p.util > 90 ? 'var(--color-status-warning)' : p.util > 60 ? 'var(--color-status-active)' : p.util === 0 ? 'transparent' : 'var(--color-status-info)',
                          }}/>
                        </div>
                        <span className="mono tnum compact">{p.util}%</span>
                      </div>
                    </td>
                    <td><span className="mono compact">{p.milestones}</span></td>
                    <td><button className="icon-btn icon-btn-sm" aria-label="Open"><Icon name="chevron-right"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Two-column: People mix donut + recent decisions */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16}}>
          <div className="card">
            <div className="card-header"><h3>Headcount mix</h3></div>
            <div className="card-body" style={{display:'flex', gap:18, alignItems:'center'}}>
              <Donut value={186} max={210} size={84} thickness={10} tone="accent"/>
              <div style={{flex:1}}>
                <div className="kpi-value mono" style={{fontSize:'var(--font-size-h2)'}}>186<span className="unit"> / 210</span></div>
                <div className="compact muted">Assigned · planned</div>
                <div style={{marginTop:10, display:'flex', flexDirection:'column', gap:4}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span className="compact"><span className="tone-dot tone-active"/> Assigned</span><span className="mono compact">152</span></div>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span className="compact"><span className="tone-dot tone-info"/> Booked</span><span className="mono compact">22</span></div>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span className="compact"><span className="tone-dot tone-pending"/> Bench</span><span className="mono compact">12</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Cash position</h3></div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:10}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="compact muted">Committed (FY)</span><span className="mono">$8.41M</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="compact muted">Recognised YTD</span><span className="mono">$5.62M</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="compact muted">EAC</span><span className="mono" style={{color:'var(--color-status-warning)'}}>$8.62M</span>
              </div>
              <div className="divider" style={{margin:'6px 0'}}/>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="body-sm" style={{fontWeight:500}}>Forecast variance</span><span className="mono" style={{color:'var(--color-status-danger)', fontWeight:600}}>−$210k</span>
              </div>
              <MiniBars data={[420, 380, 540, 612, 590, 720, 680, 640, 760, 820, 740, 690]} threshold={700} width={240} height={40} tone="accent"/>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Recent decisions</h3><a href="#" className="compact">All</a></div>
            <div className="card-body" style={{padding:'10px 20px'}}>
              <div className="timeline">
                {[
                  { tone:'active',  who:'You',         what:<>approved <strong>Activation · Orion Treasury</strong></>, when:'Mon' },
                  { tone:'danger',  who:'You',         what:<>rejected <strong>Spike +$120k</strong> on Atlas</>, when:'Fri' },
                  { tone:'info',    who:'You',         what:<>escalated to <strong>CFO</strong> · MCB-UK budget</>, when:'Thu' },
                  { tone:'active',  who:'Maya Kovács', what:<>auto-approved <strong>3 leave</strong> requests</>, when:'Wed' },
                ].map((t, i) => (
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

        {/* Freshness */}
        <div style={{display:'flex', alignItems:'center', gap:12, padding:'8px 0', color:'var(--color-text-subtle)', fontSize:'var(--font-size-compact-sm)'}}>
          <span className="tone-dot tone-active"/>
          <span>Data as of <span className="mono" style={{color:'var(--color-text-muted)'}}>23 May 2026 · 14:32 UTC</span></span>
          <span>· Source: Production DB · Confidence: High</span>
          <button className="btn btn-ghost btn-sm" style={{marginLeft:'auto'}}><Icon name="refresh"/> Refresh</button>
        </div>
      </div>
    </AppShell>
  );
}

// Burn chart — multi-line, with planned baseline and an actual curve
function BurnChart() {
  const W = 720, H = 220, P = 28;
  const weeks = 26;
  // Synthesized series — planned ramp and 6 project actuals
  const planned = Array.from({length: weeks}, (_, i) => 30 + i * 12);
  const projects = [
    [25, 38, 56, 78, 98, 122, 148, 178, 210, 248, 290, 332, 372, 412, 452, 488, 528, 568, 612, 658, 702, 748, 790, 836, 880, 922],
    [28, 42, 64, 82, 104, 128, 156, 182, 214, 244, 278, 308, 342, 372, 404, 432, 466, 498, 532, 562, 596, 624, 658, 690, 720, 752],
    [22, 32, 48, 66, 88, 110, 134, 162, 190, 220, 246, 274, 302, 332, 360, 390, 418, 446, 478, 506, 534, 562, 590, 618, 646, 672],
    [20, 28, 40, 56, 74, 92, 112, 134, 158, 184, 210, 238, 264, 292, 318, 344, 370, 396, 420, 446, 472, 498, 522, 548, 572, 598],
    [16, 22, 32, 44, 58, 72, 88, 104, 122, 142, 162, 182, 202, 222, 244, 264, 286, 308, 330, 352, 374, 396, 416, 438, 460, 482],
    [12, 16, 22, 30, 38, 48, 58, 70, 84, 98, 114, 130, 146, 164, 182, 200, 218, 236, 256, 276, 296, 316, 336, 356, 376, 396],
  ];
  const max = 1000;
  const x = (i) => P + (i / (weeks - 1)) * (W - 2*P);
  const y = (v) => H - P - (v / max) * (H - 2*P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:'auto', display:'block'}}>
      {/* gridlines */}
      {[0, 250, 500, 750, 1000].map((v) => (
        <g key={v}>
          <line x1={P} x2={W-P} y1={y(v)} y2={y(v)} stroke="var(--color-border-subtle)" strokeDasharray="2 4"/>
          <text x={P-6} y={y(v)+3} textAnchor="end" fontSize="10" fill="var(--color-text-subtle)">${v}k</text>
        </g>
      ))}
      {/* week ticks */}
      {[0, 4, 8, 12, 16, 20, 24].map((i) => (
        <text key={i} x={x(i)} y={H-8} textAnchor="middle" fontSize="10" fill="var(--color-text-subtle)">W{i+1}</text>
      ))}
      {/* planned (dashed) */}
      <path d={planned.map((v,i) => (i===0?'M':'L') + x(i) + ' ' + y(v)).join(' ')}
        fill="none" stroke="var(--color-text-subtle)" strokeWidth="1.5" strokeDasharray="4 3"/>
      {projects.map((series, idx) => (
        <path key={idx}
          d={series.map((v,i) => (i===0?'M':'L') + x(i) + ' ' + y(v)).join(' ')}
          fill="none" stroke={`var(--color-chart-${idx+1})`} strokeWidth="1.6" strokeLinejoin="round"/>
      ))}
      {/* current marker */}
      <line x1={x(18)} x2={x(18)} y1={P} y2={H-P} stroke="var(--color-accent)" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
      <text x={x(18)+6} y={P+10} fontSize="10" fill="var(--color-accent)">Today</text>
    </svg>
  );
}

window.DirectorDashboard = DirectorDashboard;
