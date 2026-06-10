// page-bench.jsx — "Bench" — People with no active position.
// Grammar: List-Detail Workflow + Inspector panel pattern.
// Master list of bench people on the left; inspector with suggested fills on the right.

const BENCH = [
  { name: 'Aarav Mehta',    role: 'Backend Engineer · L4',     released: '12 May 2026', daysOff: 11, last: 'Apollo Risk', skills: ['Java','Spring','Postgres','Kafka'], cost: 145, hue: 1, sugg: 4 },
  { name: 'Priya Natarajan', role: 'Senior Frontend Eng · L5', released: '18 May 2026', daysOff: 5,  last: 'Atlas ERP',   skills: ['React','TS','D3','Design Systems'], cost: 165, hue: 2, sugg: 5, status: 'proposed' },
  { name: 'Marco Bianchi',  role: 'SRE · L4',                  released: '02 May 2026', daysOff: 21, last: 'Beacon CRM',  skills: ['K8s','Terraform','AWS','Observability'], cost: 158, hue: 3, sugg: 2 },
  { name: 'Lina Olsen',     role: 'Data Engineer · L4',        released: '14 May 2026', daysOff: 9,  last: 'Helix DW',    skills: ['Snowflake','dbt','Python','SQL'], cost: 152, hue: 4, sugg: 3 },
  { name: 'Tomás Reyes',    role: 'QA · L3',                   released: '20 May 2026', daysOff: 3,  last: 'Apollo Risk', skills: ['Playwright','k6','Selenium'], cost: 118, hue: 5, sugg: 6 },
  { name: 'Hannah Cole',    role: 'BA · L3',                   released: '08 May 2026', daysOff: 15, last: 'Mercury Core',skills: ['BABOK','SQL','Process'], cost: 128, hue: 6, sugg: 1 },
  { name: 'Yusuf Demir',    role: 'Solution Architect · L6',   released: '01 May 2026', daysOff: 22, last: 'Atlas ERP',   skills: ['EA','TOGAF','Cloud','Banking'], cost: 192, hue: 7, sugg: 7 },
  { name: 'Sofia Andersen', role: 'PM · L4',                   released: '15 May 2026', daysOff: 8,  last: 'Beacon CRM',  skills: ['Agile','PRINCE2','Stakeholder'], cost: 162, hue: 8, sugg: 2 },
];

const SUGGESTED_FILLS = [
  { project: 'Mercury Core Banking — UK', role: 'Senior Frontend Eng',  alloc: 80,  match: 92, start: 'Jun 16', cost: 'On rate card', tone: 'active' },
  { project: 'Apollo Risk Platform',       role: 'Frontend Lead (act.)', alloc: 100, match: 86, start: 'Jul 1',  cost: '+4% above',   tone: 'warning' },
  { project: 'Helix DW Migration',         role: 'UI Engineer',          alloc: 60,  match: 71, start: 'Jun 23', cost: 'On rate card', tone: 'info' },
];

