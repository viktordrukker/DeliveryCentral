// page-directory-hr.jsx — People Directory + HR Queue

const DIRECTORY = [
  { name:'Aarav Mehta',       role:'Backend Engineer · L4',     loc:'London',   ws:'Banking BE',        status:'Bench',     util:0,   hue:1, since:'Jun 2023' },
  { name:'Priya Natarajan',   role:'Senior Frontend Eng · L5',  loc:'London',   ws:'FE Customer',       status:'Proposed',  util:80,  hue:2, since:'Jun 2023' },
  { name:'Marco Bianchi',     role:'SRE · L4',                  loc:'Milan',    ws:'Platform',          status:'Bench',     util:0,   hue:3, since:'Aug 2022' },
  { name:'Lina Olsen',        role:'Data Engineer · L4',        loc:'Oslo',     ws:'Data',              status:'Booked',    util:100, hue:4, since:'Mar 2024' },
  { name:'Tomás Reyes',       role:'QA · L3',                   loc:'Madrid',   ws:'Quality',           status:'Bench',     util:0,   hue:5, since:'Jan 2024' },
  { name:'Hannah Cole',       role:'BA · L3',                   loc:'London',   ws:'Discovery',         status:'Assigned',  util:100, hue:6, since:'Sep 2023' },
  { name:'Yusuf Demir',       role:'Solution Architect · L6',   loc:'Istanbul', ws:'Architecture',      status:'Assigned',  util:80,  hue:7, since:'Feb 2021' },
  { name:'Sofia Andersen',    role:'PM · L4',                   loc:'Stockholm',ws:'Programme',         status:'Assigned',  util:100, hue:8, since:'Apr 2022' },
  { name:'Ethan Brooks',      role:'PM · L5',                   loc:'London',   ws:'Programme',         status:'Assigned',  util:90,  hue:1, since:'Oct 2020' },
  { name:'Maya Kovács',       role:'Resource Manager · L5',     loc:'Budapest', ws:'Workforce',         status:'Assigned',  util:100, hue:2, since:'May 2021' },
  { name:'Henrik Voss',       role:'Solution Architect · L6',   loc:'Copenhagen',ws:'Architecture',     status:'Assigned',  util:50,  hue:3, since:'Nov 2019' },
  { name:'Aisha Okafor',      role:'QA Lead · L5',              loc:'Lagos',    ws:'Quality',           status:'Booked',    util:100, hue:4, since:'Aug 2023' },
];

function PeopleDirectory({ view = 'list' }) {
  return (
    <AppShell active="people" context="People · Directory">
      <PageHeader
        breadcrumb={['People']}
        title="People"
        badges={<>
          <span className="badge badge-outline">186 people</span>
          <span className="badge badge-outline">152 assigned</span>
          <span className="badge badge-outline">12 bench</span>
        </>}
        subtitle="The workforce. Search · filter · group · bulk-act."
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="upload"/> Import HRIS</button>
          <button className="btn btn-secondary btn-md"><Icon name="download"/> Export</button>
          <button className="btn btn-primary btn-md"><Icon name="plus"/> Add person</button>
        </>}
        tabs={[
          { id:'dir', label:'Directory' },
          { id:'bench', label:'Bench', count:'12' },
          { id:'hr', label:'HR Queue', count:'3' },
        ]}
        activeTab="dir"
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:16}}>
        <div className="filter-bar">
          <div style={{position:'relative', width:280}}>
            <Icon name="search" style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-subtle)'}}/>
            <input className="input input-sm" placeholder="Name, email, skill…" style={{paddingLeft:30}}/>
          </div>
          <span className="chip chip-active">All roles <Icon name="chevron-down" size={10}/></span>
          <span className="chip">London</span>
          <span className="chip">L4 +</span>
          <span className="chip chip-active">Active <Icon name="x" size={10} className="remove"/></span>
          <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Filter</button>
          <div style={{flex:1}}/>

          {/* View toggle */}
          <div style={{display:'inline-flex', border:'1px solid var(--color-border-strong)', borderRadius:'var(--radius-control)', overflow:'hidden'}}>
            <button className={'btn btn-sm ' + (view === 'list' ? 'btn-tertiary' : 'btn-ghost')} style={{borderRadius:0, borderRight:'1px solid var(--color-border)'}}><Icon name="docs"/> List</button>
            <button className={'btn btn-sm ' + (view === 'grid' ? 'btn-tertiary' : 'btn-ghost')} style={{borderRadius:0}}><Icon name="more"/> Grid</button>
          </div>
          <span className="compact muted">Group:</span>
          <select className="select input-sm" style={{width:140}} defaultValue="ws"><option value="ws">By workstream</option><option>By office</option><option>Flat</option></select>
        </div>

        {view === 'list' ? (
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflow:'auto'}}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{width:36}}><input type="checkbox" className="checkbox"/></th>
                    <th>Person</th>
                    <th>Workstream</th>
                    <th>Office</th>
                    <th>Status</th>
                    <th className="right">Util · L30D</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {DIRECTORY.map((p, i) => (
                    <tr key={p.name}>
                      <td><input type="checkbox" className="checkbox" defaultChecked={i === 0 || i === 4}/></td>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          <Avatar name={p.name}/>
                          <div>
                            <div className="table-cell-strong">{p.name}</div>
                            <div className="compact-sm muted">{p.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.ws}</td>
                      <td>{p.loc}</td>
                      <td>
                        {p.status === 'Assigned' && <StatusBadge tone="active">Assigned</StatusBadge>}
                        {p.status === 'Bench' && <StatusBadge tone="pending">Bench</StatusBadge>}
                        {p.status === 'Booked' && <StatusBadge tone="accent">Booked</StatusBadge>}
                        {p.status === 'Proposed' && <StatusBadge tone="info">Proposed</StatusBadge>}
                      </td>
                      <td className="right">
                        <div style={{display:'inline-flex', alignItems:'center', gap:6, justifyContent:'flex-end'}}>
                          <div style={{width:60, height:4, background:'var(--color-surface-alt)', borderRadius:2, overflow:'hidden'}}>
                            <div style={{width:p.util+'%', height:'100%', background: p.util > 90 ? 'var(--color-status-warning)' : p.util > 0 ? 'var(--color-status-active)' : 'transparent'}}/>
                          </div>
                          <span className="mono tnum compact">{p.util}%</span>
                        </div>
                      </td>
                      <td className="mono compact">{p.since}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-btn icon-btn-sm" aria-label="Open profile"><Icon name="chevron-right"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderTop:'1px solid var(--color-border)'}}>
              <span className="compact muted">Showing 1–12 of 186 · 2 selected</span>
              <div className="pagination">
                <button className="pag-btn" disabled><Icon name="chevron-left" size={12}/></button>
                <button className="pag-btn active">1</button>
                <button className="pag-btn">2</button>
                <button className="pag-btn">3</button>
                <span className="pag-btn" style={{cursor:'default'}}>…</span>
                <button className="pag-btn">16</button>
                <button className="pag-btn"><Icon name="chevron-right" size={12}/></button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HR Queue — tabbed approval list (leave / onboarding / offboarding / skills review)
// ─────────────────────────────────────────────────────────────────────────
const LEAVE_REQUESTS = [
  { name:'Priya Natarajan', kind:'Annual leave',   days:5,  from:'24 Jun', to:'28 Jun', manager:'Maya K.', balance:14.5, conflict:false },
  { name:'Diego Costa',     kind:'Annual leave',   days:3,  from:'10 Jul', to:'12 Jul', manager:'Ethan B.', balance:8.0,  conflict:false },
  { name:'Aisha Okafor',    kind:'Sick',           days:2,  from:'21 May', to:'22 May', manager:'Maya K.', balance:null, conflict:false },
  { name:'Marco Bianchi',   kind:'Annual leave',   days:7,  from:'15 Aug', to:'23 Aug', manager:'Henrik V.',balance:18.5, conflict:true },
  { name:'Tomás Reyes',     kind:'Parental',       days:14, from:'01 Sep', to:'14 Sep', manager:'Ethan B.', balance:null, conflict:false },
];

function HRQueue() {
  return (
    <AppShell active="hr" context="HR Queue">
      <PageHeader
        breadcrumb={['People', 'HR Queue']}
        title="HR Queue"
        badges={<>
          <StatusBadge tone="warning">3 awaiting you</StatusBadge>
          <span className="badge badge-outline">SLA · 24h</span>
        </>}
        subtitle="Operational HR · leave · onboarding cases · offboarding · skills review. Approve in-place."
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="filter"/> Filters</button>
          <button className="btn btn-secondary btn-md"><Icon name="history"/> History</button>
        </>}
        tabs={[
          { id:'leave',   label:'Leave',     count:'5' },
          { id:'on',      label:'Onboarding',count:'2' },
          { id:'off',     label:'Offboarding',count:'1' },
          { id:'skills',  label:'Skills review' },
        ]}
        activeTab="leave"
      />

      <div className="page-body" style={{display:'flex', flexDirection:'column', gap:16}}>
        {/* KPI strip */}
        <div className="kpi-strip" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          <div className="kpi tone-warning">
            <span className="kpi-label">Awaiting approval</span>
            <span className="kpi-value">5</span>
            <span className="kpi-delta down"><Icon name="trending-up" size={12}/> +2 today</span>
          </div>
          <div className="kpi tone-active">
            <span className="kpi-label">Approved · L7D</span>
            <span className="kpi-value">42</span>
            <span className="kpi-foot">avg time-to-decision 3.4h</span>
          </div>
          <div className="kpi tone-info">
            <span className="kpi-label">Onboardings in flight</span>
            <span className="kpi-value">2</span>
            <span className="kpi-foot">Lina Olsen, Diego Costa</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Avg leave balance</span>
            <span className="kpi-value mono">12.4<span className="unit"> d</span></span>
            <span className="kpi-foot">across org</span>
          </div>
        </div>

        {/* Bulk action bar */}
        <div style={{display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--color-accent-soft)', border:'1px solid var(--color-accent)', borderRadius:'var(--radius-card)', color:'var(--color-accent-text)'}}>
          <span className="body-sm" style={{fontWeight:500}}>3 selected · no conflicts detected</span>
          <button className="btn btn-tertiary btn-sm"><Icon name="check"/> Approve all 3</button>
          <button className="btn btn-tertiary btn-sm">Reject with comment</button>
          <button className="btn btn-tertiary btn-sm">Reassign approver</button>
          <div style={{flex:1}}/>
          <button className="btn btn-ghost btn-sm">Clear</button>
        </div>

        {/* Approval list */}
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflow:'auto'}}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{width:36}}><input type="checkbox" className="checkbox"/></th>
                  <th>Employee</th>
                  <th>Request</th>
                  <th>Dates</th>
                  <th>Manager</th>
                  <th>Balance</th>
                  <th>Flag</th>
                  <th style={{width:240}}>Decide</th>
                </tr>
              </thead>
              <tbody>
                {LEAVE_REQUESTS.map((r, i) => (
                  <tr key={r.name}>
                    <td><input type="checkbox" className="checkbox" defaultChecked={i < 3}/></td>
                    <td>
                      <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
                        <Avatar name={r.name} size="sm"/>
                        <span className="body-sm" style={{fontWeight:500}}>{r.name}</span>
                      </span>
                    </td>
                    <td>
                      <div className="body-sm">{r.kind} · <span className="mono">{r.days}d</span></div>
                    </td>
                    <td><span className="mono compact">{r.from} → {r.to}</span></td>
                    <td className="compact">{r.manager}</td>
                    <td className="right mono">{r.balance == null ? <span className="muted">—</span> : r.balance.toFixed(1) + 'd'}</td>
                    <td>
                      {r.conflict
                        ? <StatusBadge tone="warning">Project conflict</StatusBadge>
                        : <StatusBadge tone="active">Clean</StatusBadge>}
                    </td>
                    <td>
                      <div style={{display:'flex', gap:6}}>
                        <button className="btn btn-ghost btn-sm">Comment</button>
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

        {/* Onboarding cases panel */}
        <div className="card">
          <div className="card-header"><h3>Active onboarding cases</h3><span className="compact muted">2 in flight</span></div>
          <div className="card-body" style={{padding:0}}>
            {[
              { name:'Diego Costa',  start:'01 Jul 2026', day:14, total:30, checklist:[
                { label:'BPSS clearance', done:true },
                { label:'Laptop + access', done:true },
                { label:'M365 + Jira accounts', done:true },
                { label:'Manager 1:1 booked', done:true },
                { label:'Project orientation', done:false, owner:'Ethan B.' },
                { label:'30-day check-in', done:false, when:'31 Jul' },
              ]},
              { name:'Lina Olsen',   start:'08 Jul 2026', day:8,  total:30, checklist:[
                { label:'BPSS clearance', done:true },
                { label:'Laptop + access', done:true },
                { label:'M365 + Jira accounts', done:true },
                { label:'Manager 1:1 booked', done:false, owner:'Maya K.' },
                { label:'Project orientation', done:false, owner:'Maya K.' },
                { label:'30-day check-in', done:false, when:'07 Aug' },
              ]},
            ].map((c, ci) => (
              <div key={c.name} style={{padding:'14px 20px', borderTop: ci > 0 ? '1px solid var(--color-border-subtle)' : 0, display:'grid', gridTemplateColumns:'minmax(220px, 280px) 1fr 220px', gap:18, alignItems:'flex-start'}}>
                <div>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <Avatar name={c.name} size="lg"/>
                    <div>
                      <div className="body-sm" style={{fontWeight:600}}>{c.name}</div>
                      <div className="compact muted">Started {c.start}</div>
                    </div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginTop:12}}>
                    <div style={{flex:1, height:6, background:'var(--color-surface-alt)', borderRadius:3, overflow:'hidden'}}>
                      <div style={{width:(c.day/c.total*100)+'%', height:'100%', background:'var(--color-accent)', borderRadius:3}}/>
                    </div>
                    <span className="mono compact">Day {c.day}/{c.total}</span>
                  </div>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:6}}>
                  {c.checklist.map((t) => (
                    <div key={t.label} style={{display:'flex', alignItems:'center', gap:8}}>
                      <span style={{
                        width:16, height:16, borderRadius:4,
                        background: t.done ? 'var(--color-status-active)' : 'var(--color-surface-alt)',
                        border: '1px solid ' + (t.done ? 'var(--color-status-active)' : 'var(--color-border-strong)'),
                        display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      }}>{t.done && <Icon name="check" size={11} style={{color:'#fff'}}/>}</span>
                      <span className={'body-sm' + (t.done ? ' muted' : '')} style={{textDecoration: t.done ? 'line-through' : 'none'}}>{t.label}</span>
                      {t.owner && <span className="compact-sm muted">· {t.owner}</span>}
                      {t.when && <span className="compact-sm muted">· {t.when}</span>}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  <button className="btn btn-secondary btn-sm">Open case</button>
                  <button className="btn btn-tertiary btn-sm">Add note</button>
                  <button className="btn btn-ghost btn-sm">Reassign HRBP</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.PeopleDirectory = PeopleDirectory;
window.HRQueue = HRQueue;