function BenchPage() {
  return (
    <AppShell active="bench" context="Bench">
      <PageHeader
        breadcrumb={['Workforce', 'Bench']}
        title="Bench"
        badges={<span className="badge badge-outline">12 people · 156d total idle</span>}
        subtitle={<>People with no active position. Sorted by days off project, longest first.</>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="download"/> Export</button>
          <button className="btn btn-secondary btn-md"><Icon name="upload"/> Bulk reassign</button>
        </>}
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:16}}>
        {/* KPI strip */}
        <div className="kpi-strip" style={{gridTemplateColumns:'repeat(4, 1fr)'}}>
          <div className="kpi tone-warning">
            <span className="kpi-label">On bench</span>
            <span className="kpi-value">12</span>
            <span className="kpi-delta down"><Icon name="trending-up" size={12}/> +3 vs last week</span>
          </div>
          <div className="kpi tone-danger">
            <span className="kpi-label">Idle &gt; 14 days</span>
            <span className="kpi-value">4</span>
            <span className="kpi-foot">Marco, Hannah, Yusuf, Aarav</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Cost of bench (week)</span>
            <span className="kpi-value mono">$28.4k</span>
            <Sparkline data={[18, 21, 22, 24, 26, 28]} width={120} height={20} tone="warning"/>
          </div>
          <div className="kpi tone-active">
            <span className="kpi-label">Suggested fills</span>
            <span className="kpi-value">30</span>
            <span className="kpi-delta up">across 18 open positions</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div style={{position:'relative', width:280}}>
            <Icon name="search" style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-subtle)'}}/>
            <input className="input input-sm" placeholder="Name, role, skill…" style={{paddingLeft:30}}/>
          </div>
          <span className="chip chip-active">Idle &gt; 7d <Icon name="x" size={10} className="remove"/></span>
          <span className="chip">Engineering</span>
          <span className="chip">L4 +</span>
          <span className="chip">Available now</span>
          <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Filter</button>
          <div style={{flex:1}}></div>
          <span className="compact muted">Sort:</span>
          <select className="select input-sm" style={{width:160}} defaultValue="days">
            <option value="days">Longest idle</option>
            <option value="cost">Cost / day</option>
            <option value="match">Best match</option>
          </select>
        </div>

        {/* Bulk action bar — when selection active. Static "8 selected" demo. */}
        <div style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'10px 14px',
          background: 'var(--color-accent-soft)',
          border:'1px solid var(--color-accent)',
          borderRadius:'var(--radius-card)',
          color:'var(--color-accent-text)',
        }}>
          <span className="body-sm" style={{fontWeight:500}}>
            <span className="tnum">2 selected</span> · on idle &gt; 14 days
          </span>
          <button className="btn btn-tertiary btn-sm">Propose to position…</button>
          <button className="btn btn-tertiary btn-sm">Add to slate</button>
          <button className="btn btn-tertiary btn-sm">Plan training</button>
          <div style={{flex:1}}></div>
          <button className="btn btn-ghost btn-sm">Clear</button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:16, alignItems:'flex-start'}}>
          {/* Master list */}
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflow:'auto'}}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{width:36}}><input type="checkbox" className="checkbox"/></th>
                    <th>Person</th>
                    <th>Last project</th>
                    <th className="right">Off project</th>
                    <th className="right">Cost/d</th>
                    <th className="right">Fills</th>
                  </tr>
                </thead>
                <tbody>
                  {BENCH.map((p, i) => {
                    const selected = i === 1; // Priya = inspector selection
                    const checked = i === 0 || i === 2;
                    return (
                      <tr key={p.name} className={selected ? 'selected' : ''}>
                        <td><input type="checkbox" className="checkbox" defaultChecked={checked}/></td>
                        <td>
                          <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <Avatar name={p.name}/>
                            <div>
                              <div className="table-cell-strong">{p.name}</div>
                              <div className="compact-sm muted">{p.role}</div>
                            </div>
                            {p.status === 'proposed' && <StatusBadge tone="info">Proposed</StatusBadge>}
                          </div>
                        </td>
                        <td>
                          <div className="body-sm">{p.last}</div>
                          <div className="compact-sm muted">released {p.released}</div>
                        </td>
                        <td className="right">
                          <div className="tnum" style={{fontWeight: p.daysOff > 14 ? 600 : 400, color: p.daysOff > 14 ? 'var(--color-status-danger)' : p.daysOff > 7 ? 'var(--color-status-warning)' : 'var(--color-text)'}}>{p.daysOff}d</div>
                        </td>
                        <td className="right mono">${p.cost}0</td>
                        <td className="right">
                          {p.sugg > 0
                            ? <span className="badge badge-accent">{p.sugg}</span>
                            : <span className="muted">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderTop:'1px solid var(--color-border)'}}>
              <span className="compact muted">Showing 8 of 12</span>
              <div className="pagination">
                <button className="pag-btn" disabled><Icon name="chevron-left" size={12}/></button>
                <button className="pag-btn active">1</button>
                <button className="pag-btn">2</button>
                <button className="pag-btn"><Icon name="chevron-right" size={12}/></button>
              </div>
            </div>
          </div>

          {/* Inspector */}
          <div className="card" style={{position:'sticky', top:16}}>
            <div className="card-header" style={{paddingBottom:10, alignItems:'flex-start'}}>
              <div style={{display:'flex', gap:12, alignItems:'center', flex:1, minWidth:0}}>
                <Avatar name="Priya Natarajan" size="lg"/>
                <div style={{minWidth:0}}>
                  <h3 style={{fontSize:'var(--font-size-h3)', display:'flex', alignItems:'center', gap:8}}>
                    Priya Natarajan
                    <StatusBadge tone="info">Proposed</StatusBadge>
                  </h3>
                  <div className="compact muted">Senior Frontend Eng · L5 · 5 days off project</div>
                </div>
              </div>
              <button className="icon-btn icon-btn-sm" aria-label="Open profile"><Icon name="external"/></button>
            </div>

            <div className="card-body" style={{paddingTop:8}}>
              <dl className="dl" style={{marginBottom:16}}>
                <dt>Last project</dt>     <dd>Atlas ERP Rollout</dd>
                <dt>Released</dt>         <dd className="mono">18 May 2026</dd>
                <dt>Cost / day</dt>       <dd className="mono">$1,650</dd>
                <dt>Office</dt>           <dd>London · UK</dd>
                <dt>Manager</dt>          <dd>Maya Kovács</dd>
              </dl>

              <div className="label-eyebrow" style={{marginBottom:6}}>Skills</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:18}}>
                {['React','TypeScript','D3.js','Design Systems','Storybook','GraphQL','Node','Figma'].map((s) => (
                  <span key={s} className="chip" style={{cursor:'default'}}>{s}</span>
                ))}
              </div>

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <div className="label-eyebrow">Suggested fills</div>
                <span className="compact muted">Ranked · skill × availability × cost</span>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {SUGGESTED_FILLS.map((s, i) => (
                  <div key={i} style={{
                    border:'1px solid var(--color-border)',
                    borderRadius:'var(--radius-card)',
                    padding:12,
                    background: i === 0 ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                    borderColor: i === 0 ? 'var(--color-accent)' : 'var(--color-border)',
                  }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8}}>
                      <div style={{minWidth:0, flex:1}}>
                        <div className="body-sm" style={{fontWeight:600}}>{s.role}</div>
                        <div className="compact-sm muted">{s.project} · start {s.start}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div className="tnum" style={{fontWeight:600, fontSize:15}}>{s.match}%</div>
                        <div className="compact-sm muted">match</div>
                      </div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:8, marginTop:10, flexWrap:'wrap'}}>
                      <span className="badge badge-outline mono">{s.alloc}%</span>
                      <StatusBadge tone={s.tone}>{s.cost}</StatusBadge>
                      <div style={{flex:1}}></div>
                      <button className="btn btn-ghost btn-sm">Compare</button>
                      <button className={'btn ' + (i === 0 ? 'btn-primary' : 'btn-secondary') + ' btn-sm'}>Propose</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-footer">
              <button className="btn btn-ghost btn-sm" style={{marginRight:'auto'}}><Icon name="chevron-up"/> Previous bench</button>
              <button className="btn btn-secondary btn-sm">Skip <Icon name="chevron-right"/></button>
              <button className="btn btn-primary btn-sm">Open position search</button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.BenchPage = BenchPage;
